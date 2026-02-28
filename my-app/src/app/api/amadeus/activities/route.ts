import { NextRequest, NextResponse } from "next/server";
import { validateQuery } from "@/lib/validate";
import { ActivitiesQuerySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { geocodeCity } from "@/lib/cities";
import { createAmadeusClient } from "@/lib/amadeus";
import { MOCK_ACTIVITIES } from "@/lib/mocks";
import type { Activity } from "@/types";

export async function GET(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams);
  const validated = validateQuery(ActivitiesQuerySchema, query);
  if (validated.error) return validated.error;

  const { city, limit } = validated.data;
  const point = await geocodeCity(city);
  if (!point) {
    return NextResponse.json({ activities: [] });
  }

  const hasAmadeus =
    process.env.AMADEUS_API_KEY?.trim() && process.env.AMADEUS_API_SECRET?.trim();
  if (!hasAmadeus) {
    const activities: Activity[] = MOCK_ACTIVITIES.slice(0, limit).map((a, i) => ({
      ...a,
      id: `mock-${city}-${i}`,
      location: { ...point, name: city },
    }));
    return NextResponse.json({ activities });
  }

  try {
    const amadeus = createAmadeusClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await amadeus.shopping.activities.get({
      latitude: point.lat,
      longitude: point.lng,
      radius: 20,
    });
    clearTimeout(timeout);

    const data = response.data as Array<{
      id?: string;
      name?: string;
      type?: string;
      subType?: string;
      geoCode?: { latitude?: number; longitude?: number };
      price?: { amount?: string };
      duration?: string;
    }>;
    const activities: Activity[] = (Array.isArray(data) ? data : [])
      .slice(0, limit)
      .map((item, i) => ({
        id: item.id ?? `amadeus-${i}`,
        name: item.name ?? "Activity",
        category: (item.subType ?? item.type ?? "outdoor").toLowerCase(),
        location: {
          lat: item.geoCode?.latitude ?? point.lat,
          lng: item.geoCode?.longitude ?? point.lng,
          name: city,
        },
        price_usd: parseFloat(item.price?.amount ?? "0") || 0,
        duration_hours: parseFloat(item.duration ?? "1") || 1,
      }));
    return NextResponse.json({ activities });
  } catch (e) {
    console.error(String(e));
    const activities: Activity[] = MOCK_ACTIVITIES.slice(0, limit).map((a, i) => ({
      ...a,
      id: `fallback-${city}-${i}`,
      location: { ...point, name: city },
    }));
    return NextResponse.json({ activities });
  }
}
