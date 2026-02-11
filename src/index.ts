#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import { login, refresh, installRefreshDaemon, uninstallRefreshDaemon } from "./auth";
import { discover } from "./discover";
import { registerTimeCommands } from "./commands/time";
import { registerAliasCommands } from "./commands/alias";
import { config, saveConfigFile, getConfigFilePath } from "./config";
import { getLocale, localeSource, t } from "./i18n";

const program = new Command();

program
  .name("abacus")
  .description("CLI for Abacus time tracking")
  .version("0.1.0");

program
  .command("login")
  .description("Open browser to log in and save session")
  .action(async () => {
    try {
      await login();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Login failed: ${message}`));
      process.exit(1);
    }
  });

program
  .command("discover")
  .description("Discover API endpoints by capturing network requests")
  .action(async () => {
    try {
      await discover();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Discovery failed: ${message}`));
      process.exit(1);
    }
  });

program
  .command("refresh")
  .description("Refresh saved session to keep it alive")
  .option("--install", "Install launchd agent for automatic refresh")
  .option("--uninstall", "Remove launchd agent")
  .option("--interval <minutes>", "Refresh interval in minutes (default: 15)", "15")
  .action(async (opts) => {
    try {
      if (opts.uninstall) {
        uninstallRefreshDaemon();
      } else if (opts.install) {
        installRefreshDaemon(parseInt(opts.interval, 10));
      } else {
        await refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Refresh failed: ${message}`));
      process.exit(1);
    }
  });

const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("set")
  .description("Set a config value")
  .argument("<key>", "Config key (e.g. url)")
  .argument("<value>", "Config value")
  .action((key: string, value: string) => {
    const keyMap: Record<string, string> = { url: "abacusUrl", locale: "locale" };
    const configKey = keyMap[key];
    if (!configKey) {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.error(chalk.dim("Available keys: url, locale"));
      process.exit(1);
    }
    saveConfigFile({ [configKey]: value });
    console.log(chalk.green(`Saved ${key} to ${getConfigFilePath()}`));
  });

configCmd
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const entries: Array<{ key: string; value: string; source: string }> = [
      {
        key: "url",
        value: config.abacusUrl || chalk.dim("(not set)"),
        source: process.env.ABACUS_URL ? "env" : config.abacusUrl ? "file" : "-",
      },
      {
        key: "locale",
        value: getLocale(),
        source: localeSource,
      },
      {
        key: "headless",
        value: String(config.headless),
        source: process.env.ABACUS_HEADLESS ? "env" : "default",
      },
    ];

    console.log(chalk.bold("Configuration:"));
    console.log(chalk.dim(`Config file: ${getConfigFilePath()}`));
    console.log("");
    for (const e of entries) {
      console.log(`  ${chalk.cyan(e.key.padEnd(12))} ${e.value}  ${chalk.dim(`[${e.source}]`)}`);
    }
  });

// --- Helper: read status cache ---
function readStatusCache(): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(config.statusCachePath, "utf-8"));
  } catch {
    return null;
  }
}

function getISOWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isCacheCurrentWeek(cache: Record<string, unknown>): boolean {
  const cacheWeek = cache.weekNumber as number;
  const currentWeek = getISOWeekNumber(new Date());
  return cacheWeek === currentWeek;
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return t().timeAgoMinutes(Math.max(1, mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t().timeAgoHours(hours);
  return t().timeAgoDays(Math.floor(hours / 24));
}

function printSummary(cache: Record<string, unknown>): void {
  const weekNum = String(cache.weekNumber as number).padStart(2, "0");
  const worked = (cache.worked as number).toFixed(1);
  const target = (cache.target as number).toFixed(0);
  const remaining = (cache.remaining as number).toFixed(1);
  const missingDays = cache.missingDays as Array<{ date: string; dayName: string }>;
  const missingStr = missingDays.length > 0 ? missingDays.map((d) => d.dayName).join(", ") : "";

  console.log(t().summaryLine1(weekNum, worked, target, remaining, missingStr));

  const saldo = cache.saldo as { overtime: number; extraTime: number; total: number } | null;
  const vacation = cache.vacation as { remainingDays: number; entitlementDays: number } | null;

  if (saldo || vacation) {
    const overtime = saldo ? (saldo.overtime >= 0 ? "+" : "") + saldo.overtime.toFixed(1) : "+0.0";
    const overtimeDays = saldo ? (saldo.overtime / 8).toFixed(1) : "0.0";
    const vacDays = vacation ? vacation.remainingDays.toFixed(1) : "0.0";
    console.log(t().summaryLine2(overtime, overtimeDays, vacDays));
  }

  console.log(chalk.dim(t().summaryUpdatedAgo(formatTimeAgo(cache.updatedAt as string))));
}

program
  .command("summary")
  .description("Print compact weekly status (auto-fetches if needed)")
  .action(async () => {
    const cache = readStatusCache();

    if (cache && cache.updatedAt && isCacheCurrentWeek(cache)) {
      printSummary(cache);
      return;
    }

    // Cache missing or from a different week — auto-fetch
    try {
      const { statusTime } = await import("./api");
      await statusTime(new Date().toISOString().split("T")[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(message));
      process.exit(1);
    }

    // Print compact summary from the freshly written cache
    const freshCache = readStatusCache();
    if (freshCache) {
      console.log("");
      printSummary(freshCache);
    }
  });

program
  .command("check")
  .description("Silent check for missing days (for .zshrc)")
  .action(() => {
    const cache = readStatusCache();

    if (!cache || !cache.updatedAt) {
      console.log(chalk.dim(t().checkReminder));
      return;
    }

    // Stale = updatedAt is not from today or different month
    const updatedDate = new Date(cache.updatedAt as string).toDateString();
    const todayDate = new Date().toDateString();
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

    if (updatedDate !== todayDate || (cache.month && cache.month !== currentMonth)) {
      console.log(chalk.dim(t().checkReminder));
      return;
    }

    const missingDays = cache.missingDays as Array<{ date: string; dayName: string }>;
    if (!missingDays || missingDays.length === 0) return;

    const missingStr = missingDays.map((d) => d.dayName).join(", ");
    console.log(chalk.yellow(`⚠ ${t().checkWarning(missingStr)}`));

    const date = missingDays[0].date.split(".").reverse().join("-");
    const remaining = cache.remaining as number | undefined;
    const hours = remaining && remaining > 0 ? Math.min(remaining, 8).toFixed(2) : "8.00";
    console.log(chalk.dim(`  run: abacus time log --hours ${hours} --text "${t().defaultBookingText}" --date ${date}`));
  });

registerTimeCommands(program);
registerAliasCommands(program);

program.parse();
