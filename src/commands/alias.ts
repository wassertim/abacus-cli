import { Command } from "commander";
import { loadAliases, saveAliases } from "../aliases";
import { bold, highlight, dim, success, err } from "../ui";

export function registerAliasCommands(program: Command): void {
  const alias = program
    .command("alias")
    .description("Manage project and service type aliases");

  alias
    .command("list")
    .description("List all aliases")
    .action(() => {
      const aliases = loadAliases();
      const projects = Object.entries(aliases.projects);
      const las = Object.entries(aliases.serviceTypes);

      if (projects.length === 0 && las.length === 0) {
        console.log(dim("No aliases configured. Use 'abacus alias add' to create one."));
        return;
      }

      if (projects.length > 0) {
        const maxAlias = Math.max(...projects.map(([a]) => a.length));
        console.log(bold("Projects:"));
        for (const [alias, id] of projects) {
          console.log(`  ${highlight(alias.padEnd(maxAlias))}  ${dim("→")} ${id}`);
        }
      }

      if (las.length > 0) {
        if (projects.length > 0) console.log("");
        const maxAlias = Math.max(...las.map(([a]) => a.length));
        console.log(bold("Service Types:"));
        for (const [alias, id] of las) {
          console.log(`  ${highlight(alias.padEnd(maxAlias))}  ${dim("→")} ${id}`);
        }
      }
    });

  alias
    .command("add")
    .description("Add an alias (e.g. abacus alias add project da_dev 71100000001)")
    .argument("<type>", "project or service-type")
    .argument("<alias>", "Short name")
    .argument("<id>", "Actual ID/number")
    .action((type: string, aliasName: string, id: string) => {
      const aliases = loadAliases();

      if (type === "project" || type === "p") {
        aliases.projects[aliasName] = id;
        saveAliases(aliases);
        console.log(success(`Project alias set: ${aliasName} → ${id}`));
      } else if (type === "service-type" || type === "st") {
        aliases.serviceTypes[aliasName] = id;
        saveAliases(aliases);
        console.log(success(`Service type alias set: ${aliasName} → ${id}`));
      } else {
        console.log(err(`Unknown type "${type}". Use "project" or "service-type".`));
        process.exit(1);
      }
    });

  alias
    .command("remove")
    .description("Remove an alias")
    .argument("<type>", "project or service-type")
    .argument("<alias>", "Alias to remove")
    .action((type: string, aliasName: string) => {
      const aliases = loadAliases();

      if (type === "project" || type === "p") {
        if (!(aliasName in aliases.projects)) {
          console.log(err(`Project alias "${aliasName}" not found.`));
          process.exit(1);
        }
        delete aliases.projects[aliasName];
        saveAliases(aliases);
        console.log(success(`Removed project alias: ${aliasName}`));
      } else if (type === "service-type" || type === "st") {
        if (!(aliasName in aliases.serviceTypes)) {
          console.log(err(`Service type alias "${aliasName}" not found.`));
          process.exit(1);
        }
        delete aliases.serviceTypes[aliasName];
        saveAliases(aliases);
        console.log(success(`Removed service type alias: ${aliasName}`));
      } else {
        console.log(err(`Unknown type "${type}". Use "project" or "service-type".`));
        process.exit(1);
      }
    });
}
