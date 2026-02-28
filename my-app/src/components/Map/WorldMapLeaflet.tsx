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
  hoveredCity?: GeoPoint | null;
  flyToCity?: GeoPoint | null;
}

function createCityIcon(
  avgCarbonKg: number,
  density: number,
  highlighted: boolean
): L.DivIcon {
  const ringColor = avgCarbonKg < 50 ? "#2d6a4f" : avgCarbonKg <= 150 ? "#d47c0f" : "#c1440e";
  const size = highlighted ? 22 : 8 + Math.max(0, density * 8);
  const bg = highlighted ? "#52b788" : "#2d6a4f";
  const border = highlighted ? "3px" : "2px";
  const shadow = highlighted
    ? "0 0 20px rgba(232,93,50,0.6)"
    : "0 2px 8px rgba(0,0,0,0.2)";
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${bg}; border: ${border} solid white;
        border-radius: 50%; box-shadow: ${shadow};
        position: relative; cursor: pointer;
      ">
        <span style="
          position: absolute; inset: -4px; border: 2px solid ${ringColor};
          border-radius: 50%; animation: pulse-ring 2.5s ease-in-out infinite;
        "></span>
      </div>
    `,
    className: "custom-city-marker",
    iconSize: [Math.max(24, size + 8), Math.max(24, size + 8)],
    iconAnchor: [size / 2 + 4, size / 2 + 4],
  });
}

const defaultIcon = createCityIcon(0, 0.5, false);
const highlightedIcon = createCityIcon(0, 0.5, true);

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

function FlyToController({ city }: { city: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!city) return;
    map.flyTo([city.lat, city.lng], 11, { duration: 1500 });
  }, [map, city?.name, city?.lat, city?.lng]);
  return null;
}

export default function WorldMapLeaflet({
  cities,
  onCitySelect,
  hoveredCity = null,
  flyToCity = null,
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

  const isHovered = (city: GeoPoint) =>
    hoveredCity && hoveredCity.name === city.name;

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
      {flyToCity && <FlyToController city={flyToCity} />}
      {cities.map((city) => (
        <Marker
          key={city.name}
          position={[city.lat, city.lng]}
          icon={isHovered(city) ? highlightedIcon : defaultIcon}
          eventHandlers={{
            click: () => onCitySelect(city),
          }}
        />
      ))}
    </MapContainer>
  );
}
