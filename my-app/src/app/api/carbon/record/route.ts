import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/carbon/record
 * Records a trip's carbon emissions for the current user (for leaderboard).
 * Body: { emissionKg: number, itineraryId?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { emissionKg?: number; itineraryId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const emissionKg = typeof body.emissionKg === "number" ? body.emissionKg : undefined;
  if (emissionKg == null || emissionKg < 0) {
    return NextResponse.json(
      { error: "emissionKg must be a non-negative number" },
      { status: 400 }
    );
  }

  const itineraryId =
    typeof body.itineraryId === "string" ? body.itineraryId : null;

  try {
    await prisma.tripCarbon.create({
      data: {
        userId,
        emissionKg,
        itineraryId: itineraryId ?? undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(String(e));
    return NextResponse.json(
      { error: "Failed to record carbon" },
      { status: 500 }
    );
  }
}
