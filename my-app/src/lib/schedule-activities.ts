/**
 * Schedules selected activities into daily plans, optimizing for:
 * - Geographic proximity (minimize travel between activities)
 * - Lower carbon (prefer walking for short distances)
 */
import type { Activity, Hotel, ItineraryDay, TransportSegment } from "@/types";
import { addDays, format, parseISO } from "date-fns";
import { haversine } from "./haversine";
import { EMISSION_FACTORS } from "./carbon";

const WALK_THRESHOLD_KM = 2;
const BUS_FACTOR = EMISSION_FACTORS.bus ?? 0.08;
const WALK_SPEED_KMH = 4;
const BUS_SPEED_KMH = 20;
const BUS_PRICE_PER_KM = 0.15;

function dist(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): number {
  return haversine(origin.lat, origin.lng, dest.lat, dest.lng);
}

/** Nearest-neighbor ordering from hotel, minimizing total travel. */
function orderActivitiesByProximity(
  activities: Activity[],
  hotelLocation: { lat: number; lng: number }
): Activity[] {
  if (activities.length <= 1) return [...activities];
  const ordered: Activity[] = [];
  let remaining = [...activities];
  let current = hotelLocation;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = dist(current, remaining[0].location);
    for (let i = 1; i < remaining.length; i++) {
      const d = dist(current, remaining[i].location);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining[bestIdx];
    ordered.push(next);
    current = next.location;
    remaining.splice(bestIdx, 1);
  }
  return ordered;
}

function createTransportSegment(
  origin: { lat: number; lng: number; name: string },
  dest: { lat: number; lng: number; name: string },
  id: string
): TransportSegment {
  const distance_km = dist(origin, dest);
  const isWalk = distance_km <= WALK_THRESHOLD_KM;
  const mode = isWalk ? "walk" : "bus";
  const emission_kg = isWalk ? 0 : Math.round(distance_km * BUS_FACTOR * 1000) / 1000;
  const duration_minutes = isWalk
    ? Math.ceil((distance_km / WALK_SPEED_KMH) * 60)
    : Math.ceil((distance_km / BUS_SPEED_KMH) * 60);
  const price_usd = isWalk ? 0 : Math.round(distance_km * BUS_PRICE_PER_KM * 100) / 100;

  return {
    id,
    mode,
    origin: { ...origin, lat: origin.lat, lng: origin.lng },
    destination: { ...dest, lat: dest.lat, lng: dest.lng },
    distance_km: Math.round(distance_km * 100) / 100,
    emission_kg,
    price_usd,
    duration_minutes: Math.max(5, duration_minutes),
  };
}

export function scheduleSelectedActivities(
  activities: Activity[],
  startDate: string,
  endDate: string,
  hotel: Hotel
): ItineraryDay[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const dayCount = Math.min(
    14,
    Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  );

  const hotelLoc = hotel.location;
  const days: ItineraryDay[] = [];

  const maxPerDay = Math.max(2, Math.ceil(activities.length / dayCount));
  let activityIdx = 0;

  for (let d = 0; d < dayCount; d++) {
    const date = format(addDays(start, d), "yyyy-MM-dd");
    const dayActivities: Activity[] = [];
    for (let i = 0; i < maxPerDay && activityIdx < activities.length; i++) {
      dayActivities.push(activities[activityIdx]);
      activityIdx++;
    }

    const ordered = orderActivitiesByProximity(dayActivities, hotelLoc);
    const transport: TransportSegment[] = [];

    let prev = hotelLoc;
    for (let i = 0; i < ordered.length; i++) {
      const act = ordered[i];
      transport.push(
        createTransportSegment(
          { ...prev, name: prev.name ?? "Hotel" },
          act.location,
          `seg-${date}-${i}-to-${act.id}`
        )
      );
      prev = act.location;
    }
    if (ordered.length > 0) {
      transport.push(
        createTransportSegment(
          { ...prev, name: prev.name ?? "Last stop" },
          hotelLoc,
          `seg-${date}-return-hotel`
        )
      );
    }

    days.push({
      date,
      activities: ordered,
      transport,
      hotel,
    });
  }

  return days;
}
