"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { GeoPoint } from "@/types";
import type { Itinerary, UserPreferences } from "@/types";
import { buildCandidateItineraries } from "@/lib/itinerary-builder";
import { scoreItinerary } from "@/lib/interest-scorer";
import { geocodeCity } from "@/lib/cities";
import { ItineraryCard } from "./ItineraryCard";
import { RegretModal } from "@/components/UI/RegretModal";

const STORAGE_KEY = "plantroute_itineraries";

interface ItineraryBuilderProps {
  city: GeoPoint;
  onClose: () => void;
  initialPreferences?: UserPreferences | null;
}

export function ItineraryBuilder({
  city,
  onClose,
  initialPreferences,
}: ItineraryBuilderProps) {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prefText, setPrefText] = useState(initialPreferences?.raw_text ?? "");
  const [preferences, setPreferences] = useState<UserPreferences | null>(initialPreferences ?? null);
  const [building, setBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState("");
  const [candidates, setCandidates] = useState<Itinerary[]>([]);
  const [regretItinerary, setRegretItinerary] = useState<Itinerary | null>(null);

  const cityName = city.name.split(",")[0]?.trim() ?? city.name;

  const parsePrefs = useCallback(async () => {
    const text = prefText.replace(/<[^>]*>/g, "").trim().slice(0, 2000);
    if (!text) return;
    const res = await fetch("/api/infer/parse_prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const data = await res.json();
    setPreferences(data.preferences ?? null);
  }, [prefText]);

  const runBuild = useCallback(async () => {
    setBuilding(true);
    setBuildStatus("Fetching activities…");
    const prefs: UserPreferences = preferences ?? {
      interests: ["culture", "outdoor"],
      budget_level: "mid",
      carbon_sensitivity: "medium",
      avoid_flying: false,
      party_size: 1,
    };

    try {
      const point = await geocodeCity(cityName);
      const cityPoint = point ?? city;

      setBuildStatus("Fetching activities…");
      const activitiesRes = await fetch(
        `/api/amadeus/activities?city=${encodeURIComponent(cityName)}&interests=${encodeURIComponent(prefs.interests.join(","))}&limit=20`,
        { signal: AbortSignal.timeout(10000) }
      );
      const activitiesData = await activitiesRes.json();
      const activities = activitiesData.activities ?? [];

      setBuildStatus("Fetching hotels…");
      const hotelsRes = await fetch(
        `/api/amadeus/hotels?city=${encodeURIComponent(cityName)}&checkIn=${startDate}&checkOut=${endDate}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const hotelsData = await hotelsRes.json();
      const hotels = hotelsData.hotels ?? [];

      setBuildStatus("Fetching transport…");
      const flightsRes = await fetch(
        `/api/amadeus/flights?origin=ORD&destination=${cityName.slice(0, 3).toUpperCase()}&date=${startDate}&adults=1`,
        { signal: AbortSignal.timeout(10000) }
      );
      const flightsData = await flightsRes.json();
      const flights = flightsData.flights ?? [];

      setBuildStatus("Building your routes…");
      const rawCandidates = buildCandidateItineraries(
        cityName,
        cityPoint,
        startDate,
        endDate,
        activities,
        hotels,
        flights,
        prefs
      );

      setBuildStatus("Scoring carbon…");
      const withCarbon: Itinerary[] = [];
      for (const it of rawCandidates) {
        const carbonRes = await fetch("/api/infer/carbon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary: it }),
          signal: AbortSignal.timeout(10000),
        });
        if (carbonRes.ok) {
          const carbonData = await carbonRes.json();
          const totalKg = carbonData.total_kg ?? 0;
          withCarbon.push({
            ...it,
            total_emission_kg: totalKg,
            interest_match_score: scoreItinerary(it, prefs),
          });
        } else {
          withCarbon.push({ ...it, interest_match_score: scoreItinerary(it, prefs) });
        }
      }

      setCandidates(withCarbon);

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const list: Itinerary[] = stored ? JSON.parse(stored) : [];
      withCarbon.forEach((it) => {
        if (!list.find((i) => i.id === it.id)) list.push(it);
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }

      setStep(4);
    } catch (e) {
      console.error(e);
      setBuildStatus("Something went wrong. Please try again.");
    } finally {
      setBuilding(false);
    }
  }, [cityName, city, startDate, endDate, preferences]);

  const handleStep2Next = () => {
    parsePrefs().then(() => setStep(3));
    runBuild();
  };

  const handleSelectItinerary = (it: Itinerary) => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const list: Itinerary[] = stored ? JSON.parse(stored) : [];
    const updated = list.some((i) => i.id === it.id) ? list : [...list, it];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    window.location.href = `/itinerary/${it.id}`;
  };

  return (
    <>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full max-w-lg z-50 overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "-4px 0 40px rgba(0,0,0,0.08)",
        }}
      >
        <div className="p-4 flex items-center justify-between border-b sticky top-0 z-10" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <h2 className="text-lg font-display font-semibold" style={{ color: "var(--text-primary)" }}>
            Build itinerary · {cityName}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:opacity-80" aria-label="Close">
            <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pick your dates</p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Check-in</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Check-out</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!startDate || !endDate}
                  className="w-full py-3 rounded-xl font-medium text-white disabled:opacity-50"
                  style={{ background: "#2d6a4f" }}
                >
                  Next
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Tell us what you love (e.g. hiking, local food, museums, low carbon travel)
                </p>
                <textarea
                  value={prefText}
                  onChange={(e) => setPrefText(e.target.value.slice(0, 2000))}
                  onBlur={() => parsePrefs()}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-xl border px-4 py-3 resize-none"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="I love local food and hate flying..."
                />
                {preferences && (
                  <div className="flex flex-wrap gap-2">
                    {preferences.interests.map((i) => (
                      <span
                        key={i}
                        className="rounded-full px-3 py-1 text-sm"
                        style={{ background: "var(--accent-green-light)", color: "var(--accent-green)" }}
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="w-full py-3 rounded-xl font-medium text-white"
                  style={{ background: "#2d6a4f" }}
                >
                  Build my itinerary
                </button>
              </motion.div>
            )}

            {(step === 3 || building) && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 py-8">
                <p className="text-center font-medium" style={{ color: "var(--text-primary)" }}>
                  {buildStatus}
                </p>
                <div className="flex justify-center">
                  <motion.div
                    className="w-12 h-12 rounded-full border-4 border-t-transparent"
                    style={{ borderColor: "var(--accent-green)", borderTopColor: "transparent" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && !building && (
              <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Choose one</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {candidates.map((it, i) => (
                    <ItineraryCard
                      key={it.id}
                      itinerary={it}
                      variant={i === 0 ? "best_match" : i === 1 ? "low_carbon" : "premium"}
                      onSelect={() => handleSelectItinerary(it)}
                      onLowerCarbon={() => setRegretItinerary(it)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {regretItinerary && (
        <RegretModal
          itinerary={regretItinerary}
          onClose={() => setRegretItinerary(null)}
          onSwitch={() => {}}
        />
      )}
    </>
  );
}
