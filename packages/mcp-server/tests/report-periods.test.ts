import { describe, expect, it } from "vitest";
import { reportWindow } from "../src/report-periods.js";

describe("report periods", () => {
  it("builds calendar month and quarter windows", () => {
    expect(reportWindow({ kind: "monthly", selectedDate: "2026-02-15", timeZone: "UTC", now: "2026-12-31T12:00:00.000Z" })).toMatchObject({ kind: "monthly", asOf: "2026-02-28T23:59:59.999Z", period: { startInclusive: "2026-02-01T00:00:00.000Z", endExclusive: "2026-03-01T00:00:00.000Z", label: "February 2026" } });
    expect(reportWindow({ kind: "quarterly", selectedDate: "2026-05-10", timeZone: "UTC", now: "2026-12-31T12:00:00.000Z" })).toMatchObject({ kind: "quarterly", period: { startInclusive: "2026-04-01T00:00:00.000Z", endExclusive: "2026-07-01T00:00:00.000Z", label: "Q2 2026" } });
  });

  it("uses IANA time-zone boundaries across daylight saving changes", () => {
    const window = reportWindow({ kind: "monthly", selectedDate: "2026-03-15", timeZone: "America/New_York", now: "2026-12-31T12:00:00.000Z" });
    expect(window.period?.startInclusive).toBe("2026-03-01T05:00:00.000Z");
    expect(window.period?.endExclusive).toBe("2026-04-01T04:00:00.000Z");
  });

  it("rejects future and malformed selections", () => {
    expect(() => reportWindow({ kind: "monthly", selectedDate: "2027-01-01", timeZone: "UTC", now: "2026-12-31T12:00:00.000Z" })).toThrow(/future/);
    expect(() => reportWindow({ kind: "current", selectedDate: "not-a-date", timeZone: "UTC", now: "2026-12-31T12:00:00.000Z" })).toThrow(/YYYY-MM-DD/);
  });
});
