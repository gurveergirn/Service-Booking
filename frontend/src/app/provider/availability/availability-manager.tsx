"use client";

import { CalendarOff, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { ORDER, type Range, validateWeek, type Week } from "@/lib/availability";
import { DAY_NAMES, formatLongDate, parseDate, toInputTime, toISODate } from "@/lib/format";
import type { AvailabilityWindow, BlockedDate } from "@/types";

const DEFAULT_RANGE: Range = { start: "09:00", end: "17:00" };

function toWeek(windows: AvailabilityWindow[]): Week {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const w of windows) week[w.day_of_week].push({ start: toInputTime(w.start_time), end: toInputTime(w.end_time) });
  return week;
}

function WeeklyHours() {
  const { data, loading, reload } = useApi(() => api.get<AvailabilityWindow[]>("/providers/me/availability"));
  const [week, setWeek] = useState<Week | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setWeek(toWeek(data));
      setDirty(false);
    }
  }, [data]);

  const update = (fn: (w: Week) => Week) => {
    setWeek((w) => (w ? fn(structuredClone(w)) : w));
    setDirty(true);
  };

  async function save() {
    if (!week) return;
    const problem = validateWeek(week);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const windows = ORDER.flatMap((day) => week[day].map((r) => ({ day_of_week: day, start_time: r.start, end_time: r.end })));
      await api.put("/providers/me/availability", { windows });
      toast.success("Weekly hours saved");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly hours</CardTitle>
        <CardDescription>Your recurring schedule. Customers can book any slot inside these hours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading && !week
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="my-2 h-10" />)
          : week &&
            ORDER.map((day) => {
              const ranges = week[day];
              const open = ranges.length > 0;
              return (
                <div key={day} className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-start">
                  <label className="flex w-36 shrink-0 items-center gap-3 pt-1.5">
                    <Switch
                      checked={open}
                      onCheckedChange={(checked) => update((w) => ({ ...w, [day]: checked ? [{ ...DEFAULT_RANGE }] : [] }))}
                      aria-label={`Open on ${DAY_NAMES[day]}`}
                    />
                    <span className="text-sm font-medium">{DAY_NAMES[day]}</span>
                  </label>
                  <div className="flex flex-1 flex-col gap-2">
                    {!open && <p className="pt-1.5 text-sm text-muted-foreground">Unavailable</p>}
                    {ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[day]} start`}
                          value={r.start}
                          onChange={(e) => update((w) => ((w[day][i].start = e.target.value), w))}
                          className="h-9 w-32"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[day]} end`}
                          value={r.end}
                          onChange={(e) => update((w) => ((w[day][i].end = e.target.value), w))}
                          className="h-9 w-32"
                        />
                        <Button variant="ghost" size="icon" aria-label="Remove time range" onClick={() => update((w) => (w[day].splice(i, 1), w))}>
                          <Trash2 />
                        </Button>
                        {i === ranges.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Add time range"
                            onClick={() => update((w) => (w[day].push({ start: r.end < "20:00" ? r.end : "18:00", end: "21:00" }), w))}
                          >
                            <Plus />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {open && day === 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => update((w) => ({ ...w, 2: structuredClone(w[1]), 3: structuredClone(w[1]), 4: structuredClone(w[1]), 5: structuredClone(w[1]) }))}
                    >
                      <Copy /> Copy to Tue–Fri
                    </Button>
                  )}
                </div>
              );
            })}
        <div className="flex items-center gap-3 pt-4">
          <Button size="lg" onClick={save} disabled={saving || !dirty}>
            {saving && <Loader2 className="animate-spin" />} Save hours
          </Button>
          {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function BlockedDates() {
  const { data, loading, reload } = useApi(() => api.get<BlockedDate[]>("/providers/me/blocked-dates"));
  const [selected, setSelected] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  async function add() {
    if (!selected) return;
    setPending(true);
    try {
      await api.post("/providers/me/blocked-dates", { date: toISODate(selected), reason: reason.trim() || null });
      toast.success(`${formatLongDate(toISODate(selected))} blocked`);
      setSelected(undefined);
      setReason("");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function remove(b: BlockedDate) {
    try {
      await api.delete(`/providers/me/blocked-dates/${b.id}`);
      toast.success("Date unblocked");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const blocked = (data ?? []).map((b) => parseDate(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time off</CardTitle>
        <CardDescription>Block specific dates — holidays, appointments, sick days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center rounded-lg border">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={{ before: today }}
            modifiers={{ blocked }}
            modifiersClassNames={{ blocked: "[&>button]:line-through [&>button]:text-destructive" }}
          />
        </div>
        <Field label="Reason (optional, only you see this)" htmlFor="reason">
          <Input id="reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Vacation" className="h-9" />
        </Field>
        <Button className="w-full" size="lg" onClick={add} disabled={!selected || pending}>
          <CalendarOff /> {selected ? `Block ${formatLongDate(toISODate(selected))}` : "Pick a date to block"}
        </Button>

        <div>
          <p className="mb-2 text-sm font-medium">Upcoming time off</p>
          {loading && !data ? (
            <Skeleton className="h-10" />
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">No dates blocked.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {data.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{formatLongDate(b.date)}</span>
                    {b.reason && <span className="text-muted-foreground"> · {b.reason}</span>}
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label="Unblock date" onClick={() => remove(b)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AvailabilityManager() {
  const onboarding = useSearchParams().get("onboarding") === "1";
  const router = useRouter();
  return (
    <>
      <PageHeader title="Availability" description="Set when customers can book you." />
      {onboarding && (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <AlertTitle>Step 3 of 3: set your hours</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Turn on the days you work and save. You&apos;re then live in search!</span>
            <Button size="sm" onClick={() => router.push("/dashboard")}>
              Finish setup
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <WeeklyHours />
        <BlockedDates />
      </div>
    </>
  );
}
