/**
 * Typed Amadeus SDK wrapper. Client is created per-request (key rotation safe).
 * Uses clientId/clientSecret from env (AMADEUS_API_KEY / AMADEUS_API_SECRET).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Amadeus = require("amadeus");

export function createAmadeusClient(): ReturnType<typeof Amadeus> {
  return new Amadeus({
    clientId: process.env.AMADEUS_API_KEY,
    clientSecret: process.env.AMADEUS_API_SECRET,
    logLevel: "silent",
  });
}
