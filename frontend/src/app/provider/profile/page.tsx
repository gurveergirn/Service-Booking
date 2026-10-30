import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { serverApi } from "@/lib/api-server";
import { ApiError } from "@/lib/errors";
import type { ProviderSummary } from "@/types";

import { ProfileEditor } from "./profile-editor";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfilePage() {
  let profile: ProviderSummary;
  try {
    profile = await serverApi<ProviderSummary>("/providers/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) redirect("/provider/onboarding");
    throw e;
  }
  return <ProfileEditor profile={profile} />;
}
