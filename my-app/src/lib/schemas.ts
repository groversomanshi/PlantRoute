import { z } from "zod";

const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().max(200),
});

export const ParsePrefsSchema = z.object({
  text: z.string().min(1).max(2000).trim(),
  userId: z.string().uuid().optional(),
});

export const CarbonRequestSchema = z.object({
  itinerary: z.object({
    id: z.string().uuid(),
    city: z.string().min(1).max(100),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    days: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          activities: z
            .array(
              z.object({
                id: z.string(),
                name: z.string().max(200),
                category: z.string().max(50),
                location: geoPointSchema,
                price_usd: z.number().nonnegative(),
                duration_hours: z.number().positive().max(24),
              })
            )
            .max(20),
          transport: z
            .array(
              z.object({
                id: z.string(),
                mode: z.enum([
                  "flight_short",
                  "flight_long",
                  "train",
                  "bus",
                  "car",
                  "ferry",
                ]),
                origin: geoPointSchema,
                destination: geoPointSchema,
                price_usd: z.number().nonnegative(),
                duration_minutes: z.number().positive().max(10080),
              })
            )
            .max(10),
          hotel: z.object({
            id: z.string(),
            name: z.string().max(200),
            location: geoPointSchema,
            price_per_night_usd: z.number().nonnegative(),
            stars: z.number().int().min(1).max(5),
          }),
        })
      )
      .max(14),
  }),
});

export const ActivitiesQuerySchema = z.object({
  city: z.string().min(1).max(100).trim(),
  interests: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const HotelsQuerySchema = z.object({
  city: z.string().min(1).max(100).trim(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const FlightsQuerySchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(9).default(1),
});

export const SupermemorySaveSchema = z.object({
  userId: z.string().min(1).max(200),
  type: z.enum(["preferences", "trip"]),
  data: z.record(z.string(), z.unknown()),
});

export const SupermemoryRetrieveQuerySchema = z.object({
  userId: z.string().min(1).max(200),
  type: z.enum(["preferences", "trip"]),
});
