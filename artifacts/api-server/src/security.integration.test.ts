import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@127.0.0.1:5432/fitpulse";
process.env.TOKEN_SECRET = "security-test-secret";
process.env.CORS_ORIGIN = "http://127.0.0.1";

const { default: app } = await import("./app.js");

test("authentication endpoint applies an IP rate limit", async () => {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}/api/auth/login`;

  try {
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "bad" }),
      });
      statuses.push(response.status);
    }
    assert.equal(statuses.slice(0, 20).every(status => status === 400), true);
    assert.equal(statuses[20], 429);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
