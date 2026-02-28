import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { FlightsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAmadeusClient } from "@/lib/amadeus";
import type { TransportSegment } from "@/types";

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
    const segments: TransportSegment[] = [
      {
        id: `mock-flight-${origin}-${destination}`,
        mode: "flight_short",
        origin: { lat: 0, lng: 0, name: origin },
        destination: { lat: 0, lng: 0, name: destination },
        price_usd: 150,
        duration_minutes: 120,
      },
    ];
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
    const segments: TransportSegment[] = offers.slice(0, 5).map((offer, i) => {
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
    return NextResponse.json({ flights: segments });
  } catch {
    const segments: TransportSegment[] = [
      {
        id: `fallback-flight-${origin}-${destination}`,
        mode: "flight_short",
        origin: { lat: 0, lng: 0, name: origin },
        destination: { lat: 0, lng: 0, name: destination },
        price_usd: 150,
        duration_minutes: 120,
      },
    ];
    return NextResponse.json({ flights: segments });
  }
}
