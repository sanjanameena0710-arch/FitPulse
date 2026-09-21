import crypto from "crypto";

const DEVELOPMENT_TOKEN_SECRET = "fitpulse-development-only-token-secret";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenSecret() {
  const secret = process.env.TOKEN_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_SECRET must be set in production.");
  }
  return secret || DEVELOPMENT_TOKEN_SECRET;
}

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

export function isStrongEnoughPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 6 && password.length <= 128;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  if (encodedHash.startsWith("scrypt$")) {
    const [, salt, expectedHex] = encodedHash.split("$");
    if (!salt || !expectedHex) return false;
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  // Legacy compatibility for accounts created before scrypt was introduced.
  const legacy = crypto.createHash("sha256").update(password + "fitpulse_salt_2024").digest("hex");
  const provided = Buffer.from(encodedHash);
  const expected = Buffer.from(legacy);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export function generateToken(userId: number): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}:${crypto.randomUUID()}`;
  const signature = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function parseToken(token: string): number | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const expectedSignature = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const [userIdText, expiresAtText] = payload.split(":");
    const userId = Number(userIdText);
    const expiresAt = Number(expiresAtText);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}
