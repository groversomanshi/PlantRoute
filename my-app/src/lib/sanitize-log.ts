/**
 * Redact secrets from log messages (OWASP: no secrets in logs).
 */
const SECRET_PATTERN = /Bearer\s+\S+|sk-\S+|key[=:]\s*\S+|api[_-]?key[=:]\s*\S+/gi;

export function sanitizeForLog(message: string): string {
  return message.replace(SECRET_PATTERN, "[REDACTED]");
}
