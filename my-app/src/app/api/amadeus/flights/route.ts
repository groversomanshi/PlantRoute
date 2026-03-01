import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { FlightsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findRealFlights } from "@/lib/gemini";
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
  const mode = distance_km >= 1500 ? "flight_long" : "flight_short";
  const factor = mode === "flight_long" ? EMISSION_FACTORS.flight_long : EMISSION_FACTORS.flight_short;
  const emission_kg = Math.round(
    distance_km * factor * RADIATIVE_FORCING_MULTIPLIER * 1000
  ) / 1000;
  const origin = origCoords
    ? { ...seg.origin, lat: origCoords[0], lng: origCoords[1] }
    : seg.origin;
  const destination = destCoords
    ? { ...seg.destination, lat: destCoords[0], lng: destCoords[1] }
    : seg.destination;
  return { ...seg, mode, origin, destination, distance_km, emission_kg };
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(FlightsQuerySchema, query);
  if (validated.error) return validated.error;

  const { origin, destination, date, adults } = validated.data;

  /** One-way Expedia flight search URL for this route (actual distances/prices). */
  const expediaSearchUrl = `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${encodeURIComponent(origin)},to:${encodeURIComponent(destination)},departure:${date}TANYT&passengers=adults:${adults ?? 1},children:0,seniors:0,infantinlap:Y&options=cabinclass%3Aeconomy&mode=search`;

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
      search_url: expediaSearchUrl,
    };
    const segments = [addDistanceAndEmission(raw)];
    return NextResponse.json({ flights: segments, source: "fallback_mock" });
  }

  try {
    const flights = await findRealFlights(
      process.env.GEMINI_API_KEY?.trim() ?? "",
      origin,
      destination,
      date,
      adults
    );
    if (flights.length > 0) {
      const rawSegments: TransportSegment[] = flights.slice(0, 5).map((flight, i) => {
        const segmentId = [flight.airline, flight.flight_number, flight.id]
          .filter(Boolean)
          .join("-")
          .replace(/\s+/g, "");
        return {
          id: segmentId || `flight-${i}`,
          mode: "flight_short",
          origin: { lat: 0, lng: 0, name: flight.origin_iata || origin },
          destination: { lat: 0, lng: 0, name: flight.destination_iata || destination },
          price_usd: flight.price_usd > 0 ? flight.price_usd : 150,
          duration_minutes: flight.duration_minutes > 0 ? flight.duration_minutes : 120,
          provider: flight.airline,
          search_url: expediaSearchUrl,
        };
      });
      const segments = rawSegments.map(addDistanceAndEmission);
      return NextResponse.json({ flights: segments, source: "real_amadeus" });
    }

    const raw: TransportSegment = {
      id: `fallback-flight-${origin}-${destination}`,
      mode: "flight_short",
      origin: { lat: 0, lng: 0, name: origin },
      destination: { lat: 0, lng: 0, name: destination },
      price_usd: 150,
      duration_minutes: 120,
      search_url: expediaSearchUrl,
    };
    const segments = [addDistanceAndEmission(raw)];
    return NextResponse.json({ flights: segments, source: "fallback_mock" });
  } catch {
    const raw: TransportSegment = {
      id: `fallback-flight-${origin}-${destination}`,
      mode: "flight_short",
      origin: { lat: 0, lng: 0, name: origin },
      destination: { lat: 0, lng: 0, name: destination },
      price_usd: 150,
      duration_minutes: 120,
      search_url: expediaSearchUrl,
    };
    const segments = [addDistanceAndEmission(raw)];
    return NextResponse.json({ flights: segments, source: "fallback_mock" });
  }
}

