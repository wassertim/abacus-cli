import { chromium, BrowserContext } from "playwright";
import fs from "fs";
import { config, ensureConfigDir, hasState } from "./config";

export async function login(): Promise<void> {
  ensureConfigDir();

  console.log("Starting browser for login...");
  console.log(`Navigating to: ${config.abacusUrl}`);
  console.log("");
  console.log("Please log in manually in the browser window.");
  console.log("The browser will close automatically once login is detected.");
  console.log("");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(config.abacusUrl);

  // Wait for successful login by detecting the portal page loaded after auth.
  // We wait for a URL change away from any login/auth page, or for a known
  // element that only appears after login. Using a generous timeout since the
  // user logs in manually.
  try {
    await page.waitForFunction(
      () => {
        // Consider logged in when we're on the portal and the page has
        // meaningful content (not a login form redirect).
        const url = window.location.href;
        const isPortal =
          url.includes("/portal/") || url.includes("/myabacus");
        const hasNav =
          document.querySelector("nav") !== null ||
          document.querySelector("[class*='dashboard']") !== null ||
          document.querySelector("[class*='menu']") !== null ||
          document.querySelector("[class*='header']") !== null;
        return isPortal && hasNav;
      },
      {},
      { timeout: 300_000 } // 5 minutes for manual login
    );
  } catch {
    // If the auto-detection doesn't work, give the user a manual option
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

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState });

  return {
    context,
    close: async () => {
      await browser.close();
    },
  };
}
