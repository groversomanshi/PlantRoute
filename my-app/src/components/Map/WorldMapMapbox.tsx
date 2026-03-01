"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoPoint } from "@/types";

const BASEMAP_STYLES: Record<import("@/types").BasemapKey, string> = {
  light: "mapbox://styles/mapbox/light-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
};

interface WorldMapMapboxProps {
  cities: GeoPoint[];
  pastTripCities: string[];
  onCitySelect: (city: GeoPoint) => void;
  basemap?: import("@/types").BasemapKey;
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
  const isLightStyle = basemap === "light" || basemap === "streets" || basemap === "outdoors";
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(false);
  }, [basemap]);

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
    <div className={`w-full h-full ${isLightStyle ? "map-light-tint" : ""}`}>
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={BASEMAP_STYLES[basemap]}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      onClick={handleClick}
      onLoad={() => setMapReady(true)}
    >
      {mapReady &&
        cities.map((city) => {
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
