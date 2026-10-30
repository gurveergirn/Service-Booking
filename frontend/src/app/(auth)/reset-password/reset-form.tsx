"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await api.post("/auth/reset-password", { token, new_password: form.get("password") });
      router.push("/login?reset=1");
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This reset link is missing its token.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>You&apos;ll be signed out of other devices.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}{" "}
                <Link href="/forgot-password" className="underline">
                  Request a new link
                </Link>
              </AlertDescription>
            </Alert>
          )}
          <Field label="New password" htmlFor="password" hint="At least 8 characters">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className="h-10" />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="h-10" />
          </Field>
        </CardContent>
        <CardFooter className="mt-6">
          <SubmitButton pending={pending} className="w-full">
            Update password
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
