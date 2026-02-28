import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { HotelsQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { geocodeCity } from "@/lib/cities";
import { createAmadeusClient } from "@/lib/amadeus";
import { MOCK_HOTELS } from "@/lib/mocks";
import type { Hotel } from "@/types";

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
    }));
    return NextResponse.json({ hotels });
  }

  try {
    const amadeus = createAmadeusClient();
    const hotelList = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: point.lat,
      longitude: point.lng,
    });
    const listData = hotelList.data as Array<{ id?: string; name?: string }>;
    const hotelIds = (Array.isArray(listData) ? listData : []).slice(0, 5).map((h) => h.id).filter(Boolean).join(",");
    if (!hotelIds) {
      const hotels: Hotel[] = MOCK_HOTELS.map((h, i) => ({
        ...h,
        id: `fallback-${city}-${i}`,
        location: { ...point, name: city },
      }));
      return NextResponse.json({ hotels });
    }
    const offers = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds,
      adults: "1",
    });
    const offersData = (offers.data as Array<{
      hotel?: { id?: string; name?: string };
      offers?: Array<{ price?: { total?: string }; room?: { type?: string } }>;
    }>) ?? [];
    const nights = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000)));
    const hotels: Hotel[] = offersData.slice(0, 10).map((o, i) => {
      const total = parseFloat(o.offers?.[0]?.price?.total ?? "0") || 100 * nights;
      return {
        id: o.hotel?.id ?? `amadeus-hotel-${i}`,
        name: o.hotel?.name ?? "Hotel",
        location: { ...point, name: city },
        price_per_night_usd: total / nights,
        stars: 4,
      };
    });
    return NextResponse.json({ hotels });
  } catch {
    const hotels: Hotel[] = MOCK_HOTELS.map((h, i) => ({
      ...h,
      id: `fallback-${city}-${i}`,
      location: { ...point, name: city },
    }));
    return NextResponse.json({ hotels });
  }
}
