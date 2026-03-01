import { getAirportCoords } from "@/lib/airport-coords";
import { haversine } from "@/lib/haversine";
import { EMISSION_FACTORS, RADIATIVE_FORCING_MULTIPLIER } from "@/lib/carbon";
import type { TransportSegment } from "@/types";

export function addDistanceAndEmission(seg: TransportSegment): TransportSegment {
  const origCoords = getAirportCoords(seg.origin.name);
  const destCoords = getAirportCoords(seg.destination.name);
  let distance_km = seg.distance_km;
  if (distance_km == null && origCoords && destCoords) {
    distance_km = haversine(origCoords[0], origCoords[1], destCoords[0], destCoords[1]);
    distance_km = Math.round(distance_km * 100) / 100;
  }
  if (distance_km == null) distance_km = 0;
  const isLong = distance_km >= 1500;
  const factor = isLong ? EMISSION_FACTORS.flight_long : EMISSION_FACTORS.flight_short;
  const emission_kg = Math.round(
    distance_km * factor * RADIATIVE_FORCING_MULTIPLIER * 1000
  ) / 1000;
  const origin = origCoords
    ? { ...seg.origin, lat: origCoords[0], lng: origCoords[1] }
    : seg.origin;
  const destination = destCoords
    ? { ...seg.destination, lat: destCoords[0], lng: destCoords[1] }
    : seg.destination;
  return { ...seg, origin, destination, distance_km, emission_kg };
}
