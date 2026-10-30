import { DAY_NAMES } from "@/lib/format";

export type Range = { start: string; end: string };
export type Week = Record<number, Range[]>;

/** Display order: Monday first. */
export const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Returns an error message for the first invalid day, or null. */
export function validateWeek(week: Week): string | null {
  for (const day of ORDER) {
    const ranges = [...week[day]].sort((a, b) => a.start.localeCompare(b.start));
    for (const [i, r] of ranges.entries()) {
      if (!r.start || !r.end || r.start >= r.end) return `${DAY_NAMES[day]}: each time range must end after it starts.`;
      if (i > 0 && r.start < ranges[i - 1].end) return `${DAY_NAMES[day]}: time ranges overlap.`;
    }
  }
  return null;
}
