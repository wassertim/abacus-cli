// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import { Page } from "rebrowser-playwright-core";
import * as readline from "readline";
import Table from "cli-table3";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";
import { t, detectLocale, setLocale, confirmDeleteKey, Locale } from "./i18n";
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
  leistungsart: string;
  hours: number;
  date: string; // YYYY-MM-DD
  buchungstext: string;
}

export interface ExistingEntry {
  datum: string;
  projekt: string;
  leistungsart: string;
  text: string;
  anzahl: string;
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

/** Navigate to Leistungen page via Rapportierung menu. */
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

  spin(t().openingRapportierung);
  const isExpanded = await rapportierungToggle.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await rapportierungToggle.click();
    await waitForVaadin(page);
  }

  spin(t().openingLeistungen);
  await page.locator('a[href^="proj_services"]').click();
  await waitForVaadin(page);
}

/**
 * Set the Leistungen page filters to show a full month.
 * @param monthYear — format "MM.YYYY" e.g. "01.2025"
 */
async function setMonthFilter(page: Page, monthYear: string): Promise<void> {
  // Set Ansicht to "Monat" (position 3 in dropdown)
  spin(t().settingAnsichtMonth);
  await selectComboboxByIndex(page, "cmbDateRange", 3);

  // Set Datum to the first day of the requested month
  const [mm, yyyy] = monthYear.split(".");
  const formattedDate = `01.${mm}.${yyyy}`;

  spin(t().settingDatum(formattedDate));
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
    const results: { card: string[]; text: string; anzahl: string; status: string }[] = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));

      const getSlotContent = (cellIndex: number): Element | null => {
        if (cellIndex >= cells.length) return null;
        const slot = cells[cellIndex].querySelector("slot");
        if (!slot) return null;
        const assigned = (slot as HTMLSlotElement).assignedElements();
        return assigned.length > 0 ? assigned[0] : null;
      };

      // Cell 0: card with date + project + leistungsart as separate child elements
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

      // Cell 1: buchungstext
      const textEl = getSlotContent(1);
      const text = textEl?.textContent?.trim() || "";

      // Cell 2: anzahl/hours
      const anzahlEl = getSlotContent(2);
      const anzahl = anzahlEl?.textContent?.trim() || "";

      // Cell 3: status
      const statusEl = getSlotContent(3);
      const status = statusEl?.textContent?.trim() || "";

      // Skip empty rows
      if (card.length === 0 && !text && !anzahl) continue;

      results.push({ card, text, anzahl, status });
    }

    return results;
  });

  return raw.map((r, i) => ({
    // Card parts: [0]=date, [1]=project, [2]=leistungsart
    datum: r.card[0] || "",
    projekt: r.card[1] || "",
    leistungsart: r.card[2] || "",
    text: r.text,
    anzahl: r.anzahl,
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
  spin(t().settingDatumField(formattedDate));
  const dateInput = page.locator('vaadin-date-picker[movie-id="ProjDat"] input');
  await dateInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await dateInput.pressSequentially(formattedDate, { delay: 30 });
  await dateInput.press("Enter");
  await waitForVaadin(page);

  // Projekt-Nr. (movie-id="ProjNr2")
  spin(t().settingProjekt(entry.project));
  await fillCombobox(page, "ProjNr2", entry.project);

  // Leistungsart (movie-id="LeArtNr") — appears after project selection
  spin(t().settingLeistungsart(entry.leistungsart));
  const leistungsartCombo = page.locator(
    'vaadin-combo-box[movie-id="LeArtNr"]'
  );
  await leistungsartCombo.waitFor({ state: "visible", timeout: 10_000 });
  await fillCombobox(page, "LeArtNr", entry.leistungsart);

  // Stunden (movie-id="Menge")
  spin(t().settingStunden(entry.hours));
  const hoursField = page.locator(
    'vaadin-text-field[movie-id="Menge"] input'
  );
  await hoursField.waitFor({ state: "visible", timeout: 10_000 });
  await hoursField.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await hoursField.fill(String(entry.hours));
  await waitForVaadin(page);

  // Buchungstext (movie-id="Text")
  if (entry.buchungstext) {
    spin(t().settingBuchungstext(entry.buchungstext));
    const buchungstext = page.locator(
      'vaadin-text-field[movie-id="Text"] input'
    );
    await buchungstext.click({ clickCount: 3 });
    await page.keyboard.press("Backspace");
    await buchungstext.fill(entry.buchungstext);
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
function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** Extract MM.YYYY from a YYYY-MM-DD date string. */
function toMonthYear(date: string): string {
  const [y, m] = date.split("-");
  return `${m}.${y}`;
}

/**
 * Set the Leistungen page filters to show a week containing the given date.
 * @param date — format "YYYY-MM-DD"
 */
async function setWeekFilter(page: Page, date: string): Promise<void> {
  spin(t().settingAnsichtWeek);
  await selectComboboxByIndex(page, "cmbDateRange", 2);

  const formattedDate = formatDate(date);
  spin(t().settingDatum(formattedDate));
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
 * Show the Rapportmatrix (time account status) for the week containing the given date.
 * @param date — format "YYYY-MM-DD", defaults to today
 */
export async function statusTime(date: string): Promise<void> {
  return withCaptchaRetry(async () => {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setWeekFilter(page, date);

    spin(t().readingRapportmatrix);

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
      fail(err(t().rapportmatrixNotFound));
      return;
    }

    stopSpinner();

    const table = new Table({
      head: [t().rapportmatrixTitle, t().colDay, t().colTotal],
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
      const hasEntry = entries.some((e) => e.datum === dStr);
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
          const projektNr = lastEntry.projekt.split(".")[0].trim();
          // Extract leistungsart number
          const leistungsartNr = lastEntry.leistungsart.split(".")[0].trim();
          const hours = Math.min(missing, 8);
          console.log("");
          console.log(bold(t().exampleLabel));
          console.log(
            dim(`  npx abacus time log --project ${projektNr} --hours ${hours.toFixed(2)} --leistungsart ${leistungsartNr} --text "${lastEntry.text || "..."}" --date ${missingDaysList.length > 0 ? missingDaysList[0].split(".").reverse().join("-") : date}`)
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

    // Group entries by datum
    const entriesByDate = new Map<string, ExistingEntry[]>();
    for (const e of entries) {
      const list = entriesByDate.get(e.datum) || [];
      list.push(e);
      entriesByDate.set(e.datum, list);
    }

    // Build table with missing-day warnings interleaved
    const table = new Table({
      head: [
        t().headerDatum,
        t().headerProjekt,
        t().headerLeistungsart,
        t().headerStunden,
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
          table.push([e.datum, e.projekt, e.leistungsart, e.anzahl, e.text]);
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
      if (!datesRendered.has(e.datum)) {
        table.push([e.datum, e.projekt, e.leistungsart, e.anzahl, e.text]);
        datesRendered.add(e.datum);
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
      (e) => e.datum === targetDate && e.projekt.includes(entry.project)
    );

    if (match) {
      stopSpinner();
      console.log("");
      console.log(warn(t().alreadyBooked(match.anzahl, match.datum, match.projekt)));
      console.log(`  ${t().leistungsartLabel}: ${match.leistungsart}`);
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
    succeed(success(t().saved));
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
      (e) => e.datum === targetDate && e.projekt.includes(project)
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
      console.log(t().foundEntry(match.anzahl, match.datum, match.projekt));
      console.log(`  ${t().leistungsartLabel}: ${match.leistungsart}`);
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
          `  [${i + 1}] ${m.anzahl}  ${m.leistungsart}  ${m.text || t().noText}`
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
