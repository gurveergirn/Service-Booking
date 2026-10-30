"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { ProviderSummary } from "@/types";

export function ProfileEditor({ profile }: { profile: ProviderSummary }) {
  const router = useRouter();
  return (
    <>
      <PageHeader title="Profile settings" description="Update how you appear in search results and on your public page." />
      <Card className="max-w-3xl">
        <CardContent>
          <ProfileForm
            initial={profile}
            name={profile.name}
            submitLabel="Save changes"
            onSaved={() => {
              toast.success("Profile updated");
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
