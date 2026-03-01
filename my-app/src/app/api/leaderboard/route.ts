import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/leaderboard
 * Returns users ranked by average CO2 per trip (kg), ascending.
 * Lower average = higher rank (better).
 */
export async function GET() {
  try {
    const rows = await prisma.tripCarbon.groupBy({
      by: ["userId"],
      _avg: { emissionKg: true },
      _count: { id: true },
    });

    if (rows.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    const userIds = rows.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const ranked = rows
      .map((r) => {
        const avg = r._avg.emissionKg ?? 0;
        const count = r._count.id;
        const user = userMap.get(r.userId);
        return {
          userId: r.userId,
          name: user?.name ?? "Anonymous",
          image: user?.image ?? null,
          avgEmissionKg: Math.round(avg * 10) / 10,
          tripCount: count,
        };
      })
      .sort((a, b) => a.avgEmissionKg - b.avgEmissionKg)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return NextResponse.json({ leaderboard: ranked });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[leaderboard]", msg, e);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", detail: process.env.NODE_ENV === "development" ? msg : undefined },
      { status: 500 }
    );
  }
}
