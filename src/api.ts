// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import Table from "cli-table3";
import { Page } from "patchright-core";
import { createAuthenticatedContext } from "./auth";
import { config, ensureConfigDir } from "./config";
import { t, getLocale, confirmDeleteKey } from "./i18n";
import * as fs from "fs";
import chalk from "chalk";
import {
  success, err, warn, info, bold, highlight, dim,
  spin, stopSpinner, succeed, fail,
  promptUser,
} from "./ui";
import {
  withCaptchaRetry,
  navigateToLeistungen,
  setMonthFilter,
  readGridEntries,
  navigateToWochenrapport,
  readWeeklyReport,
  readSaldoPanel,
  readVacationPanel,
  clickRow,
  fillForm,
  deleteSidePanelEntry,
  deleteRowViaContextMenu,
  closeSidePanelIfOpen,
  createEntry,
  saveEntry,
  formatDate,
  toMonthYear,
} from "./page";
import { waitForVaadin } from "./vaadin";
import { reverseProject, reverseServiceType } from "./aliases";

export type { TimeEntry, ExistingEntry } from "./page";
export { formatDate, toMonthYear } from "./page";

// Re-import types for local use
import type { TimeEntry, ExistingEntry } from "./page";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch existing entries from Abacus for the given dates.
 * Groups dates by month, navigates once, reads each month's grid.
 */
export async function fetchExistingEntries(dates: string[]): Promise<ExistingEntry[]> {
  return withCaptchaRetry(async () => {
    const { context, close } = await createAuthenticatedContext();

    try {
      const page = await context.newPage();
      await navigateToLeistungen(page);

      // Collect unique months from the date list
      const months = new Set<string>();
      for (const d of dates) {
        months.add(toMonthYear(d));
      }

      const allEntries: ExistingEntry[] = [];
      for (const monthYear of months) {
        await setMonthFilter(page, monthYear);
        spin(t().readingExistingEntries);
        const entries = await readGridEntries(page);
        allEntries.push(...entries);
      }

      stopSpinner();
      return allEntries;
    } finally {
      await close();
    }
  });
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

/** Get ISO week number for a date. */
function getISOWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Right-pad a label to a fixed width. */
function pad(label: string, width: number): string {
  return label.padEnd(width);
}

/** Format hours as "8.00". */
function fmtHours(n: number): string {
  return n.toFixed(2);
}

/** Format signed hours: positive with "+", negative with "−". */
function fmtSignedHours(n: number): string {
  if (n > 0) return `+${n.toFixed(2)}`;
  if (n < 0) return `${n.toFixed(2)}`;
  return "0.00";
}

/** Format hours with days in parentheses, e.g. "40.00 hours (5.0d)". */
function fmtHoursAndDays(n: number): string {
  const days = n / 8;
  return `${fmtHours(n)} ${t().statusHoursUnit} (${days.toFixed(1)}${t().statusDaysUnit})`;
}

/** Print quick-action hints when there are missing days. */
function printHints(entries: ExistingEntry[], missingDayDates: string[], hours: number, fallbackDate: string): void {
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry || missingDayDates.length === 0) return;
  const projectArg = reverseProject(lastEntry.project) || lastEntry.project;
  const serviceTypeArg = reverseServiceType(lastEntry.serviceType) || lastEntry.serviceType;
  const text = lastEntry.text || "...";
  const toIso = (d: string) => d.split(".").reverse().join("-");
  const targetDate = missingDayDates.length > 0 ? toIso(missingDayDates[0]) : fallbackDate;
  console.log("");
  console.log(dim(`  💡 ${t().hintQuickActions}`));
  console.log("");
  console.log(dim(`  ${t().hintLogSingle}`));
  console.log(info(`    abacus time log --project ${projectArg} --hours ${hours.toFixed(2)} --service-type ${serviceTypeArg} --text "${text}" --date ${targetDate}`));
  if (missingDayDates.length > 1) {
    console.log("");
    console.log(dim(`  ${t().hintBatchFill}`));
    console.log(info(`    abacus time batch --project ${projectArg} --hours ${hours.toFixed(2)} --service-type ${serviceTypeArg} --text "${text}"`));
    console.log("");
    console.log(dim(`  ${t().hintBatchGenerate}`));
    console.log(info(`    abacus time batch --generate`));
    console.log(info(`    code batch.json`));
    console.log(info(`    abacus time batch --file batch.json`));
  }
  console.log("");
}

/** Get short weekday name using Intl (locale-aware, e.g. Mon/Di/Lun). */
function shortDayName(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

/** Format a Date as DD.MM.YYYY. */
function fmtFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/**
 * Compute month-level missing days and week-level stats, then write the cache.
 * Reused by refreshCache and listTime.
 */
function updateCacheFromEntries(entries: ExistingEntry[], monthYear: string): void {
  const locale = getLocale();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [mm, yyyy] = monthYear.split(".");
  const year = parseInt(yyyy, 10);
  const month = parseInt(mm, 10) - 1;

  // Compute missing weekdays from month start to today
  const lastDay = new Date(year, month + 1, 0);
  const endDate = lastDay < today ? lastDay : today;

  const missingDayNames: string[] = [];
  const missingDayDates: string[] = [];
  for (let d = new Date(year, month, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dStr = formatDate(d.toISOString().split("T")[0]);
    const hasEntry = entries.some((e) => e.date === dStr);
    if (!hasEntry) {
      missingDayNames.push(shortDayName(new Date(d), locale));
      missingDayDates.push(dStr);
    }
  }

  // Week-level stats
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const weekNum = getISOWeekNumber(today);

  // Filter entries to current week for worked hours
  const weekDates = new Set<string>();
  for (let d = new Date(monday); d <= friday; d.setDate(d.getDate() + 1)) {
    weekDates.add(fmtFull(new Date(d)));
  }

  const worked = entries
    .filter((e) => weekDates.has(e.date))
    .reduce((sum, e) => {
      const h = parseFloat(e.hours.replace(",", "."));
      return sum + (isNaN(h) ? 0 : h);
    }, 0);

  // Preserve saldo/vacation/target from existing cache
  let existingCache: Record<string, unknown> | null = null;
  try {
    existingCache = JSON.parse(fs.readFileSync(config.statusCachePath, "utf-8"));
  } catch {
    // Cache may not exist yet
  }

  const target = (existingCache?.target as number) || 40;
  const remaining = Math.max(0, target - worked);

  ensureConfigDir();
  const cache = {
    updatedAt: new Date().toISOString(),
    month: monthYear,
    weekNumber: weekNum,
    monday: fmtFull(monday),
    friday: fmtFull(friday),
    worked,
    target,
    remaining,
    missingDays: missingDayNames.map((name, i) => ({
      date: missingDayDates[i],
      dayName: name,
    })),
    saldo: existingCache?.saldo ?? null,
    vacation: existingCache?.vacation ?? null,
  };
  fs.writeFileSync(config.statusCachePath, JSON.stringify(cache, null, 2) + "\n");
}

/**
 * Refresh the cache after a log/delete operation.
 * Switches to month view, reads current entries, and updates the cache file.
 */
async function refreshCache(page: Page): Promise<void> {
  try {
    spin(t().updatingCache);
    const todayStr = new Date().toISOString().split("T")[0];
    const monthYear = toMonthYear(todayStr);

    await setMonthFilter(page, monthYear);
    const entries = await readGridEntries(page);

    updateCacheFromEntries(entries, monthYear);
    stopSpinner();
  } catch {
    // Cache refresh is non-critical, silently ignore
    stopSpinner();
  }
}

/**
 * Show the time report (weekly status) for the week containing the given date.
 * @param date — format "YYYY-MM-DD", defaults to today
 */
export async function statusTime(date: string): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();

    // 1. Navigate to Leistungen first (sets up session + filters)
    await navigateToLeistungen(page);
    await setMonthFilter(page, toMonthYear(date));

    spin(t().readingTimeReport);

    // 2. Read grid entries for missing-days detection
    const entries = await readGridEntries(page);

    // 3. Navigate to Wochenrapport for weekly totals, saldo, vacation
    await navigateToWochenrapport(page);

    const weekly = await readWeeklyReport(page);
    const saldo = await readSaldoPanel(page);
    const vacation = await readVacationPanel(page);

    if (!weekly) {
      fail(err(t().timeReportNotFound));
      return;
    }

    stopSpinner();

    const locale = getLocale();
    const LABEL_WIDTH = 22;

    // --- Week header ---
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const weekNum = getISOWeekNumber(targetDate);
    const fmtDayMonth = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;

    console.log("");
    console.log(bold(t().statusWeekHeader(weekNum, fmtDayMonth(monday), fmtFull(friday))));
    console.log("");

    // --- Worked / Remaining ---
    const remaining = Math.max(0, weekly.target - weekly.worked);
    console.log(`  ${pad(t().statusWorked + ":", LABEL_WIDTH)} ${bold(fmtHours(weekly.worked))} / ${fmtHours(weekly.target)} ${t().statusHoursUnit}`);
    console.log(`  ${pad(t().statusRemaining + ":", LABEL_WIDTH)} ${remaining > 0 ? warn(fmtHours(remaining)) : fmtHours(remaining)} ${t().statusHoursUnit}`);

    // --- Missing days ---
    const today = new Date();
    const missingDayNames: string[] = [];
    const missingDayDates: string[] = [];
    for (let d = new Date(monday); d <= today && d <= friday; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const dStr = formatDate(d.toISOString().split("T")[0]);
      const hasEntry = entries.some((e) => e.date === dStr);
      if (!hasEntry) {
        missingDayNames.push(shortDayName(new Date(d), locale));
        missingDayDates.push(dStr);
      }
    }

    if (missingDayNames.length > 0) {
      console.log(`  ${pad(t().statusMissingDaysLabel + ":", LABEL_WIDTH)} ${warn(missingDayNames.join(", "))}`);
    }

    // --- Balances (Saldo) ---
    if (saldo) {
      console.log("");
      console.log(bold(t().statusBalancesHeader));
      console.log(`  ${pad(t().statusOvertime + ":", LABEL_WIDTH)} ${fmtSignedHours(saldo.overtime)} ${t().statusHoursUnit} (${(saldo.overtime / 8).toFixed(1)}${t().statusDaysUnit})`);
      console.log(`  ${pad(t().statusExtraTime + ":", LABEL_WIDTH)} ${fmtSignedHours(saldo.extraTime)} ${t().statusHoursUnit} (${(saldo.extraTime / 8).toFixed(1)}${t().statusDaysUnit})`);
    }

    // --- Vacation (Ferien) ---
    if (vacation) {
      console.log("");
      console.log(bold(t().statusVacationHeader));
      console.log(`  ${pad(t().statusVacationRemaining + ":", LABEL_WIDTH)} ${fmtHours(vacation.remaining)} / ${fmtHours(vacation.entitlement)} ${t().statusHoursUnit} (${(vacation.remaining / 8).toFixed(1)} / ${(vacation.entitlement / 8).toFixed(1)}${t().statusDaysUnit})`);
      console.log(`  ${pad(t().statusVacationPlannedByDec + ":", LABEL_WIDTH)} ${fmtHoursAndDays(vacation.plannedByYearEnd)}`);
    }

    // --- Write status cache (month-level missing days) ---
    const monthYear = toMonthYear(date);
    const nowForCache = new Date();
    const currentMonthYear = `${String(nowForCache.getMonth() + 1).padStart(2, "0")}.${nowForCache.getFullYear()}`;
    if (monthYear === currentMonthYear) {
      try {
        const [mmC, yyyyC] = monthYear.split(".");
        const yearC = parseInt(yyyyC, 10);
        const monthC = parseInt(mmC, 10) - 1;
        const lastDayOfMonth = new Date(yearC, monthC + 1, 0);
        const endDateForMonth = lastDayOfMonth < today ? lastDayOfMonth : today;

        const monthMissingDayNames: string[] = [];
        const monthMissingDayDates: string[] = [];
        for (let dm = new Date(yearC, monthC, 1); dm <= endDateForMonth; dm.setDate(dm.getDate() + 1)) {
          const dow = dm.getDay();
          if (dow === 0 || dow === 6) continue;
          const dStr = formatDate(dm.toISOString().split("T")[0]);
          const hasEntry = entries.some((e) => e.date === dStr);
          if (!hasEntry) {
            monthMissingDayNames.push(shortDayName(new Date(dm), locale));
            monthMissingDayDates.push(dStr);
          }
        }

        ensureConfigDir();
        const cache = {
          updatedAt: new Date().toISOString(),
          month: monthYear,
          weekNumber: weekNum,
          monday: fmtFull(monday),
          friday: fmtFull(friday),
          worked: weekly.worked,
          target: weekly.target,
          remaining,
          missingDays: monthMissingDayNames.map((name, i) => ({
            date: monthMissingDayDates[i],
            dayName: name,
          })),
          saldo: saldo ? { overtime: saldo.overtime, extraTime: saldo.extraTime, total: saldo.total } : null,
          vacation: vacation ? {
            remaining: vacation.remaining,
            entitlement: vacation.entitlement,
            remainingDays: parseFloat((vacation.remaining / 8).toFixed(1)),
            entitlementDays: parseFloat((vacation.entitlement / 8).toFixed(1)),
          } : null,
        };
        fs.writeFileSync(config.statusCachePath, JSON.stringify(cache, null, 2) + "\n");
      } catch {
        // Cache write failure is non-critical, silently ignore
      }
    }

    // --- Example command hints ---
    if (weekly.difference < 0) {
      const hours = Math.min(Math.abs(weekly.difference), 8);
      printHints(entries, missingDayDates, hours, date);
    } else {
      console.log("");
    }
  } finally {
    await close();
  }
  });
}

/**
 * List all time entries for a given month.
 * @param monthYear — format "MM.YYYY" e.g. "01.2025"
 */
export async function listTime(monthYear: string): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setMonthFilter(page, monthYear);

    spin(t().readingEntries);
    const entries = await readGridEntries(page);

    stopSpinner();

    // Compute weekdays in the month up to today
    const [mm, yyyy] = monthYear.split(".");
    const year = parseInt(yyyy, 10);
    const month = parseInt(mm, 10) - 1; // 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = new Date(year, month + 1, 0); // last day of month
    const endDate = lastDay < today ? lastDay : today;

    const weekdays: string[] = [];
    for (
      let d = new Date(year, month, 1);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const dd = String(d.getDate()).padStart(2, "0");
      const mmStr = String(d.getMonth() + 1).padStart(2, "0");
      weekdays.push(`${dd}.${mmStr}.${d.getFullYear()}`);
    }

    // Group entries by date
    const entriesByDate = new Map<string, ExistingEntry[]>();
    for (const e of entries) {
      const list = entriesByDate.get(e.date) || [];
      list.push(e);
      entriesByDate.set(e.date, list);
    }

    // Build table with missing-day warnings interleaved
    const table = new Table({
      head: [
        t().headerDate,
        t().headerProject,
        t().headerServiceType,
        t().headerHours,
        t().headerText,
      ],
      style: { head: ["cyan"] },
    });

    let missingCount = 0;
    const datesRendered = new Set<string>();

    for (const day of weekdays) {
      const dayEntries = entriesByDate.get(day);
      datesRendered.add(day);
      if (dayEntries && dayEntries.length > 0) {
        for (const e of dayEntries) {
          table.push([e.date, e.project, e.serviceType, e.hours, e.text]);
        }
      } else {
        missingCount++;
        table.push([
          chalk.yellow(day),
          chalk.yellow(`⚠ ${t().missingDayRow}`),
          "",
          "",
          "",
        ]);
      }
    }

    // Append entries with dates outside the weekday range (e.g. weekend entries)
    for (const e of entries) {
      if (!datesRendered.has(e.date)) {
        table.push([e.date, e.project, e.serviceType, e.hours, e.text]);
        datesRendered.add(e.date);
      }
    }

    console.log("");
    console.log(table.toString());
    console.log(info(t().entriesTotal(entries.length)));
    if (missingCount > 0) {
      console.log(warn(t().missingDaysSummary(missingCount)));

      const missingDays = weekdays.filter((d) => !entriesByDate.has(d) || entriesByDate.get(d)!.length === 0);
      printHints(entries, missingDays, 8, "");
    }

    // Update cache if listing current month
    const now = new Date();
    const currentMonthYear = `${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
    if (monthYear === currentMonthYear) {
      try {
        updateCacheFromEntries(entries, monthYear);
      } catch {
        // Cache update is non-critical
      }
    }
  } finally {
    await close();
  }
  });
}

/**
 * Log a time entry. Checks for duplicates (same date + project) and offers
 * to update the existing entry or create a new one.
 */
export async function logTime(entry: TimeEntry): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setMonthFilter(page, toMonthYear(entry.date));

    // Read entries and check for duplicate
    spin(t().readingExistingEntries);
    const allEntries = await readGridEntries(page);
    const targetDate = formatDate(entry.date);
    const match = allEntries.find(
      (e) => e.date === targetDate && e.project.includes(entry.project)
    );

    if (match) {
      stopSpinner();
      console.log("");
      console.log(warn(t().alreadyBooked(match.hours, match.date, match.project)));
      console.log(`  ${t().serviceTypeLabel}: ${match.serviceType}`);
      if (match.text) console.log(`  ${t().textLabel}: ${match.text}`);
      console.log("");

      const answer = await promptUser(t().promptUpdateOrNew);

      if (answer === t().promptYes) {
        spin(t().openingExistingEntry);
        await clickRow(page, match.rowIndex);
        await fillForm(page, entry);
      } else {
        spin(t().creatingNewEntry);
        await createEntry(page, entry);
      }
    } else {
      spin(t().noExistingEntryCreating);
      await createEntry(page, entry);
    }

    if (config.semiManual) {
      // Semi-manual mode: form is filled, user saves manually
      stopSpinner();
      console.log(bold("Form filled. Save manually in the browser, then press Enter here."));
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });
      succeed(success(t().saved));
    } else {
      spin(t().saving);
      await saveEntry(page);
      succeed(success(t().saved));
    }

    await refreshCache(page);
  } finally {
    await close();
  }
  });
}

/**
 * Delete a time entry matching the given date and project.
 * Opens the side panel and uses the three-dot menu → Delete.
 */
export async function deleteTime(
  date: string,
  project: string
): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setMonthFilter(page, toMonthYear(date));

    spin(t().readingEntries);
    const allEntries = await readGridEntries(page);
    const targetDate = formatDate(date);
    const matches = allEntries.filter(
      (e) => e.date === targetDate && e.project.includes(project)
    );

    if (matches.length === 0) {
      stopSpinner();
      console.log(info(t().noEntryFound(targetDate, project)));
      return;
    }

    let match: ExistingEntry;

    if (matches.length === 1) {
      match = matches[0];
      stopSpinner();
      console.log(t().foundEntry(match.hours, match.date, match.project));
      console.log(`  ${t().serviceTypeLabel}: ${match.serviceType}`);
      if (match.text) console.log(`  ${t().textLabel}: ${match.text}`);
      console.log("");

      const answer = await promptUser(t().promptConfirmDelete);
      if (answer !== confirmDeleteKey()) {
        console.log(info(t().cancelled));
        return;
      }
    } else {
      stopSpinner();
      console.log(t().multipleEntriesFound(matches.length, targetDate, project));
      console.log("");
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        console.log(
          `  [${i + 1}] ${m.hours}  ${m.serviceType}  ${m.text || t().noText}`
        );
      }
      console.log("");

      const answer = await promptUser(t().promptWhichDelete(matches.length));
      if (answer === "n") {
        console.log(info(t().cancelled));
        return;
      }
      if (answer === "a") {
        // Delete all matches in reverse order (so rowIndex stays valid)
        for (let i = matches.length - 1; i >= 0; i--) {
          spin(t().deletingEntry(i + 1, matches.length));
          await clickRow(page, matches[i].rowIndex);
          await deleteSidePanelEntry(page);
        }
        succeed(success(t().entriesDeleted(matches.length)));
        await refreshCache(page);
        return;
      }
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= matches.length) {
        console.log(warn(t().invalidSelection));
        return;
      }
      match = matches[idx];
    }

    // Open side panel for this entry
    spin(t().deletingEntry(1, 1));
    await clickRow(page, match.rowIndex);

    // Delete via three-dot menu
    await deleteSidePanelEntry(page);

    succeed(success(t().entryDeleted));

    await refreshCache(page);
  } finally {
    await close();
  }
  });
}

/**
 * Interactive delete: load all entries for the current month,
 * let the user pick which ones to delete via checkbox, then delete them.
 * Returns the entries so the command layer can drive the selection UI.
 */
export async function loadMonthEntries(): Promise<{
  entries: ExistingEntry[];
  deleteFn: (indices: number[]) => Promise<void>;
  closeFn: () => Promise<void>;
}> {
  const { context, close } = await createAuthenticatedContext();
  const page = await context.newPage();

  try {
    await navigateToLeistungen(page);
    const now = new Date();
    const monthYear = `${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
    await setMonthFilter(page, monthYear);

    spin(t().readingEntries);
    const entries = await readGridEntries(page);
    stopSpinner();

    const deleteFn = async (indices: number[]) => {
      // Re-navigate to ensure page is fresh after idle time in the picker
      await navigateToLeistungen(page);
      await setMonthFilter(page, monthYear);
      await waitForVaadin(page);

      // Sort descending so that row indices stay valid as we delete
      const sorted = [...indices].sort((a, b) => b - a);
      for (let i = 0; i < sorted.length; i++) {
        spin(t().deletingEntry(i + 1, sorted.length));
        await deleteRowViaContextMenu(page, sorted[i]);
      }
      succeed(success(t().entriesDeleted(sorted.length)));

      await refreshCache(page);
    };

    return { entries, deleteFn, closeFn: close };
  } catch (e) {
    await close();
    throw e;
  }
}

/**
 * Log multiple time entries in a single browser session.
 * Groups entries by month, checks for duplicates, and creates entries sequentially.
 */
export async function batchLogTime(entries: TimeEntry[]): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);

    // Group entries by month
    const byMonth = new Map<string, TimeEntry[]>();
    for (const entry of entries) {
      const key = toMonthYear(entry.date);
      const list = byMonth.get(key) || [];
      list.push(entry);
      byMonth.set(key, list);
    }

    let created = 0;
    let skipped = 0;
    let entryIndex = 0;

    for (const [monthYear, monthEntries] of byMonth) {
      await setMonthFilter(page, monthYear);

      spin(t().readingExistingEntries);
      const existing = await readGridEntries(page);

      for (const entry of monthEntries) {
        entryIndex++;
        const targetDate = formatDate(entry.date);

        // Check for duplicate (same date + project)
        const isDuplicate = existing.some(
          (e) => e.date === targetDate && e.project.includes(entry.project)
        );

        if (isDuplicate) {
          stopSpinner();
          console.log(warn(t().batchSkipping(targetDate, entry.project)));
          skipped++;
          continue;
        }

        spin(t().batchCreating(entryIndex, entries.length, targetDate));

        await createEntry(page, entry);

        spin(t().saving);
        await saveEntry(page);

        await closeSidePanelIfOpen(page);
        created++;
      }
    }

    stopSpinner();
    succeed(success(t().batchSummary(created, skipped)));

    if (created > 0) {
      await refreshCache(page);
    }
  } finally {
    await close();
  }
  });
}

/**
 * Generate a batch template file with missing weekdays pre-filled with defaults.
 */
export async function generateBatchFile(
  from: string,
  to: string,
  outPath: string
): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);

    // Collect existing entries across months in the range
    const allExisting: ExistingEntry[] = [];
    const months = new Set<string>();
    const startDate = new Date(from);
    const endDate = new Date(to);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      months.add(toMonthYear(d.toISOString().split("T")[0]));
    }

    for (const monthYear of months) {
      await setMonthFilter(page, monthYear);
      spin(t().readingEntries);
      const entries = await readGridEntries(page);
      allExisting.push(...entries);
    }

    // Find weekdays with no entries
    const missing: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const dateStr = d.toISOString().split("T")[0];
      const formatted = formatDate(dateStr);
      const hasEntry = allExisting.some((e) => e.date === formatted);
      if (!hasEntry) {
        missing.push(dateStr);
      }
    }

    stopSpinner();

    if (missing.length === 0) {
      console.log(info(t().batchNoEntries));
      return;
    }

    // Pick defaults from the last existing entry
    let defaultProject = "";
    let defaultServiceType = "";
    let defaultHours = 8;
    let defaultText = "";
    if (allExisting.length > 0) {
      const last = allExisting[allExisting.length - 1];
      defaultProject = last.project.trim();
      defaultServiceType = last.serviceType.trim();
      defaultText = last.text.trim();
      const parsed = parseFloat(last.hours.replace(",", "."));
      if (!isNaN(parsed)) defaultHours = parsed;
    }

    const template = missing.map((date) => ({
      date,
      project: defaultProject,
      serviceType: defaultServiceType,
      hours: defaultHours,
      text: defaultText,
    }));

    fs.writeFileSync(outPath, JSON.stringify(template, null, 2) + "\n");
    succeed(success(t().batchGenerated(outPath, missing.length)));
    console.log(info(t().batchGenerateHint(outPath)));
  } finally {
    await close();
  }
  });
}
