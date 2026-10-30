import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE } from "@/lib/config";
import { verifyAccessToken } from "@/lib/tokens";
import type { Session } from "@/types";

/** Current user from the access-token cookie. Middleware refreshes expired tokens before pages render. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifyAccessToken(store.get(ACCESS_COOKIE)?.value);
}
