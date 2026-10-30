import { describe, expect, it } from "vitest";

import { validateWeek } from "@/lib/availability";
import { pageWindow } from "@/lib/pagination";

describe("pageWindow", () => {
  it("shows first, last and neighbours with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe("validateWeek", () => {
  const empty = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  it("accepts valid, non-overlapping ranges", () => {
    expect(validateWeek({ ...empty, 1: [{ start: "13:00", end: "17:00" }, { start: "09:00", end: "12:00" }] })).toBeNull();
  });
  it("rejects backwards and overlapping ranges", () => {
    expect(validateWeek({ ...empty, 2: [{ start: "17:00", end: "09:00" }] })).toMatch(/Tuesday/);
    expect(validateWeek({ ...empty, 3: [{ start: "09:00", end: "13:00" }, { start: "12:00", end: "14:00" }] })).toMatch(/overlap/);
  });
});
