import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchPlacesByCity } from "@/lib/google-maps";

/**
 * GET /api/places?city=
 * Returns Google Places hotels + attractions (normalized) for map + list UI.
 * Single geocode, then parallel fetch; uses cache.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim();
  if (!city) {
    return NextResponse.json(
      { hotels: [], attractions: [], error: "Missing city parameter" },
      { status: 400 }
    );
  }

  const { hotels, attractions } = await fetchPlacesByCity(city);

  if (hotels.length === 0 && attractions.length === 0) {
    return NextResponse.json({
      hotels: [],
      attractions: [],
      message: "No real places found",
    });
  }

  return NextResponse.json({ hotels, attractions, source: "google_places" });
}
