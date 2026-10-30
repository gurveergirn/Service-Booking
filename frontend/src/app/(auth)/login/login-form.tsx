"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { messageFromDetail } from "@/lib/errors";
import type { User } from "@/types";

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(messageFromDetail(data.detail, "Login failed"));
      const user = data.user as User;
      const fallback = user.role === "PROVIDER" && !user.has_provider_profile ? "/provider/onboarding" : "/dashboard";
      // Full navigation so the server-rendered header picks up the new session
      window.location.href = safeNext(params.get("next")) ?? fallback;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to manage your bookings.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {params.get("reset") === "1" && (
            <Alert>
              <AlertDescription>Your password was updated. Log in with your new password.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            hint={
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot your password?
              </Link>
            }
          >
            <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
          </Field>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <SubmitButton pending={pending} className="w-full">
            Log in
          </SubmitButton>
          <p className="text-sm text-muted-foreground">
            New to BookWell?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
