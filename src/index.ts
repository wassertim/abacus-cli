#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import chalk from "chalk";
import { login } from "./auth";
import { discover } from "./discover";
import { registerTimeCommands } from "./commands/time";
import { registerAliasCommands } from "./commands/alias";

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

registerTimeCommands(program);
registerAliasCommands(program);

program.parse();
