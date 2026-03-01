import type { UserPreferences } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a travel preference parser. Output ONLY valid JSON matching this schema (no markdown, no code fences):
{
  "interests": string[],
  "budget_level": "budget" | "mid" | "luxury",
  "carbon_sensitivity": "low" | "medium" | "high",
  "avoid_flying": boolean,
  "party_size": number
}
Infer from the user's message. interests: e.g. ["culture", "food", "nature", "adventure", "museum", "outdoor", "restaurant", "nightlife", "wellness", "beach", "ski"]. party_size defaults to 1. avoid_flying: true if they say they hate flying or prefer trains. carbon_sensitivity: high if they care about carbon/low emissions.`;

export async function parsePreferencesWithGemini(
  apiKey: string,
  text: string
): Promise<UserPreferences> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text }] }],
    systemInstruction: SYSTEM_PROMPT,
  });
  const response = result.response;
  const raw = response.text();
  if (!raw?.trim()) {
    return fallbackParsePreferences(text);
  }
  const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      budget_level:
        parsed.budget_level === "budget" ||
        parsed.budget_level === "mid" ||
        parsed.budget_level === "luxury"
          ? parsed.budget_level
          : "mid",
      carbon_sensitivity:
        parsed.carbon_sensitivity === "low" ||
        parsed.carbon_sensitivity === "medium" ||
        parsed.carbon_sensitivity === "high"
          ? parsed.carbon_sensitivity
          : "medium",
      avoid_flying: Boolean(parsed.avoid_flying),
      party_size:
        typeof parsed.party_size === "number" && parsed.party_size >= 1
          ? Math.min(9, Math.floor(parsed.party_size))
          : 1,
      raw_text: text,
    };
  } catch {
    return fallbackParsePreferences(text);
  }
}

/** Suggest one hotel from the list that is best for proximity to the selected attractions. */
export async function suggestHotelByProximity(
  apiKey: string,
  city: string,
  selectedAttractions: Array<{ id: string; name: string; location: { lat: number; lng: number; name: string } }>,
  hotels: Array<{ id: string; name: string }>
): Promise<{ hotelId: string; reason: string }> {
  if (hotels.length === 0) {
    return { hotelId: "", reason: "No hotels available." };
  }
  if (hotels.length === 1) {
    return { hotelId: hotels[0]!.id, reason: "Only one hotel available." };
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const attractionList = selectedAttractions
    .map((a) => `${a.name} (${a.location.name ?? city})`)
    .join(", ");
  const hotelList = hotels.map((h) => `${h.id}: ${h.name}`).join("\n");
  const prompt = `The traveler is visiting "${city}" and has selected these attractions they want to visit: ${attractionList}.

Here are the available hotels (id and name):
${hotelList}

Which hotel is best for proximity to these attractions (most central / convenient base)? Reply with ONLY valid JSON, no markdown:
{ "hotelId": "<exact id from the list>", "reason": "<one short sentence>" }`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const raw = result.response.text();
  if (!raw?.trim()) {
    return { hotelId: hotels[0]!.id, reason: "Central option for your stay." };
  }
  const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { hotelId?: string; reason?: string };
    const id = String(parsed.hotelId ?? "").trim();
    const found = hotels.some((h) => h.id === id);
    return {
      hotelId: found ? id : hotels[0]!.id,
      reason: String(parsed.reason ?? "Central location for your selected attractions.").slice(0, 200),
    };
  } catch {
    return { hotelId: hotels[0]!.id, reason: "Central option for your stay." };
  }
}

/** Simple keyword-based fallback when Gemini is not configured. */
export function fallbackParsePreferences(text: string): UserPreferences {
  const t = text.toLowerCase();
  const interests: string[] = [];
  if (/\b(food|eat|local cuisine|restaurant)\b/.test(t)) interests.push("food", "restaurant");
  if (/\b(museum|art|history|culture)\b/.test(t)) interests.push("culture", "museum");
  if (/\b(nature|hiking|outdoor|park)\b/.test(t)) interests.push("nature", "outdoor");
  if (/\b(beach|sea|sun)\b/.test(t)) interests.push("beach");
  if (/\b(nightlife|bar|club)\b/.test(t)) interests.push("nightlife");
  if (/\b(wellness|spa|relax)\b/.test(t)) interests.push("wellness");
  if (/\b(ski|snow)\b/.test(t)) interests.push("ski");
  if (interests.length === 0) interests.push("culture", "outdoor");

  let budget_level: "budget" | "mid" | "luxury" = "mid";
  if (/\b(budget|cheap|low cost)\b/.test(t)) budget_level = "budget";
  if (/\b(luxury|fancy|high end|5 star)\b/.test(t)) budget_level = "luxury";

  let carbon_sensitivity: "low" | "medium" | "high" = "medium";
  if (/\b(carbon|emission|green|sustainable|eco)\b/.test(t)) carbon_sensitivity = "high";

  const avoid_flying = /\b(hate flying|avoid flying|train|no fly)\b/.test(t);

  const partyMatch = t.match(/\b(\d+)\s*(people|adults|travelers)?\b/);
  const party_size = partyMatch ? Math.min(9, Math.max(1, parseInt(partyMatch[1], 10))) : 1;

  return {
    interests: [...new Set(interests)],
    budget_level,
    carbon_sensitivity,
    avoid_flying,
    party_size,
    raw_text: text,
  };
}
