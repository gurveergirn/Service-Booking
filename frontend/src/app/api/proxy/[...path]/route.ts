import { type NextRequest, NextResponse } from "next/server";

import { clearAuthCookies, refreshTokens, setAuthCookies } from "@/lib/auth-cookies";
import { ACCESS_COOKIE, API_BASE, REFRESH_COOKIE } from "@/lib/config";
import type { TokenResponse } from "@/types";

/**
 * Browser -> Next.js -> FastAPI. Attaches the access token from the httpOnly cookie
 * and, if FastAPI says it expired, refreshes once and retries.
 */
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${API_BASE}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();

  const send = (token: string | undefined) => {
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { method: request.method, headers, body, cache: "no-store" });
  };

  let upstream: Response;
  let refreshed: TokenResponse | null = null;
  try {
    upstream = await send(request.cookies.get(ACCESS_COOKIE)?.value);
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (upstream.status === 401 && refreshToken) {
      refreshed = await refreshTokens(refreshToken);
      if (refreshed) upstream = await send(refreshed.access_token);
    }
  } catch {
    return NextResponse.json({ detail: "Can't reach the server. Please try again." }, { status: 502 });
  }

  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : new NextResponse(await upstream.text(), {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
        });
  if (refreshed) setAuthCookies(response, refreshed);
  else if (upstream.status === 401 && request.cookies.has(REFRESH_COOKIE)) clearAuthCookies(response);
  return response;
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
