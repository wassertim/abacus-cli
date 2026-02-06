// Leistungen page interaction layer.
// Knows page structure (selectors, grid layout) but no business logic.

import { Page } from "rebrowser-playwright-core";
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

/**
 * Set the Leistungen page filters to show a week containing the given date.
 * @param date — format "YYYY-MM-DD"
 */
export async function setWeekFilter(page: Page, date: string): Promise<void> {
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
