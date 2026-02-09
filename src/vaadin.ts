// Generic Vaadin-over-Playwright primitives.
// No business logic or page-structure knowledge.

import { Page } from "patchright-core";

/** Wait for Vaadin to finish processing (no pending server requests). */
export async function waitForVaadin(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const vaadin = (window as any).Vaadin;
    if (!vaadin?.Flow?.clients) return true;
    return Object.values(vaadin.Flow.clients).every(
      (client: any) => !client.isActive?.()
    );
  }, { timeout: 15_000 });
}

/** Fill a Vaadin combobox: type char-by-char to filter, wait, press Enter. */
export async function fillCombobox(
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
export async function selectComboboxByIndex(
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
