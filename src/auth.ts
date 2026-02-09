import { chromium, BrowserContext } from "patchright-core";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import os from "os";
import chalk from "chalk";
import { config, ensureConfigDir, hasState, saveConfigFile } from "./config";

export async function login(): Promise<void> {
  if (!config.abacusUrl) {
    throw new Error(
      "ABACUS_URL not configured. Run 'abacus config set url <url>'"
    );
  }

  ensureConfigDir();

  console.log(chalk.dim("Starting browser for login..."));
  console.log(chalk.dim(`Navigating to: ${config.abacusUrl}`));
  console.log("");
  console.log("Please log in manually in the browser window.");
  console.log("The browser will close automatically once login is detected.");
  console.log("");

  const context = await chromium.launchPersistentContext(config.chromeDataDir, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto(config.abacusUrl);

  // Wait for successful login by detecting the Vaadin portal menu
  try {
    await page
      .locator('vaadin-button[movie-id="menu-item_rapportierung"]')
      .waitFor({ state: "visible", timeout: 300_000 });
    console.log(chalk.green("Login detected!"));
  } catch {
    console.log("");
    console.log(
      chalk.yellow("Auto-detection timed out. If you are logged in, press Enter in this terminal to save the session.")
    );
    await new Promise<void>((resolve) => {
      process.stdin.once("data", () => resolve());
    });
  }

  // Write marker so other commands know login has been done
  fs.writeFileSync(config.statePath, JSON.stringify({ loggedIn: true }));

  // Persist URL so the launchd daemon can find it
  saveConfigFile({ abacusUrl: config.abacusUrl });

  console.log("");
  console.log(chalk.green("Session saved"));

  await context.close();
}

export async function createAuthenticatedContext(): Promise<{
  context: BrowserContext;
  close: () => Promise<void>;
}> {
  if (!config.abacusUrl) {
    throw new Error(
      "ABACUS_URL not configured. Run 'abacus config set url <url>'"
    );
  }

  if (!hasState()) {
    throw new Error(
      "No saved session found. Run 'abacus login' first."
    );
  }

  const context = await chromium.launchPersistentContext(config.chromeDataDir, {
    headless: config.headless,
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
  });

  return {
    context,
    close: async () => {
      await context.close();
    },
  };
}

const REFRESH_LOG = path.join(config.configDir, "refresh.log");

function logRefresh(message: string): void {
  const ts = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  const line = `[${ts}] ${message}\n`;
  fs.appendFileSync(REFRESH_LOG, line);
}

export async function refresh(): Promise<void> {
  const { context, close } = await createAuthenticatedContext();
  try {
    const page = await context.newPage();
    await page.goto(config.abacusUrl, { waitUntil: "networkidle" });
    await page
      .locator('vaadin-button[movie-id="menu-item_rapportierung"]')
      .waitFor({ state: "visible", timeout: 15_000 });
    logRefresh("Session refreshed successfully");
    console.log(chalk.green("Session refreshed successfully"));
  } catch {
    logRefresh("ERROR: Session expired — run 'abacus login'");
    console.error(chalk.red("Session expired — run 'abacus login'"));
    try {
      execSync(
        `osascript -e 'display notification "Session expired — run abacus login" with title "Abacus CLI"'`
      );
    } catch {
      // Notification is optional; may fail on non-macOS or headless environments
    }
    await close();
    process.exit(1);
  }
  await close();
}

const PLIST_LABEL = "com.abacus-cli.refresh";
const PLIST_PATH = path.join(
  os.homedir(),
  "Library",
  "LaunchAgents",
  `${PLIST_LABEL}.plist`
);

export function installRefreshDaemon(intervalMinutes: number): void {
  const nodePath = process.execPath;
  const abacusBin = path.resolve(process.argv[1]);
  const intervalSeconds = intervalMinutes * 60;

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${abacusBin}</string>
    <string>refresh</string>
  </array>
  <key>StartInterval</key>
  <integer>${intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${REFRESH_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${REFRESH_LOG}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>`;

  // Unload existing agent if present
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null`);
  } catch {}

  fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true });
  fs.writeFileSync(PLIST_PATH, plist);
  execSync(`launchctl load "${PLIST_PATH}"`);

  console.log(chalk.green(`Refresh daemon installed (every ${intervalMinutes} min)`));
  console.log(chalk.dim(`Plist: ${PLIST_PATH}`));
  console.log(chalk.dim(`Log:   ${REFRESH_LOG}`));
}

export function uninstallRefreshDaemon(): void {
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null`);
  } catch {}

  if (fs.existsSync(PLIST_PATH)) {
    fs.unlinkSync(PLIST_PATH);
  }

  console.log(chalk.green("Refresh daemon uninstalled"));
}
