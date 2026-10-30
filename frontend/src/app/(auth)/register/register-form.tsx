"use client";

import { Briefcase, CalendarSearch } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { messageFromDetail } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const ROLES: { value: Role; title: string; text: string; icon: typeof Briefcase }[] = [
  { value: "CUSTOMER", title: "I want to book", text: "Find and book local services", icon: CalendarSearch },
  { value: "PROVIDER", title: "I offer services", text: "Take bookings from customers", icon: Briefcase },
];

export function RegisterForm() {
  const params = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("role") === "PROVIDER" ? "PROVIDER" : "CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("Passwords don't match");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(messageFromDetail(data.detail, "Registration failed"));
      window.location.href = role === "PROVIDER" ? "/provider/onboarding" : "/providers";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>It&apos;s free and takes less than a minute.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, title, text, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                onClick={() => setRole(value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  role === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <Icon className={cn("mb-1 size-5", role === value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted-foreground">{text}</span>
              </button>
            ))}
          </div>
          <Field label={role === "PROVIDER" ? "Your name or business name" : "Full name"} htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required maxLength={100} className="h-10" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className="h-10" />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="h-10" />
          </Field>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <SubmitButton pending={pending} className="w-full">
            {role === "PROVIDER" ? "Create provider account" : "Create account"}
          </SubmitButton>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
