import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateBody } from "@/lib/validate";
import { ParsePrefsSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { parsePreferencesWithGemini, fallbackParsePreferences } from "@/lib/gemini";
import { sanitizeForLog } from "@/lib/sanitize-log";

export async function POST(req: NextRequest) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // JWT decryption failed; treat as unauthenticated
  }
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.parsePrefs, userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(ParsePrefsSchema, body);
  if (validated.error) return validated.error;

  const { text, userId: bodyUserId } = validated.data;
  const sanitizedText = text.replace(/<[^>]*>/g, "").trim();
  if (!sanitizedText) {
    return NextResponse.json({ error: "Invalid request", details: "text is required" }, { status: 400 });
  }

  let preferences;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey?.trim()) {
    try {
      preferences = await parsePreferencesWithGemini(apiKey, sanitizedText);
    } catch (err) {
      console.error(sanitizeForLog(String(err)));
      preferences = fallbackParsePreferences(sanitizedText);
    }
  } else {
    preferences = fallbackParsePreferences(sanitizedText);
  }

  const effectiveUserId = userId ?? bodyUserId;
  if (effectiveUserId && process.env.SUPERMEMORY_API_KEY?.trim()) {
    try {
      const saveRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/supermemory/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          type: "preferences",
          data: { preferences },
        }),
      });
      if (!saveRes.ok) {
        console.error(sanitizeForLog(await saveRes.text()));
      }
    } catch (e) {
      console.error(sanitizeForLog(String(e)));
    }
  }

  return NextResponse.json({ preferences });
}
