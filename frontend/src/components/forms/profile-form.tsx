"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { ProviderAvatar } from "@/components/provider-avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import type { ProviderSummary } from "@/types";

const categoryItems = CATEGORIES.map((c) => ({ value: c.name, label: c.name }));

export function ProfileForm({ initial, name, submitLabel, onSaved }: { initial?: ProviderSummary | null; name: string; submitLabel: string; onSaved: (p: ProviderSummary) => void }) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [rate, setRate] = useState(initial ? String(initial.hourly_rate) : "");
  const [avatar, setAvatar] = useState(initial?.avatar_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) {
      setError("Please choose a category");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const saved = await api.put<ProviderSummary>("/providers/me", {
        bio,
        category,
        location,
        hourly_rate: Number(rate),
        avatar_url: avatar.trim() || null,
      });
      onSaved(saved);
    } catch (e) {
      setError(errorMessage(e));
      toast.error("Couldn't save your profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-4">
        <ProviderAvatar name={name} url={avatar.startsWith("http") ? avatar : null} className="size-16" />
        <Field label="Photo URL (optional)" htmlFor="avatar" className="flex-1" hint="A link to a square photo or logo">
          <Input id="avatar" type="url" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" className="h-10" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" htmlFor="category">
          <Select items={categoryItems} value={category || null} onValueChange={(v) => setCategory(String(v ?? ""))}>
            <SelectTrigger id="category" className="h-10 w-full">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Location" htmlFor="location" hint="City or neighbourhood customers will search for">
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Brooklyn, NY" className="h-10" />
        </Field>
      </div>
      <Field label="Hourly rate ($)" htmlFor="rate" hint="Shown as a guide; each service has its own price">
        <Input id="rate" type="number" min={0} max={10000} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required className="h-10 sm:max-w-48" />
      </Field>
      <Field label="About you" htmlFor="bio" hint={`${bio.length}/2000`}>
        <Textarea id="bio" rows={5} maxLength={2000} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your experience, specialities and what customers can expect." />
      </Field>
      <div>
        <Button type="submit" size="lg" className="h-10 px-5" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
