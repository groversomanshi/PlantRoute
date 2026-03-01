"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { WorldMap } from "@/components/Map/WorldMap";
import { CityModal } from "@/components/Map/CityModal";
import { CitySearchBar } from "@/components/Map/CitySearchBar";
import { ItineraryBuilder } from "@/components/Itinerary/ItineraryBuilder";
import { Sidebar } from "@/components/Sidebar";
import { MessageCircle } from "lucide-react";
import type { GeoPoint, BasemapKey } from "@/types";

interface HomeClientProps {
  useMapbox: boolean;
}

export function HomeClient({ useMapbox }: HomeClientProps) {
  const [selectedCity, setSelectedCity] = useState<GeoPoint | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("outdoors");
  const [flyToCity, setFlyToCity] = useState<GeoPoint | null>(null);
  const pastTripCities: string[] = useMemo(() => [], []);

  const [agentQuery, setAgentQuery] = useState("");
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [retrySecondsRemaining, setRetrySecondsRemaining] = useState<number | null>(null);
  const [agentMinimized, setAgentMinimized] = useState(false);

  useEffect(() => {
    if (retrySecondsRemaining == null || retrySecondsRemaining <= 0) return;
    const id = setInterval(() => {
      setRetrySecondsRemaining((s) => {
        if (s == null || s <= 1) {
          setAgentError(null);
          return null;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [retrySecondsRemaining]);

  const handleSearchFlyTo = useCallback((city: GeoPoint) => {
    setFlyToCity(city);
    setTimeout(() => setFlyToCity(null), 2000);
  }, []);

  const handleAskAgent = useCallback(async () => {
    const q = agentQuery.trim();
    if (!q) return;
    setAgentLoading(true);
    setAgentError(null);
    setAgentResult(null);
    setRetrySecondsRemaining(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as { text?: string; error?: string; retryAfterSeconds?: number };
      if (!res.ok) {
        setAgentError(data.error ?? "Search failed");
        if (res.status === 429 && data.retryAfterSeconds != null && data.retryAfterSeconds > 0) {
          setRetrySecondsRemaining(data.retryAfterSeconds);
        }
        return;
      }
      setAgentResult(data.text ?? "");
    } catch (e) {
      setAgentError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setAgentLoading(false);
    }
  }, [agentQuery]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Main content: sidebar + split pane - map takes most of the space */}
      <div className="flex h-screen min-h-[600px]">
        <Sidebar basemap={basemap} onBasemapChange={setBasemap} />

        <div className="flex-1 flex p-4 min-w-0 min-h-0">
          {/* Map - full width with title + search overlay */}
          <div className="flex-1 min-w-0 min-h-0 rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative">
            <WorldMap
              useMapbox={useMapbox}
              basemap={basemap}
              onCitySelect={setSelectedCity}
              pastTripCities={pastTripCities}
              flyToCity={flyToCity}
            />
            {/* Floating title + search bar overlay */}
            <div className="absolute top-0 left-0 right-0 pt-6 px-4 flex flex-col items-center gap-3 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
              <div className="pointer-events-auto relative">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg text-center">
                  PlantRoute
                </h1>
                <p className="text-white/90 text-sm md:text-base text-center mt-0.5">
                  AI-powered sustainable travel
                </p>
              </div>
              <div className="w-full max-w-2xl pointer-events-auto">
                <CitySearchBar
                  basemap={basemap}
                  onCitySelect={setSelectedCity}
                  onFlyTo={handleSearchFlyTo}
                />
              </div>
            </div>

            {/* Ask an AI Travel Agent - bottom right, live Google AI search */}
            <div className="absolute bottom-3 right-3 w-full max-w-sm pointer-events-auto z-10">
              <div
                className="rounded-xl border shadow-lg backdrop-blur-sm overflow-hidden"
                style={{ borderColor: "rgba(45, 106, 79, 0.2)", backgroundColor: "rgba(250, 248, 245, 0.97)" }}
              >
                <div
                  className="px-3 py-2 border-b flex items-center justify-between gap-2"
                  style={{ borderColor: "rgba(45, 106, 79, 0.15)", backgroundColor: "#2d6a4f" }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MessageCircle className="w-4 h-4 text-white shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white text-sm truncate">Ask an AI Travel Agent</h2>
                      {!agentMinimized && (
                        <p className="text-white/80 text-[11px] mt-0.5">
                          Live Google AI Search — destinations, tips, sustainability.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgentMinimized((m) => !m)}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-lg hover:bg-white/20 transition-colors"
                    style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                    aria-label={agentMinimized ? "Expand" : "Minimize"}
                  >
                    {agentMinimized ? "+" : "−"}
                  </button>
                </div>
                {!agentMinimized && (
                  <div className="p-2.5 space-y-2" style={{ backgroundColor: "rgba(250, 248, 245, 0.5)" }}>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={agentQuery}
                        onChange={(e) => setAgentQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAskAgent()}
                        placeholder="e.g. Eco hotels in Rome?"
                        className="flex-1 min-w-0 rounded-lg border px-2.5 py-2 text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/50 focus:border-[#2d6a4f]"
                        style={{ borderColor: "rgba(45, 106, 79, 0.2)", backgroundColor: "#fdfcfb" }}
                        disabled={agentLoading}
                      />
                      <button
                        type="button"
                        onClick={handleAskAgent}
                        disabled={agentLoading}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        style={{ backgroundColor: "#2d6a4f" }}
                      >
                        {agentLoading ? "…" : "Ask"}
                      </button>
                    </div>
                    {(agentResult !== null || agentError) && (
                      <div
                        className="max-h-36 overflow-y-auto rounded-lg border p-2.5 text-xs text-gray-800"
                        style={{ borderColor: "rgba(45, 106, 79, 0.12)", backgroundColor: "#f7f5f0" }}
                      >
                        {agentError && (
                          <p className="text-red-600">
                            {agentError}
                            {retrySecondsRemaining != null && retrySecondsRemaining > 0 && (
                              <> Retry in ~{retrySecondsRemaining}s.</>
                            )}
                          </p>
                        )}
                        {agentResult !== null && !agentError && (
                          <div className="prose prose-sm prose-gray max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                            <ReactMarkdown>{agentResult}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedCity && (
        <CityModal
          city={selectedCity}
          onClose={() => setSelectedCity(null)}
          onBuildItinerary={() => {
            setBuilderOpen(true);
          }}
        />
      )}

      {builderOpen && selectedCity && (
        <ItineraryBuilder
          city={selectedCity}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </div>
  );
}
