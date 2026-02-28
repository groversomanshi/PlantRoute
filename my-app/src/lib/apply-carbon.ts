import type { Itinerary, CarbonResult } from "@/types";

/**
 * Maps CarbonResult items back onto the itinerary by id and type.
 * Updates emission_kg on activities and transport segments, emission_kg_per_night on hotels.
 */
export function applyCarbonResult(itinerary: Itinerary, carbon: CarbonResult): Itinerary {
  const byId = new Map<string, number>();
  for (const item of carbon.items) {
    byId.set(`${item.type}:${item.id}`, item.emission_kg);
  }

  const days = itinerary.days.map((day) => ({
    ...day,
    activities: day.activities.map((a) => ({
      ...a,
      emission_kg: byId.get(`activity:${a.id}`) ?? a.emission_kg,
    })),
    transport: day.transport.map((t) => ({
      ...t,
      emission_kg: byId.get(`transport:${t.id}`) ?? t.emission_kg,
    })),
    hotel: day.hotel
      ? {
          ...day.hotel,
          emission_kg_per_night:
            byId.get(`hotel:${day.hotel.id}`) ?? day.hotel.emission_kg_per_night,
        }
      : day.hotel,
  }));

  return {
    ...itinerary,
    days,
    total_emission_kg: carbon.total_kg,
  };
}
