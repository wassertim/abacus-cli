// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import { Page } from "rebrowser-playwright-core";
import * as readline from "readline";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";

/** Retry wrapper: if FortiADC captcha is solved, retry the operation once. */
async function withCaptchaRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CAPTCHA_SOLVED_RETRY") {
      console.log("Captcha solved. Retrying...");
      return fn();
    }
    throw err;
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

/** Navigate to Leistungen page via Rapportierung menu. */
async function navigateToLeistungen(page: Page): Promise<void> {
  console.log("Navigating to Abacus portal...");
  await page.goto(config.abacusUrl, { waitUntil: "networkidle" });

  // Detect FortiADC captcha redirect
  if (page.url().includes("fortiadc_captcha")) {
    console.log("FortiADC captcha detected. Reopening in headed mode...");

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

    console.log("Please solve the captcha in the browser window.");
    console.log("Waiting for portal to load...");

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
    throw new Error(
      `Session abgelaufen oder Seite nicht geladen (URL: ${url}). Bitte 'abacus login' erneut ausführen.`
    );
  }

  console.log("Opening Rapportierung menu...");
  const isExpanded = await rapportierungToggle.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await rapportierungToggle.click();
    await waitForVaadin(page);
  }

  console.log("Opening Leistungen...");
  await page.locator('a[title="Leistungen"]').click();
  await waitForVaadin(page);
}

/**
 * Set the Leistungen page filters to show a full month.
 * @param monthYear — format "MM.YYYY" e.g. "01.2025"
 */
async function setMonthFilter(page: Page, monthYear: string): Promise<void> {
  // Set Ansicht to "Monat"
  console.log("Setting Ansicht to Monat...");
  await fillCombobox(page, "cmbDateRange", "Monat");

  // Set Datum to the first day of the requested month
  const [mm, yyyy] = monthYear.split(".");
  const formattedDate = `01.${mm}.${yyyy}`;

  console.log(`Setting Datum to ${formattedDate}...`);
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
  const emptyMsg = page.locator(
    'text="Für diese Auswahl sind keine Leistungen vorhanden"'
  );
  if (await emptyMsg.isVisible().catch(() => false)) {
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
  console.log(`Setting Datum: ${formattedDate}`);
  const dateInput = page.locator('vaadin-date-picker[movie-id="ProjDat"] input');
  await dateInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await dateInput.pressSequentially(formattedDate, { delay: 30 });
  await dateInput.press("Enter");
  await waitForVaadin(page);

  // Projekt-Nr. (movie-id="ProjNr2")
  console.log(`Setting Projekt-Nr.: ${entry.project}`);
  await fillCombobox(page, "ProjNr2", entry.project);

  // Leistungsart (movie-id="LeArtNr") — appears after project selection
  console.log(`Setting Leistungsart: ${entry.leistungsart}`);
  const leistungsartCombo = page.locator(
    'vaadin-combo-box[movie-id="LeArtNr"]'
  );
  await leistungsartCombo.waitFor({ state: "visible", timeout: 10_000 });
  await fillCombobox(page, "LeArtNr", entry.leistungsart);

  // Stunden (movie-id="Menge")
  console.log(`Setting Stunden: ${entry.hours}`);
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
    console.log(`Setting Buchungstext: ${entry.buchungstext}`);
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

  // Click "Löschen" in the popup menu
  await page.getByText("Löschen", { exact: true }).click();
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
  console.log("Setting Ansicht to Woche...");
  await fillCombobox(page, "cmbDateRange", "Woche");

  const formattedDate = formatDate(date);
  console.log(`Setting Datum to ${formattedDate}...`);
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

    console.log("Reading Rapportmatrix...");

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
      console.log("Rapportmatrix nicht gefunden.");
      return;
    }

    const labelWidth = Math.max(...rows.map((r) => r.label.length));
    const col1Width = Math.max(6, ...rows.map((r) => r.col1.length));

    console.log("");
    console.log(
      "Rapportmatrix".padEnd(labelWidth) +
        "  " +
        "Tag".padStart(col1Width) +
        "  " +
        "Total"
    );
    console.log("-".repeat(labelWidth + col1Width + 12));

    for (const r of rows) {
      console.log(
        r.label.padEnd(labelWidth) +
          "  " +
          r.col1.padStart(col1Width) +
          "  " +
          r.col2
      );
    }
    console.log("");

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

    const missingDays: string[] = [];
    for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const dStr = formatDate(d.toISOString().split("T")[0]);
      const hasEntry = entries.some((e) => e.datum === dStr);
      if (!hasEntry) {
        missingDays.push(dStr);
      }
    }

    if (missingDays.length > 0) {
      console.log(
        `Du hast an ${missingDays.length} Tag${missingDays.length > 1 ? "en" : ""} nicht gebucht: ${missingDays.join(", ")}`
      );
    }

    // Check Differenz for negative hours
    const diffRow = rows.find((r) => r.label === "Differenz");
    if (diffRow) {
      const diff = parseFloat(diffRow.col2.replace(",", "."));
      if (diff < 0) {
        const missing = Math.abs(diff);
        console.log(`Dir fehlen noch ${missing.toFixed(2)} Stunden.`);

        // Suggest command based on last entry
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          // Extract project number (before the dot)
          const projektNr = lastEntry.projekt.split(".")[0].trim();
          // Extract leistungsart number
          const leistungsartNr = lastEntry.leistungsart.split(".")[0].trim();
          const hours = Math.min(missing, 8);
          console.log("");
          console.log("Beispiel:");
          console.log(
            `  npx abacus time log --project ${projektNr} --hours ${hours.toFixed(2)} --leistungsart ${leistungsartNr} --text "${lastEntry.text || "..."}" --date ${missingDays.length > 0 ? missingDays[0].split(".").reverse().join("-") : date}`
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

    console.log("Reading entries...");
    const entries = await readGridEntries(page);

    if (entries.length === 0) {
      console.log("Keine Einträge gefunden.");
      return;
    }

    // Compute column widths from data
    const cols = {
      datum: Math.max(5, ...entries.map((e) => e.datum.length)),
      projekt: Math.max(7, ...entries.map((e) => e.projekt.length)),
      leistungsart: Math.max(12, ...entries.map((e) => e.leistungsart.length)),
      anzahl: Math.max(7, ...entries.map((e) => e.anzahl.length)),
    };

    const header =
      "Datum".padEnd(cols.datum) +
      "  " +
      "Projekt".padEnd(cols.projekt) +
      "  " +
      "Leistungsart".padEnd(cols.leistungsart) +
      "  " +
      "Stunden".padStart(cols.anzahl) +
      "  " +
      "Text";
    const line = "-".repeat(header.length);

    console.log("");
    console.log(header);
    console.log(line);

    for (const e of entries) {
      console.log(
        e.datum.padEnd(cols.datum) +
          "  " +
          e.projekt.padEnd(cols.projekt) +
          "  " +
          e.leistungsart.padEnd(cols.leistungsart) +
          "  " +
          e.anzahl.padStart(cols.anzahl) +
          "  " +
          e.text
      );
    }

    console.log("");
    console.log(`${entries.length} Einträge total.`);
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
    console.log("Reading existing entries...");
    const allEntries = await readGridEntries(page);
    const targetDate = formatDate(entry.date);
    const match = allEntries.find(
      (e) => e.datum === targetDate && e.projekt.includes(entry.project)
    );

    if (match) {
      console.log("");
      console.log(
        `${match.anzahl} bereits gebucht am ${match.datum} für Projekt ${match.projekt}`
      );
      console.log(`  Leistungsart: ${match.leistungsart}`);
      if (match.text) console.log(`  Text: ${match.text}`);
      console.log("");

      const answer = await promptUser(
        "Bestehenden updaten oder neuen hinzufügen? [u/n] "
      );

      if (answer === "u") {
        console.log("Opening existing entry for editing...");
        await clickRow(page, match.rowIndex);
        await fillForm(page, entry);
      } else {
        console.log("Creating new entry...");
        await page.locator('vaadin-button[movie-id="mainAction"]').click();
        await waitForVaadin(page);
        await page
          .locator('vaadin-combo-box[movie-id="ProjNr2"]')
          .waitFor({ state: "visible", timeout: 10_000 });
        await fillForm(page, entry);
      }
    } else {
      console.log("No existing entry found, creating new...");
      await page.locator('vaadin-button[movie-id="mainAction"]').click();
      await waitForVaadin(page);
      await page
        .locator('vaadin-combo-box[movie-id="ProjNr2"]')
        .waitFor({ state: "visible", timeout: 10_000 });
      await fillForm(page, entry);
    }

    // Save — try side panel save button, then fall back to dialog button
    console.log("Saving...");
    const saveBtn = page.locator('vaadin-button[movie-id="btnSave"]');
    const dialogSaveBtn = page.locator('vaadin-button[movie-id="btnPrimary"]');

    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
    } else if (await dialogSaveBtn.isVisible().catch(() => false)) {
      await dialogSaveBtn.click();
    } else {
      console.log("Save button not found. Entry was NOT saved.");
      return;
    }
    await waitForVaadin(page);
    console.log("Gespeichert.");
  } finally {
    await close();
  }
  });
}

/**
 * Delete a time entry matching the given date and project.
 * Opens the side panel and uses the three-dot menu → Löschen.
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

    console.log("Reading entries...");
    const allEntries = await readGridEntries(page);
    const targetDate = formatDate(date);
    const matches = allEntries.filter(
      (e) => e.datum === targetDate && e.projekt.includes(project)
    );

    if (matches.length === 0) {
      console.log(
        `Kein Eintrag gefunden am ${targetDate} für Projekt ${project}.`
      );
      return;
    }

    let match: ExistingEntry;

    if (matches.length === 1) {
      match = matches[0];
      console.log(
        `Gefunden: ${match.anzahl} am ${match.datum} — ${match.projekt}`
      );
      console.log(`  Leistungsart: ${match.leistungsart}`);
      if (match.text) console.log(`  Text: ${match.text}`);
      console.log("");

      const answer = await promptUser("Wirklich löschen? [j/n] ");
      if (answer !== "j") {
        console.log("Abgebrochen.");
        return;
      }
    } else {
      console.log(
        `${matches.length} Einträge gefunden am ${targetDate} für Projekt ${project}:`
      );
      console.log("");
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        console.log(
          `  [${i + 1}] ${m.anzahl}  ${m.leistungsart}  ${m.text || "(kein Text)"}`
        );
      }
      console.log("");

      const answer = await promptUser(
        `Welchen löschen? [1-${matches.length} / a=alle / n=abbrechen] `
      );
      if (answer === "n") {
        console.log("Abgebrochen.");
        return;
      }
      if (answer === "a") {
        // Delete all matches in reverse order (so rowIndex stays valid)
        for (let i = matches.length - 1; i >= 0; i--) {
          console.log(`Lösche Eintrag ${i + 1}/${matches.length}...`);
          await clickRow(page, matches[i].rowIndex);
          await deleteSidePanelEntry(page);
        }
        console.log(`${matches.length} Einträge gelöscht.`);
        return;
      }
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= matches.length) {
        console.log("Ungültige Auswahl. Abgebrochen.");
        return;
      }
      match = matches[idx];
    }

    // Open side panel for this entry
    await clickRow(page, match.rowIndex);

    // Delete via three-dot menu
    await deleteSidePanelEntry(page);

    console.log("Eintrag gelöscht.");
  } finally {
    await close();
  }
  });
}
