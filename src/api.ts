// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import Table from "cli-table3";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";
import { t, confirmDeleteKey } from "./i18n";
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
  setWeekFilter,
  readGridEntries,
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

/**
 * Show the time report (weekly status) for the week containing the given date.
 * @param date — format "YYYY-MM-DD", defaults to today
 */
export async function statusTime(date: string): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setWeekFilter(page, date);

    spin(t().readingTimeReport);

    const rows = await page.evaluate(() => {
      const panel = document.querySelector(
        'vaadin-vertical-layout[movie-id="id_pnl_matrixView"]'
      );
      if (!panel) return [];

      const flexRows = panel.querySelectorAll("div.va-flex-layout");
      const results: { label: string; col1: string; col2: string }[] = [];

      for (const row of Array.from(flexRows)) {
        const cells = row.querySelectorAll(
          "div.va-html-label, div.va-label"
        );
        if (cells.length < 3) continue;

        const getText = (el: Element): string =>
          el.textContent?.trim() || "";

        const label = getText(cells[0]);
        if (!label) continue;

        results.push({
          label,
          col1: getText(cells[1]),
          col2: getText(cells[2]),
        });
      }

      return results;
    });

    if (rows.length === 0) {
      fail(err(t().timeReportNotFound));
      return;
    }

    stopSpinner();

    const table = new Table({
      head: [t().timeReportTitle, t().colDay, t().colTotal],
      style: { head: ["cyan"] },
    });

    for (const r of rows) {
      table.push([r.label, r.col1, r.col2]);
    }

    console.log("");
    console.log(table.toString());

    // --- Hints ---
    const entries = await readGridEntries(page);
    const today = new Date();
    const todayStr = formatDate(
      today.toISOString().split("T")[0]
    );

    // Find weekdays (Mon-Fri) in this week up to today that have no entries
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ...
    const monday = new Date(targetDate);
    monday.setDate(
      targetDate.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1)
    );

    const missingDaysList: string[] = [];
    for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const dStr = formatDate(d.toISOString().split("T")[0]);
      const hasEntry = entries.some((e) => e.date === dStr);
      if (!hasEntry) {
        missingDaysList.push(dStr);
      }
    }

    if (missingDaysList.length > 0) {
      console.log(
        warn(t().missingDays(missingDaysList.length, missingDaysList.join(", ")))
      );
    }

    // Check Differenz for negative hours
    const diffRow = rows.find((r) => r.label === "Differenz");
    if (diffRow) {
      const diff = parseFloat(diffRow.col2.replace(",", "."));
      if (diff < 0) {
        const missing = Math.abs(diff);
        console.log(warn(t().missingHours(missing.toFixed(2))));

        // Suggest command based on last entry
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          // Extract project number (before the dot)
          const projectNr = lastEntry.project.split(".")[0].trim();
          // Extract service type number
          const serviceTypeNr = lastEntry.serviceType.split(".")[0].trim();
          const hours = Math.min(missing, 8);
          console.log("");
          console.log(bold(t().exampleLabel));
          console.log(
            dim(`  npx abacus time log --project ${projectNr} --hours ${hours.toFixed(2)} --service-type ${serviceTypeNr} --text "${lastEntry.text || "..."}" --date ${missingDaysList.length > 0 ? missingDaysList[0].split(".").reverse().join("-") : date}`)
          );
        }
      }
    }

    console.log("");
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
    console.log("");
    console.log(info(t().entriesTotal(entries.length)));
    if (missingCount > 0) {
      console.log(warn(t().missingDaysSummary(missingCount)));
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
