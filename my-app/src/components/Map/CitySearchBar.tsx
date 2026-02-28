"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import type { GeoPoint } from "@/types";

interface CitySearchBarProps {
  onCitySelect: (city: GeoPoint) => void;
  onFlyTo?: (city: GeoPoint) => void;
}

export function CitySearchBar({
  onCitySelect,
  onFlyTo,
}: CitySearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      try {
        const geoRes = await fetch(
          `/api/geocode?city=${encodeURIComponent(trimmed)}`
        );
        if (!geoRes.ok) {
          const data = await geoRes.json().catch(() => ({}));
          throw new Error(data.error ?? "City not found");
        }
        const city: GeoPoint = await geoRes.json();
        onFlyTo?.(city);
        onCitySelect(city);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [query, onFlyTo, onCitySelect]
  );

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 p-2 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
      >
        <Search className="w-5 h-5 text-white/90 ml-2 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destinations..."
          className="flex-1 bg-transparent text-white placeholder-white/70 font-medium py-2 px-1 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[#2d6a4f] text-white font-medium hover:bg-[#236b47] disabled:opacity-60 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-200">{error}</p>
      )}
    </div>
  );
}
