// Leistungen page interaction layer.
// Knows page structure (selectors, grid layout) but no business logic.

import { Page } from "patchright-core";
import { waitForVaadin, fillCombobox, selectComboboxByIndex } from "./vaadin";
import { config } from "./config";
import { t } from "./i18n";
import { spin, fail, succeed, stopSpinner } from "./ui";
import { err, warn } from "./ui";

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

/** Retry wrapper: if FortiADC captcha is solved, retry the operation once. */
export async function withCaptchaRetry<T>(fn: () => Promise<T>): Promise<T> {
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

/** Navigate to the services (Leistungen) page via the time tracking menu. */
export async function navigateToLeistungen(page: Page): Promise<void> {
  spin(t().navigatingToPortal);
  await page.goto(config.abacusUrl, { waitUntil: "networkidle" });

  // Detect FortiADC captcha redirect
  if (page.url().includes("fortiadc_captcha")) {
    fail(err(t().captchaDetected));

    // Close headless browser — persistent context saves state on close
    const context = page.context();
    await context.close();

    // Relaunch in headed mode with same persistent profile
    const { chromium } = await import("patchright-core");
    const { config: cfg } = await import("./config");
    const headedContext = await chromium.launchPersistentContext(cfg.chromeDataDir, {
      headless: false,
      channel: "chrome",
      chromiumSandbox: true,
      viewport: { width: 1280, height: 800 },
    });
    const headedPage = headedContext.pages()[0] || await headedContext.newPage();
    await headedPage.goto(cfg.abacusUrl, { waitUntil: "networkidle" });

    console.log(t().captchaSolve);
    console.log(t().captchaWaiting);

    // Wait for captcha to be solved and portal to load
    await headedPage.waitForFunction(
      () => !window.location.href.includes("fortiadc_captcha"),
      { timeout: 120_000 }
    );
    await waitForVaadin(headedPage);

    await headedContext.close();

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
export async function setMonthFilter(page: Page, monthYear: string): Promise<void> {
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
export async function readGridEntries(page: Page): Promise<ExistingEntry[]> {
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
export async function clickRow(page: Page, rowIndex: number): Promise<void> {
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
export async function fillForm(page: Page, entry: TimeEntry): Promise<void> {
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
export async function deleteSidePanelEntry(page: Page): Promise<void> {
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
export async function deleteRowViaContextMenu(page: Page, rowIndex: number): Promise<void> {
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
export async function closeSidePanelIfOpen(page: Page): Promise<void> {
  const panel = page.locator('va-side-panel[movie-id="id_editRecordSidePanel"]');
  if (await panel.isVisible().catch(() => false)) {
    await page.locator('vaadin-button[movie-id="sidepanel_btnClose"]').click();
    await waitForVaadin(page);
  }
}

/** Click "new entry" button and wait for the form to appear. */
export async function createEntry(page: Page, entry: TimeEntry): Promise<void> {
  await page.locator('vaadin-button[movie-id="mainAction"]').click();
  await waitForVaadin(page);
  await page
    .locator('vaadin-combo-box[movie-id="ProjNr2"]')
    .waitFor({ state: "visible", timeout: 10_000 });
  await fillForm(page, entry);
}

/** Save the currently open entry (side panel or dialog). */
export async function saveEntry(page: Page): Promise<void> {
  // Blur the active field so Vaadin commits pending values to the server
  await page.keyboard.press("Tab");
  await waitForVaadin(page);

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
}

// ---------------------------------------------------------------------------
// Wochenrapport navigation & panel readers (for time status)
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  worked: number;
  target: number;
  difference: number;
}

export interface SaldoData {
  overtime: number;
  extraTime: number;
  total: number;
}

export interface VacationData {
  entitlement: number;
  used: number;
  remaining: number;
  plannedByYearEnd: number;
  remainingByYearEnd: number;
}

/** Parse a value like "40.00 STD" or "-5.79" → number. */
function parseHoursValue(text: string): number {
  const cleaned = text.replace(/[^\d.,-]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/** Navigate to the Wochenrapport page. */
export async function navigateToWochenrapport(page: Page): Promise<void> {
  const rapportierungToggle = page.locator(
    'vaadin-button[movie-id="menu-item_rapportierung"]'
  );
  const isExpanded = await rapportierungToggle.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await rapportierungToggle.click();
    await waitForVaadin(page);
  }
  await page.locator('a[href^="proj_weeklyreport"]').click();
  await waitForVaadin(page);
}

/**
 * Read the weekly totals from the Wochenrapport page grid.
 * The grid is built from individual div.va-flex-layout elements (1 child each).
 * Pattern: [label] [Mon] [Tue] [Wed] [Thu] [Fri] [Total] [empty]
 * We find rows whose Total column (offset +6) contains a time value.
 * The last 3 such rows are always: worked, target, difference (language-independent).
 */
export async function readWeeklyReport(page: Page): Promise<WeeklyReport | null> {
  const totals = await page.evaluate(() => {
    const content = document.querySelector('.va-portal-page-content');
    if (!content) return null;

    const flexLayouts = Array.from(content.querySelectorAll('div.va-flex-layout'));
    const texts = flexLayouts.map(fl => fl.textContent?.trim() || "");

    // Rows are 8 cells: [label, Mon, Tue, Wed, Thu, Fri, Total, spacer]
    // Scan for rows where ALL day columns (+1..+5) and Total (+6) are numeric.
    // This skips the "In & Out" row (empty day columns) and header rows.
    const numPattern = /^-?\d+\.\d{2}$/;
    const rowTotals: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      if (texts[i] && !numPattern.test(texts[i]) && i + 6 < texts.length
          && numPattern.test(texts[i + 1]) && numPattern.test(texts[i + 6])) {
        rowTotals.push(texts[i + 6]);
      }
    }

    // First 3 matching rows are: worked (Istzeit), target (Sollzeit), difference
    return rowTotals.slice(0, 3);
  });

  if (!totals || totals.length < 2) return null;

  return {
    worked: parseHoursValue(totals[0]),
    target: parseHoursValue(totals[1]),
    difference: totals.length >= 3 ? parseHoursValue(totals[2]) : 0,
  };
}

/**
 * Read the Saldo panel on the Wochenrapport page.
 * Panel: movie-id="id_pnl_overTime"
 * Rows: vaadin-horizontal-layout with div.va-label pairs.
 * Row 0 = Überstunden, Row 1 = Überzeit, Row 2 = Total.
 */
export async function readSaldoPanel(page: Page): Promise<SaldoData | null> {
  const values = await page.evaluate(() => {
    const panel = document.querySelector(
      'vaadin-vertical-layout[movie-id="id_pnl_overTime"]'
    );
    if (!panel) return null;

    const rows = panel.querySelectorAll(
      "vaadin-vertical-layout > vaadin-horizontal-layout"
    );
    const result: string[] = [];

    for (const row of Array.from(rows)) {
      const labels = row.querySelectorAll("div.va-label");
      if (labels.length >= 2) {
        // Value is the last label's text content
        const text = labels[labels.length - 1].textContent?.trim() || "0";
        result.push(text);
      }
    }

    return result;
  });

  if (!values || values.length < 2) return null;

  return {
    overtime: parseHoursValue(values[0]),
    extraTime: parseHoursValue(values[1]),
    total: values.length >= 3 ? parseHoursValue(values[2]) : 0,
  };
}

/**
 * Read the Ferien (vacation) panel on the Wochenrapport page.
 * Panel: movie-id="id_pnl_holiday"
 * Rows: Anspruch, Bezug, Restguthaben, Geplanter Bezug per 31.12., Restguthaben per 31.12.
 */
export async function readVacationPanel(page: Page): Promise<VacationData | null> {
  const values = await page.evaluate(() => {
    const panel = document.querySelector(
      'vaadin-vertical-layout[movie-id="id_pnl_holiday"]'
    );
    if (!panel) return null;

    const rows = panel.querySelectorAll(
      "vaadin-vertical-layout > vaadin-horizontal-layout"
    );
    const result: string[] = [];

    for (const row of Array.from(rows)) {
      const labels = row.querySelectorAll("div.va-label");
      if (labels.length >= 2) {
        const text = labels[labels.length - 1].textContent?.trim() || "0";
        result.push(text);
      }
    }

    return result;
  });

  if (!values || values.length < 5) return null;

  return {
    entitlement: parseHoursValue(values[0]),
    used: parseHoursValue(values[1]),
    remaining: parseHoursValue(values[2]),
    plannedByYearEnd: parseHoursValue(values[3]),
    remainingByYearEnd: parseHoursValue(values[4]),
  };
}

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
