import crypto from "crypto";

const DEVELOPMENT_TOKEN_SECRET = "fitpulse-development-only-token-secret";

function tokenSecret() {
  return process.env.TOKEN_SECRET || DEVELOPMENT_TOKEN_SECRET;
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fitpulse_salt_2024").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: number): string {
  const payload = `${userId}:${Date.now()}:${crypto.randomUUID()}`;
  const signature = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function parseToken(token: string): number | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const expected = crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }
    const userId = Number(payload.split(":")[0]);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
