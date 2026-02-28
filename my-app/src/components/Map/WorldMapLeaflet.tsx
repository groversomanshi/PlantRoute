"use client";

import { useEffect, useRef } from "react";
import type { GeoPoint } from "@/types";

interface WorldMapLeafletProps {
  cities: GeoPoint[];
  pastTripCities: string[];
  onCitySelect: (city: GeoPoint) => void;
}

function createMarkerIcon(avgCarbonKg: number, density: number) {
  const ringColor = avgCarbonKg < 50 ? "#2d6a4f" : avgCarbonKg <= 150 ? "#d47c0f" : "#c1440e";
  const size = 8 + Math.max(0, density * 8);
  return `
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
  `;
}

export default function WorldMapLeaflet({
  cities,
  onCitySelect,
}: WorldMapLeafletProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });

    const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const pane = map.getPane("tilePane");
    if (pane) {
      pane.style.filter = "sepia(20%) saturate(0.9) brightness(1.05)";
    }

    const markers: ReturnType<typeof L.marker>[] = [];
    cities.forEach((city) => {
      const icon = L.divIcon({
        html: createMarkerIcon(0, 0.5),
        className: "custom-city-marker",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([city.lat, city.lng], { icon });
      marker.on("click", () => onCitySelect(city));
      marker.addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [cities, onCitySelect]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-screen" />
  );
}
