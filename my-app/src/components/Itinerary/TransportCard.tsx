"use client";

import { motion } from "framer-motion";
import type { TransportSegment } from "@/types";
import { CarbonBadge } from "@/components/UI/CarbonBadge";
import { formatPrice } from "@/lib/utils";
import { Plane, Train, Bus, Car, Ship, Footprints } from "lucide-react";

const modeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  flight_short: Plane,
  flight_long: Plane,
  train: Train,
  bus: Bus,
  car: Car,
  ferry: Ship,
  walk: Footprints,
};

interface TransportCardProps {
  segment: TransportSegment;
}

export function TransportCard({ segment }: TransportCardProps) {
  const Icon = modeIcons[segment.mode] ?? Car;
  const emission = segment.emission_kg ?? 0;
  const durationMin = segment.duration_minutes;

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--accent-green-light)", color: "var(--accent-green)" }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
          {segment.origin.name} → {segment.destination.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {segment.distance_km != null ? `${segment.distance_km.toFixed(0)} km` : ""} · {Math.floor(durationMin / 60)}h {durationMin % 60}m
        </p>
      </div>
      <div className="flex items-center gap-2">
        <CarbonBadge kg={emission} />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {formatPrice(segment.price_usd)}
        </span>
      </div>
    </motion.div>
  );
}
