"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { TravelPreferencesForm } from "@/components/Profile/TravelPreferencesForm";
import {
  DEFAULT_TRAVEL_PREFERENCES,
  type TravelPreferences,
  type UserPreferences,
} from "@/types";

function mergeTravel(
  existing: UserPreferences | null,
  travel: TravelPreferences
): UserPreferences {
  const base: UserPreferences = existing ?? {
    interests: [],
    budget_level: "mid",
    carbon_sensitivity: "medium",
    avoid_flying: false,
    party_size: 1,
  };
  return {
    ...base,
    travel: { ...DEFAULT_TRAVEL_PREFERENCES, ...base.travel, ...travel, completed: true },
  };
}

export function OnboardingClient() {
  const router = useRouter();
  const { profile, loading, load, savePreferences } = useProfile();
  const [travel, setTravel] = useState<TravelPreferences>(DEFAULT_TRAVEL_PREFERENCES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (profile?.preferences?.travel) {
      if (profile.preferences.travel.completed) {
        router.replace("/");
        return;
      }
      setTravel({ ...DEFAULT_TRAVEL_PREFERENCES, ...profile.preferences.travel });
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const prefs = mergeTravel(profile?.preferences ?? null, travel);
    const result = await savePreferences(prefs);
    setSaving(false);
    if (result.success) router.replace("/");
  };

  if (loading && !profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 shadow-lg border"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-display font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Set your travel preferences
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            We’ll use these to tailor your itineraries. You can change them anytime in Profile.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <TravelPreferencesForm
            value={travel}
            onChange={setTravel}
            showTitle={false}
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full py-3 rounded-xl font-medium text-white disabled:opacity-60"
            style={{ background: "#2d6a4f" }}
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
