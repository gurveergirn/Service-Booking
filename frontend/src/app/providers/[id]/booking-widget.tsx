"use client";

import { CalendarDays, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { ApiError, errorMessage } from "@/lib/errors";
import { formatDuration, formatLongDate, formatPrice, formatTime, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Booking, ProviderDetail, Session, SlotsResponse, TimeSlot } from "@/types";

const HORIZON_DAYS = 60;

export function BookingWidget({ provider, session }: { provider: ProviderDetail; session: Session | null }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(provider.services[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const service = provider.services.find((s) => s.id === serviceId);
  const workingDays = useMemo(() => new Set(provider.availability.map((w) => w.day_of_week)), [provider.availability]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const lastDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + HORIZON_DAYS), [today]);

  async function loadSlots(targetDate: Date, targetService: string) {
    setLoadingSlots(true);
    setSlotsError(null);
    setSlot(null);
    try {
      const res = await api.get<SlotsResponse>(`/providers/${provider.id}/slots`, { service_id: targetService, date: toISODate(targetDate) });
      setSlots(res.slots);
      if (res.blocked) setSlotsError(`${provider.name} is unavailable on this date.`);
    } catch (e) {
      setSlots(null);
      setSlotsError(errorMessage(e));
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (date && serviceId) void loadSlots(date, serviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId]);

  async function book() {
    if (!service || !date || !slot) return;
    setSubmitting(true);
    try {
      await api.post<Booking>("/bookings", { service_id: service.id, date: toISODate(date), start_time: slot.start_time });
      toast.success("Booking requested!", { description: `${provider.name} will confirm shortly. We've emailed you the details.` });
      router.push("/dashboard");
    } catch (e) {
      toast.error(errorMessage(e));
      setConfirming(false);
      // Someone else may have grabbed the slot: refresh what's available
      if (e instanceof ApiError && e.status === 409) void loadSlots(date, service.id);
    } finally {
      setSubmitting(false);
    }
  }

  if (provider.services.length === 0 || provider.availability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Book an appointment</CardTitle>
          <CardDescription>This provider isn&apos;t taking online bookings yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book an appointment</CardTitle>
        <CardDescription>Pick a service, a day and a time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div role="radiogroup" aria-label="Service" className="space-y-2">
          {provider.services.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === serviceId}
              onClick={() => setServiceId(s.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                s.id === serviceId ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              <span>
                <span className="block font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">{formatDuration(s.duration_minutes)}</span>
              </span>
              <span className="font-semibold">{formatPrice(s.price)}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center rounded-lg border">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            startMonth={today}
            endMonth={lastDay}
            disabled={[{ before: today }, { after: lastDay }, (d: Date) => !workingDays.has(d.getDay())]}
            className="[--cell-size:--spacing(9)]"
          />
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-muted-foreground" />
            {date ? formatLongDate(toISODate(date)) : "Choose a date to see times"}
          </p>
          {loadingSlots && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          )}
          {!loadingSlots && slotsError && (
            <Alert>
              <AlertDescription>{slotsError}</AlertDescription>
            </Alert>
          )}
          {!loadingSlots && !slotsError && slots && slots.length === 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Fully booked — try another day.</p>
          )}
          {!loadingSlots && slots && slots.length > 0 && (
            <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {slots.map((s) => (
                <Button
                  key={s.start_time}
                  variant={slot?.start_time === s.start_time ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSlot(s)}
                >
                  {formatTime(s.start_time)}
                </Button>
              ))}
            </div>
          )}
        </div>

        {session?.role === "PROVIDER" ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Provider accounts can&apos;t make bookings. Log in with a customer account to book.</p>
        ) : session ? (
          <Button size="lg" className="h-11 w-full" disabled={!slot} onClick={() => setConfirming(true)}>
            <CalendarDays /> {slot ? `Book ${formatTime(slot.start_time)}` : "Select a time"}
          </Button>
        ) : (
          <Link href={`/login?next=/providers/${provider.id}`} className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}>
            Log in to book
          </Link>
        )}
      </CardContent>

      <Dialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your booking</DialogTitle>
            <DialogDescription>{provider.name} will review your request and confirm it.</DialogDescription>
          </DialogHeader>
          {service && date && slot && (
            <dl className="grid grid-cols-[6rem_1fr] gap-y-2 rounded-lg bg-muted/60 p-4 text-sm">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-medium">{service.name}</dd>
              <dt className="text-muted-foreground">When</dt>
              <dd className="font-medium">
                {formatLongDate(toISODate(date))}
                <br />
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </dd>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">{formatPrice(service.price)} · pay in person</dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
              Back
            </Button>
            <Button onClick={book} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />} Request booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
