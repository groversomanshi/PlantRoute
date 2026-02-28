"use client";

import { motion } from "framer-motion";

interface CityMarkerProps {
  label: string;
  avgCarbonKg?: number;
  density?: number; // 0–1, activity density
  onClick?: () => void;
}

export function CityMarker({
  label,
  avgCarbonKg = 0,
  density = 0.5,
  onClick,
}: CityMarkerProps) {
  const ringColor =
    avgCarbonKg < 50 ? "#2d6a4f" : avgCarbonKg <= 150 ? "#d47c0f" : "#c1440e";
  const size = 8 + Math.max(0, density * 8);

  return (
    <div
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      aria-label={label}
    >
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: "var(--accent-green)",
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: ringColor }}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}
