"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Itinerary } from "@/types";
import { ActivityCard } from "@/components/Itinerary/ActivityCard";
import { TransportCard } from "@/components/Itinerary/TransportCard";
import { SavePreferencesBanner } from "@/components/UI/SavePreferencesBanner";
import { RegretModal } from "@/components/UI/RegretModal";
import { formatPrice, formatDate } from "@/lib/utils";
import { Star } from "lucide-react";

const STORAGE_KEY = "plantroute_itineraries";

export default function ItineraryDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [regretOpen, setRegretOpen] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: Itinerary[] = raw ? JSON.parse(raw) : [];
    const found = list.find((i) => i.id === id);
    setItinerary(found ?? null);
    setShowSaveBanner(list.length >= 1);
  }, [id]);

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--text-muted)" }}>Itinerary not found.</p>
          <Link href="/" className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  const totalKg = itinerary.total_emission_kg;
  const transportKg = itinerary.days.reduce(
    (s, d) => s + d.transport.reduce((t, seg) => t + (seg.emission_kg ?? 0), 0),
    0
  );
  const activityKg = itinerary.days.reduce(
    (s, d) => s + d.activities.reduce((t, a) => t + (a.emission_kg ?? 0), 0),
    0
  );
  const hotelKg = totalKg - transportKg - activityKg;

  const stars = Math.min(5, Math.max(1, Math.round(itinerary.interest_match_score * 5)));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="border-b sticky top-0 z-10 p-4 flex items-center justify-between" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>
          ← Back to map
        </Link>
        <h1 className="text-lg font-display font-semibold" style={{ color: "var(--text-primary)" }}>
          {itinerary.city}
        </h1>
        <span />
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {itinerary.days.map((day) => (
            <section
              key={day.date}
              className="rounded-2xl p-5"
              style={{ background: "var(--bg-elevated)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-display font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatDate(day.date)}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedDates((prev) => {
                      const next = new Set(prev);
                      if (next.has(day.date)) next.delete(day.date);
                      else next.add(day.date);
                      return next;
                    })
                  }
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    background: "var(--bg-surface)",
                  }}
                  aria-label={collapsedDates.has(day.date) ? "Expand this day" : "Collapse this day"}
                >
                  {collapsedDates.has(day.date) ? "Expand" : "Collapse"}
                </button>
              </div>

              {!collapsedDates.has(day.date) && (
                <>
                  {day.hotel && (
                    <div className="mb-4 p-3 rounded-xl" style={{ background: "var(--bg-surface)", borderLeft: "4px solid var(--accent-green-mid)" }}>
                      <p className="font-medium text-sm">Hotel: {day.hotel.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatPrice(day.hotel.price_per_night_usd)}/night
                      </p>
                    </div>
                  )}
                  {day.transport.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Transport</p>
                      {day.transport.map((seg) => (
                        <TransportCard key={seg.id} segment={seg} />
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Activities</p>
                    {day.activities.map((act) => (
                      <ActivityCard key={act.id} activity={act} />
                    ))}
                  </div>
                </>
              )}
              {collapsedDates.has(day.date) && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {day.activities.length} activities · {day.transport.length} transport
                </p>
              )}
            </section>
          ))}
        </div>
        
        <aside className="space-y-6">
          <div className="rounded-2xl p-5 sticky top-24" style={{ background: "var(--bg-elevated)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 className="font-display font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Carbon summary
            </h3>
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--accent-green)"
                  strokeWidth="3"
                  strokeDasharray={`${(transportKg / totalKg) * 100} ${100 - (transportKg / totalKg) * 100}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--accent-amber)"
                  strokeWidth="3"
                  strokeDasharray={`${(activityKg / totalKg) * 100} ${100 - (activityKg / totalKg) * 100}`}
                  strokeDashoffset={-(transportKg / totalKg) * 100}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--accent-red)"
                  strokeWidth="3"
                  strokeDasharray={`${(hotelKg / totalKg) * 100} ${100 - (hotelKg / totalKg) * 100}`}
                  strokeDashoffset={-((transportKg + activityKg) / totalKg) * 100}
                />
              </svg>
            </div>
            <p className="text-center text-2xl font-display font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {totalKg.toFixed(0)} kg CO₂e
            </p>
            <p className="text-center text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Total · {formatPrice(itinerary.total_price_usd)}
            </p>
            <div className="flex items-center justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  fill={i < stars ? "var(--accent-amber)" : "transparent"}
                  style={{ color: i < stars ? "var(--accent-amber)" : "var(--border)" }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRegretOpen(true)}
              className="w-full py-3 rounded-xl font-medium border"
              style={{ borderColor: "var(--accent-green)", color: "var(--accent-green)" }}
            >
              Find a lower-carbon version
            </button>
          </div>
        </aside>
      </div>

      {showSaveBanner && (
        <SavePreferencesBanner
          onSave={async () => ({ success: true })}
          onDismiss={() => setShowSaveBanner(false)}
        />
      )}

      {regretOpen && (
        <RegretModal
          itinerary={itinerary}
          onClose={() => setRegretOpen(false)}
          onSwitch={(alt) => {
            setItinerary(alt);
            setRegretOpen(false);
          }}
        />
      )}
    </div>
  );
}
