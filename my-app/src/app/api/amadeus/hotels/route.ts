import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { HotelsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { geocodeCity } from "@/lib/cities";
import { findRealHotels } from "@/lib/gemini";
import { MOCK_HOTELS } from "@/lib/mocks";
import { HOTEL_FACTOR_PER_NIGHT } from "@/lib/carbon";
import type { Hotel } from "@/types";

/** Estimate emission: lower stars = simpler = lower carbon proxy. 15 kg base, -2 per star below 5. */
function estimateHotelEmission(stars: number): number {
  const base = HOTEL_FACTOR_PER_NIGHT;
  const reduction = Math.max(0, (5 - stars) * 2);
  return Math.max(8, base - reduction);
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(HotelsQuerySchema, query);
  if (validated.error) return validated.error;

  const { city, checkIn, checkOut } = validated.data;
  const point = await geocodeCity(city);
  if (!point) {
    return NextResponse.json({ hotels: [] });
  }

  const hasAmadeus =
    process.env.AMADEUS_API_KEY?.trim() && process.env.AMADEUS_API_SECRET?.trim();
  if (!hasAmadeus) {
    const hotels: Hotel[] = MOCK_HOTELS.map((h, i) => ({
      ...h,
      id: `mock-hotel-${city}-${i}`,
      location: { ...point, name: city },
      emission_kg_per_night: estimateHotelEmission(h.stars),
    }));
    const sorted = [...hotels].sort(
      (a, b) => (a.emission_kg_per_night ?? 15) - (b.emission_kg_per_night ?? 15)
    );
    return NextResponse.json({ hotels: sorted, source: "fallback_mock" });
  }

  try {
    const realHotels = await findRealHotels(
      process.env.GEMINI_API_KEY?.trim() ?? "",
      city,
      checkIn,
      checkOut,
      1
    );
    if (realHotels.length > 0) {
      const hotels: Hotel[] = realHotels.slice(0, 10).map((h, i) => {
        const stars = Math.max(1, Math.min(5, Number.isFinite(h.stars) ? Math.round(h.stars) : 4));
        const hasCoords = Number.isFinite(h.location.lat) && Number.isFinite(h.location.lng);
        const nightly = h.price_per_night_usd > 0 ? h.price_per_night_usd : 120;
        return {
          id: h.id || `real-hotel-${city}-${i}`,
          name: h.name || "Hotel",
          location: hasCoords ? h.location : { ...point, name: city },
          price_per_night_usd: nightly,
          stars,
          emission_kg_per_night: estimateHotelEmission(stars),
        };
      });
      const sorted = [...hotels].sort(
        (a, b) => (a.emission_kg_per_night ?? 15) - (b.emission_kg_per_night ?? 15)
      );
      return NextResponse.json({ hotels: sorted, source: "real_amadeus" });
    }

    const fallbackHotels: Hotel[] = MOCK_HOTELS.map((h, i) => ({
      ...h,
      id: `fallback-${city}-${i}`,
      location: { ...point, name: city },
      emission_kg_per_night: estimateHotelEmission(h.stars),
    }));
    const sorted = [...fallbackHotels].sort(
      (a, b) => (a.emission_kg_per_night ?? 15) - (b.emission_kg_per_night ?? 15)
    );
    return NextResponse.json({ hotels: sorted, source: "fallback_mock" });
  } catch {
    const hotels: Hotel[] = MOCK_HOTELS.map((h, i) => ({
      ...h,
      id: `fallback-${city}-${i}`,
      location: { ...point, name: city },
      emission_kg_per_night: estimateHotelEmission(h.stars),
    }));
    const sorted = [...hotels].sort(
      (a, b) => (a.emission_kg_per_night ?? 15) - (b.emission_kg_per_night ?? 15)
    );
    return NextResponse.json({ hotels: sorted, source: "fallback_mock" });
  }
}
