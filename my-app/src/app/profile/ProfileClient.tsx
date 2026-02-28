"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { TravelPreferencesForm } from "@/components/Profile/TravelPreferencesForm";
import { DEFAULT_TRAVEL_PREFERENCES, type UserPreferences } from "@/types";

const STORAGE_KEY = "plantroute_itineraries";

export default function ProfileClient() {
  const { profile, loading, load, savePreferences } = useProfile();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [hasEditedPreferences, setHasEditedPreferences] = useState(false);
  const [pastTrips] = useState<Array<{ id: string; city: string; date: string; kg: number }>>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((it: { id: string; city: string; start_date: string; total_emission_kg: number }) => ({
      id: it.id,
      city: it.city,
      date: it.start_date,
      kg: it.total_emission_kg,
    }));
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const effectivePreferences: UserPreferences | null =
    !hasEditedPreferences && profile
      ? {
          ...profile.preferences,
          travel: profile.preferences.travel
            ? { ...DEFAULT_TRAVEL_PREFERENCES, ...profile.preferences.travel }
            : DEFAULT_TRAVEL_PREFERENCES,
        }
      : preferences;

  const handleSave = async () => {
    if (!effectivePreferences) return;
    const result = await savePreferences(effectivePreferences);
    if (result.success) setSaved(true);
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading preference…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto" style={{ background: "var(--bg-primary)" }}>
      <Link href="/" className="text-sm font-medium mb-6 inline-block" style={{ color: "var(--accent-green)" }}>
        ← Back to map
      </Link>
      <h1 className="text-2xl font-display font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
        Your preference
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3" style={{ color: "var(--text-primary)" }}>
          Travel Preferences
        </h2>
        <TravelPreferencesForm
          value={effectivePreferences?.travel ?? DEFAULT_TRAVEL_PREFERENCES}
          onChange={(travel) => {
            setHasEditedPreferences(true);
            setPreferences((prev) =>
              prev
                ? { ...prev, travel }
                : {
                    ...(profile?.preferences ?? {
                      interests: [],
                      budget_level: "mid",
                      carbon_sensitivity: "medium",
                      avoid_flying: false,
                      party_size: 1,
                    }),
                    travel,
                  }
            );
          }}
          showTitle={false}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3" style={{ color: "var(--text-primary)" }}>
          Preference tags
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {effectivePreferences?.interests.map((i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1 text-sm"
              style={{ background: "var(--accent-green-light)", color: "var(--accent-green)" }}
            >
              {i}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="py-2 px-4 rounded-xl font-medium text-white"
          style={{ background: "#2d6a4f" }}
        >
          {saved ? "Saved" : "Save changes"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3" style={{ color: "var(--text-primary)" }}>
          Past trips
        </h2>
        <ul className="space-y-2">
          {pastTrips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/itinerary/${trip.id}`}
                className="block rounded-xl p-4 border hover:bg-black/5"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="font-medium">{trip.city}</span>
                <span className="text-sm ml-2" style={{ color: "var(--text-muted)" }}>
                  {trip.date} · {trip.kg.toFixed(0)} kg CO₂e
                </span>
              </Link>
            </li>
          ))}
          {pastTrips.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No trips yet. Build an itinerary from the map.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
