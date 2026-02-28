import type { ZodSchema } from "zod";
import { NextResponse } from "next/server";

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}

export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(query);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
