import chalk from "chalk";
import ora, { Ora } from "ora";
import * as readline from "readline";

// ---------------------------------------------------------------------------
// Semantic color helpers
// ---------------------------------------------------------------------------

export const success = (text: string) => chalk.green(text);
export const err = (text: string) => chalk.red(text);
export const warn = (text: string) => chalk.yellow(text);
export const info = (text: string) => chalk.cyan(text);
export const bold = (text: string) => chalk.bold(text);
export const highlight = (text: string) => chalk.cyan(text);
export const dim = (text: string) => chalk.dim(text);

// ---------------------------------------------------------------------------
// Global spinner singleton
// ---------------------------------------------------------------------------

let spinner: Ora | null = null;

/** Start or update the spinner text. */
export function spin(text: string): void {
  if (spinner && spinner.isSpinning) {
    spinner.text = text;
  } else {
    spinner = ora(text).start();
  }
}

/** Stop the spinner (clear it from the line). */
export function stopSpinner(): void {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

/** Stop spinner with a success (✔) message. */
export function succeed(text: string): void {
  if (spinner) {
    spinner.succeed(text);
    spinner = null;
  } else {
    ora(text).succeed();
  }
}

/** Stop spinner with a failure (✖) message. */
export function fail(text: string): void {
  if (spinner) {
    spinner.fail(text);
    spinner = null;
  } else {
    ora(text).fail();
  }
}

/** Prompt the user for input in the terminal. */
export function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}
