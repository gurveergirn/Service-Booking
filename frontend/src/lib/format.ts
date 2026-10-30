export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "13:30:00" -> "1:30 PM" */
export function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Parse "YYYY-MM-DD" as a local calendar date (new Date("YYYY-MM-DD") would be UTC midnight). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar date -> "YYYY-MM-DD" */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return parseDate(value).toLocaleDateString("en-US", opts);
}

export function formatLongDate(value: string): string {
  return formatDate(value, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "HH:MM:SS" -> "HH:MM" for <input type="time"> */
export function toInputTime(value: string): string {
  return value.slice(0, 5);
}

/** Group availability windows by weekday, e.g. for a "Mon–Fri 9 AM – 5 PM" summary. */
export function summarizeHours(windows: { day_of_week: number; start_time: string; end_time: string }[]): { day: string; hours: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((d) => {
    const ws = windows.filter((w) => w.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return {
      day: DAY_SHORT[d],
      hours: ws.length ? ws.map((w) => `${formatTime(w.start_time)} – ${formatTime(w.end_time)}`).join(", ") : "Closed",
    };
  });
}
