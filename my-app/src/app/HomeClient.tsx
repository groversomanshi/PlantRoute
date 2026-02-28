"use client";

import { useState, useMemo, useCallback } from "react";
import { WorldMap } from "@/components/Map/WorldMap";
import { CityModal } from "@/components/Map/CityModal";
import { CitySearchBar } from "@/components/Map/CitySearchBar";
import { ItineraryBuilder } from "@/components/Itinerary/ItineraryBuilder";
import { Sidebar } from "@/components/Sidebar";
import type { GeoPoint } from "@/types";

interface HomeClientProps {
  useMapbox: boolean;
}

type BasemapKey = "light" | "outdoors";

export function HomeClient({ useMapbox }: HomeClientProps) {
  const [selectedCity, setSelectedCity] = useState<GeoPoint | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("outdoors");
  const [flyToCity, setFlyToCity] = useState<GeoPoint | null>(null);
  const pastTripCities: string[] = useMemo(() => [], []);

  const handleSearchFlyTo = useCallback((city: GeoPoint) => {
    setFlyToCity(city);
    // Reset flyToCity after animation so repeat searches work
    setTimeout(() => setFlyToCity(null), 2000);
  }, []);

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
                  onCitySelect={setSelectedCity}
                  onFlyTo={handleSearchFlyTo}
                />
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
