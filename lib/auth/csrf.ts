import * as crypto from "crypto";

const CSRF_SECRET =
  process.env.SESSION_SECRET ||
  "default_super_secret_for_csrf_protection_key_2026_at_least_32_chars";

export function generateCsrfToken(sessionId: string): string {
  return crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(sessionId)
    .digest("hex");
}

export function verifyCsrfToken(
  sessionId: string,
  providedToken?: string | null
): boolean {
  if (!sessionId || !providedToken) return false;
  const expected = generateCsrfToken(sessionId);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(providedToken)
    );
  } catch {
    return false;
  }
}
