import { Command } from "commander";
import { logTime, listTime, deleteTime, statusTime } from "../api";
import { t } from "../i18n";
import { bold, highlight, info, err, fail } from "../ui";
import { loadAliases, resolveProject, resolveLeistungsart, promptSelect } from "../aliases";

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
    .option("--project <name>", "Project number or alias")
    .requiredOption("--hours <n>", "Number of hours", parseFloat)
    .option("--leistungsart <name>", "Leistungsart / service type (default: 1435)")
    .requiredOption("--text <text>", "Buchungstext / description")
    .option("--date <YYYY-MM-DD>", "Date (default: today)")
    .action(async (options) => {
      const date = options.date || new Date().toISOString().split("T")[0];
      const aliases = loadAliases();

      try {
        // Interactive project selection if not provided
        let project: string;
        if (options.project) {
          project = resolveProject(options.project);
        } else {
          project = await promptSelect("project", aliases.projects);
        }

        // Interactive leistungsart selection if not provided
        let leistungsart: string;
        if (options.leistungsart) {
          leistungsart = resolveLeistungsart(options.leistungsart);
        } else if (Object.keys(aliases.leistungsarten).length > 0) {
          leistungsart = await promptSelect("leistungsart", aliases.leistungsarten);
        } else {
          leistungsart = "1435";
        }

        console.log("");
        console.log(bold(t().timeEntryLabel));
        console.log(`  ${bold("Project:")}       ${highlight(project)}`);
        console.log(`  ${bold(t().leistungsartLabel + ":")}  ${highlight(leistungsart)}`);
        console.log(`  ${bold("Hours:")}         ${highlight(String(options.hours))}`);
        console.log(`  ${bold("Date:")}          ${highlight(date)}`);
        if (options.text) console.log(`  ${bold(t().textLabel + ":")}  ${highlight(options.text)}`);
        console.log("");

        await logTime({
          project,
          leistungsart,
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
    .option("--project <name>", "Project number or alias")
    .action(async (options) => {
      const aliases = loadAliases();

      try {
        let project: string;
        if (options.project) {
          project = resolveProject(options.project);
        } else {
          project = await promptSelect("project", aliases.projects);
        }

        console.log(info(t().deletingEntryFor(options.date, project)));
        console.log("");

        await deleteTime(options.date, project);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });
}
