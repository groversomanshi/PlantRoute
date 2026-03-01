import { NextRequest, NextResponse } from "next/server";
import { quickSearchWithGemini } from "@/lib/gemini";

/**
 * POST /api/search — Quick AI search (testing only).
 * Body: { query: string }
 * Uses Gemini with Google Search grounding.
 */
export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const hasKey = !!(process.env.GEMINI_API_KEY ?? "").trim();
  if (!hasKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is not set. Add it to .env.local (e.g. GEMINI_API_KEY=your_key) and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const result = await quickSearchWithGemini(query);
  if (result.ok) {
    return NextResponse.json({ text: result.text });
  }
  if (result.rateLimit && result.retryAfterSeconds) {
    return NextResponse.json(
      {
        error: result.error,
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      }
    );
  }
  if (result.rateLimit) {
    return NextResponse.json({ error: result.error }, { status: 429 });
  }
  return NextResponse.json(
    {
      error:
        result.error === "GEMINI_API_KEY not set"
          ? "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server."
          : "Gemini request failed. Check the terminal for details.",
    },
    { status: 503 }
  );
}
