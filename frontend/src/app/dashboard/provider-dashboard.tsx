"use client";

import { CalendarCheck, CalendarClock, Check, CheckCheck, DollarSign, ExternalLink, Inbox, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { BookingListSkeleton } from "@/components/bookings/booking-list-skeleton";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import type { Booking, ProviderDashboard as Dashboard, ProviderSummary } from "@/types";

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Star; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  );
}

function hasStarted(b: Booking) {
  const [h, m] = b.start_time.split(":").map(Number);
  const [y, mo, d] = b.date.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m) <= new Date();
}

function useBookingAction(reload: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (booking: Booking, action: "accept" | "decline" | "complete", success: string) => {
    setBusy(booking.id + action);
    try {
      await api.post(`/bookings/${booking.id}/${action}`);
      toast.success(success);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function BookingLine({ booking, children, showDate = true }: { booking: Booking; children?: React.ReactNode; showDate?: boolean }) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="w-20 shrink-0 text-sm">
          {showDate && <p className="font-semibold">{formatDate(booking.date, { month: "short", day: "numeric" })}</p>}
          <p className={showDate ? "text-muted-foreground" : "font-semibold"}>{formatTime(booking.start_time)}</p>
        </div>
        <div className="min-w-0">
          <p className="font-medium">{booking.customer_name}</p>
          <p className="text-sm text-muted-foreground">
            {booking.service_name} · {formatPrice(booking.price)}
          </p>
        </div>
      </div>
      {children && <div className="flex gap-2 pl-24 sm:pl-0">{children}</div>}
    </div>
  );
}

export function ProviderDashboard({ profile }: { profile: ProviderSummary }) {
  const { data, error, loading, reload } = useApi(() => api.get<Dashboard>("/providers/me/dashboard"));
  const history = useApi(() => api.get<Booking[]>("/bookings/me"));
  const reloadAll = () => {
    void reload();
    void history.reload();
  };
  const { busy, run } = useBookingAction(reloadAll);

  return (
    <div className="container-page py-10">
      <PageHeader title="Provider dashboard" description={`Welcome back, ${profile.name}.`}>
        <Link href={`/providers/${profile.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ExternalLink /> View public profile
        </Link>
        <Link href="/provider/availability" className={buttonVariants({ size: "lg" })}>
          <CalendarClock /> Edit availability
        </Link>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Couldn&apos;t load your dashboard: {error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : data ? (
          <>
            <Stat icon={CalendarCheck} label="Today" value={data.today.length} hint="appointments" />
            <Stat icon={Inbox} label="Pending requests" value={data.pending.length} hint="need a response" />
            <Stat icon={DollarSign} label="Earned this month" value={formatPrice(data.earnings.this_month)} hint={`${formatPrice(data.earnings.total)} all time · ${data.earnings.completed_count} completed`} />
            <Stat icon={Star} label="Rating" value={data.rating.count ? data.rating.average.toFixed(1) : "—"} hint={`${data.rating.count} review${data.rating.count === 1 ? "" : "s"}`} />
          </>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">All bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Pending requests</CardTitle>
                <CardDescription>Accept to confirm the appointment, or decline to free the slot.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {loading && !data ? (
                  <BookingListSkeleton rows={2} />
                ) : !data?.pending.length ? (
                  <p className="text-sm text-muted-foreground">You&apos;re all caught up. 🎉</p>
                ) : (
                  data.pending.map((b) => (
                    <BookingLine key={b.id} booking={b}>
                      <Button size="sm" onClick={() => run(b, "accept", "Booking confirmed — customer notified")} disabled={!!busy}>
                        <Check /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => run(b, "decline", "Booking declined — customer notified")} disabled={!!busy}>
                        <X /> Decline
                      </Button>
                    </BookingLine>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s schedule</CardTitle>
                <CardDescription>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {loading && !data ? (
                  <BookingListSkeleton rows={2} />
                ) : !data?.today.length ? (
                  <EmptyState icon={CalendarCheck} title="Nothing scheduled today" />
                ) : (
                  data.today.map((b) => (
                    <BookingLine key={b.id} booking={b} showDate={false}>
                      {b.status === "CONFIRMED" && hasStarted(b) ? (
                        <Button size="sm" variant="outline" onClick={() => run(b, "complete", "Marked as completed")} disabled={!!busy}>
                          <CheckCheck /> Mark complete
                        </Button>
                      ) : (
                        <StatusBadge booking={b} />
                      )}
                    </BookingLine>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming</CardTitle>
                <CardDescription>Confirmed appointments after today.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {loading && !data ? (
                  <BookingListSkeleton rows={2} />
                ) : !data?.upcoming.length ? (
                  <EmptyState icon={CalendarClock} title="No upcoming appointments" />
                ) : (
                  data.upcoming.map((b) => (
                    <BookingLine key={b.id} booking={b}>
                      <CancelBookingButton booking={b} otherParty={b.customer_name} onDone={reloadAll} />
                    </BookingLine>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent>
              {history.loading && !history.data ? (
                <BookingListSkeleton />
              ) : !history.data?.length ? (
                <EmptyState icon={Inbox} title="No bookings yet" description="Share your profile link to get your first booking." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.data.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(b.date)} · {formatTime(b.start_time)}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{b.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer_email}</p>
                          </TableCell>
                          <TableCell>{b.service_name}</TableCell>
                          <TableCell className="text-right">{formatPrice(b.price)}</TableCell>
                          <TableCell>
                            <StatusBadge booking={b} />
                          </TableCell>
                          <TableCell className="text-right">
                            {b.status === "CONFIRMED" && hasStarted(b) && (
                              <Button size="sm" variant="outline" onClick={() => run(b, "complete", "Marked as completed")} disabled={!!busy}>
                                Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
