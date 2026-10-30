import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { secondsUntilExpiry, verifyAccessToken } from "@/lib/tokens";

const SECRET = "test-secret-for-vitest-only";

function sign(claims: Record<string, unknown>, exp: string | number = "5m", secret = SECRET) {
  return new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setSubject("user-1").setExpirationTime(exp).sign(new TextEncoder().encode(secret));
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

describe("verifyAccessToken", () => {
  it("returns the session for a valid access token", async () => {
    const token = await sign({ type: "access", role: "PROVIDER", name: "Pat", email: "pat@x.dev" });
    expect(await verifyAccessToken(token)).toEqual({ id: "user-1", role: "PROVIDER", name: "Pat", email: "pat@x.dev" });
  });

  it("rejects refresh tokens, bad signatures and expired tokens", async () => {
    expect(await verifyAccessToken(await sign({ type: "refresh", role: "CUSTOMER" }))).toBeNull();
    expect(await verifyAccessToken(await sign({ type: "access", role: "CUSTOMER" }, "5m", "other-secret"))).toBeNull();
    expect(await verifyAccessToken(await sign({ type: "access", role: "CUSTOMER" }, Math.floor(Date.now() / 1000) - 10))).toBeNull();
    expect(await verifyAccessToken(undefined)).toBeNull();
  });
});

describe("secondsUntilExpiry", () => {
  it("reads exp from the token", async () => {
    const s = secondsUntilExpiry(await sign({ type: "access" }, "10m"));
    expect(s).toBeGreaterThan(590);
    expect(s).toBeLessThanOrEqual(600);
    expect(secondsUntilExpiry("garbage")).toBe(0);
  });
});
