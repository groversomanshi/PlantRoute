export type TransportMode =
  | "flight_short"
  | "flight_long"
  | "train"
  | "bus"
  | "car"
  | "ferry";

export interface GeoPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface TransportSegment {
  id: string;
  mode: TransportMode;
  origin: GeoPoint;
  destination: GeoPoint;
  distance_km?: number;
  emission_kg?: number;
  price_usd: number;
  duration_minutes: number;
  provider?: string;
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  location: GeoPoint;
  price_usd: number;
  duration_hours: number;
  emission_kg?: number;
  interest_score?: number;
  amadeus_id?: string;
  image_url?: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: GeoPoint;
  price_per_night_usd: number;
  stars: number;
  emission_kg_per_night?: number;
  amadeus_id?: string;
}

export interface ItineraryDay {
  date: string;
  activities: Activity[];
  transport: TransportSegment[];
  hotel: Hotel;
}

export interface Itinerary {
  id: string;
  city: string;
  start_date: string;
  end_date: string;
  days: ItineraryDay[];
  total_price_usd: number;
  total_emission_kg: number;
  interest_match_score: number;
  regret_score: number;
}

export interface CarbonItem {
  id: string;
  type: "transport" | "activity" | "hotel";
  description: string;
  distance_km: number | null;
  emission_kg: number;
}

export interface CarbonResult {
  items: CarbonItem[];
  total_kg: number;
}

export interface UserPreferences {
  interests: string[];
  budget_level: "budget" | "mid" | "luxury";
  carbon_sensitivity: "low" | "medium" | "high";
  avoid_flying: boolean;
  party_size: number;
  raw_text?: string;
}

export interface UserProfile {
  id: string;
  preferences: UserPreferences;
  trip_count: number;
  past_trips: string[];
}
