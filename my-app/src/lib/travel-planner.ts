import { findRealFlights } from "@/lib/gemini";
import { addDistanceAndEmission } from "@/lib/flight-utils";
import { haversine } from "@/lib/haversine";
import type { NormalizedPlace } from "@/types";
import type { TransportSegment } from "@/types";

export interface FlightOption {
  id: string;
  duration_minutes: number;
  arrival_time: string;
  price_usd: number;
  origin_iata: string;
  destination_iata: string;
  segment: TransportSegment;
}

/**
 * Fetch flight options for arrival and departure dates.
 * Uses Amadeus when available; otherwise returns mock options.
 */
export async function fetchFlightData(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string,
  adults = 1
): Promise<{ arrivalFlights: FlightOption[]; departureFlights: FlightOption[] }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

  const [arrivalRaw, departureRaw] = await Promise.all([
    findRealFlights(apiKey, origin, destination, startDate, adults),
    findRealFlights(apiKey, destination, origin, endDate, adults),
  ]);

  const toOption = (
    f: {
      id: string;
      airline: string;
      departure_time: string;
      arrival_time: string;
      origin_iata: string;
      destination_iata: string;
      price_usd: number;
      duration_minutes: number;
    },
    date: string
  ): FlightOption => {
    const segment: TransportSegment = {
      id: f.id,
      mode: "flight_short",
      origin: { lat: 0, lng: 0, name: f.origin_iata },
      destination: { lat: 0, lng: 0, name: f.destination_iata },
      price_usd: f.price_usd,
      duration_minutes: f.duration_minutes,
      provider: f.airline,
    };
    const withEmission = addDistanceAndEmission(segment);
    return {
      id: f.id,
      duration_minutes: f.duration_minutes,
      arrival_time: f.arrival_time,
      price_usd: f.price_usd,
      origin_iata: f.origin_iata,
      destination_iata: f.destination_iata,
      segment: withEmission,
    };
  };

  const arrivalFlights: FlightOption[] =
    arrivalRaw.length > 0
      ? arrivalRaw.slice(0, 5).map((f) => toOption(f, startDate))
      : [
          {
            id: `mock-arr-${origin}-${destination}`,
            duration_minutes: 120,
            arrival_time: `${startDate}T18:00:00`,
            price_usd: 150,
            origin_iata: origin,
            destination_iata: destination,
            segment: addDistanceAndEmission({
              id: `mock-arr-${origin}-${destination}`,
              mode: "flight_short",
              origin: { lat: 0, lng: 0, name: origin },
              destination: { lat: 0, lng: 0, name: destination },
              price_usd: 150,
              duration_minutes: 120,
            }),
          },
        ];

  const departureFlights: FlightOption[] =
    departureRaw.length > 0
      ? departureRaw.slice(0, 5).map((f) => toOption(f, endDate))
      : [
          {
            id: `mock-dep-${destination}-${origin}`,
            duration_minutes: 120,
            arrival_time: `${endDate}T12:00:00`,
            price_usd: 150,
            origin_iata: destination,
            destination_iata: origin,
            segment: addDistanceAndEmission({
              id: `mock-dep-${destination}-${origin}`,
              mode: "flight_short",
              origin: { lat: 0, lng: 0, name: destination },
              destination: { lat: 0, lng: 0, name: origin },
              price_usd: 150,
              duration_minutes: 120,
            }),
          },
        ];

  return { arrivalFlights, departureFlights };
}

/** Score a hotel by average distance to attractions (closer = better). */
function scoreHotelProximity(
  hotel: NormalizedPlace,
  attractions: NormalizedPlace[]
): number {
  if (attractions.length === 0) return 0;
  const totalKm = attractions.reduce(
    (sum, a) => sum + haversine(hotel.lat, hotel.lng, a.lat, a.lng),
    0
  );
  const avgKm = totalKm / attractions.length;
  return Math.max(0, 100 - avgKm * 2);
}

/** Parse ISO time to hours (e.g. "18:30" -> 18.5). Late = after 21. */
function arrivalHour(iso: string): number {
  const match = iso?.match(/T(\d{2}):(\d{2})/);
  if (!match) return 12;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

/**
 * Score itinerary: prefer hotels closer to attractions, penalize long
 * airport→hotel after late arrival, prefer shorter total travel time.
 */
export function scoreRecommendedItinerary(
  hotels: NormalizedPlace[],
  attractions: NormalizedPlace[],
  arrivalFlights: FlightOption[],
  departureFlights: FlightOption[]
): {
  hotel: NormalizedPlace;
  attractionIds: string[];
  score: number;
  reason: string;
} | null {
  if (hotels.length === 0) return null;

  const bestArrival = arrivalFlights[0];
  const lateArrival = bestArrival ? arrivalHour(bestArrival.arrival_time) >= 21 : false;
  const totalTravelMinutes =
    (bestArrival?.duration_minutes ?? 0) + (departureFlights[0]?.duration_minutes ?? 0);

  let best: {
    hotel: NormalizedPlace;
    score: number;
    reason: string;
  } | null = null;

  for (const hotel of hotels) {
    const proximityScore = scoreHotelProximity(hotel, attractions);
    let penalty = 0;
    if (lateArrival) penalty += 15;
    const travelPenalty = Math.min(30, totalTravelMinutes / 10);
    const score = proximityScore - penalty - travelPenalty;

    if (best == null || score > best.score) {
      best = {
        hotel,
        score,
        reason:
          proximityScore > 0
            ? "Close to attractions"
            : lateArrival
              ? "Late arrival; consider early check-in"
              : "Best available",
      };
    }
  }

  if (!best) return null;

  const topAttractions = [...attractions]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)
    .map((a) => a.id);

  return {
    hotel: best.hotel,
    attractionIds: topAttractions,
    score: best.score,
    reason: best.reason,
  };
}
