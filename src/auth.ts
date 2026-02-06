// Must be set BEFORE importing rebrowser-playwright-core
process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = "addBinding";

import { chromium, BrowserContext } from "rebrowser-playwright-core";
import fs from "fs";
import { config, ensureConfigDir, hasState } from "./config";

const STEALTH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-infobars",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-translate",
  "--metrics-recording-only",
  "--no-first-run",
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function login(): Promise<void> {
  ensureConfigDir();

  console.log("Starting browser for login...");
  console.log(`Navigating to: ${config.abacusUrl}`);
  console.log("");
  console.log("Please log in manually in the browser window.");
  console.log("The browser will close automatically once login is detected.");
  console.log("");

  const browser = await chromium.launch({ headless: false, args: STEALTH_ARGS });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto(config.abacusUrl);

  // Wait for successful login by detecting the Vaadin portal menu
  try {
    await page
      .locator('vaadin-button[movie-id="menu-item_rapportierung"]')
      .waitFor({ state: "visible", timeout: 300_000 });
    console.log("Login detected!");
  } catch {
    console.log("");
    console.log(
      "Auto-detection timed out. If you are logged in, press Enter in this terminal to save the session."
    );
    await new Promise<void>((resolve) => {
      process.stdin.once("data", () => resolve());
    });
  }

  // Save browser state (cookies + storage)
  const storageState = await context.storageState();
  fs.writeFileSync(config.statePath, JSON.stringify(storageState, null, 2));

  console.log("");
  console.log(`Session saved to ${config.statePath}`);

  await browser.close();
}

export async function createAuthenticatedContext(): Promise<{
  context: BrowserContext;
  close: () => Promise<void>;
}> {
  if (!hasState()) {
    throw new Error(
      "No saved session found. Run 'abacus login' first."
    );
  }

  const storageState = JSON.parse(fs.readFileSync(config.statePath, "utf-8"));

  const browser = await chromium.launch({
    headless: true,
    args: STEALTH_ARGS,
  });
  const context = await browser.newContext({
    storageState,
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      "sec-ch-ua":
        '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
    },
  });

  return {
    context,
    close: async () => {
      await browser.close();
    },
  };
}
