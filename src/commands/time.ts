import { Command } from "commander";
import { logTime, listTime, deleteTime, statusTime } from "../api";
import { t } from "../i18n";
import { bold, highlight, info, err, fail } from "../ui";

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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });

  time
    .command("list")
    .description("List time entries for a month")
    .requiredOption("--monthYear <MM.YYYY>", "Month and year (e.g. 01.2025)")
    .action(async (options) => {
      console.log(info(t().listingEntries(options.monthYear)));
      console.log("");

      try {
        await listTime(options.monthYear);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });

  time
    .command("log")
    .description("Log a time entry")
    .requiredOption("--project <name>", "Project number (e.g. 71100000001)")
    .requiredOption("--hours <n>", "Number of hours", parseFloat)
    .option("--leistungsart <name>", "Leistungsart / service type (default: 1435)", "1435")
    .option("--text <text>", "Buchungstext / description")
    .option("--date <YYYY-MM-DD>", "Date (default: today)")
    .action(async (options) => {
      const date = options.date || new Date().toISOString().split("T")[0];

      console.log(bold(t().timeEntryLabel));
      console.log(`  ${bold("Project:")}       ${highlight(options.project)}`);
      console.log(`  ${bold(t().leistungsartLabel + ":")}  ${highlight(options.leistungsart)}`);
      console.log(`  ${bold("Hours:")}         ${highlight(String(options.hours))}`);
      console.log(`  ${bold("Date:")}          ${highlight(date)}`);
      if (options.text) console.log(`  ${bold(t().textLabel + ":")}  ${highlight(options.text)}`);
      console.log("");

      try {
        await logTime({
          project: options.project,
          leistungsart: options.leistungsart,
          hours: options.hours,
          date,
          buchungstext: options.text || "",
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
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
      console.log(info(t().deletingEntryFor(options.date, options.project)));
      console.log("");

      try {
        await deleteTime(options.date, options.project);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });
}
