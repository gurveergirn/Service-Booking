import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { serverApi } from "@/lib/api-server";
import { ApiError } from "@/lib/errors";
import { getSession } from "@/lib/session";
import type { ProviderSummary } from "@/types";

import { CustomerDashboard } from "./customer-dashboard";
import { ProviderDashboard } from "./provider-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  if (session.role === "CUSTOMER") return <CustomerDashboard name={session.name} />;

  let profile: ProviderSummary;
  try {
    profile = await serverApi<ProviderSummary>("/providers/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) redirect("/provider/onboarding");
    throw e;
  }
  return <ProviderDashboard profile={profile} />;
}
