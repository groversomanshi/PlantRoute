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

/** Slider values 0–1. Stored under Profile → Travel Preferences. */
export interface TravelPreferences {
  trip_pace: number; // 0 = very relaxed, 1 = very packed
  crowd_comfort: number; // 0 = hate crowds, 1 = don't mind
  morning_tolerance: number; // 0 = avoid early mornings, 1 = totally fine
  late_night_tolerance: number; // 0 = prefer early nights, 1 = love late nights
  walking_effort: number; // 0 = minimal walking, 1 = long walks/hikes fine
  budget_level: number; // 0 = budget, 1 = premium
  planning_vs_spontaneity: number; // 0 = mostly free time, 1 = mostly pre-planned
  noise_sensitivity: number; // 0 = very sensitive, 1 = don't mind noise
  dislike_heat: boolean;
  dislike_cold: boolean;
  dislike_rain: boolean;
  travel_vibe: "Chill" | "Adventure" | "Family" | "Romantic" | "Nightlife";
  additional_notes?: string;
  /** Set when user completes onboarding so we don't show the form again. */
  completed?: boolean;
}

export const TRAVEL_VIBES: TravelPreferences["travel_vibe"][] = [
  "Chill",
  "Adventure",
  "Family",
  "Romantic",
  "Nightlife",
];

export const DEFAULT_TRAVEL_PREFERENCES: TravelPreferences = {
  trip_pace: 0.5,
  crowd_comfort: 0.5,
  morning_tolerance: 0.5,
  late_night_tolerance: 0.5,
  walking_effort: 0.5,
  budget_level: 0.5,
  planning_vs_spontaneity: 0.5,
  noise_sensitivity: 0.5,
  dislike_heat: false,
  dislike_cold: false,
  dislike_rain: false,
  travel_vibe: "Chill",
  additional_notes: "",
};

export interface UserPreferences {
  interests: string[];
  budget_level: "budget" | "mid" | "luxury";
  carbon_sensitivity: "low" | "medium" | "high";
  avoid_flying: boolean;
  party_size: number;
  raw_text?: string;
  travel?: TravelPreferences;
}

export interface UserProfile {
  id: string;
  preferences: UserPreferences;
  trip_count: number;
  past_trips: string[];
}
