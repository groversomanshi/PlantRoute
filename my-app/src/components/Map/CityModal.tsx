"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GeoPoint } from "@/types";
import type { Activity } from "@/types";
import { LoadingRoute } from "@/components/UI/LoadingRoute";
import { formatPrice } from "@/lib/utils";
import {
  UtensilsCrossed,
  MapPin,
  TreePine,
  Moon,
  Heart,
  Mountain,
  Landmark,
  X,
} from "lucide-react";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  museum: Landmark,
  restaurant: UtensilsCrossed,
  outdoor: Mountain,
  nature: TreePine,
  nightlife: Moon,
  wellness: Heart,
  default: MapPin,
};

interface CityModalProps {
  city: GeoPoint;
  onClose: () => void;
  onBuildItinerary: () => void;
}

export function CityModal({ city, onClose, onBuildItinerary }: CityModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const cityName = city.name.split(",")[0]?.trim() ?? city.name;
    fetch(
      `/api/amadeus/activities?city=${encodeURIComponent(cityName)}&limit=5`,
      { signal: AbortSignal.timeout(10000) }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setActivities(data.activities ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city.name]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl shadow-lg"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.08)",
          maxHeight: "70vh",
        }}
      >
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-xl font-display font-semibold" style={{ color: "var(--text-primary)" }}>
            {city.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:opacity-80"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            Top activities
          </p>
          {loading ? (
            <LoadingRoute />
          ) : (
            <div className="flex flex-wrap gap-2">
              {activities.map((act) => {
                const Icon = categoryIcons[act.category?.toLowerCase() ?? ""] ?? categoryIcons.default;
                return (
                  <span
                    key={act.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {act.name} · {formatPrice(act.price_usd)}
                  </span>
                );
              })}
              {activities.length === 0 && !loading && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No activities found. You can still build an itinerary.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={onBuildItinerary}
            className="w-full py-3 px-4 rounded-xl font-medium text-white transition opacity-90 hover:opacity-100"
            style={{ background: "#2d6a4f" }}
          >
            Build Itinerary
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
