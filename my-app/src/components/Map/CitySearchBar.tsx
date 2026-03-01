"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import type { GeoPoint, BasemapKey } from "@/types";

const DEBOUNCE_MS = 280;

const SEARCH_BAR_THEMES: Record<
  BasemapKey,
  {
    container: string;
    icon: string;
    input: string;
    placeholder: string;
    button: string;
    buttonHover: string;
    dropdown: string;
    dropdownItem: string;
    dropdownItemHover: string;
    error: string;
  }
> = {
  light: {
    container: "bg-white/95 border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
    icon: "text-gray-600",
    input: "text-gray-900",
    placeholder: "placeholder:text-gray-500",
    button: "bg-[#2d6a4f] text-white",
    buttonHover: "hover:bg-[#236b47]",
    dropdown: "bg-white border-gray-200 shadow-lg",
    dropdownItem: "text-gray-800",
    dropdownItemHover: "hover:bg-[#2d6a4f]/10",
    error: "text-red-600",
  },
  outdoors: {
    container: "bg-white/20 backdrop-blur-md border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
    icon: "text-white/90",
    input: "text-white",
    placeholder: "placeholder:text-white/70",
    button: "bg-[#2d6a4f] text-white",
    buttonHover: "hover:bg-[#236b47]",
    dropdown: "bg-white/95 backdrop-blur-md border-gray-200 shadow-lg",
    dropdownItem: "text-gray-800",
    dropdownItemHover: "hover:bg-[#2d6a4f]/10",
    error: "text-red-200",
  },
  streets: {
    container: "bg-white/90 border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
    icon: "text-gray-600",
    input: "text-gray-900",
    placeholder: "placeholder:text-gray-500",
    button: "bg-[#2d6a4f] text-white",
    buttonHover: "hover:bg-[#236b47]",
    dropdown: "bg-white border-gray-200 shadow-lg",
    dropdownItem: "text-gray-800",
    dropdownItemHover: "hover:bg-[#2d6a4f]/10",
    error: "text-red-600",
  },
  dark: {
    container: "bg-gray-800/95 border-gray-600/50 shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
    icon: "text-gray-300",
    input: "text-gray-100",
    placeholder: "placeholder:text-gray-400",
    button: "bg-[#52b788] text-gray-900",
    buttonHover: "hover:bg-[#74c69d]",
    dropdown: "bg-gray-800 border-gray-600 shadow-xl",
    dropdownItem: "text-gray-200",
    dropdownItemHover: "hover:bg-gray-700",
    error: "text-red-300",
  },
  satellite: {
    container: "bg-gray-900/90 backdrop-blur-md border-gray-600/40 shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
    icon: "text-gray-200",
    input: "text-gray-100",
    placeholder: "placeholder:text-gray-400",
    button: "bg-[#52b788] text-gray-900",
    buttonHover: "hover:bg-[#74c69d]",
    dropdown: "bg-gray-800/98 border-gray-600 shadow-xl",
    dropdownItem: "text-gray-200",
    dropdownItemHover: "hover:bg-gray-700",
    error: "text-red-300",
  },
};

interface CitySearchBarProps {
  basemap?: BasemapKey;
  onCitySelect: (city: GeoPoint) => void;
  onFlyTo?: (city: GeoPoint) => void;
}

export function CitySearchBar({
  basemap = "outdoors",
  onCitySelect,
  onFlyTo,
}: CitySearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoPoint[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const theme = SEARCH_BAR_THEMES[basemap];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const tid = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSuggestionsLoading(true);
      fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      })
        .then((r) => r.json())
        .then((data: GeoPoint[]) => setSuggestions(Array.isArray(data) ? data : []))
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setSuggestions([]);
        })
        .finally(() => setSuggestionsLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(tid);
      abortRef.current?.abort();
    };
  }, [query]);

  useEffect(() => {
    setDropdownOpen(query.trim().length >= 2 && (suggestions.length > 0 || suggestionsLoading));
    setHighlightedIndex(0);
  }, [query, suggestions.length, suggestionsLoading]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleSelectSuggestion = useCallback(
    (city: GeoPoint) => {
      setQuery("");
      setDropdownOpen(false);
      setError(null);
      onFlyTo?.(city);
      onCitySelect(city);
    },
    [onFlyTo, onCitySelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dropdownOpen || suggestions.length === 0 || suggestionsLoading) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    },
    [dropdownOpen, suggestions, suggestionsLoading, highlightedIndex, handleSelectSuggestion]
  );

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
        setQuery("");
        setDropdownOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [query, onFlyTo, onCitySelect]
  );

  return (
    <div className="w-full max-w-2xl relative" ref={dropdownRef}>
      <form
        onSubmit={handleSearch}
        className={`flex items-center gap-2 rounded-2xl border p-2 transition-colors ${theme.container}`}
      >
        <Search className={`w-5 h-5 ml-2 flex-shrink-0 ${theme.icon}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && (suggestions.length > 0 || suggestionsLoading) && setDropdownOpen(true)}
          placeholder="Search destinations..."
          className={`flex-1 bg-transparent font-medium py-2 px-1 focus:outline-none ${theme.input} ${theme.placeholder}`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls="city-suggestions"
          aria-activedescendant={dropdownOpen && suggestions[highlightedIndex] ? `suggestion-${highlightedIndex}` : undefined}
          id="city-search-input"
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded-xl font-medium disabled:opacity-60 transition-colors ${theme.button} ${theme.buttonHover}`}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {dropdownOpen && (
        <ul
          id="city-suggestions"
          role="listbox"
          className={`absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 max-h-60 overflow-y-auto ${theme.dropdown}`}
        >
          {suggestionsLoading && suggestions.length === 0 ? (
            <li className={`px-4 py-3 text-sm ${theme.dropdownItem}`}>
              Searching...
            </li>
          ) : (
            suggestions.map((city, i) => (
              <li
                key={`${city.name}-${city.lat}-${city.lng}`}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                onClick={() => handleSelectSuggestion(city)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors ${theme.dropdownItem} ${theme.dropdownItemHover} ${
                  i === highlightedIndex ? "bg-[#2d6a4f]/15" : ""
                }`}
              >
                {city.name}
              </li>
            ))
          )}
        </ul>
      )}

      {error && (
        <p className={`mt-2 text-sm ${theme.error}`}>{error}</p>
      )}
    </div>
  );
}
