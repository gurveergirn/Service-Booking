import { describe, expect, it } from "vitest";

import { messageFromDetail } from "@/lib/errors";

describe("messageFromDetail", () => {
  it("passes through string details", () => {
    expect(messageFromDetail("Invalid email or password")).toBe("Invalid email or password");
  });

  it("formats the first FastAPI validation error", () => {
    const detail = [{ loc: ["body", "hourly_rate"], msg: "Input should be greater than or equal to 0" }];
    expect(messageFromDetail(detail)).toBe("hourly rate: Input should be greater than or equal to 0");
  });

  it("strips pydantic's 'Value error' prefix", () => {
    expect(messageFromDetail([{ loc: ["body"], msg: "Value error, start_time must be before end_time" }])).toBe(
      "start_time must be before end_time",
    );
  });

  it("falls back when empty", () => {
    expect(messageFromDetail(undefined, "Nope")).toBe("Nope");
  });
});
