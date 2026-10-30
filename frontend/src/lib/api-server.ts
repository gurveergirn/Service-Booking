import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE, API_BASE } from "@/lib/config";
import { ApiError, messageFromDetail } from "@/lib/errors";

/** Call FastAPI from a Server Component, forwarding the user's access token. */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(messageFromDetail(body.detail, res.statusText), res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
