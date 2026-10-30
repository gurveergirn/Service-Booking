"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProfileForm } from "@/components/forms/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = ["Profile", "Services", "Availability"];

export function Onboarding({ name }: { name: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-6 flex items-center gap-2 text-sm">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
            <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{step}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome, {name.split(" ")[0]}! Let&apos;s set up your profile</CardTitle>
          <CardDescription>This is what customers see when they find you.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={name}
            submitLabel="Save and add services"
            onSaved={() => {
              toast.success("Profile created");
              router.push("/provider/services?onboarding=1");
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
