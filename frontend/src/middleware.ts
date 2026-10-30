import { type NextRequest, NextResponse } from "next/server";

import { clearAuthCookies, refreshTokens, setAuthCookies } from "@/lib/auth-cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/config";
import { verifyAccessToken } from "@/lib/tokens";
import type { Session } from "@/types";

const PROTECTED = ["/dashboard", "/provider", "/bookings"];
const PROVIDER_ONLY = ["/provider"];
const GUEST_ONLY = ["/login", "/register", "/forgot-password", "/reset-password"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let session: Session | null = await verifyAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);
  let refreshed = null;
  let clear = false;

  // Access token expired but we still have a refresh token: renew silently
  if (!session && request.cookies.has(REFRESH_COOKIE)) {
    refreshed = await refreshTokens(request.cookies.get(REFRESH_COOKIE)?.value);
    if (refreshed) {
      session = await verifyAccessToken(refreshed.access_token);
      // Make the new token visible to Server Components rendering this same request
      request.cookies.set(ACCESS_COOKIE, refreshed.access_token);
    } else {
      clear = true;
    }
  }

  let response: NextResponse;
  if (!session && matches(pathname, PROTECTED)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(url);
  } else if (session && matches(pathname, PROVIDER_ONLY) && session.role !== "PROVIDER") {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else if (session && matches(pathname, GUEST_ONLY)) {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (refreshed) setAuthCookies(response, refreshed);
  if (clear) clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
