import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EXPORT_API_KEY = process.env.PREFERENCES_EXPORT_API_KEY?.trim();

/**
 * GET /api/preferences/export
 * Returns all preference rows for LLM training. Protected by PREFERENCES_EXPORT_API_KEY.
 * Send: Authorization: Bearer <key> or x-api-key: <key>
 */
export async function GET(req: NextRequest) {
  if (!EXPORT_API_KEY) {
    return NextResponse.json(
      { error: "Export not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  const token = apiKey ?? authHeader?.replace(/^Bearer\s+/i, "");

  if (token !== EXPORT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.preference.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        tripPace: true,
        crowdComfort: true,
        morningTolerance: true,
        lateNightTolerance: true,
        walkingEffort: true,
        budgetLevel: true,
        planningVsSpontaneity: true,
        noiseSensitivity: true,
        dislikeHeat: true,
        dislikeCold: true,
        dislikeRain: true,
        travelVibe: true,
        additionalNotes: true,
        completed: true,
        preferencesSnapshot: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      count: rows.length,
      exportedAt: new Date().toISOString(),
      preferences: rows,
    });
  } catch (e) {
    console.error(String(e));
    return NextResponse.json(
      { error: "Failed to export preferences" },
      { status: 500 }
    );
  }
}
