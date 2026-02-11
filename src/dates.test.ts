import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toLocalISO,
  fmtFull,
  getISOWeekNumber,
  formatDate,
  toMonthYear,
  getWeekdays,
  getMonday,
  getFriday,
} from "./dates";

describe("toLocalISO", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toLocalISO(new Date(2025, 0, 7))).toBe("2025-01-07");
    expect(toLocalISO(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  it("pads single-digit month and day", () => {
    expect(toLocalISO(new Date(2025, 2, 3))).toBe("2025-03-03");
  });

  it("never shifts midnight local time to previous day (timezone regression)", () => {
    // The original bug: new Date(2025, 0, 7) at midnight CET (UTC+1)
    // was 2025-01-06T23:00:00Z, so toISOString().split("T")[0] returned "2025-01-06"
    for (let month = 0; month < 12; month++) {
      const d = new Date(2025, month, 15);
      expect(toLocalISO(d)).toBe(`2025-${String(month + 1).padStart(2, "0")}-15`);
    }
  });
});

describe("fmtFull", () => {
  it("formats a date as DD.MM.YYYY", () => {
    expect(fmtFull(new Date(2025, 0, 7))).toBe("07.01.2025");
    expect(fmtFull(new Date(2025, 11, 31))).toBe("31.12.2025");
  });

  it("pads single-digit day and month", () => {
    expect(fmtFull(new Date(2025, 2, 3))).toBe("03.03.2025");
  });
});

describe("formatDate", () => {
  it("converts YYYY-MM-DD to DD.MM.YYYY", () => {
    expect(formatDate("2025-01-07")).toBe("07.01.2025");
    expect(formatDate("2025-12-31")).toBe("31.12.2025");
  });
});

describe("toMonthYear", () => {
  it("converts YYYY-MM-DD to MM.YYYY", () => {
    expect(toMonthYear("2025-01-07")).toBe("01.2025");
    expect(toMonthYear("2025-12-31")).toBe("12.2025");
  });
});

describe("getISOWeekNumber", () => {
  it("returns correct week numbers for known dates", () => {
    // 2025-01-06 is a Monday in week 2
    expect(getISOWeekNumber(new Date(2025, 0, 6))).toBe(2);
    // 2025-01-01 is a Wednesday in week 1
    expect(getISOWeekNumber(new Date(2025, 0, 1))).toBe(1);
    // 2024-12-30 is a Monday in week 1 of 2025
    expect(getISOWeekNumber(new Date(2024, 11, 30))).toBe(1);
    // 2024-12-29 is a Sunday in week 52 of 2024
    expect(getISOWeekNumber(new Date(2024, 11, 29))).toBe(52);
  });
});

describe("getWeekdays", () => {
  it("returns only Mon-Fri dates in range", () => {
    // 2025-01-06 (Mon) to 2025-01-12 (Sun)
    const days = getWeekdays("2025-01-06", "2025-01-12");
    expect(days).toEqual([
      "2025-01-06",
      "2025-01-07",
      "2025-01-08",
      "2025-01-09",
      "2025-01-10",
    ]);
  });

  it("handles a single day", () => {
    expect(getWeekdays("2025-01-06", "2025-01-06")).toEqual(["2025-01-06"]);
  });

  it("returns empty for weekend-only range", () => {
    // 2025-01-11 (Sat) to 2025-01-12 (Sun)
    expect(getWeekdays("2025-01-11", "2025-01-12")).toEqual([]);
  });

  it("spans across months", () => {
    // 2025-01-30 (Thu) to 2025-02-03 (Mon)
    const days = getWeekdays("2025-01-30", "2025-02-03");
    expect(days).toEqual([
      "2025-01-30",
      "2025-01-31",
      "2025-02-03",
    ]);
  });
});

describe("getMonday / getFriday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Monday of the current week", () => {
    // Fake Wednesday 2025-01-08
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 8, 12, 0, 0));
    expect(getMonday()).toBe("2025-01-06");
  });

  it("returns Friday of the current week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 8, 12, 0, 0));
    expect(getFriday()).toBe("2025-01-10");
  });

  it("handles Sunday correctly (belongs to previous week)", () => {
    vi.useFakeTimers();
    // Sunday 2025-01-12
    vi.setSystemTime(new Date(2025, 0, 12, 12, 0, 0));
    expect(getMonday()).toBe("2025-01-06");
    expect(getFriday()).toBe("2025-01-10");
  });

  it("handles Monday correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 6, 12, 0, 0));
    expect(getMonday()).toBe("2025-01-06");
    expect(getFriday()).toBe("2025-01-10");
  });
});
