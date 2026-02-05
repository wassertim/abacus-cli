// Abacus uses Vaadin (server-side Java framework) with a single UIDL endpoint.
// There is no REST API. All interactions must go through browser automation.

import { Page } from "playwright";
import { createAuthenticatedContext } from "./auth";
import { config } from "./config";

export interface TimeEntry {
  project: string;
  leistungsart: string;
  hours: number;
  date: string; // YYYY-MM-DD
  buchungstext: string;
}

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

  // Click and select all existing text
  await input.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");

  // Type char-by-char to properly trigger Vaadin's filter-changed events
  await input.pressSequentially(value, { delay: 50 });

  // Wait for server-side filter round-trip to complete
  await page.waitForTimeout(1000);
  await waitForVaadin(page);

  // Press Enter to select the first filtered item
  await input.press("Enter");
  await waitForVaadin(page);
}

export async function logTime(entry: TimeEntry): Promise<void> {
  const { context, close } = await createAuthenticatedContext();

  try {
    const page = await context.newPage();

    // 1. Navigate to portal
    console.log("Navigating to Abacus portal...");
    await page.goto(config.abacusUrl);
    await waitForVaadin(page);

    // 2. Expand "Rapportierung" menu group if collapsed
    console.log("Opening Rapportierung menu...");
    const rapportierungToggle = page.locator('vaadin-button[movie-id="menu-item_rapportierung"]');
    const isExpanded = await rapportierungToggle.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await rapportierungToggle.click();
      await waitForVaadin(page);
    }

    // 3. Click "Wochenrapport" link
    console.log("Opening Wochenrapport...");
    const wochenrapportLink = page.locator('a[title="Wochenrapport"]');
    await wochenrapportLink.click();
    await waitForVaadin(page);

    // 4. Select the correct day tab
    console.log(`Selecting date ${entry.date}...`);
    const [year, month, day] = entry.date.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const dayAbbr = dayNames[targetDate.getDay()];
    const dayNum = String(day).padStart(2, "0");

    const dayTab = page.getByText(new RegExp(`${dayAbbr}.*${dayNum}`)).first();
    await dayTab.click();
    await waitForVaadin(page);

    // 5. Click "+" button next to "Leistungen" to open the new entry modal
    console.log("Opening new time entry...");
    const addButton = page.locator('vaadin-button[movie-id="btnNewActivity"]');
    await addButton.click();
    await waitForVaadin(page);

    // 6. Fill modal form fields using movie-id selectors
    // Required fields: ProjNr2, LeArtNr, Menge, Text, AbrTyp (pre-filled)
    // Grobplan is optional and skipped
    const dialog = page.locator('vaadin-dialog-overlay[opened]');
    await dialog.waitFor({ state: "visible", timeout: 10_000 });

    // Projekt-Nr. (movie-id="ProjNr2")
    console.log(`Setting Projekt-Nr.: ${entry.project}`);
    await fillCombobox(page, "ProjNr2", entry.project);

    // Leistungsart (movie-id="LeArtNr") - appears after project selection
    console.log(`Setting Leistungsart: ${entry.leistungsart}`);
    const leistungsartCombo = dialog.locator('vaadin-combo-box[movie-id="LeArtNr"]');
    await leistungsartCombo.waitFor({ state: "visible", timeout: 10_000 });
    await fillCombobox(page, "LeArtNr", entry.leistungsart);

    // (STD) Stunden (movie-id="Menge")
    console.log(`Setting Stunden: ${entry.hours}`);
    const hoursField = dialog.locator('vaadin-text-field[movie-id="Menge"] input');
    await hoursField.waitFor({ state: "visible", timeout: 10_000 });
    await hoursField.click();
    await hoursField.fill(String(entry.hours));
    await waitForVaadin(page);

    // Buchungstext (movie-id="Text")
    if (entry.buchungstext) {
      console.log(`Setting Buchungstext: ${entry.buchungstext}`);
      const buchungstext = dialog.locator('vaadin-text-field[movie-id="Text"] input');
      await buchungstext.click();
      await buchungstext.fill(entry.buchungstext);
      await waitForVaadin(page);
    }

    // Do NOT save - leave the modal open for the user to review
    console.log("");
    console.log("Form filled. Please review in the browser.");
    console.log("Browser closes automatically in 2 minutes, or close it manually.");

    // Wait for 2 min timeout or user closing the browser, whichever comes first
    await Promise.race([
      new Promise<void>((resolve) => {
        page.on("close", () => resolve());
        context.on("close", () => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 120_000)),
    ]);
  } finally {
    await close();
  }
}
