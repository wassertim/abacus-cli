import path from "path";
import os from "os";
import fs from "fs";

const CONFIG_DIR = path.join(os.homedir(), ".abacus-cli");

export const config = {
  abacusUrl: "https://your-abacus-instance.example.com/portal/myabacus",
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
