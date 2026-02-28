import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateQuery } from "@/lib/validate";
import { SupermemoryRetrieveQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createSupermemoryClient, retrieveMemory } from "@/lib/supermemory";
import { getPreferenceByUserId } from "@/lib/preference-db";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.supermemory, userId);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(SupermemoryRetrieveQuerySchema, query);
  if (validated.error) return validated.error;

  const { userId: queryUserId, type } = validated.data;
  if (queryUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (type === "preferences") {
    try {
      const result = await getPreferenceByUserId(userId);
      return NextResponse.json(result ?? { preferences: null });
    } catch (e) {
      console.error(String(e));
      return NextResponse.json({ preferences: null }, { status: 200 });
    }
  }

  if (!process.env.SUPERMEMORY_API_KEY?.trim()) {
    return NextResponse.json({ past_trips: [] }, { status: 200 });
  }

  try {
    const client = createSupermemoryClient();
    const content = await retrieveMemory(client, userId, type);
    return NextResponse.json(content ?? { past_trips: [] });
  } catch (e) {
    console.error(String(e));
    return NextResponse.json({ past_trips: [] }, { status: 200 });
  }
}
