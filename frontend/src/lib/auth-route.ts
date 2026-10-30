import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth-cookies";
import { API_BASE } from "@/lib/config";
import type { TokenResponse } from "@/types";

/** Forward a login/register request to FastAPI and, on success, store the tokens as httpOnly cookies. */
export async function forwardAuth(request: Request, path: "/auth/login" | "/auth/register") {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Can't reach the server. Please try again." }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const tokens = data as TokenResponse;
  // Only the user goes back to the browser; the tokens stay in httpOnly cookies
  const response = NextResponse.json({ user: tokens.user }, { status: res.status });
  setAuthCookies(response, tokens);
  return response;
}
