import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { TravelSearchSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { geocodeWithGoogle } from "@/lib/google-maps";
import { fetchPlacesByCity } from "@/lib/google-maps";
import {
  fetchFlightData,
  scoreRecommendedItinerary,
} from "@/lib/travel-planner";

/**
 * POST /api/travel/search
 * Body: { city, startDate, endDate, interests?, budgetLevel?, originIata, destinationIata }
 * Uses Google Places as primary for hotels + attractions; fetches flight data; scores itinerary.
 * Returns: { flights, hotels, attractions, recommendedItinerary }.
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

  const { city, startDate, endDate, originIata, destinationIata } = validated.data;

  const point = await geocodeWithGoogle(city);
  if (!point) {
    return NextResponse.json(
      {
        flights: { arrivalFlights: [], departureFlights: [] },
        hotels: [],
        attractions: [],
        recommendedItinerary: null,
        message: "Could not geocode city",
      },
      { status: 200 }
    );
  }

  const [places, flightData] = await Promise.all([
    fetchPlacesByCity(city),
    fetchFlightData(originIata, destinationIata, startDate, endDate),
  ]);

  const recommendedItinerary = scoreRecommendedItinerary(
    places.hotels,
    places.attractions,
    flightData.arrivalFlights,
    flightData.departureFlights
  );

  return NextResponse.json({
    flights: {
      arrivalFlights: flightData.arrivalFlights.map((f) => f.segment),
      departureFlights: flightData.departureFlights.map((f) => f.segment),
    },
    hotels: places.hotels,
    attractions: places.attractions,
    recommendedItinerary: recommendedItinerary
      ? {
          hotel: recommendedItinerary.hotel,
          attractionIds: recommendedItinerary.attractionIds,
          reason: recommendedItinerary.reason,
        }
      : null,
    source: "google_places",
  });
}
