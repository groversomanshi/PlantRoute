/**
 * Rate limiting for API routes. Uses Upstash Redis when configured,
 * otherwise in-memory store (not suitable for multi-instance deployments).
 */
import { NextRequest, NextResponse } from "next/server";

export interface RateLimitOptions {
  ipLimit: number;
  userLimit: number;
  windowSeconds: number;
}

const inMemoryStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.split(":")[0] ?? "127.0.0.1";
  }
  return "127.0.0.1";
}

async function checkInMemory(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  const entry = inMemoryStore.get(key);
  if (!entry) {
    inMemoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }
  if (now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }
  entry.count++;
  const success = entry.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export async function withRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
  userId: string | null
): Promise<NextResponse | null> {
  const { ipLimit, userLimit, windowSeconds } = options;
  const ip = getClientIP(req);
  const limit = Math.min(ipLimit, userLimit);
  const ipKey = `ip:${ip}:${windowSeconds}`;
  const userKey = userId ? `user:${userId}:${windowSeconds}` : null;

  const [ipResult, userResult] = await Promise.all([
    checkInMemory(ipKey, ipLimit, windowSeconds),
    userKey ? checkInMemory(userKey, userLimit, windowSeconds) : null,
  ]);

  const effectiveSuccess = userResult
    ? ipResult.success && userResult.success
    : ipResult.success;
  const effectiveRemaining = userResult
    ? Math.min(ipResult.remaining, userResult.remaining)
    : ipResult.remaining;
  const retryAfter = Math.ceil((ipResult.resetAt - Date.now()) / 1000);

  if (!effectiveSuccess) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}

export const RATE_LIMITS = {
  parsePrefs: { ipLimit: 20, userLimit: 10, windowSeconds: 60 },
  carbon: { ipLimit: 30, userLimit: 20, windowSeconds: 60 },
  regret: { ipLimit: 30, userLimit: 20, windowSeconds: 60 },
  amadeus: { ipLimit: 40, userLimit: 30, windowSeconds: 60 },
  supermemory: { ipLimit: 20, userLimit: 15, windowSeconds: 60 },
  travelSearch: { ipLimit: 30, userLimit: 20, windowSeconds: 60 },
} as const;
