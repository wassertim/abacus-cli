import path from "path";
import os from "os";
import fs from "fs";

const CONFIG_DIR =
  process.env.ABACUS_CONFIG_DIR || path.join(os.homedir(), ".abacus-cli");

export const config = {
  abacusUrl:
    process.env.ABACUS_URL || "https://abacus.example.com/portal/myabacus",
  locale: process.env.ABACUS_LOCALE || "",
  headless: process.env.ABACUS_HEADLESS !== "false",
  semiManual: process.env.ABACUS_SEMI_MANUAL === "true",
  configDir: CONFIG_DIR,
  statePath: path.join(CONFIG_DIR, "state.json"),
  discoveryPath: path.join(CONFIG_DIR, "api-discovery.json"),
  credentialsPath: path.join(CONFIG_DIR, "api-credentials.json"),
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(config.configDir)) {
    fs.mkdirSync(config.configDir, { recursive: true });
  }
}

export function hasState(): boolean {
  return fs.existsSync(config.statePath);
}
