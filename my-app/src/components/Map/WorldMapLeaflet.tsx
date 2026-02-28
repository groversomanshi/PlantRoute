"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoPoint } from "@/types";

import "leaflet/dist/leaflet.css";

interface WorldMapLeafletProps {
  cities: GeoPoint[];
  pastTripCities: string[];
  onCitySelect: (city: GeoPoint) => void;
}

function createCityIcon(avgCarbonKg: number, density: number): L.DivIcon {
  const ringColor = avgCarbonKg < 50 ? "#2d6a4f" : avgCarbonKg <= 150 ? "#d47c0f" : "#c1440e";
  const size = 8 + Math.max(0, density * 8);
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: #2d6a4f; border: 2px solid white;
        border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        position: relative; cursor: pointer;
      ">
        <span style="
          position: absolute; inset: -4px; border: 2px solid ${ringColor};
          border-radius: 50%; animation: pulse-ring 2.5s ease-in-out infinite;
        "></span>
      </div>
    `,
    className: "custom-city-marker",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const defaultIcon = createCityIcon(0, 0.5);

function MapPaneFilter() {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane("tilePane");
    if (pane) {
      pane.style.filter = "sepia(20%) saturate(0.9) brightness(1.05)";
    }
  }, [map]);
  return null;
}

export default function WorldMapLeaflet({
  cities,
  onCitySelect,
}: WorldMapLeafletProps) {
  // Fix default Leaflet icon 404s when not using custom icon
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      zoomControl={true}
      className="w-full h-full min-h-screen"
      style={{ height: "100%", minHeight: "100vh" }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapPaneFilter />
      {cities.map((city) => (
        <Marker
          key={city.name}
          position={[city.lat, city.lng]}
          icon={defaultIcon}
          eventHandlers={{
            click: () => onCitySelect(city),
          }}
        />
      ))}
    </MapContainer>
  );
}
