"use client";

import { ArrowRight, Clock, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BookingListSkeleton } from "@/components/bookings/booking-list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/forms/field";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/types";

type Draft = { name: string; description: string; duration_minutes: string; price: string };
const EMPTY: Draft = { name: "", description: "", duration_minutes: "60", price: "" };

function ServiceDialog({ service, open, onOpenChange, onSaved }: { service: Service | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Reset the form whenever the dialog opens for a different service
  const key = open ? (service?.id ?? "new") : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (key) {
      setDraft(
        service
          ? { name: service.name, description: service.description, duration_minutes: String(service.duration_minutes), price: String(service.price) }
          : EMPTY,
      );
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const body = { name: draft.name, description: draft.description, duration_minutes: Number(draft.duration_minutes), price: Number(draft.price) };
    try {
      if (service) await api.put(`/providers/me/services/${service.id}`, body);
      else await api.post("/providers/me/services", body);
      toast.success(service ? "Service updated" : "Service added");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{service ? "Edit service" : "Add a service"}</DialogTitle>
            <DialogDescription>Customers pick a service when booking; its duration sets the appointment length.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="svc-name">
            <Input id="svc-name" value={draft.name} onChange={set("name")} required maxLength={120} placeholder="e.g. Classic haircut" className="h-10" />
          </Field>
          <Field label="Description" htmlFor="svc-desc">
            <Textarea id="svc-desc" rows={3} maxLength={1000} value={draft.description} onChange={set("description")} placeholder="What's included?" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)" htmlFor="svc-duration">
              <Input id="svc-duration" type="number" min={5} max={720} step={5} value={draft.duration_minutes} onChange={set("duration_minutes")} required className="h-10" />
            </Field>
            <Field label="Price ($)" htmlFor="svc-price">
              <Input id="svc-price" type="number" min={0} step="0.01" value={draft.price} onChange={set("price")} required className="h-10" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {service ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteServiceButton({ service, onDeleted }: { service: Service; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  async function remove() {
    try {
      await api.delete(`/providers/me/services/${service.id}`);
      toast.success("Service removed");
      setOpen(false);
      onDeleted();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Remove ${service.name}`} />}>
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove “{service.name}”?</AlertDialogTitle>
          <AlertDialogDescription>Customers won&apos;t be able to book it any more. Existing bookings are not affected.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Remove service
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ServicesManager() {
  const onboarding = useSearchParams().get("onboarding") === "1";
  const router = useRouter();
  const { data, error, loading, reload } = useApi(() => api.get<Service[]>("/providers/me/services"));
  const [editing, setEditing] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (error && error.includes("provider profile")) router.replace("/provider/onboarding");

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader title="Services" description="What you offer, how long it takes and what it costs.">
        <Button size="lg" onClick={openNew}>
          <Plus /> Add service
        </Button>
      </PageHeader>

      {onboarding && (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <AlertTitle>Step 2 of 3: add your services</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Add at least one service, then set the hours you&apos;re available.</span>
            {!!data?.length && (
              <Link href="/provider/availability?onboarding=1" className={buttonVariants({ size: "sm" })}>
                Next: availability <ArrowRight />
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && !error.includes("provider profile") && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <BookingListSkeleton />
      ) : !data?.length ? (
        <EmptyState icon={Tag} title="No services yet" description="Add your first service so customers can book you.">
          <Button onClick={openNew}>
            <Plus /> Add service
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="min-w-0">
                <p className="font-semibold">{s.name}</p>
                {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-2 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" /> {formatDuration(s.duration_minutes)}
                  </span>
                  <span className="font-semibold">{formatPrice(s.price)}</span>
                </p>
              </div>
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${s.name}`}
                  onClick={() => {
                    setEditing(s);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <DeleteServiceButton service={s} onDeleted={reload} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceDialog service={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={reload} />
    </>
  );
}

