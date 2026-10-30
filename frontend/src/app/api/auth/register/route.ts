import { forwardAuth } from "@/lib/auth-route";

export async function POST(request: Request) {
  return forwardAuth(request, "/auth/register");
}
