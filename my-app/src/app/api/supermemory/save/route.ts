import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateBody } from "@/lib/validate";
import { SupermemorySaveSchema } from "@/lib/schemas";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createSupermemoryClient, saveMemory } from "@/lib/supermemory";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await withRateLimit(req, RATE_LIMITS.supermemory, userId);
  if (rateLimitResponse) return rateLimitResponse;

  if (!process.env.SUPERMEMORY_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supermemory not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(SupermemorySaveSchema, body);
  if (validated.error) return validated.error;

  const { userId: bodyUserId, type, data } = validated.data;
  if (bodyUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = createSupermemoryClient();
    const result = await saveMemory(client, userId, type, data);
    return NextResponse.json({ success: true, memoryId: result.memoryId });
  } catch (e) {
    console.error(String(e));
    return NextResponse.json(
      { error: "Failed to save" },
      { status: 500 }
    );
  }
}
