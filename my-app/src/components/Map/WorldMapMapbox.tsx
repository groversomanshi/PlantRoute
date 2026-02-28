"use client";

import { useCallback, useRef, useEffect } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoPoint } from "@/types";

const BASEMAP_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
} as const;

type BasemapKey = keyof typeof BASEMAP_STYLES;

interface WorldMapMapboxProps {
  cities: GeoPoint[];
  pastTripCities: string[];
  onCitySelect: (city: GeoPoint) => void;
  basemap?: BasemapKey;
  hoveredCity?: GeoPoint | null;
  flyToCity?: GeoPoint | null;
}

export default function WorldMapMapbox({
  cities,
  onCitySelect,
  basemap = "outdoors",
  hoveredCity = null,
  flyToCity = null,
}: WorldMapMapboxProps) {
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (!flyToCity || !mapRef.current) return;
    const map = mapRef.current.getMap();
    map.flyTo({
      center: [flyToCity.lng, flyToCity.lat],
      zoom: 11,
      duration: 1500,
    });
  }, [flyToCity?.name, flyToCity?.lat, flyToCity?.lng]);

  const handleClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      const city = cities.find(
        (c) => Math.abs(c.lng - e.lngLat.lng) < 1 && Math.abs(c.lat - e.lngLat.lat) < 1
      );
      if (city) onCitySelect(city);
    },
    [cities, onCitySelect]
  );

  const isHovered = (city: GeoPoint) =>
    hoveredCity && hoveredCity.name === city.name;

  return (
    <div className={`w-full h-full ${basemap === "light" ? "map-light-tint" : ""}`}>
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={BASEMAP_STYLES[basemap]}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      onClick={handleClick}
    >
      {cities.map((city) => {
        const highlighted = isHovered(city);
        return (
          <Marker
            key={city.name}
            longitude={city.lng}
            latitude={city.lat}
            anchor="center"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation();
              onCitySelect(city);
            }}
          >
            <div
              style={{
                width: highlighted ? 22 : 16,
                height: highlighted ? 22 : 16,
                borderRadius: "50%",
                background: highlighted ? "#52b788" : "var(--accent-green)",
                border: highlighted ? "3px solid white" : "2px solid white",
                boxShadow: highlighted
                  ? "0 0 20px rgba(232,93,50,0.6)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            />
          </Marker>
        );
      })}
    </Map>
    </div>
  );
}
