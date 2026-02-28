"use client";

import dynamic from "next/dynamic";
import type { GeoPoint } from "@/types";
import { CITIES } from "@/lib/cities";

const MapboxMap = dynamic(() => import("./WorldMapMapbox"), { ssr: false });
const LeafletMap = dynamic(() => import("./WorldMapLeaflet"), { ssr: false });

const CITIES_LIST = Object.values(CITIES);

interface WorldMapProps {
  useMapbox: boolean;
  onCitySelect: (city: GeoPoint) => void;
  pastTripCities?: string[];
}

export function WorldMap({ useMapbox, onCitySelect, pastTripCities = [] }: WorldMapProps) {
  const content = useMapbox ? (
    <MapboxMap cities={CITIES_LIST} pastTripCities={pastTripCities} onCitySelect={onCitySelect} />
  ) : (
    <LeafletMap cities={CITIES_LIST} pastTripCities={pastTripCities} onCitySelect={onCitySelect} />
  );

  return (
    <div className="w-full h-full min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {content}
    </div>
  );
}
