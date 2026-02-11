// Shared date utility functions.
// All formatting uses local time to avoid UTC shift bugs (e.g. CET midnight → previous day in UTC).

/** Format a Date as YYYY-MM-DD using local time. */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format a Date as DD.MM.YYYY using local time. */
export function fmtFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** Get ISO week number for a date. */
export function getISOWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Format date from YYYY-MM-DD to DD.MM.YYYY. */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** Extract MM.YYYY from a YYYY-MM-DD date string. */
export function toMonthYear(date: string): string {
  const [y, m] = date.split("-");
  return `${m}.${y}`;
}

/** Get all weekday dates (Mon-Fri) in a range as YYYY-MM-DD. */
export function getWeekdays(from: string, to: string): string[] {
  const result: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      result.push(toLocalISO(new Date(d)));
    }
  }
  return result;
}

/** Get Monday of the current week as YYYY-MM-DD. */
export function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return toLocalISO(monday);
}

/** Get Friday of the current week as YYYY-MM-DD. */
export function getFriday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1) + 4;
  const friday = new Date(now);
  friday.setDate(diff);
  return toLocalISO(friday);
}
