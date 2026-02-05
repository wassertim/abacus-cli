import fs from "fs";
import path from "path";
import { config, ensureConfigDir } from "./config";
import { bold, highlight, dim } from "./ui";
import chalk from "chalk";

export interface AliasFile {
  projects: Record<string, string>;
  leistungsarten: Record<string, string>;
}

const aliasPath = path.join(config.configDir, "aliases.json");

export function loadAliases(): AliasFile {
  if (!fs.existsSync(aliasPath)) {
    return { projects: {}, leistungsarten: {} };
  }
  return JSON.parse(fs.readFileSync(aliasPath, "utf-8"));
}

export function saveAliases(aliases: AliasFile): void {
  ensureConfigDir();
  fs.writeFileSync(aliasPath, JSON.stringify(aliases, null, 2) + "\n");
}

/** Resolve a project alias to its ID, or return the input as-is. */
export function resolveProject(input: string): string {
  const aliases = loadAliases();
  return aliases.projects[input] || input;
}

/** Resolve a leistungsart alias to its ID, or return the input as-is. */
export function resolveLeistungsart(input: string): string {
  const aliases = loadAliases();
  return aliases.leistungsarten[input] || input;
}

/**
 * Interactive arrow-key list selector.
 * Returns the resolved ID (value, not the alias key).
 */
export function promptSelect(
  label: string,
  items: Record<string, string>
): Promise<string> {
  const entries = Object.entries(items);
  if (entries.length === 0) {
    return Promise.reject(new Error(`No ${label} aliases configured. Use 'abacus alias add' first.`));
  }

  if (entries.length === 1) {
    console.log(`${bold(`${label}:`)} ${highlight(entries[0][0])} ${dim("→")} ${entries[0][1]}`);
    return Promise.resolve(entries[0][1]);
  }

  const maxAlias = Math.max(...entries.map(([a]) => a.length));
  let cursor = 0;
  let firstRender = true;

  function render() {
    // Move cursor up to overwrite previous render (skip on first render)
    if (!firstRender) {
      process.stdout.write(`\x1b[${entries.length}A`);
    }
    firstRender = false;
    for (let i = 0; i < entries.length; i++) {
      const [alias, id] = entries[i];
      const prefix = i === cursor ? chalk.cyan("❯ ") : "  ";
      const name = i === cursor ? chalk.cyan.bold(alias.padEnd(maxAlias)) : alias.padEnd(maxAlias);
      const arrow = dim("→");
      const value = i === cursor ? chalk.cyan(id) : dim(id);
      process.stdout.write(`\x1b[2K${prefix}${name}  ${arrow} ${value}\n`);
    }
  }

  return new Promise((resolve) => {
    console.log(bold(`Select ${label}:`));
    render();

    const { stdin } = process;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    function onData(key: Buffer) {
      const s = key.toString();

      // Enter
      if (s === "\r" || s === "\n") {
        cleanup();
        resolve(entries[cursor][1]);
        return;
      }

      // Ctrl+C
      if (s === "\x03") {
        cleanup();
        process.exit(0);
      }

      // Arrow up / k
      if (s === "\x1b[A" || s === "k") {
        cursor = (cursor - 1 + entries.length) % entries.length;
        render();
      }

      // Arrow down / j
      if (s === "\x1b[B" || s === "j") {
        cursor = (cursor + 1) % entries.length;
        render();
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}
