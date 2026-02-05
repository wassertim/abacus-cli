// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import { Page } from "playwright";
import * as readline from "readline";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";

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
  await page.goto(config.abacusUrl);
  await waitForVaadin(page);

  console.log("Opening Rapportierung menu...");
  const rapportierungToggle = page.locator(
    'vaadin-button[movie-id="menu-item_rapportierung"]'
  );
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

/** Wait for user to review in the browser, then close. */
async function waitForReview(
  page: Page,
  context: { on: Function }
): Promise<void> {
  console.log("");
  console.log("Form filled. Please review in the browser.");
  console.log(
    "Browser closes automatically in 2 minutes, or close it manually."
  );

  await Promise.race([
    new Promise<void>((resolve) => {
      page.on("close", () => resolve());
      context.on("close", () => resolve());
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 120_000)),
  ]);
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
 * List all time entries for a given month.
 * @param monthYear — format "MM.YYYY" e.g. "01.2025"
 */
export async function listTime(monthYear: string): Promise<void> {
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
}

/**
 * Log a time entry. Checks for duplicates (same date + project) and offers
 * to update the existing entry or create a new one.
 */
export async function logTime(entry: TimeEntry): Promise<void> {
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

    // Save
    console.log("Saving...");
    await page.locator('vaadin-button[movie-id="btnSave"]').click();
    await waitForVaadin(page);
    console.log("Gespeichert.");
  } finally {
    await close();
  }
}

/**
 * Delete a time entry matching the given date and project.
 * Opens the side panel and uses the three-dot menu → Löschen.
 */
export async function deleteTime(
  date: string,
  project: string
): Promise<void> {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();
    await navigateToLeistungen(page);
    await setMonthFilter(page, toMonthYear(date));

    console.log("Reading entries...");
    const allEntries = await readGridEntries(page);
    const targetDate = formatDate(date);
    const match = allEntries.find(
      (e) => e.datum === targetDate && e.projekt.includes(project)
    );

    if (!match) {
      console.log(
        `Kein Eintrag gefunden am ${targetDate} für Projekt ${project}.`
      );
      return;
    }

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

    // Open side panel for this entry
    await clickRow(page, match.rowIndex);

    // Delete via three-dot menu
    await deleteSidePanelEntry(page);

    console.log("Eintrag gelöscht.");
  } finally {
    await close();
  }
}
