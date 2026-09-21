import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  generateToken,
  hashPassword,
  isStrongEnoughPassword,
  isValidEmail,
  normalizeEmail,
  parseToken,
  verifyPassword,
} from "./auth.js";

process.env.NODE_ENV = "test";
process.env.TOKEN_SECRET = "security-test-secret";

test("password hashes are salted and verify only the original password", () => {
  const first = hashPassword("correct-password");
  const second = hashPassword("correct-password");
  assert.notEqual(first, second);
  assert.equal(verifyPassword("correct-password", first), true);
  assert.equal(verifyPassword("wrong-password", first), false);
});

test("legacy password hashes remain verifiable during migration", () => {
  const legacy = crypto.createHash("sha256").update("legacy-passwordfitpulse_salt_2024").digest("hex");
  assert.equal(verifyPassword("legacy-password", legacy), true);
});

test("tokens are signed and tampering is rejected", () => {
  const token = generateToken(42);
  assert.equal(parseToken(token), 42);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from("43:9999999999999:forged", "utf8").toString("base64url");
  assert.equal(parseToken(`${forgedPayload}.${signature}`), null);
  assert.equal(parseToken(`${token}tampered`), null);
});

test("auth input helpers enforce normalization and length limits", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isStrongEnoughPassword("123456"), true);
  assert.equal(isStrongEnoughPassword("123"), false);
  assert.equal(isStrongEnoughPassword("x".repeat(129)), false);
});
