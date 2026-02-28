import type { Activity, Hotel } from "@/types";

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "mock-act-1",
    name: "City Museum",
    category: "museum",
    location: { lat: 0, lng: 0, name: "City Center" },
    price_usd: 15,
    duration_hours: 2,
    interest_score: 0.8,
  },
  {
    id: "mock-act-2",
    name: "Local Food Tour",
    category: "restaurant",
    location: { lat: 0, lng: 0, name: "Old Town" },
    price_usd: 45,
    duration_hours: 3,
    interest_score: 0.9,
  },
  {
    id: "mock-act-3",
    name: "Central Park Walk",
    category: "outdoor",
    location: { lat: 0, lng: 0, name: "Park" },
    price_usd: 0,
    duration_hours: 1.5,
    interest_score: 0.7,
  },
  {
    id: "mock-act-4",
    name: "Historic District",
    category: "museum",
    location: { lat: 0, lng: 0, name: "Historic" },
    price_usd: 10,
    duration_hours: 2,
    interest_score: 0.75,
  },
  {
    id: "mock-act-5",
    name: "Evening Rooftop Bar",
    category: "nightlife",
    location: { lat: 0, lng: 0, name: "Downtown" },
    price_usd: 25,
    duration_hours: 2,
    interest_score: 0.6,
  },
];

export const MOCK_HOTELS: Hotel[] = [
  {
    id: "mock-hotel-1",
    name: "Central Inn",
    location: { lat: 0, lng: 0, name: "Center" },
    price_per_night_usd: 120,
    stars: 4,
  },
  {
    id: "mock-hotel-2",
    name: "Green Stay Hotel",
    location: { lat: 0, lng: 0, name: "Center" },
    price_per_night_usd: 85,
    stars: 3,
  },
  {
    id: "mock-hotel-3",
    name: "Luxury Plaza",
    location: { lat: 0, lng: 0, name: "Center" },
    price_per_night_usd: 280,
    stars: 5,
  },
];
