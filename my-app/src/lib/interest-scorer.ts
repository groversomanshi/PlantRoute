import type { Activity, Itinerary, UserPreferences } from "@/types";

const RELATED_CATEGORIES: Record<string, string[]> = {
  outdoor: ["nature", "hiking", "adventure", "sports"],
  nature: ["outdoor", "hiking", "adventure", "beach"],
  museum: ["culture", "art", "history"],
  culture: ["museum", "art", "history"],
  restaurant: ["food", "local", "culinary"],
  food: ["restaurant", "local", "culinary"],
  nightlife: ["bars", "entertainment"],
  wellness: ["spa", "relaxation", "health"],
  beach: ["outdoor", "nature"],
  ski: ["outdoor", "adventure", "sports"],
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function scoreActivity(
  activity: Activity,
  prefs: UserPreferences
): number {
  const cat = normalize(activity.category);
  const interests = prefs.interests.map(normalize);
  if (interests.length === 0) return 0.5;
  if (interests.includes(cat)) return 1.0;
  const related = RELATED_CATEGORIES[cat];
  if (related?.some((r) => interests.includes(r))) return 0.6;
  return 0.1;
}

const MAX_EMISSION_FOR_NORM = 500;

export function scoreItinerary(
  itinerary: Itinerary,
  prefs: UserPreferences
): number {
  let activitySum = 0;
  let activityCount = 0;
  itinerary.days.forEach((day) => {
    day.activities.forEach((a) => {
      activitySum += scoreActivity(a, prefs);
      activityCount++;
    });
  });
  const activityScore =
    activityCount === 0 ? 0.5 : activitySum / activityCount;
  const carbonNorm = Math.min(
    1,
    Math.max(0, 1 - itinerary.total_emission_kg / MAX_EMISSION_FOR_NORM)
  );
  return 0.7 * activityScore + 0.3 * carbonNorm;
}
