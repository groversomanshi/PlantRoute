/**
 * Map between Prisma Preference model and app UserPreferences / TravelPreferences.
 * Used to store form data in the database for LLM training and personalization.
 */
import { prisma } from "@/lib/prisma";
import type { TravelVibe, UserPreferences, TravelPreferences } from "@/types";

export async function getPreferenceByUserId(userId: string): Promise<{
  preferences: UserPreferences;
} | null> {
  const row = await prisma.preference.findUnique({
    where: { userId },
  });
  if (!row) return null;

  const snapshot = row.preferencesSnapshot as Partial<UserPreferences> | null;
  const snapshotTravel = snapshot?.travel as Partial<TravelPreferences> | undefined;
  const snapshotVibes = Array.isArray(snapshotTravel?.travel_vibes)
    ? snapshotTravel.travel_vibes.filter(Boolean) as TravelVibe[]
    : [];
  const selectedVibes = snapshotVibes.length > 0
    ? snapshotVibes
    : ([row.travelVibe] as TravelVibe[]);

  const travel: TravelPreferences = {
    trip_pace: row.tripPace,
    crowd_comfort: row.crowdComfort,
    morning_tolerance: row.morningTolerance,
    late_night_tolerance: row.lateNightTolerance,
    walking_effort: row.walkingEffort,
    budget_level: row.budgetLevel,
    planning_vs_spontaneity: row.planningVsSpontaneity,
    noise_sensitivity: row.noiseSensitivity,
    dislike_heat: row.dislikeHeat,
    dislike_cold: row.dislikeCold,
    dislike_rain: row.dislikeRain,
    travel_vibes: selectedVibes,
    travel_vibe: selectedVibes[0],
    no_weather_dislikes:
      snapshotTravel?.no_weather_dislikes ??
      (!row.dislikeHeat && !row.dislikeCold && !row.dislikeRain),
    additional_notes: row.additionalNotes ?? undefined,
    completed: row.completed,
  };

  const preferences: UserPreferences = snapshot
    ? {
        ...snapshot,
        interests: snapshot.interests ?? [],
        budget_level: snapshot.budget_level ?? "mid",
        carbon_sensitivity: snapshot.carbon_sensitivity ?? "medium",
        avoid_flying: snapshot.avoid_flying ?? false,
        party_size: snapshot.party_size ?? 1,
        travel,
      }
    : {
        interests: [],
        budget_level: "mid",
        carbon_sensitivity: "medium",
        avoid_flying: false,
        party_size: 1,
        travel,
      };
  return { preferences };
}

export async function upsertPreference(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  const travel = preferences.travel;
  const tripPace = travel?.trip_pace ?? 0.5;
  const crowdComfort = travel?.crowd_comfort ?? 0.5;
  const morningTolerance = travel?.morning_tolerance ?? 0.5;
  const lateNightTolerance = travel?.late_night_tolerance ?? 0.5;
  const walkingEffort = travel?.walking_effort ?? 0.5;
  const budgetLevel = travel?.budget_level ?? 0.5;
  const planningVsSpontaneity = travel?.planning_vs_spontaneity ?? 0.5;
  const noiseSensitivity = travel?.noise_sensitivity ?? 0.5;
  const dislikeHeat = travel?.dislike_heat ?? false;
  const dislikeCold = travel?.dislike_cold ?? false;
  const dislikeRain = travel?.dislike_rain ?? false;
  const travelVibes = travel?.travel_vibes?.filter(Boolean) as TravelVibe[] | undefined;
  const travelVibe = travelVibes?.[0] ?? travel?.travel_vibe ?? "Chill";
  const additionalNotes = travel?.additional_notes ?? null;
  const completed = travel?.completed ?? false;

  const snapshot: UserPreferences = {
    ...preferences,
    travel: travel
      ? { ...travel, completed }
      : undefined,
  };

  await prisma.preference.upsert({
    where: { userId },
    create: {
      userId,
      tripPace,
      crowdComfort,
      morningTolerance,
      lateNightTolerance,
      walkingEffort,
      budgetLevel,
      planningVsSpontaneity,
      noiseSensitivity,
      dislikeHeat,
      dislikeCold,
      dislikeRain,
      travelVibe,
      additionalNotes,
      completed,
      preferencesSnapshot: snapshot as object,
    },
    update: {
      tripPace,
      crowdComfort,
      morningTolerance,
      lateNightTolerance,
      walkingEffort,
      budgetLevel,
      planningVsSpontaneity,
      noiseSensitivity,
      dislikeHeat,
      dislikeCold,
      dislikeRain,
      travelVibe,
      additionalNotes,
      completed,
      preferencesSnapshot: snapshot as object,
    },
  });
}
