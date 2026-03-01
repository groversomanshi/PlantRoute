import { NextRequest, NextResponse } from "next/server";
import { searchTravelWithGemini } from "@/lib/gemini";
import { addDistanceAndEmission } from "@/lib/flight-utils";
import { validateBody } from "@/lib/validate";
import { TravelSearchSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { HOTEL_FACTOR_PER_NIGHT } from "@/lib/carbon";
import type { Hotel } from "@/types";

function estimateHotelEmission(stars: number): number {
  const base = HOTEL_FACTOR_PER_NIGHT;
  const reduction = Math.max(0, (5 - stars) * 2);
  return Math.max(8, base - reduction);
}

/**
 * POST /api/travel/search
 * Body: { city, startDate, endDate, interests?, budgetLevel?, originIata, destinationIata }
 * Returns real travel data from Gemini with Google Search grounding.
 * Use when GEMINI_API_KEY is set. On failure (503), client should fall back to Amadeus/mock.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.travelSearch, null);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateBody(TravelSearchSchema, body);
  if (validated.error) return validated.error;

  const { city, startDate, endDate, interests, budgetLevel, originIata, destinationIata } = validated.data;

  const result = await searchTravelWithGemini({
    city,
    startDate,
    endDate,
    interests,
    budgetLevel,
    originIata,
    destinationIata,
  });

  if (!result) {
    return NextResponse.json(
      { error: "Gemini travel search failed or returned invalid data. Use fallback." },
      { status: 503 }
    );
  }

  const hotelsWithEmission: Hotel[] = result.hotels
    .map((h) => ({
      ...h,
      emission_kg_per_night: estimateHotelEmission(h.stars),
    }))
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));

  const arrivalFlights = result.arrivalFlights.map(addDistanceAndEmission);
  const departureFlights = result.departureFlights.map(addDistanceAndEmission);

  return NextResponse.json({
    hotels: hotelsWithEmission,
    activities: result.activities,
    arrivalFlights,
    departureFlights,
    source: "gemini",
  });
}
