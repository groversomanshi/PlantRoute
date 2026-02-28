import { NextRequest, NextResponse } from "next/server";
import { validateBody } from "@/lib/validate";
import { RegretRequestSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sanitizeForLog } from "@/lib/sanitize-log";

type Engine = "preference" | "regret_protection";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.regret, null);
  if (rateLimitResponse) return rateLimitResponse;

  const engineParam = req.nextUrl.searchParams.get("engine") as Engine | null;
  const engine: Engine =
    engineParam === "regret_protection" ? "regret_protection" : "preference";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(RegretRequestSchema, body);
  if (validated.error) return validated.error;

  const modalToken = process.env.MODAL_TOKEN?.trim();
  const preferenceUrl = process.env.MODAL_PREFERENCE_URL?.trim();
  const regretUrl = process.env.MODAL_REGRET_URL?.trim();

  const url =
    engine === "regret_protection" ? regretUrl : preferenceUrl;
  if (!modalToken || !url) {
    return NextResponse.json(
      {
        error: "Regret inference requires Modal. Set MODAL_TOKEN and MODAL_PREFERENCE_URL (or MODAL_REGRET_URL).",
      },
      { status: 503 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modalToken}`,
      },
      body: JSON.stringify(validated.data),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text();
      console.error(sanitizeForLog(`Modal regret (${engine}): ${res.status} ${text}`));
      return NextResponse.json(
        { error: "Regret inference failed", status: res.status },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error(sanitizeForLog(String(e)));
    return NextResponse.json(
      { error: "Regret inference request failed" },
      { status: 502 }
    );
  }
}
