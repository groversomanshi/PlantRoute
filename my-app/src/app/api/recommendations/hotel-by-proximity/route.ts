import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { HotelByProximitySchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { suggestHotelByProximity } from "@/lib/gemini";
import { normalizedPlaceToHotel } from "@/lib/places-utils";
import type { Hotel } from "@/types";
import type { NormalizedPlace } from "@/types";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.amadeus, null);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(HotelByProximitySchema, body);
  if (validated.error) return validated.error;

  const { city, checkIn, checkOut, selectedAttractions } = validated.data;

  const baseUrl = req.nextUrl.origin;
  let hotels: Hotel[];
  try {
    const res = await fetch(
      `${baseUrl}/api/amadeus/hotels?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch hotels", suggestedHotel: null, hotels: [] },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { hotels?: NormalizedPlace[] | Hotel[] };
    const raw = Array.isArray(data.hotels) ? data.hotels : [];
    hotels = raw.map((h) =>
      "type" in h && h.type === "hotel"
        ? normalizedPlaceToHotel(h as NormalizedPlace, city)
        : (h as Hotel)
    );
  } catch (e) {
    console.error(String(e));
    return NextResponse.json(
      { error: "Failed to fetch hotels", suggestedHotel: null, hotels: [] },
      { status: 502 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const first = hotels[0] ?? null;
    return NextResponse.json({
      suggestedHotel: first,
      reason: "Hotel suggestion by proximity requires GEMINI_API_KEY. Showing first available.",
      hotels,
    });
  }

  try {
    const { hotelId, reason } = await suggestHotelByProximity(
      apiKey,
      city,
      selectedAttractions.map((a) => ({
        id: a.id,
        name: a.name,
        location: a.location,
      })),
      hotels.map((h) => ({ id: h.id, name: h.name }))
    );
    const suggestedHotel = hotels.find((h) => h.id === hotelId) ?? hotels[0] ?? null;
    return NextResponse.json({
      suggestedHotel,
      reason,
      hotels,
    });
  } catch (e) {
    console.error(String(e));
    const first = hotels[0] ?? null;
    return NextResponse.json({
      suggestedHotel: first,
      reason: "Could not compute proximity suggestion; showing first option.",
      hotels,
    });
  }
}
