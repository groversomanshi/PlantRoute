/**
 * Google Maps API (Geocoding + Places) for server-side use.
 * Uses GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_KEY from env.
 * Geocode results are cached in memory; use coordinates for all Places searches.
 */

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const COORD_CACHE = new Map<string, { lat: number; lng: number }>();
const DEFAULT_RADIUS_M = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const PLACES_CACHE = new Map<string, { data: unknown[]; ts: number }>();
const PLACES_CACHE_TTL_MS = 60 * 1000;

function getApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.GOOGLE_MAPS_KEY?.trim();
  return key || null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Geocode a city name to lat/lng. Results are cached by normalized city name.
 */
export async function geocodeWithGoogle(city: string): Promise<GeocodeResult | null> {
  const key = city.trim().toLowerCase();
  const cached = COORD_CACHE.get(key);
  if (cached) return { ...cached, name: city.trim() };

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${GEOCODE_URL}?address=${encodeURIComponent(city.trim())}&key=${apiKey}`,
      { next: { revalidate: 0 } }
    );
    const data = (await res.json()) as {
      status: string;
      results?: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    COORD_CACHE.set(key, { lat, lng });
    return { lat, lng, name: city.trim() };
  } catch {
    return null;
  }
}

export interface PlaceResult {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  price_level?: number;
  types: string[];
  vicinity?: string;
}

function placesCacheKey(lat: number, lng: number, type: string): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${type}`;
}

/**
 * Fetch nearby places from Google Places API (Legacy Nearby Search).
 * Uses location + radius; one type per request. Results cached briefly.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  type: string,
  radiusMeters: number = DEFAULT_RADIUS_M
): Promise<PlaceResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const cacheKey = placesCacheKey(lat, lng, type);
  const cached = PLACES_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < PLACES_CACHE_TTL_MS) {
    return cached.data as PlaceResult[];
  }

  try {
    const url = `${PLACES_NEARBY_URL}?location=${lat},${lng}&radius=${radiusMeters}&type=${encodeURIComponent(type)}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as {
      status: string;
      results?: Array<{
        place_id?: string;
        name?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        rating?: number;
        price_level?: number;
        types?: string[];
        vicinity?: string;
      }>;
    };
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
    const results = (data.results ?? []).map((r) => ({
      place_id: r.place_id ?? "",
      name: r.name ?? "Place",
      lat: Number(r.geometry?.location?.lat) || lat,
      lng: Number(r.geometry?.location?.lng) || lng,
      rating: r.rating,
      price_level: r.price_level,
      types: r.types ?? [],
      vicinity: r.vicinity,
    }));
    PLACES_CACHE.set(cacheKey, { data: results, ts: Date.now() });
    return results;
  } catch {
    return [];
  }
}

/** Place types for hotels (lodging). */
export const PLACES_TYPE_LODGING = "lodging";

/** Place types for attractions: tourist_attraction, museum, restaurant, park. */
export const PLACES_TYPES_ATTRACTIONS = [
  "tourist_attraction",
  "museum",
  "restaurant",
  "park",
] as const;

export type NormalizedPlace = import("@/types").NormalizedPlace;

function toNormalizedPlace(p: PlaceResult, type: "hotel" | "attraction"): NormalizedPlace {
  return {
    id: p.place_id || `${p.name}-${p.lat}-${p.lng}`,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    price_level: p.price_level,
    vicinity: p.vicinity,
    type,
  };
}

/**
 * Geocode city once, fetch hotels (lodging) and attractions (all types) in parallel.
 * Uses existing cache; no duplicate geocode or repeated Places calls for same location.
 * Returns empty arrays if no API key or no results.
 */
export async function fetchPlacesByCity(city: string): Promise<{
  hotels: NormalizedPlace[];
  attractions: NormalizedPlace[];
}> {
  const point = await geocodeWithGoogle(city);
  if (!point) return { hotels: [], attractions: [] };

  const { lat, lng } = point;

  const [hotelResults, ...attractionResults] = await Promise.all([
    fetchNearbyPlaces(lat, lng, PLACES_TYPE_LODGING),
    ...PLACES_TYPES_ATTRACTIONS.map((type) => fetchNearbyPlaces(lat, lng, type)),
  ]);

  const hotels: NormalizedPlace[] = hotelResults.slice(0, 20).map((p) => toNormalizedPlace(p, "hotel"));

  const seen = new Set<string>();
  const attractions: NormalizedPlace[] = [];
  for (const list of attractionResults) {
    for (const p of list) {
      const id = p.place_id || `${p.name}-${p.lat}-${p.lng}`;
      if (seen.has(id)) continue;
      seen.add(id);
      attractions.push(toNormalizedPlace(p, "attraction"));
    }
  }

  return { hotels, attractions: attractions.slice(0, 30) };
}
