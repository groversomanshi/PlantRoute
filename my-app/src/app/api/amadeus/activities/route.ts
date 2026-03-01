import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { ActivitiesQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchPlacesByCity } from "@/lib/google-maps";

/**
 * GET /api/amadeus/activities?city=&limit=
 * Returns Google Places attractions only (normalized). No Amadeus, no mock.
 * Limit caps the number of attractions returned.
 * If no results: { activities: [], message: "No real places found" }.
 * Also returns "attractions" key for consistency with travel planner.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(ActivitiesQuerySchema, query);
  if (validated.error) return validated.error;

  const { city, limit } = validated.data;

  const { attractions } = await fetchPlacesByCity(city);
  const capped = attractions.slice(0, limit);

  if (capped.length === 0) {
    return NextResponse.json({
      activities: [],
      attractions: [],
      message: "No real places found",
    });
  }

  return NextResponse.json({
    activities: capped,
    attractions: capped,
    source: "google_places",
  });
}
