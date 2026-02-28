"use client";

import { cn } from "@/lib/utils";

interface CarbonBadgeProps {
  kg: number;
  className?: string;
}

export function CarbonBadge({ kg, className }: CarbonBadgeProps) {
  const variant =
    kg < 20 ? "green" : kg <= 100 ? "amber" : "red";
  const bg =
    variant === "green"
      ? "#2d6a4f"
      : variant === "amber"
        ? "#d47c0f"
        : "#c1440e";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white",
        className
      )}
      style={{ backgroundColor: bg }}
    >
      {kg.toFixed(1)} kg CO₂e
    </span>
  );
}
