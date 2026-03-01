"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";
import { TravelPreferencesForm } from "@/components/Profile/TravelPreferencesForm";
import {
  ATTRACTION_TYPES,
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
  const searchParams = useSearchParams();
  const forceShow = searchParams.get("force") === "1";
  const { data: session, status: sessionStatus } = useSession();
  const { profile, loading, load, savePreferences } = useProfile();
  const [travel, setTravel] = useState<TravelPreferences>(DEFAULT_TRAVEL_PREFERENCES);
  const [interests, setInterests] = useState<string[]>([]);
  const [hasEditedTravel, setHasEditedTravel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSlidersActivated, setAllSlidersActivated] = useState(false);
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (sessionStatus !== "authenticated") {
        setHasCheckedProfile(sessionStatus === "unauthenticated");
        return;
      }
      setHasCheckedProfile(false);
      await load();
      if (!cancelled) setHasCheckedProfile(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, load]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !hasCheckedProfile || loading) return;
    if (!forceShow && profile?.preferences?.travel?.completed) {
      router.replace("/");
      return;
    }
  }, [sessionStatus, hasCheckedProfile, loading, profile, router, forceShow]);

  useEffect(() => {
    if (hasCheckedProfile && profile?.preferences?.interests?.length && interests.length === 0) {
      setInterests(profile.preferences.interests);
    }
  }, [hasCheckedProfile, profile?.preferences?.interests, interests.length]);

  const effectiveTravel =
    !hasEditedTravel && profile?.preferences?.travel
      ? { ...DEFAULT_TRAVEL_PREFERENCES, ...profile.preferences.travel }
      : travel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const prefs = mergeTravel(profile?.preferences ?? null, effectiveTravel);
    prefs.interests = interests;
    const result = await savePreferences(prefs);
    setSaving(false);
    if (result.success) router.replace("/");
  };

  const sessionLoading = sessionStatus === "loading";
  const profileLoading =
    sessionStatus === "authenticated" && (!hasCheckedProfile || loading);
  if (sessionLoading || profileLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }
  if (sessionStatus === "authenticated" && profile?.preferences?.travel?.completed && !forceShow) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="fixed top-3 right-3 z-50">
        <div
          className="rounded-lg border p-2 text-xs"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "user avatar"}
                className="w-6 h-6 rounded-full border"
                style={{ borderColor: "var(--border)" }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full border"
                style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
              />
            )}
            <div className="leading-tight">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {session?.user?.name ?? "User"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-2 w-full rounded-md border px-2 py-1 text-xs font-medium"
            style={{
              color: "#991b1b",
              background: "#fee2e2",
              borderColor: "#fecaca",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

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
            Set your travel preferences (1 - 5)
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            We’ll use these to tailor your itineraries. You can change them anytime in Preference.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <TravelPreferencesForm
            value={effectiveTravel}
            onChange={(next) => {
              setHasEditedTravel(true);
              setTravel(next);
            }}
            onValidationChange={({ isComplete }) => setSelectionComplete(isComplete)}
            showTitle={false}
            requireDragToActivate={true}
            onAllSlidersActivated={() => setAllSlidersActivated(true)}
          />

          <div className="mt-6 mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Attraction types you like (optional)
            </p>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              Select the kinds of attractions you enjoy.
            </p>
            <div className="flex flex-wrap gap-2">
              {ATTRACTION_TYPES.map((type) => {
                const selected = interests.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className="rounded-full px-3 py-1.5 text-sm border transition-colors capitalize"
                    style={{
                      borderColor: selected ? "var(--accent-green)" : "var(--border)",
                      background: selected ? "var(--accent-green-light)" : "transparent",
                      color: selected ? "var(--accent-green)" : "var(--text-primary)",
                    }}
                    onClick={() =>
                      setInterests((prev) =>
                        selected ? prev.filter((i) => i !== type) : [...prev, type]
                      )
                    }
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {!allSlidersActivated && (
            <p className="mt-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Drag each point left or right to set your preference — then Continue will unlock.
            </p>
          )}
          {allSlidersActivated && !selectionComplete && (
            <p className="mt-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Complete the required Weather dislikes and Trip vibe sections to continue.
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !allSlidersActivated || !selectionComplete}
            className="mt-6 w-full py-3 rounded-xl font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#2d6a4f" }}
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
