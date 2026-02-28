"use client";

import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import type { UserProfile, UserPreferences } from "@/types";

export function useProfile() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/supermemory/retrieve?userId=${encodeURIComponent(userId)}&type=preferences`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      const tripRes = await fetch(
        `/api/supermemory/retrieve?userId=${encodeURIComponent(userId)}&type=trip`,
        { signal: AbortSignal.timeout(10000) }
      );
      const tripData = tripRes.ok ? await tripRes.json() : null;
      setProfile({
        id: userId,
        preferences: data?.preferences ?? {
          interests: [],
          budget_level: "mid",
          carbon_sensitivity: "medium",
          avoid_flying: false,
          party_size: 1,
        },
        trip_count: tripData?.past_trips?.length ?? 0,
        past_trips: tripData?.past_trips ?? [],
      });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const savePreferences = useCallback(
    async (preferences: UserPreferences) => {
      if (!userId) return { success: false };
      const res = await fetch("/api/supermemory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: "preferences",
          data: { preferences },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false };
      await load();
      return { success: true };
    },
    [userId, load]
  );

  const saveTrip = useCallback(
    async (itineraryId: string) => {
      if (!userId) return { success: false };
      const res = await fetch("/api/supermemory/retrieve", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const existing = await fetch(
        `/api/supermemory/retrieve?userId=${encodeURIComponent(userId)}&type=trip`
      ).then((r) => (r.ok ? r.json() : null));
      const past_trips = [...(existing?.past_trips ?? []), itineraryId];
      const saveRes = await fetch("/api/supermemory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: "trip",
          data: { past_trips },
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { success: saveRes.ok };
    },
    [userId]
  );

  return {
    userId,
    profile,
    loading,
    load,
    savePreferences,
    saveTrip,
  };
}
