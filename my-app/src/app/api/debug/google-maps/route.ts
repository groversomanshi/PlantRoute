import { NextRequest, NextResponse } from "next/server";
import { geocodeWithGoogle, fetchNearbyPlaces } from "@/lib/google-maps";

/**
 * GET /api/debug/google-maps?city=STRING
 * Temporary debug endpoint to verify Google Maps API integration.
 * Returns raw diagnostic JSON. No mock data; errors pushed into errors[].
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const errors: string[] = [];

  const city =
    req.nextUrl.searchParams.get("city")?.trim() || "Dublin";

  const apiKeyPresent = !!(
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_KEY?.trim()
  );

  if (!apiKeyPresent) {
    errors.push("GOOGLE_MAPS_API_KEY / GOOGLE_MAPS_KEY not set");
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let geocodeSuccess = false;

  let geocodeResult: Awaited<ReturnType<typeof geocodeWithGoogle>> = null;
  try {
    geocodeResult = await geocodeWithGoogle(city);
    if (geocodeResult) {
      lat = geocodeResult.lat;
      lng = geocodeResult.lng;
      geocodeSuccess = true;
    } else if (apiKeyPresent) {
      errors.push("Geocoding returned null (check city or API status)");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Geocoding error: ${msg}`);
  }

  let hotels: Awaited<ReturnType<typeof fetchNearbyPlaces>> = [];
  let attractions: Awaited<ReturnType<typeof fetchNearbyPlaces>> = [];

  if (lat != null && lng != null) {
    try {
      hotels = await fetchNearbyPlaces(lat, lng, "lodging");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Hotels (lodging) error: ${msg}`);
    }
    try {
      attractions = await fetchNearbyPlaces(lat, lng, "tourist_attraction");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Attractions (tourist_attraction) error: ${msg}`);
    }
  }

  const totalMs = Date.now() - start;

  const body = {
    apiKeyPresent,
    city,
    geocode: {
      success: geocodeSuccess,
      lat,
      lng,
    },
    hotels: {
      count: hotels.length,
      sample: hotels.slice(0, 3),
    },
    attractions: {
      count: attractions.length,
      sample: attractions.slice(0, 3),
    },
    timing: {
      totalMs,
    },
    errors,
  };

  return NextResponse.json(body);
}
