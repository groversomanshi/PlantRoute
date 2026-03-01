/**
 * Build request for XGBoost preference engine and/or rank activities by fit + low CO2e.
 * When PREFERENCE_ENGINE_XGBOOST_URL is set, the API route calls the engine; otherwise fallback ranking.
 */

import type { Activity } from "@/types";
import type { TravelPreferences, UserPreferences } from "@/types";

export interface TravelInput {
  trip_pace: number;
  crowd_comfort: number;
  morning_tolerance: number;
  late_night_tolerance: number;
  walking_effort: number;
  budget_level: number;
  planning_vs_spontaneity: number;
  noise_sensitivity: number;
  eco_preference: number;
}

export interface ActivityInput {
  id?: string;
  name?: string;
  category: string;
  duration_hours: number;
  emission_kg: number;
  price_usd: number;
  activity_density?: number;
  typical_start_hour?: number;
  typical_crowd_level?: number;
}

export interface BatchScoreRequest {
  travel: TravelInput;
  interests: string[];
  activities: ActivityInput[];
}

export interface ScoreResponseItem {
  fit_score: number;
  regret_probability: number;
  explanation?: string[] | null;
}

export interface BatchScoreResponse {
  scores: ScoreResponseItem[];
}

export interface RankedActivity extends Activity {
  fit_score: number;
  regret_probability?: number;
  explanation?: string[] | null;
}

/** Map app TravelPreferences to engine TravelInput (0–1 sliders). */
export function travelToEngineInput(travel: TravelPreferences | undefined): TravelInput {
  const t: Partial<TravelPreferences> = travel ?? {};
  return {
    trip_pace: typeof t.trip_pace === "number" ? t.trip_pace : 0.5,
    crowd_comfort: typeof t.crowd_comfort === "number" ? t.crowd_comfort : 0.5,
    morning_tolerance: typeof t.morning_tolerance === "number" ? t.morning_tolerance : 0.5,
    late_night_tolerance: typeof t.late_night_tolerance === "number" ? t.late_night_tolerance : 0.5,
    walking_effort: typeof t.walking_effort === "number" ? t.walking_effort : 0.5,
    budget_level: typeof t.budget_level === "number" ? t.budget_level : 0.5,
    planning_vs_spontaneity:
      typeof t.planning_vs_spontaneity === "number" ? t.planning_vs_spontaneity : 0.5,
    noise_sensitivity: typeof t.noise_sensitivity === "number" ? t.noise_sensitivity : 0.5,
    eco_preference: typeof t.eco_preference === "number" ? t.eco_preference : 0.5,
  };
}

/** Map Activity to engine ActivityInput. Use same category normalization as fallback so engine sees interest types (e.g. sightseeing→culture). */
export function activityToEngineInput(a: Activity): ActivityInput {
  const rawCategory = (a.category ?? "outdoor").toLowerCase();
  const category = normalizeCategoryForMatch(rawCategory);
  return {
    id: a.id,
    name: a.name,
    category,
    duration_hours: a.duration_hours ?? 1,
    emission_kg: a.emission_kg ?? 0,
    price_usd: a.price_usd ?? 0,
    typical_start_hour: 12,
    typical_crowd_level: 0.5,
  };
}

/** Build BatchScoreRequest from UserPreferences and activities. */
export function buildBatchScoreRequest(
  preferences: UserPreferences | null | undefined,
  activities: Activity[]
): BatchScoreRequest {
  const travel = travelToEngineInput(preferences?.travel);
  const interests = Array.isArray(preferences?.interests) ? preferences.interests : [];
  return {
    travel,
    interests,
    activities: activities.map(activityToEngineInput),
  };
}

/** Map API/Amadeus category strings to our interest types for matching. */
const CATEGORY_TO_INTEREST: Record<string, string> = {
  sightseeing: "culture",
  sights: "culture",
  tour: "culture",
  tours: "culture",
  attraction: "outdoor",
  attractions: "outdoor",
  restaurant: "food",
  dining: "food",
  experience: "outdoor",
  activities: "outdoor",
};

function normalizeCategoryForMatch(category: string): string {
  const c = (category ?? "").trim().toLowerCase();
  return CATEGORY_TO_INTEREST[c] ?? c;
}

/** Simple interest match: 1 if category (or its mapping) in interests, 0.5 if no interests, else 0. */
function simpleInterestMatch(interests: string[], category: string): number {
  if (interests.length === 0) return 0.5;
  const cat = normalizeCategoryForMatch(category);
  const normalized = interests.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (normalized.includes(cat)) return 1;
  return 0;
}

/**
 * Fallback ranking when the XGBoost engine is not available: sort by interest match (desc) then emission_kg (asc).
 */
export function rankActivitiesFallback(
  activities: Activity[],
  interests: string[]
): RankedActivity[] {
  return activities
    .map((a) => ({
      ...a,
      fit_score: simpleInterestMatch(interests, a.category ?? ""),
      regret_probability: undefined,
      explanation: undefined,
    }))
    .sort((a, b) => {
      if (b.fit_score !== a.fit_score) return b.fit_score - a.fit_score;
      return (a.emission_kg ?? 0) - (b.emission_kg ?? 0);
    });
}

/**
 * Merge engine batch scores with activities and sort by fit_score desc then emission_kg asc.
 */
export function mergeAndRank(
  activities: Activity[],
  scores: ScoreResponseItem[]
): RankedActivity[] {
  if (scores.length !== activities.length) {
    return activities.map((a) => ({ ...a, fit_score: 0.5, regret_probability: undefined, explanation: undefined }));
  }
  const merged: RankedActivity[] = activities.map((a, i) => ({
    ...a,
    fit_score: scores[i]!.fit_score,
    regret_probability: scores[i]!.regret_probability,
    explanation: scores[i]!.explanation ?? undefined,
  }));
  merged.sort((a, b) => {
    if (b.fit_score !== a.fit_score) return b.fit_score - a.fit_score;
    return (a.emission_kg ?? 0) - (b.emission_kg ?? 0);
  });
  return merged;
}
