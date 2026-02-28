"use client";

import { useState, useMemo } from "react";
import { WorldMap } from "@/components/Map/WorldMap";
import { CityModal } from "@/components/Map/CityModal";
import { ItineraryBuilder } from "@/components/Itinerary/ItineraryBuilder";
import { Header } from "@/components/Header";
import type { GeoPoint } from "@/types";

interface HomeClientProps {
  useMapbox: boolean;
}

export function HomeClient({ useMapbox }: HomeClientProps) {
  const [selectedCity, setSelectedCity] = useState<GeoPoint | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const pastTripCities: string[] = useMemo(() => [], []);

  return (
    <>
      <Header />
      <main className="w-full h-screen min-h-screen" style={{ paddingTop: "4rem" }}>
        <WorldMap
          useMapbox={useMapbox}
          onCitySelect={setSelectedCity}
          pastTripCities={pastTripCities}
        />
      </main>

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
    </>
  );
}
