import { decodeJwt, jwtVerify } from "jose";

import type { Role, Session } from "@/types";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "");

/** Verify an access token with the shared secret. Returns null if missing, invalid or expired. */
export async function verifyAccessToken(token: string | undefined): Promise<Session | null> {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.type !== "access" || typeof payload.sub !== "string") return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Seconds until the token expires (0 if unknown/expired). Used to size cookie lifetimes. */
export function secondsUntilExpiry(token: string): number {
  try {
    const { exp } = decodeJwt(token);
    return exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0;
  } catch {
    return 0;
  }
}
