import type { GeoPoint } from "@/types";

/**
 * Hardcoded lookup for ~50 major cities. Used when Amadeus/geocoding needs lat/lng.
 * Nominatim fallback for cities not in this list.
 */
export const CITIES: Record<string, GeoPoint> = {
  "New York": { lat: 40.7128, lng: -74.006, name: "New York" },
  "London": { lat: 51.5074, lng: -0.1278, name: "London" },
  "Paris": { lat: 48.8566, lng: 2.3522, name: "Paris" },
  "Tokyo": { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
  "Sydney": { lat: -33.8688, lng: 151.2093, name: "Sydney" },
  "Berlin": { lat: 52.52, lng: 13.405, name: "Berlin" },
  "Rome": { lat: 41.9028, lng: 12.4964, name: "Rome" },
  "Madrid": { lat: 40.4168, lng: -3.7038, name: "Madrid" },
  "Barcelona": { lat: 41.3851, lng: 2.1734, name: "Barcelona" },
  "Amsterdam": { lat: 52.3676, lng: 4.9041, name: "Amsterdam" },
  "Lisbon": { lat: 38.7223, lng: -9.1393, name: "Lisbon" },
  "Vienna": { lat: 48.2082, lng: 16.3738, name: "Vienna" },
  "Prague": { lat: 50.0755, lng: 14.4378, name: "Prague" },
  "Budapest": { lat: 47.4979, lng: 19.0402, name: "Budapest" },
  "Dublin": { lat: 53.3498, lng: -6.2603, name: "Dublin" },
  "Los Angeles": { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
  "Chicago": { lat: 41.8781, lng: -87.6298, name: "Chicago" },
  "San Francisco": { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
  "Miami": { lat: 25.7617, lng: -80.1918, name: "Miami" },
  "Toronto": { lat: 43.6532, lng: -79.3832, name: "Toronto" },
  "Vancouver": { lat: 49.2827, lng: -123.1207, name: "Vancouver" },
  "Mexico City": { lat: 19.4326, lng: -99.1332, name: "Mexico City" },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816, name: "Buenos Aires" },
  "São Paulo": { lat: -23.5505, lng: -46.6333, name: "São Paulo" },
  "Rio de Janeiro": { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro" },
  "Singapore": { lat: 1.3521, lng: 103.8198, name: "Singapore" },
  "Hong Kong": { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
  "Seoul": { lat: 37.5665, lng: 126.978, name: "Seoul" },
  "Bangkok": { lat: 13.7563, lng: 100.5018, name: "Bangkok" },
  "Dubai": { lat: 25.2048, lng: 55.2708, name: "Dubai" },
  "Istanbul": { lat: 41.0082, lng: 28.9784, name: "Istanbul" },
  "Cairo": { lat: 30.0444, lng: 31.2357, name: "Cairo" },
  "Cape Town": { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
  "Mumbai": { lat: 19.076, lng: 72.8777, name: "Mumbai" },
  "Delhi": { lat: 28.7041, lng: 77.1025, name: "Delhi" },
  "Shanghai": { lat: 31.2304, lng: 121.4737, name: "Shanghai" },
  "Beijing": { lat: 39.9042, lng: 116.4074, name: "Beijing" },
  "Osaka": { lat: 34.6937, lng: 135.5023, name: "Osaka" },
  "Kyoto": { lat: 35.0116, lng: 135.7681, name: "Kyoto" },
  "Munich": { lat: 48.1351, lng: 11.582, name: "Munich" },
  "Brussels": { lat: 50.8503, lng: 4.3517, name: "Brussels" },
  "Copenhagen": { lat: 55.6761, lng: 12.5683, name: "Copenhagen" },
  "Stockholm": { lat: 59.3293, lng: 18.0686, name: "Stockholm" },
  "Helsinki": { lat: 60.1695, lng: 24.9354, name: "Helsinki" },
  "Athens": { lat: 37.9838, lng: 23.7275, name: "Athens" },
  "Zurich": { lat: 47.3769, lng: 8.5417, name: "Zurich" },
  "Geneva": { lat: 46.2044, lng: 6.1432, name: "Geneva" },
  "Warsaw": { lat: 52.2297, lng: 21.0122, name: "Warsaw" },
  "Krakow": { lat: 50.0647, lng: 19.945, name: "Krakow" },
  "Boston": { lat: 42.3601, lng: -71.0589, name: "Boston" },
  "Washington": { lat: 38.9072, lng: -77.0369, name: "Washington" },
  "Seattle": { lat: 47.6062, lng: -122.3321, name: "Seattle" },
  "Austin": { lat: 30.2672, lng: -97.7431, name: "Austin" },
  "Denver": { lat: 39.7392, lng: -104.9903, name: "Denver" },
  "Las Vegas": { lat: 36.1699, lng: -115.1398, name: "Las Vegas" },
  "San Diego": { lat: 32.7157, lng: -117.1611, name: "San Diego" },
  "Philadelphia": { lat: 39.9526, lng: -75.1652, name: "Philadelphia" },
};

export function getCityPoint(cityName: string): GeoPoint | null {
  const normalized = cityName.trim();
  for (const [name, point] of Object.entries(CITIES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) return point;
  }
  return null;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeCity(cityName: string): Promise<GeoPoint | null> {
  const cached = getCityPoint(cityName);
  if (cached) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    clearTimeout(timeout);
    if (!data?.[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: cityName.trim(),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
