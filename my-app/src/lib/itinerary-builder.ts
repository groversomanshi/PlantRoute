import type {
  Activity,
  Hotel,
  Itinerary,
  ItineraryDay,
  TransportSegment,
  UserPreferences,
  GeoPoint,
} from "@/types";
import { addDays, format, parseISO } from "date-fns";

export function buildCandidateItineraries(
  city: string,
  cityPoint: GeoPoint,
  startDate: string,
  endDate: string,
  activities: Activity[],
  hotels: Hotel[],
  flights: TransportSegment[],
  prefs: UserPreferences
): Itinerary[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const nightCount = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const dayCount = Math.min(14, Math.max(1, nightCount));

  const sortedByInterest = [...activities].sort(
    (a, b) => (b.interest_score ?? 0) - (a.interest_score ?? 0)
  );
  const sortedByEmission = [...activities].sort(
    (a, b) => (a.emission_kg ?? 0) - (b.emission_kg ?? 0)
  );
  const sortedHotelsByStars = [...hotels].sort((a, b) => b.stars - a.stars);
  const sortedHotelsByPrice = [...hotels].sort(
    (a, b) => a.price_per_night_usd - b.price_per_night_usd
  );

  const defaultHotel: Hotel = hotels[0] ?? {
    id: "default-hotel",
    name: "Hotel",
    location: cityPoint,
    price_per_night_usd: 100,
    stars: 3,
  };

  const getDays = (): ItineraryDay[] => {
    const days: ItineraryDay[] = [];
    for (let i = 0; i < dayCount; i++) {
      const date = addDays(start, i);
      days.push({
        date: format(date, "yyyy-MM-dd"),
        activities: [],
        transport: [],
        hotel: defaultHotel,
      });
    }
    return days;
  };

  const assignHotel = (days: ItineraryDay[], hotel: Hotel): void => {
    days.forEach((d) => {
      d.hotel = hotel;
    });
  };

  const distributeActivities = (
    days: ItineraryDay[],
    activityList: Activity[],
    maxPerDay: number
  ): void => {
    let idx = 0;
    for (const day of days) {
      for (let j = 0; j < maxPerDay && idx < activityList.length; j++) {
        day.activities.push(activityList[idx]);
        idx++;
      }
    }
  };

  const addArrivalTransport = (
    days: ItineraryDay[],
    segments: TransportSegment[]
  ): void => {
    if (segments.length > 0 && days.length > 0) {
      days[0].transport.push(segments[0]);
    }
  };

  const totalPrice = (days: ItineraryDay[]): number => {
    let sum = 0;
    const hotel = days[0]?.hotel;
    if (hotel) sum += hotel.price_per_night_usd * days.length;
    days.forEach((d) => {
      d.activities.forEach((a) => (sum += a.price_usd));
      d.transport.forEach((t) => (sum += t.price_usd));
    });
    return sum;
  };

  const totalEmission = (days: ItineraryDay[]): number => {
    let sum = 0;
    days.forEach((d) => {
      d.hotel.emission_kg_per_night && (sum += d.hotel.emission_kg_per_night * 1);
      d.activities.forEach((a) => (sum += a.emission_kg ?? 0));
      d.transport.forEach((t) => (sum += t.emission_kg ?? 0));
    });
    return sum;
  };

  const avgInterest = (days: ItineraryDay[]): number => {
    let total = 0;
    let n = 0;
    days.forEach((d) => {
      d.activities.forEach((a) => {
        total += a.interest_score ?? 0;
        n++;
      });
    });
    return n === 0 ? 0 : total / n;
  };

  // Candidate 0: Best Match — top interest activities, cheapest transport
  const days0 = getDays();
  assignHotel(days0, sortedHotelsByPrice[0] ?? defaultHotel);
  distributeActivities(days0, sortedByInterest, 3);
  addArrivalTransport(days0, flights);

  const itinerary0: Itinerary = {
    id: crypto.randomUUID(),
    city,
    start_date: startDate,
    end_date: endDate,
    days: days0,
    total_price_usd: totalPrice(days0),
    total_emission_kg: totalEmission(days0),
    interest_match_score: avgInterest(days0),
    regret_score: 0,
  };

  // Candidate 1: Low Carbon — lowest emission activities first
  const days1 = getDays();
  assignHotel(days1, sortedHotelsByPrice[0] ?? defaultHotel);
  distributeActivities(days1, sortedByEmission, 3);
  addArrivalTransport(days1, flights);

  const itinerary1: Itinerary = {
    id: crypto.randomUUID(),
    city,
    start_date: startDate,
    end_date: endDate,
    days: days1,
    total_price_usd: totalPrice(days1),
    total_emission_kg: totalEmission(days1),
    interest_match_score: avgInterest(days1),
    regret_score: 0,
  };

  // Candidate 2: Premium — highest rated hotels + mix of activities
  const days2 = getDays();
  assignHotel(days2, sortedHotelsByStars[0] ?? defaultHotel);
  distributeActivities(days2, activities, 3);
  addArrivalTransport(days2, flights);

  const itinerary2: Itinerary = {
    id: crypto.randomUUID(),
    city,
    start_date: startDate,
    end_date: endDate,
    days: days2,
    total_price_usd: totalPrice(days2),
    total_emission_kg: totalEmission(days2),
    interest_match_score: avgInterest(days2),
    regret_score: 0,
  };

  return [itinerary0, itinerary1, itinerary2];
}
