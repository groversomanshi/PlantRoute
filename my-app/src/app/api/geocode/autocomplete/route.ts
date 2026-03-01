import { NextRequest, NextResponse } from "next/server";
import { autocompletePlaces } from "@/lib/cities";

const MAX_SUGGESTIONS = 5;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const suggestions = await autocompletePlaces(q, MAX_SUGGESTIONS);
  return NextResponse.json(suggestions);
}
