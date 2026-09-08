export type ReportKind = "current" | "monthly" | "quarterly";
export type ReportPeriod = { startInclusive: string; endExclusive: string; timeZone: string; label: string };
export type ReportWindow = { kind: ReportKind; asOf: string; period?: ReportPeriod };

function parts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year!, month: values.month!, day: values.day!, hour: values.hour!, minute: values.minute!, second: values.second! };
}

function localMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  let guess = new Date(Date.UTC(year, month - 1, day));
  for (let index = 0; index < 3; index += 1) {
    const local = parts(guess, timeZone);
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    guess = new Date(guess.getTime() + (Date.UTC(year, month - 1, day) - represented));
  }
  return guess;
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function parseSelectedDate(value: string | undefined, now: Date, timeZone: string): { year: number; month: number; day: number } {
  if (!value) {
    const local = parts(now, timeZone);
    return { year: local.year, month: local.month, day: local.day };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("selectedDate must use YYYY-MM-DD.");
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error("selectedDate is not a valid calendar date.");
  return { year, month, day };
}

export function reportWindow(input: { kind?: ReportKind; selectedDate?: string; timeZone?: string; asOf?: string; now: string }): ReportWindow {
  const kind = input.kind ?? "current";
  const timeZone = input.timeZone ?? "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(input.now)); } catch { throw new Error("timeZone must be a valid IANA time zone."); }
  const now = new Date(input.now);
  const selected = parseSelectedDate(input.selectedDate, now, timeZone);
  if (kind === "current") {
    if (input.asOf) {
      const asOf = new Date(input.asOf);
      if (!Number.isFinite(asOf.getTime()) || asOf > now) throw new Error("asOf must be a valid time no later than now.");
      return { kind, asOf: asOf.toISOString() };
    }
    const next = new Date(Date.UTC(selected.year, selected.month - 1, selected.day + 1));
    const end = localMidnightUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone).getTime() - 1;
    return { kind, asOf: new Date(Math.min(now.getTime(), end)).toISOString() };
  }
  const quarterStartMonth = Math.floor((selected.month - 1) / 3) * 3 + 1;
  const startMonth = kind === "monthly" ? selected.month : quarterStartMonth;
  const endMonthRaw = kind === "monthly" ? nextMonth(selected.year, selected.month) : nextMonth(selected.year, quarterStartMonth + 2);
  const start = localMidnightUtc(selected.year, startMonth, 1, timeZone);
  const end = localMidnightUtc(endMonthRaw.year, endMonthRaw.month, 1, timeZone);
  if (start > now) throw new Error("A report period cannot start in the future.");
  const asOf = new Date(Math.min(now.getTime(), end.getTime() - 1));
  const label = kind === "monthly"
    ? new Intl.DateTimeFormat("en-US", { timeZone, month: "long", year: "numeric" }).format(start)
    : `Q${Math.floor((startMonth - 1) / 3) + 1} ${selected.year}`;
  return { kind, asOf: asOf.toISOString(), period: { startInclusive: start.toISOString(), endExclusive: end.toISOString(), timeZone, label } };
}
