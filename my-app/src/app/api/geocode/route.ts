import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/cities";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();
  if (!city) {
    return NextResponse.json(
      { error: "Missing city parameter" },
      { status: 400 }
    );
  }

  const point = await geocodeCity(city);
  if (!point) {
    return NextResponse.json(
      { error: "City not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(point);
}
