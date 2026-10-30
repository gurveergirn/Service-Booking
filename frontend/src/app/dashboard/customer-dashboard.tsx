"use client";

import { CalendarX2, Clock, History } from "lucide-react";
import Link from "next/link";

import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { BookingListSkeleton } from "@/components/bookings/booking-list-skeleton";
import { ReviewDialog } from "@/components/bookings/review-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProviderAvatar } from "@/components/provider-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import type { Booking } from "@/types";

function BookingRow({ booking, reload }: { booking: Booking; reload: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <ProviderAvatar name={booking.provider_name} url={booking.provider_avatar_url} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{booking.service_name}</p>
            <StatusBadge booking={booking} />
          </div>
          <Link href={`/providers/${booking.provider_id}`} className="text-sm text-muted-foreground hover:text-primary">
            {booking.provider_name} · {booking.provider_category}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Clock className="size-3.5 text-muted-foreground" />
            {formatDate(booking.date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
            <span className="text-muted-foreground">· {formatPrice(booking.price)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:justify-end">
        {booking.is_upcoming && <CancelBookingButton booking={booking} otherParty={booking.provider_name} onDone={reload} />}
        {booking.status === "COMPLETED" && !booking.has_review && <ReviewDialog booking={booking} onDone={reload} />}
        {!booking.is_upcoming && (
          <Link href={`/providers/${booking.provider_id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Book again
          </Link>
        )}
      </div>
    </div>
  );
}

export function CustomerDashboard({ name }: { name: string }) {
  const { data, error, loading, reload } = useApi(() => api.get<Booking[]>("/bookings/me"));
  const upcoming = (data ?? []).filter((b) => b.is_upcoming).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const past = (data ?? []).filter((b) => !b.is_upcoming);
  const toReview = past.filter((b) => b.status === "COMPLETED" && !b.has_review).length;

  return (
    <div className="container-page py-10">
      <PageHeader title={`Hi, ${name.split(" ")[0]}`} description="Your appointments at a glance.">
        <Link href="/providers" className={buttonVariants({ size: "lg" })}>
          Book a service
        </Link>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Couldn&apos;t load your bookings: {error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming {data ? `(${upcoming.length})` : ""}</TabsTrigger>
          <TabsTrigger value="past">
            Past {data ? `(${past.length})` : ""}
            {toReview > 0 && <span className="ml-1 size-2 rounded-full bg-rating" aria-label={`${toReview} to review`} />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3">
          {loading && !data ? (
            <BookingListSkeleton />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarX2} title="No upcoming appointments" description="When you book a service it'll show up here.">
              <Link href="/providers" className={buttonVariants()}>
                Find a provider
              </Link>
            </EmptyState>
          ) : (
            upcoming.map((b) => <BookingRow key={b.id} booking={b} reload={reload} />)
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-3">
          {loading && !data ? (
            <BookingListSkeleton />
          ) : past.length === 0 ? (
            <EmptyState icon={History} title="No past bookings yet" />
          ) : (
            past.map((b) => <BookingRow key={b.id} booking={b} reload={reload} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
