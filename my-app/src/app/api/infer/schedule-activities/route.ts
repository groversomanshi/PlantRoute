import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { ScheduleActivitiesSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { scheduleSelectedActivities } from "@/lib/schedule-activities";
import type { Activity, Hotel } from "@/types";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.carbon, null);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(ScheduleActivitiesSchema, body);
  if (validated.error) return validated.error;

  const { activities, startDate, endDate, hotel } = validated.data as {
    activities: Activity[];
    startDate: string;
    endDate: string;
    hotel: Hotel;
  };

  const days = scheduleSelectedActivities(activities, startDate, endDate, hotel);
  return NextResponse.json({ days });
}
