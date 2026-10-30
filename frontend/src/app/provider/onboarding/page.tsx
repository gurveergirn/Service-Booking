import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { serverApi } from "@/lib/api-server";
import { ApiError } from "@/lib/errors";
import { getSession } from "@/lib/session";

import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    await serverApi("/providers/me");
    redirect("/dashboard"); // already onboarded
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 409)) throw e;
  }
  return <Onboarding name={session.name} />;
}
