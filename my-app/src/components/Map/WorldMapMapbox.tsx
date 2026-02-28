"use client";

import { useCallback } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
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
  const handleClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      const city = cities.find(
        (c) => Math.abs(c.lng - e.lngLat.lng) < 1 && Math.abs(c.lat - e.lngLat.lat) < 1
      );
      if (city) onCitySelect(city);
    },
    [cities, onCitySelect]
  );

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
