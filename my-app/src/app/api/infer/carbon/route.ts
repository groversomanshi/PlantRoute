import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { CarbonRequestSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { carbonPredictorLocal } from "@/lib/carbon-local";
import type { Itinerary, CarbonResult } from "@/types";
import { sanitizeForLog } from "@/lib/sanitize-log";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.carbon, null);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(CarbonRequestSchema, body);
  if (validated.error) return validated.error;

  const itinerary = validated.data.itinerary as unknown as Itinerary;
  const modalToken = process.env.MODAL_TOKEN?.trim();

  if (modalToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(
        process.env.MODAL_CARBON_URL ?? "https://api.modal.com/v1/functions/call",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${modalToken}`,
          },
          body: JSON.stringify({ itinerary_json: itinerary }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as CarbonResult;
        return NextResponse.json(data);
      }
    } catch (e) {
      console.error(sanitizeForLog(String(e)));
    }
  }

  const result = carbonPredictorLocal(itinerary);
  return NextResponse.json(result);
}
