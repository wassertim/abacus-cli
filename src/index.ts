#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import chalk from "chalk";
import { login, refresh, installRefreshDaemon, uninstallRefreshDaemon } from "./auth";
import { discover } from "./discover";
import { registerTimeCommands } from "./commands/time";
import { registerAliasCommands } from "./commands/alias";
import { config, saveConfigFile, getConfigFilePath } from "./config";

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
    const keyMap: Record<string, string> = { url: "abacusUrl" };
    const configKey = keyMap[key];
    if (!configKey) {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.error(chalk.dim("Available keys: url"));
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
        value: config.locale || chalk.dim("(auto-detect)"),
        source: process.env.ABACUS_LOCALE ? "env" : "-",
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

registerTimeCommands(program);
registerAliasCommands(program);

program.parse();
