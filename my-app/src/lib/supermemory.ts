/**
 * Supermemory wrapper for saving/retrieving user preferences and trip history.
 * Client is instantiated per-request (key rotation safe).
 */
import Supermemory from "supermemory";
import type { UserPreferences, UserProfile } from "@/types";

const TIMEOUT_MS = 10000;

export function createSupermemoryClient(): InstanceType<typeof Supermemory> {
  return new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY ?? "",
    timeout: TIMEOUT_MS,
  });
}

export async function saveMemory(
  client: InstanceType<typeof Supermemory>,
  userId: string,
  type: "preferences" | "trip",
  data: object
): Promise<{ success: boolean; memoryId: string }> {
  const content = JSON.stringify(data);
  const tag = `user-${userId}`;
  const res = await client.documents.add({
    content,
    containerTag: tag,
    metadata: { type, userId },
  });
  return {
    success: true,
    memoryId: (res as { id?: string }).id ?? "unknown",
  };
}

export async function retrieveMemory(
  client: InstanceType<typeof Supermemory>,
  userId: string,
  type: "preferences" | "trip"
): Promise<object | null> {
  try {
    const list = await client.documents.list({
      containerTags: [`user-${userId}`],
      includeContent: true,
      limit: 50,
      sort: "updatedAt",
      order: "desc",
    });
    const memories = (list as { memories?: Array<{ content?: string; metadata?: Record<string, unknown>; updatedAt?: string }> })
      .memories ?? [];
    const withType = memories.filter(
      (m) => (m.metadata as Record<string, string>)?.type === type
    );
    const mostRecent = withType[0];
    if (!mostRecent?.content) return null;
    return JSON.parse(mostRecent.content) as object;
  } catch {
    return null;
  }
}

export function buildProfileFromMemories(
  userId: string,
  preferencesData: UserPreferences | null,
  tripData: { past_trips?: string[] } | null
): UserProfile {
  return {
    id: userId,
    preferences: preferencesData ?? {
      interests: [],
      budget_level: "mid",
      carbon_sensitivity: "medium",
      avoid_flying: false,
      party_size: 1,
    },
    trip_count: tripData?.past_trips?.length ?? 0,
    past_trips: tripData?.past_trips ?? [],
  };
}
