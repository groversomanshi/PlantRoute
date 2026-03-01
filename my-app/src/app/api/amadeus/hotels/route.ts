import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { HotelsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchPlacesByCity } from "@/lib/google-maps";

/**
 * GET /api/amadeus/hotels?city=&checkIn=&checkOut=
 * Returns Google Places lodging only (normalized). No Amadeus, no mock.
 * If no results: { hotels: [], message: "No real places found" }.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(HotelsQuerySchema, query);
  if (validated.error) return validated.error;

  const { city } = validated.data;

  const { hotels } = await fetchPlacesByCity(city);

  if (hotels.length === 0) {
    return NextResponse.json({
      hotels: [],
      message: "No real places found",
    });
  }

  return NextResponse.json({ hotels, source: "google_places" });
}
