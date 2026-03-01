import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateQuery } from "@/lib/validate";
import { ActivitiesQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPreferenceByUserId } from "@/lib/preference-db";
import {
  buildBatchScoreRequest,
  mergeAndRank,
  rankActivitiesFallback,
  type RankedActivity,
} from "@/lib/recommendations";
import type { Activity } from "@/types";

export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(ActivitiesQuerySchema, query);
  if (validated.error) return validated.error;

  const { city, limit } = validated.data;

  let preferences = null;
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) {
      const pref = await getPreferenceByUserId(userId);
      preferences = pref?.preferences ?? null;
    }
  } catch {
    // continue without preferences
  }

  const baseUrl = req.nextUrl.origin;
  let activities: Activity[];
  try {
    const res = await fetch(
      `${baseUrl}/api/amadeus/activities?city=${encodeURIComponent(city)}&limit=${limit}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch activities", activities: [] },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { activities?: Activity[] };
    activities = Array.isArray(data.activities) ? data.activities : [];
  } catch (e) {
    console.error(String(e));
    return NextResponse.json(
      { error: "Failed to fetch activities", activities: [] },
      { status: 502 }
    );
  }

  if (activities.length === 0) {
    return NextResponse.json({ activities: [] });
  }

  const engineUrl = process.env.PREFERENCE_ENGINE_XGBOOST_URL?.trim();
  let ranked: RankedActivity[];

  if (engineUrl) {
    try {
      const body = buildBatchScoreRequest(preferences, activities);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${engineUrl.replace(/\/$/, "")}/batch_score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const batch = (await res.json()) as { scores: Array<{ fit_score: number; regret_probability?: number; explanation?: string[] | null }> };
        ranked = mergeAndRank(activities, batch.scores ?? []);
      } else {
        ranked = rankActivitiesFallback(activities, preferences?.interests ?? []);
      }
    } catch {
      ranked = rankActivitiesFallback(activities, preferences?.interests ?? []);
    }
  } else {
    ranked = rankActivitiesFallback(activities, preferences?.interests ?? []);
  }

  return NextResponse.json({ activities: ranked });
}
