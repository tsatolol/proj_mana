import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./date";

describe("date formatting", () => {
  it("formats in Asia/Tokyo even when the UTC date is the previous day", () => {
    // 2026-03-31 15:30 UTC = 2026-04-01 00:30 JST
    const date = new Date("2026-03-31T15:30:00Z");
    expect(formatDate(date)).toBe("2026/04/01");
    expect(formatDateTime(date)).toBe("2026/04/01 00:30");
  });
});
