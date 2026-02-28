import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { FlightsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAmadeusClient } from "@/lib/amadeus";
import { getAirportCoords } from "@/lib/airport-coords";
import { haversine } from "@/lib/haversine";
import {
  EMISSION_FACTORS,
  RADIATIVE_FORCING_MULTIPLIER,
} from "@/lib/carbon";
import type { TransportSegment } from "@/types";

function addDistanceAndEmission(seg: TransportSegment): TransportSegment {
  const origCoords = getAirportCoords(seg.origin.name);
  const destCoords = getAirportCoords(seg.destination.name);
  let distance_km = seg.distance_km;
  if (distance_km == null && origCoords && destCoords) {
    distance_km = haversine(origCoords[0], origCoords[1], destCoords[0], destCoords[1]);
    distance_km = Math.round(distance_km * 100) / 100;
  }
  if (distance_km == null) distance_km = 0;
  const isLong = distance_km >= 1500;
  const factor = isLong ? EMISSION_FACTORS.flight_long : EMISSION_FACTORS.flight_short;
  const emission_kg = Math.round(
    distance_km * factor * RADIATIVE_FORCING_MULTIPLIER * 1000
  ) / 1000;
  const origin = origCoords
    ? { ...seg.origin, lat: origCoords[0], lng: origCoords[1] }
    : seg.origin;
  const destination = destCoords
    ? { ...seg.destination, lat: destCoords[0], lng: destCoords[1] }
    : seg.destination;
  return { ...seg, origin, destination, distance_km, emission_kg };
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(FlightsQuerySchema, query);
  if (validated.error) return validated.error;

  const { origin, destination, date, adults } = validated.data;
  const hasAmadeus =
    process.env.AMADEUS_API_KEY?.trim() && process.env.AMADEUS_API_SECRET?.trim();

  if (!hasAmadeus) {
    const raw: TransportSegment = {
      id: `mock-flight-${origin}-${destination}`,
      mode: "flight_short",
      origin: { lat: 0, lng: 0, name: origin },
      destination: { lat: 0, lng: 0, name: destination },
      price_usd: 150,
      duration_minutes: 120,
    };
    const segments = [addDistanceAndEmission(raw)];
    return NextResponse.json({ flights: segments });
  }

  try {
    const amadeus = createAmadeusClient();
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: String(adults),
    });
    const data = response.data as Array<{
      id?: string;
      price?: string;
      itineraries?: Array<{
        segments?: Array<{
          departure?: { iataCode?: string };
          arrival?: { iataCode?: string };
          duration?: string;
        }>;
      }>;
    }>;
    const offers = Array.isArray(data) ? data : [];
    const rawSegments: TransportSegment[] = offers.slice(0, 5).map((offer, i) => {
      const seg = offer.itineraries?.[0]?.segments?.[0];
      const durationMatch = seg?.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      const durationMinutes = durationMatch
        ? (parseInt(durationMatch[1] ?? "0", 10) * 60) + parseInt(durationMatch[2] ?? "0", 10)
        : 120;
      return {
        id: offer.id ?? `flight-${i}`,
        mode: "flight_short" as const,
        origin: { lat: 0, lng: 0, name: seg?.departure?.iataCode ?? origin },
        destination: { lat: 0, lng: 0, name: seg?.arrival?.iataCode ?? destination },
        price_usd: parseFloat(offer.price ?? "0") || 100,
        duration_minutes: durationMinutes,
      };
    });
    const segments = rawSegments.map(addDistanceAndEmission);
    return NextResponse.json({ flights: segments });
  } catch {
    const raw: TransportSegment = {
      id: `fallback-flight-${origin}-${destination}`,
      mode: "flight_short",
      origin: { lat: 0, lng: 0, name: origin },
      destination: { lat: 0, lng: 0, name: destination },
      price_usd: 150,
      duration_minutes: 120,
    };
    const segments = [addDistanceAndEmission(raw)];
    return NextResponse.json({ flights: segments });
  }
}
