/**
 * Dates here are calendar days as `YYYY-MM-DD` strings, never instants, so
 * they are parsed and formatted in UTC to keep a day from sliding across a
 * timezone boundary.
 */
export function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  let d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);

  return toDay(d);
}

export function formatDay(day: string, withYear = false): string {
  return parseDay(day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function formatRange(start: string, end: string): string {
  if (start === end) {
    return formatDay(start);
  }

  return `${formatDay(start)} – ${formatDay(end)}`;
}

export function formatDays(n: number): string {
  let shown = Number.isInteger(n) ? String(n) : n.toFixed(1);

  return `${shown} ${n === 1 ? "day" : "days"}`;
}

export function formatMonth(month: string): string {
  return parseDay(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function shiftMonth(month: string, n: number): string {
  let d = parseDay(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);

  return toDay(d).slice(0, 7);
}

export function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Weekdays from start to end inclusive; mirrors the workingDays() sql function. */
export function workingDaysBetween(start: string, end: string): number {
  if (!start || !end || end < start) {
    return 0;
  }

  let n = 0;
  for (let d = parseDay(start); toDay(d) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    let dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      n++;
    }
  }

  return n;
}

export const STATUS_PILLS: Record<string, string> = {
  pending: "is-warning",
  approved: "is-success",
  denied: "is-danger",
  cancelled: "",
};
