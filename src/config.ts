import path from "path";
import os from "os";
import fs from "fs";

const CONFIG_DIR =
  process.env.ABACUS_CONFIG_DIR || path.join(os.homedir(), ".abacus-cli");

const configFilePath = path.join(CONFIG_DIR, "config.json");

function loadConfigFile(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
  } catch {
    return {};
  }
}

export function saveConfigFile(data: Record<string, unknown>): void {
  ensureConfigDir();
  const existing = loadConfigFile();
  const merged = { ...existing, ...data };
  fs.writeFileSync(configFilePath, JSON.stringify(merged, null, 2) + "\n");
}

export function getConfigFilePath(): string {
  return configFilePath;
}

const fileConfig = loadConfigFile();

export const config = {
  abacusUrl:
    process.env.ABACUS_URL ||
    (typeof fileConfig.abacusUrl === "string" ? fileConfig.abacusUrl : ""),
  locale: process.env.ABACUS_LOCALE || "",
  headless: process.env.ABACUS_HEADLESS !== "false",
  semiManual: process.env.ABACUS_SEMI_MANUAL === "true",
  configDir: CONFIG_DIR,
  configFilePath,
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
