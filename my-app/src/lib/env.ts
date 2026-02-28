/**
 * Runtime validation for required server-side env vars.
 * Call at the top of every API route to prevent silent failures with undefined auth headers.
 */
export function validateServerEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
