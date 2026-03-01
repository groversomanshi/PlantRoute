"use client";

import dynamic from "next/dynamic";
import type { GeoPoint, BasemapKey } from "@/types";
import { CITIES } from "@/lib/cities";

const MapboxMap = dynamic(() => import("./WorldMapMapbox"), { ssr: false });
const LeafletMap = dynamic(() => import("./WorldMapLeaflet"), { ssr: false });

const CITIES_LIST = Object.values(CITIES);

interface WorldMapProps {
  useMapbox: boolean;
  basemap?: BasemapKey;
  onCitySelect: (city: GeoPoint) => void;
  pastTripCities?: string[];
  hoveredCity?: GeoPoint | null;
  flyToCity?: GeoPoint | null;
}

export function WorldMap({
  useMapbox,
  basemap = "outdoors",
  onCitySelect,
  pastTripCities = [],
  hoveredCity = null,
  flyToCity = null,
}: WorldMapProps) {
  const content = useMapbox ? (
    <MapboxMap
      cities={CITIES_LIST}
      pastTripCities={pastTripCities}
      onCitySelect={onCitySelect}
      basemap={basemap}
      hoveredCity={hoveredCity}
      flyToCity={flyToCity}
    />
  ) : (
    <LeafletMap
      cities={CITIES_LIST}
      pastTripCities={pastTripCities}
      onCitySelect={onCitySelect}
      hoveredCity={hoveredCity}
      flyToCity={flyToCity}
    />
  );

  return (
    <div className="w-full h-full" style={{ background: "var(--bg-primary)" }}>
      {content}
    </div>
  );
}
