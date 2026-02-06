// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import { Page } from "rebrowser-playwright-core";
import * as readline from "readline";
import Table from "cli-table3";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";
import { t, detectLocale, setLocale, confirmDeleteKey, Locale } from "./i18n";
import * as fs from "fs";
import chalk from "chalk";
import {
  success, err, warn, info, bold, highlight, dim,
  spin, stopSpinner, succeed, fail,
} from "./ui";

/** Retry wrapper: if FortiADC captcha is solved, retry the operation once. */
async function withCaptchaRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CAPTCHA_SOLVED_RETRY") {
      spin(t().captchaRetry);
      return fn();
    }
    throw error;
  }
}

export interface TimeEntry {
  project: string;
  serviceType: string;
  hours: number;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface ExistingEntry {
  date: string;
  project: string;
  serviceType: string;
  text: string;
  hours: string;
  status: string;
  rowIndex: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Wait for Vaadin to finish processing (no pending server requests). */
async function waitForVaadin(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const vaadin = (window as any).Vaadin;
    if (!vaadin?.Flow?.clients) return true;
    return Object.values(vaadin.Flow.clients).every(
      (client: any) => !client.isActive?.()
    );
  }, { timeout: 15_000 });
}

/** Fill a Vaadin combobox: type char-by-char to filter, wait, press Enter. */
async function fillCombobox(
  page: Page,
  movieId: string,
  value: string
): Promise<void> {
  const combo = page.locator(`vaadin-combo-box[movie-id="${movieId}"]`);
  const input = combo.locator("input");

  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");

  await input.pressSequentially(value, { delay: 50 });

  await page.waitForTimeout(1000);
  await waitForVaadin(page);

  await input.press("Enter");
  await waitForVaadin(page);
}

/**
 * Select a Vaadin combobox item by its position (aria-posinset).
 * Opens the dropdown and clicks the item directly — language-independent.
 */
async function selectComboboxByIndex(
  page: Page,
  movieId: string,
  posinset: number
): Promise<void> {
  const combo = page.locator(`vaadin-combo-box[movie-id="${movieId}"]`);
  const input = combo.locator("input");

  // Open the dropdown
  await input.click();
  await page.waitForTimeout(300);

  // Click the item by aria-posinset
  await page
    .locator(`vaadin-combo-box-item[aria-posinset="${posinset}"]`)
    .click();
  await waitForVaadin(page);
}

/** Initialize locale: use env var override or auto-detect from the page. */
async function initLocale(page: Page): Promise<void> {
  if (config.locale) {
    setLocale(config.locale as Locale);
  } else {
    const detected = await detectLocale(page);
    setLocale(detected);
  }
}

/** Navigate to the services (Leistungen) page via the time tracking menu. */
async function navigateToLeistungen(page: Page): Promise<void> {
  spin(t().navigatingToPortal);
  await page.goto(config.abacusUrl, { waitUntil: "networkidle" });

  // Detect FortiADC captcha redirect
  if (page.url().includes("fortiadc_captcha")) {
    fail(warn(t().captchaDetected));

    // Get the browser context to access storageState and relaunch
    const context = page.context();
    const state = await context.storageState();
    const browser = context.browser();

    // Close headless browser
    if (browser) await browser.close();

    // Relaunch in headed mode
    const { chromium } = await import("rebrowser-playwright-core");
    const headedBrowser = await chromium.launch({
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
      ],
    });
    const headedContext = await headedBrowser.newContext({
      storageState: state,
      viewport: { width: 1280, height: 800 },
    });
    const headedPage = await headedContext.newPage();
    await headedPage.goto(config.abacusUrl, { waitUntil: "networkidle" });

    console.log(t().captchaSolve);
    console.log(t().captchaWaiting);

    // Wait for captcha to be solved and portal to load
    await headedPage.waitForFunction(
      () => !window.location.href.includes("fortiadc_captcha"),
      { timeout: 120_000 }
    );
    await waitForVaadin(headedPage);

    // Save updated session state (with captcha cookie)
    const newState = await headedContext.storageState();
    const fs = await import("fs");
    const { config: cfg } = await import("./config");
    fs.writeFileSync(cfg.statePath, JSON.stringify(newState, null, 2));

    await headedBrowser.close();

    // Throw a special error to retry the whole operation
    throw new Error("CAPTCHA_SOLVED_RETRY");
  }

  await waitForVaadin(page);

  // Check if session is still valid (page should have Vaadin menu)
  const rapportierungToggle = page.locator(
    'vaadin-button[movie-id="menu-item_rapportierung"]'
  );
  const menuVisible = await rapportierungToggle
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!menuVisible) {
    const url = page.url();
    throw new Error(t().sessionExpired(url));
  }

  // Auto-detect locale after page loads and before navigating further
  await initLocale(page);

  spin(t().openingTimeTracking);
  const isExpanded = await rapportierungToggle.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await rapportierungToggle.click();
    await waitForVaadin(page);
  }

  spin(t().openingServices);
  await page.locator('a[href^="proj_services"]').click();
  await waitForVaadin(page);
}

/**
 * Set the Leistungen page filters to show a full month.
 * @param monthYear — format "MM.YYYY" e.g. "01.2025"
 */
async function setMonthFilter(page: Page, monthYear: string): Promise<void> {
  // Set view to "Month" (position 3 in dropdown)
  spin(t().settingViewMonth);
  await selectComboboxByIndex(page, "cmbDateRange", 3);

  // Set Datum to the first day of the requested month
  const [mm, yyyy] = monthYear.split(".");
  const formattedDate = `01.${mm}.${yyyy}`;

  spin(t().settingDate(formattedDate));
  const datePicker = page.locator("vaadin-date-picker#dateField");
  const input = datePicker.locator("input");

  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.pressSequentially(formattedDate, { delay: 30 });
  await input.press("Enter");
  await page.waitForTimeout(500);
  await waitForVaadin(page);
}

/** Read all visible entries from the Leistungen grid. */
async function readGridEntries(page: Page): Promise<ExistingEntry[]> {
  // Check for empty state first
  const emptyState = page.locator(".va-empty-state");
  if (await emptyState.isVisible().catch(() => false)) {
    return [];
  }

  const raw = await page.evaluate(() => {
    const grid = document.querySelector(
      'vaadin-grid[movie-id="ServicesList"]'
    );
    if (!grid || !grid.shadowRoot) return [];

    const tbody = grid.shadowRoot.querySelector("#items");
    if (!tbody) return [];

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const results: { card: string[]; text: string; hours: string; status: string }[] = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));

      const getSlotContent = (cellIndex: number): Element | null => {
        if (cellIndex >= cells.length) return null;
        const slot = cells[cellIndex].querySelector("slot");
        if (!slot) return null;
        const assigned = (slot as HTMLSlotElement).assignedElements();
        return assigned.length > 0 ? assigned[0] : null;
      };

      // Cell 0: card with date + project + service type as separate child elements
      const cardEl = getSlotContent(0);
      const card: string[] = [];
      if (cardEl) {
        // Read each .dl-slot-row or direct child block separately
        const blocks = cardEl.querySelectorAll(".dl-slot-row");
        if (blocks.length > 0) {
          blocks.forEach((b) => card.push(b.textContent?.trim() || ""));
        } else {
          // Fallback: read direct children
          Array.from(cardEl.children).forEach((c) =>
            card.push(c.textContent?.trim() || "")
          );
        }
      }

      // Cell 1: description/text
      const textEl = getSlotContent(1);
      const text = textEl?.textContent?.trim() || "";

      // Cell 2: hours
      const hoursEl = getSlotContent(2);
      const hours = hoursEl?.textContent?.trim() || "";

      // Cell 3: status
      const statusEl = getSlotContent(3);
      const status = statusEl?.textContent?.trim() || "";

      // Skip empty rows
      if (card.length === 0 && !text && !hours) continue;

      results.push({ card, text, hours, status });
    }

    return results;
  });

  return raw.map((r, i) => ({
    // Card parts: [0]=date, [1]=project, [2]=serviceType
    date: r.card[0] || "",
    project: r.card[1] || "",
    serviceType: r.card[2] || "",
    text: r.text,
    hours: r.hours,
    status: r.status,
    rowIndex: i,
  }));
}

/** Click a grid row to open the Buchungsdetails side panel. */
async function clickRow(page: Page, rowIndex: number): Promise<void> {
  // Get the bounding box of the target row and click it via Playwright's
  // mouse API so the event propagates correctly through Vaadin's grid.
  const box = await page.evaluate((idx) => {
    const grid = document.querySelector(
      'vaadin-grid[movie-id="ServicesList"]'
    );
    if (!grid || !grid.shadowRoot) return null;
    const tbody = grid.shadowRoot.querySelector("#items");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    if (!rows[idx]) return null;
    const rect = rows[idx].getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, rowIndex);

  if (!box) throw new Error(`Grid row ${rowIndex} not found`);

  await page.mouse.click(box.x, box.y);
  await waitForVaadin(page);

  // Wait for the edit form to appear (works for side panel or dialog)
  await page
    .locator('vaadin-date-picker[movie-id="ProjDat"]')
    .waitFor({ state: "visible", timeout: 10_000 });
}

/** Fill form fields. Works for both the side panel and the new-entry dialog. */
async function fillForm(page: Page, entry: TimeEntry): Promise<void> {
  // Datum (movie-id="ProjDat")
  const formattedDate = formatDate(entry.date);
  spin(t().settingDateField(formattedDate));
  const dateInput = page.locator('vaadin-date-picker[movie-id="ProjDat"] input');
  await dateInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await dateInput.pressSequentially(formattedDate, { delay: 30 });
  await dateInput.press("Enter");
  await waitForVaadin(page);

  // Projekt-Nr. (movie-id="ProjNr2")
  spin(t().settingProject(entry.project));
  await fillCombobox(page, "ProjNr2", entry.project);

  // Service type (movie-id="LeArtNr") — appears after project selection
  spin(t().settingServiceType(entry.serviceType));
  const serviceTypeCombo = page.locator(
    'vaadin-combo-box[movie-id="LeArtNr"]'
  );
  await serviceTypeCombo.waitFor({ state: "visible", timeout: 10_000 });
  await fillCombobox(page, "LeArtNr", entry.serviceType);

  // Hours (movie-id="Menge")
  spin(t().settingHours(entry.hours));
  const hoursField = page.locator(
    'vaadin-text-field[movie-id="Menge"] input'
  );
  await hoursField.waitFor({ state: "visible", timeout: 10_000 });
  await hoursField.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await hoursField.fill(String(entry.hours));
  await waitForVaadin(page);

  // Description (movie-id="Text")
  if (entry.description) {
    spin(t().settingDescription(entry.description));
    const descriptionField = page.locator(
      'vaadin-text-field[movie-id="Text"] input'
    );
    await descriptionField.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await descriptionField.fill(entry.description);
    await waitForVaadin(page);
  }
}

/** Delete the currently open entry via the side panel three-dot menu. */
async function deleteSidePanelEntry(page: Page): Promise<void> {
  // Click three-dot menu in side panel header
  const dotsBtn = page.locator(
    'vaadin-button[movie-id="sidepanel_btnPopupActions"]'
  );
  await dotsBtn.click();
  await page.waitForTimeout(300);

  // Click delete in the popup menu
  await page.locator('vaadin-context-menu-item[movie-id="deleteActionBtn"]').click();
  await waitForVaadin(page);

  // Confirm deletion in the dialog
  const confirmBtn = page.locator('vaadin-button[movie-id="btnPrimary"]');
  await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
  await confirmBtn.click();
  await waitForVaadin(page);
}

/** Delete a grid row directly via the inline three-dot context menu. */
async function deleteRowViaContextMenu(page: Page, rowIndex: number): Promise<void> {
  // Click the three-dot menu button on the target row
  const btnBox = await page.evaluate((idx) => {
    const grid = document.querySelector('vaadin-grid[movie-id="ServicesList"]');
    if (!grid || !grid.shadowRoot) return null;
    const tbody = grid.shadowRoot.querySelector("#items");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    if (!rows[idx]) return null;
    // The menu button is in the last cell's slotted content
    const cells = rows[idx].querySelectorAll("td");
    for (const cell of Array.from(cells)) {
      const slot = cell.querySelector("slot") as HTMLSlotElement | null;
      if (!slot) continue;
      const assigned = slot.assignedElements();
      for (const el of assigned) {
        const btn = el.querySelector("vaadin-button.dl-menubutton") || (el.matches("vaadin-button.dl-menubutton") ? el : null);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  }, rowIndex);

  if (!btnBox) throw new Error(`Menu button not found on row ${rowIndex}`);

  await page.mouse.click(btnBox.x, btnBox.y);

  // Wait for the context menu overlay to appear
  const deleteItem = page.locator('vaadin-context-menu-item[movie-id="datalist_context_delete"]');
  await deleteItem.waitFor({ state: "visible", timeout: 10_000 });
  await deleteItem.click();
  await waitForVaadin(page);

  // Confirm deletion in the dialog
  const confirmBtn = page.locator('vaadin-button[movie-id="btnPrimary"]');
  await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
  await confirmBtn.click();
  await waitForVaadin(page);

  // Wait for confirm dialog to close and grid to stabilize
  await confirmBtn.waitFor({ state: "hidden", timeout: 10_000 });
  await page.waitForTimeout(500);
}

/** Close the side panel if it's currently open. */
async function closeSidePanelIfOpen(page: Page): Promise<void> {
  const panel = page.locator('va-side-panel[movie-id="id_editRecordSidePanel"]');
  if (await panel.isVisible().catch(() => false)) {
    await page.locator('vaadin-button[movie-id="sidepanel_btnClose"]').click();
    await waitForVaadin(page);
  }
}

/** Prompt the user for input in the terminal. */
function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Format date from YYYY-MM-DD to DD.MM.YYYY */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** Extract MM.YYYY from a YYYY-MM-DD date string. */
export function toMonthYear(date: string): string {
  const [y, m] = date.split("-");
  return `${m}.${y}`;
}

/**
 * Set the Leistungen page filters to show a week containing the given date.
 * @param date — format "YYYY-MM-DD"
 */
async function setWeekFilter(page: Page, date: string): Promise<void> {
  spin(t().settingViewWeek);
  await selectComboboxByIndex(page, "cmbDateRange", 2);

  const formattedDate = formatDate(date);
  spin(t().settingDate(formattedDate));
  const datePicker = page.locator("vaadin-date-picker#dateField");
  const input = datePicker.locator("input");

  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await input.pressSequentially(formattedDate, { delay: 30 });
  await input.press("Enter");
  await page.waitForTimeout(500);
  await waitForVaadin(page);
}

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
        await page.locator('vaadin-button[movie-id="mainAction"]').click();
        await waitForVaadin(page);
        await page
          .locator('vaadin-combo-box[movie-id="ProjNr2"]')
          .waitFor({ state: "visible", timeout: 10_000 });
        await fillForm(page, entry);
      }
    } else {
      spin(t().noExistingEntryCreating);
      await page.locator('vaadin-button[movie-id="mainAction"]').click();
      await waitForVaadin(page);
      await page
        .locator('vaadin-combo-box[movie-id="ProjNr2"]')
        .waitFor({ state: "visible", timeout: 10_000 });
      await fillForm(page, entry);
    }

    // Blur the active field so Vaadin commits pending values to the server
    await page.keyboard.press("Tab");
    await waitForVaadin(page);

    if (config.semiManual) {
      // Semi-manual mode: form is filled, user saves manually
      stopSpinner();
      console.log(bold("Form filled. Save manually in the browser, then press Enter here."));
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });
      succeed(success(t().saved));
    } else {
      // Save — try side panel save button, then fall back to dialog button
      spin(t().saving);
      const saveBtn = page.locator('vaadin-button[movie-id="btnSave"]');
      const dialogSaveBtn = page.locator('vaadin-button[movie-id="btnPrimary"]');

      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
      } else if (await dialogSaveBtn.isVisible().catch(() => false)) {
        await dialogSaveBtn.click();
      } else {
        fail(err(t().saveButtonNotFound));
        return;
      }
      await waitForVaadin(page);
      await page.waitForTimeout(1000);
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

        await page.locator('vaadin-button[movie-id="mainAction"]').click();
        await waitForVaadin(page);
        await page
          .locator('vaadin-combo-box[movie-id="ProjNr2"]')
          .waitFor({ state: "visible", timeout: 10_000 });

        await fillForm(page, entry);

        // Blur to commit pending values
        await page.keyboard.press("Tab");
        await waitForVaadin(page);

        // Save
        const saveBtn = page.locator('vaadin-button[movie-id="btnSave"]');
        const dialogSaveBtn = page.locator('vaadin-button[movie-id="btnPrimary"]');

        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
        } else if (await dialogSaveBtn.isVisible().catch(() => false)) {
          await dialogSaveBtn.click();
        } else {
          fail(err(t().saveButtonNotFound));
          return;
        }
        await waitForVaadin(page);
        await page.waitForTimeout(1000);

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
