import { describe, expect, it } from "vitest";

import { formatDuration, formatPrice, formatTime, initials, parseDate, summarizeHours, toISODate } from "@/lib/format";

describe("formatTime", () => {
  it("formats 24h times as 12h", () => {
    expect(formatTime("00:00:00")).toBe("12:00 AM");
    expect(formatTime("09:05")).toBe("9:05 AM");
    expect(formatTime("12:30:00")).toBe("12:30 PM");
    expect(formatTime("17:00:00")).toBe("5:00 PM");
  });
});

describe("dates", () => {
  it("round-trips local calendar dates without timezone drift", () => {
    expect(toISODate(parseDate("2026-03-08"))).toBe("2026-03-08");
    expect(parseDate("2026-12-31").getDate()).toBe(31);
  });
});

describe("misc formatters", () => {
  it("formats prices, durations and initials", () => {
    expect(formatPrice(45)).toBe("$45");
    expect(formatPrice(45.5)).toBe("$45.50");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(120)).toBe("2 hr");
    expect(initials("ava  marie thompson")).toBe("AM");
  });

  it("summarizes weekly hours starting Monday", () => {
    const summary = summarizeHours([
      { day_of_week: 1, start_time: "13:00:00", end_time: "17:00:00" },
      { day_of_week: 1, start_time: "09:00:00", end_time: "12:00:00" },
    ]);
    expect(summary[0]).toEqual({ day: "Mon", hours: "9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM" });
    expect(summary[6]).toEqual({ day: "Sun", hours: "Closed" });
  });
});
