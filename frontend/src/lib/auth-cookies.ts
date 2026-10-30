import type { NextResponse } from "next/server";

import { ACCESS_COOKIE, API_BASE, REFRESH_COOKIE } from "@/lib/config";
import { secondsUntilExpiry } from "@/lib/tokens";
import type { TokenResponse } from "@/types";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookies(response: NextResponse, tokens: Pick<TokenResponse, "access_token" | "refresh_token">) {
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...base, maxAge: secondsUntilExpiry(tokens.access_token) });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge: secondsUntilExpiry(tokens.refresh_token) });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}

/** Exchange a refresh token for a new token pair; null if the session is no longer valid. */
export async function refreshTokens(refreshToken: string | undefined): Promise<TokenResponse | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as TokenResponse) : null;
  } catch {
    return null;
  }
}
