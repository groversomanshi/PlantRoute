import type { GeoPoint } from "@/types";
import { CITIES } from "@/lib/cities";
import { haversine } from "@/lib/haversine";

/** Reference point for distance calculation (Chicago) */
const REF_LAT = 41.8781;
const REF_LNG = -87.6298;

/** Deterministic hash for pseudo-random but stable values */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface DestinationData extends GeoPoint {
  image_url: string;
  distance_km: number;
  likes: number;
  rating: number;
}

export function getDestinationImage(cityName: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(cityName)}/400/300`;
}

export function enrichCity(point: GeoPoint): DestinationData {
  const dist = haversine(REF_LAT, REF_LNG, point.lat, point.lng);
  const h = hash(point.name);
  return {
    ...point,
    image_url: getDestinationImage(point.name),
    distance_km: Math.round(dist),
    likes: 100 + (h % 5000),
    rating: 4 + (h % 10) / 10,
  };
}

const DESTINATIONS_CACHE = new Map<string, DestinationData>();

export function getDestination(point: GeoPoint): DestinationData {
  const key = point.name;
  if (!DESTINATIONS_CACHE.has(key)) {
    DESTINATIONS_CACHE.set(key, enrichCity(point));
  }
  return DESTINATIONS_CACHE.get(key)!;
}

export const DESTINATIONS_LIST: DestinationData[] = Object.values(CITIES).map(
  enrichCity
);

/** Popular destinations for slideshow (subset with higher engagement) */
export const POPULAR_DESTINATIONS: DestinationData[] = DESTINATIONS_LIST
  .sort((a, b) => b.likes - a.likes)
  .slice(0, 12);
