"use client";

import { useState } from "react";
import { Heart, MapPin, ThumbsUp, Star } from "lucide-react";
import type { DestinationData } from "@/lib/destinations";
import type { GeoPoint } from "@/types";

interface DestinationCardProps {
  destination: DestinationData;
  onClick: (city: GeoPoint) => void;
  onHover?: (city: GeoPoint | null) => void;
  variant?: "list" | "slideshow";
}

export function DestinationCard({
  destination,
  onClick,
  onHover,
  variant = "list",
}: DestinationCardProps) {
  const [favorited, setFavorited] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorited((prev) => !prev);
  };

  const isCompact = variant === "slideshow";

  return (
    <button
      type="button"
      className="w-full text-left rounded-[28px] overflow-hidden bg-white/20 backdrop-blur-xl border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f] focus-visible:ring-offset-2"
      onClick={() => onClick(destination)}
      onMouseEnter={() => onHover?.(destination)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className={`relative bg-gray-200 ${isCompact ? "aspect-[4/3]" : "aspect-[16/10]"}`}
      >
        <img
          src={destination.image_url}
          alt={destination.name}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"
          style={{ bottom: 0 }}
        />
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/25 backdrop-blur-xl border border-white/30 hover:bg-white/40 transition-colors"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-5 h-5 ${favorited ? "fill-[#2d6a4f] text-[#2d6a4f]" : "text-white"}`}
          />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-white/10 backdrop-blur-xl border-t border-white/20 rounded-b-[28px]">
          <h3 className="font-bold text-white text-lg tracking-tight drop-shadow">
            {destination.name}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-white/90 text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {destination.distance_km} km
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              {destination.likes}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {destination.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
