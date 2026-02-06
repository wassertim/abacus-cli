import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import Table from "cli-table3";
import { logTime, listTime, deleteTime, statusTime, batchLogTime, generateBatchFile, loadMonthEntries, fetchExistingEntries, formatDate, TimeEntry } from "../api";
import { t, confirmDeleteKey } from "../i18n";
import chalk from "chalk";
import { bold, highlight, info, warn, err, fail } from "../ui";
import { loadAliases, resolveProject, resolveServiceType, promptSelect, promptCheckbox } from "../aliases";

export function registerTimeCommands(program: Command): void {
  const time = program.command("time").description("Time tracking commands");

  time
    .command("status")
    .description("Show time report for a week")
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
    .option("--service-type <name>", "Service type (default: 1435)")
    .requiredOption("--text <text>", "Description")
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

        // Interactive service type selection if not provided
        let serviceType: string;
        if (options.serviceType) {
          serviceType = resolveServiceType(options.serviceType);
        } else if (Object.keys(aliases.serviceTypes).length > 0) {
          serviceType = await promptSelect("service-type", aliases.serviceTypes);
        } else {
          serviceType = "1435";
        }

        console.log("");
        console.log(bold(t().timeEntryLabel));
        console.log(`  ${bold("Project:")}       ${highlight(project)}`);
        console.log(`  ${bold(t().serviceTypeLabel + ":")}  ${highlight(serviceType)}`);
        console.log(`  ${bold("Hours:")}         ${highlight(String(options.hours))}`);
        console.log(`  ${bold("Date:")}          ${highlight(date)}`);
        if (options.text) console.log(`  ${bold(t().textLabel + ":")}  ${highlight(options.text)}`);
        console.log("");

        await logTime({
          project,
          serviceType,
          hours: options.hours,
          date,
          description: options.text || "",
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });

  time
    .command("delete")
    .description("Delete time entries (interactive if no flags given)")
    .option("--date <YYYY-MM-DD>", "Date of the entry to delete")
    .option("--project <name>", "Project number or alias")
    .action(async (options) => {
      try {
        // Interactive mode: no flags → load current month, checkbox picker
        if (!options.date && !options.project) {
          const { entries, deleteFn, closeFn } = await loadMonthEntries();

          if (entries.length === 0) {
            console.log(info(t().noEntriesFound));
            await closeFn();
            return;
          }

          const items = entries.map((e) => ({
            label: `${e.date}  ${e.project}  ${e.serviceType}  ${e.hours}`,
            detail: e.text,
          }));

          console.log("");
          const selected = await promptCheckbox(
            items,
            t().selectEntriesToDelete,
            t().selectHint
          );

          if (selected.length === 0) {
            console.log(info(t().noEntriesSelected));
            await closeFn();
            return;
          }

          // Map selected indices to rowIndex values
          const rowIndices = selected.map((i) => entries[i].rowIndex);

          console.log("");
          await deleteFn(rowIndices);
          await closeFn();
          return;
        }

        // Targeted mode: --date (required in this path) + optional --project
        if (!options.date) {
          fail(err("--date is required when --project is specified."));
          process.exit(1);
        }

        const aliases = loadAliases();
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

  time
    .command("batch")
    .description("Create multiple time entries in a single browser session")
    .option("--project <name>", "Project number or alias")
    .option("--hours <n>", "Hours per entry", parseFloat)
    .option("--service-type <name>", "Service type (default: 1435)")
    .option("--text <text>", "Description for all entries")
    .option("--from <YYYY-MM-DD>", "Start date (default: Monday of current week)")
    .option("--to <YYYY-MM-DD>", "End date (default: Friday of current week)")
    .option("--file <path>", "Import entries from a JSON or CSV file")
    .option("--generate", "Generate a template file with missing days")
    .option("--out <path>", "Output path for --generate (default: batch.json)")
    .option("--dry-run", "Preview entries without creating them")
    .option("--include-weekends", "Allow weekend dates from file import")
    .action(async (options) => {
      try {
        const aliases = loadAliases();

        // --- Mode 2: Generate template ---
        if (options.generate) {
          const from = options.from || getMonday();
          const to = options.to || getFriday();
          const outPath = options.out || "batch.json";
          await generateBatchFile(from, to, outPath);
          return;
        }

        // --- Build entries list ---
        let entries: TimeEntry[];

        if (options.file) {
          // Mode 3: File import
          entries = parseFile(options.file, options.includeWeekends);
          // Resolve aliases per entry
          for (const entry of entries) {
            entry.project = resolveProject(entry.project);
            entry.serviceType = resolveServiceType(entry.serviceType);
          }
        } else {
          // Mode 1: Range fill — requires project, hours, text
          if (!options.project && !options.hours) {
            fail(err("--project and --hours are required for range fill mode. Use --file to import from a file."));
            process.exit(1);
          }

          let project: string;
          if (options.project) {
            project = resolveProject(options.project);
          } else {
            project = await promptSelect("project", aliases.projects);
          }

          let serviceType: string;
          if (options.serviceType) {
            serviceType = resolveServiceType(options.serviceType);
          } else if (Object.keys(aliases.serviceTypes).length > 0) {
            serviceType = await promptSelect("service-type", aliases.serviceTypes);
          } else {
            serviceType = "1435";
          }

          const from = options.from || getMonday();
          const to = options.to || getFriday();
          const weekdays = getWeekdays(from, to);

          entries = weekdays.map((date) => ({
            project,
            serviceType,
            hours: options.hours,
            date,
            description: options.text || "",
          }));
        }

        if (entries.length === 0) {
          console.log(info(t().batchNoEntries));
          return;
        }

        // --- Dry-run mode ---
        if (options.dryRun) {
          // Fetch existing entries from Abacus (also detects locale)
          const dates = entries.map((e) => e.date);
          const existing = await fetchExistingEntries(dates);

          console.log("");
          console.log(bold(t().batchDryRun));
          console.log("");

          // Separate planned entries into new vs skipped (duplicate)
          let skipCount = 0;
          type Row = { date: string; sortDate: string; project: string; serviceType: string; hours: string; text: string; status: string };
          const rows: Row[] = [];

          // Add existing entries
          for (const e of existing) {
            const [dd, mm, yyyy] = e.date.split(".");
            rows.push({
              date: e.date,
              sortDate: `${yyyy}-${mm}-${dd}`,
              project: e.project,
              serviceType: e.serviceType,
              hours: e.hours.replace(/\s*[A-Za-z]+$/, ""),
              text: e.text,
              status: t().dryRunExisting,
            });
          }

          // Add only genuinely new entries (skip duplicates — existing row already covers them)
          for (const entry of entries) {
            const targetDate = formatDate(entry.date);
            const isDuplicate = existing.some(
              (e) => e.date === targetDate && e.project.includes(entry.project)
            );
            if (isDuplicate) {
              skipCount++;
              continue;
            }
            rows.push({
              date: targetDate,
              sortDate: entry.date,
              project: entry.project,
              serviceType: entry.serviceType,
              hours: entry.hours.toFixed(2),
              text: entry.description,
              status: t().dryRunNew,
            });
          }

          rows.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

          const table = new Table({
            head: [t().headerDate, t().headerProject, t().headerServiceType, t().headerHours, t().headerText, t().headerStatus],
            style: { head: ["cyan"] },
          });

          for (const r of rows) {
            const statusLabel = r.status === t().dryRunNew ? chalk.green(r.status) : chalk.dim(r.status);
            table.push([r.date, r.project, r.serviceType, r.hours, r.text, statusLabel]);
          }

          console.log(table.toString());
          console.log("");

          const newCount = rows.filter((r) => r.status === t().dryRunNew).length;
          console.log(info(t().dryRunSummary(newCount, skipCount, existing.length)));
          return;
        }

        // --- Print summary before running ---
        console.log("");
        console.log(bold(`Batch: ${entries.length} entries`));
        for (const e of entries) {
          console.log(`  ${highlight(e.date)}  ${e.project}  ${e.serviceType}  ${e.hours}h  ${e.description}`);
        }
        console.log("");

        await batchLogTime(entries);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fail(err(message));
        process.exit(1);
      }
    });
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/** Get Monday of the current week as YYYY-MM-DD. */
function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

/** Get Friday of the current week as YYYY-MM-DD. */
function getFriday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - ((day === 0 ? 7 : day) - 1) + 4;
  const friday = new Date(now);
  friday.setDate(diff);
  return friday.toISOString().split("T")[0];
}

/** Get all weekday dates (Mon-Fri) in a range as YYYY-MM-DD. */
function getWeekdays(from: string, to: string): string[] {
  const result: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      result.push(d.toISOString().split("T")[0]);
    }
  }
  return result;
}

/** Parse a batch file (JSON or CSV) into TimeEntry[]. */
function parseFile(filePath: string, includeWeekends: boolean): TimeEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(t().batchFileNotFound(filePath));
  }

  const ext = path.extname(filePath).toLowerCase();
  let entries: TimeEntry[];

  if (ext === ".json") {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(raw)) throw new Error(t().batchInvalidFormat);
    entries = raw.map((r: any) => ({
      project: String(r.project || ""),
      serviceType: String(r.serviceType || "1435"),
      hours: Number(r.hours || 0),
      date: String(r.date || ""),
      description: String(r.text || r.description || ""),
    }));
  } else if (ext === ".csv") {
    const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
    if (lines.length < 2) throw new Error(t().batchInvalidFormat);
    const headers = lines[0].split(",").map((h) => h.trim());
    entries = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cols[i] || ""));
      return {
        project: row.project || "",
        serviceType: row.serviceType || "1435",
        hours: Number(row.hours || 0),
        date: row.date || "",
        description: row.text || row.description || "",
      };
    });
  } else {
    throw new Error(t().batchInvalidFormat);
  }

  // Filter out weekends unless --include-weekends
  if (!includeWeekends) {
    entries = entries.filter((e) => {
      const d = new Date(e.date);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        console.log(warn(t().batchWeekendSkipped(e.date)));
        return false;
      }
      return true;
    });
  }

  return entries;
}
