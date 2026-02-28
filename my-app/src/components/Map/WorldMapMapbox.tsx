"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoPoint } from "@/types";

interface WorldMapMapboxProps {
  cities: GeoPoint[];
  pastTripCities: string[];
  onCitySelect: (city: GeoPoint) => void;
}

export default function WorldMapMapbox({
  cities,
  onCitySelect,
}: WorldMapMapboxProps) {
  const [Map, setMap] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [Marker, setMarker] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    import("react-map-gl/mapbox").then((mod) => {
      setMap(() => mod.default as React.ComponentType<Record<string, unknown>>);
      setMarker(() => mod.Marker as unknown as React.ComponentType<Record<string, unknown>>);
    });
  }, []);

  const handleClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      const city = cities.find(
        (c) => Math.abs(c.lng - e.lngLat.lng) < 1 && Math.abs(c.lat - e.lngLat.lat) < 1
      );
      if (city) onCitySelect(city);
    },
    [cities, onCitySelect]
  );

  if (!Map || !Marker) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading map…</p>
      </div>
    );
  }

  // Markers are react-map-gl <Marker> with latitude/longitude only — no CSS top/left; they stay pinned to coordinates.
  return (
    <Map
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      onClick={handleClick}
    >
      {cities.map((city) => (
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
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--accent-green)",
              border: "2px solid white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              cursor: "pointer",
            }}
          />
        </Marker>
      ))}
    </Map>
  );
}
