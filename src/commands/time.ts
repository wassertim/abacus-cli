import { Command } from "commander";
import { logTime, listTime, deleteTime, statusTime } from "../api";

export function registerTimeCommands(program: Command): void {
  const time = program.command("time").description("Time tracking commands");

  time
    .command("status")
    .description("Show Rapportmatrix (time account status) for a week")
    .option("--date <YYYY-MM-DD>", "Date within the target week (default: today)")
    .action(async (options) => {
      const date = options.date || new Date().toISOString().split("T")[0];
      try {
        await statusTime(date);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  time
    .command("list")
    .description("List time entries for a month")
    .requiredOption("--monthYear <MM.YYYY>", "Month and year (e.g. 01.2025)")
    .action(async (options) => {
      console.log(`Listing entries for ${options.monthYear}...`);
      console.log("");

      try {
        await listTime(options.monthYear);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  time
    .command("log")
    .description("Log a time entry")
    .requiredOption("--project <name>", "Project number (e.g. 71100000001)")
    .requiredOption("--hours <n>", "Number of hours", parseFloat)
    .option("--leistungsart <name>", "Leistungsart (default: 1435)", "1435")
    .option("--text <text>", "Buchungstext")
    .option("--date <YYYY-MM-DD>", "Date (default: today)")
    .action(async (options) => {
      const date = options.date || new Date().toISOString().split("T")[0];

      console.log("Time entry:");
      console.log(`  Project:       ${options.project}`);
      console.log(`  Leistungsart:  ${options.leistungsart}`);
      console.log(`  Hours:         ${options.hours}`);
      console.log(`  Date:          ${date}`);
      if (options.text) console.log(`  Buchungstext:  ${options.text}`);
      console.log("");

      try {
        await logTime({
          project: options.project,
          leistungsart: options.leistungsart,
          hours: options.hours,
          date,
          buchungstext: options.text || "",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  time
    .command("delete")
    .description("Delete a time entry")
    .requiredOption("--date <YYYY-MM-DD>", "Date of the entry to delete")
    .requiredOption(
      "--project <name>",
      "Project number (e.g. 71100000001)"
    )
    .action(async (options) => {
      console.log(`Deleting entry for ${options.date} / ${options.project}...`);
      console.log("");

      try {
        await deleteTime(options.date, options.project);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
