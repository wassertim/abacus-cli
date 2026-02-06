# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

abacus-cli is a TypeScript CLI tool that automates time entry logging in Abacus ERP. Abacus uses Vaadin (server-side Java UI framework) with no REST API, so all interaction is done via **Playwright browser automation**. The target instance URL is configured via the `ABACUS_URL` environment variable.

The project supports **multiple UI languages** (de, en, fr, it, es). Locale is resolved at startup via priority chain: `ABACUS_LOCALE` env var → `config.json` `locale` field → system locale (`Intl.DateTimeFormat` / `LANG`) → `"en"` fallback. All user-facing strings live in `src/i18n.ts`.

## Commands

```bash
npm run build      # TypeScript compilation (tsc) to dist/
npm run dev        # Run from source via ts-node
npm start          # Run compiled version (node dist/index.js)
```

No test framework or linter is configured.

## CLI Usage

```bash
abacus login                          # Opens browser for manual login, saves session
abacus discover                       # Captures network requests for API exploration
abacus time log --hours <n> --text <text> [--project <id>] [--service-type <id>] [--date <YYYY-MM-DD>]
abacus time list [--monthYear <MM.YYYY>]
abacus time status [--date <YYYY-MM-DD>]
abacus time batch [--project <id> --hours <n>] [--file <path>] [--generate] [--dry-run]
abacus time delete [--date <YYYY-MM-DD> --project <id>]
abacus summary                        # Compact weekly status (cached, auto-fetches if stale)
abacus check                          # Silent missing-days check (for .zshrc)
abacus refresh [--install|--uninstall] # Session keep-alive / launchd daemon
abacus config show|set <key> <value>  # Manage configuration
abacus alias list|add|remove          # Manage project/service-type aliases
```

## Architecture

**Entry point:** `src/index.ts` — Commander.js CLI with commands: `login`, `discover`, `time`, `summary`, `check`, `refresh`, `config`, `alias`.

**Core automation flow:**
1. `src/auth.ts` — Session management. Opens a real browser for manual login, persists cookies/localStorage to `~/.abacus-cli/state.json`, restores session for subsequent commands. Also manages the launchd refresh daemon.
2. `src/api.ts` — High-level Abacus operations (log, list, delete, status, batch). Orchestrates page navigation, duplicate detection, and cache management.
3. `src/page.ts` — Page-level interactions: navigation, grid reading, form filling, side panel operations. Handles Vaadin's async server round-trips.
4. `src/vaadin.ts` — Low-level Vaadin primitives: `waitForVaadin()` and `fillCombobox()`.
5. `src/i18n.ts` — Multi-language support. Translations for de/en/fr/it/es, locale auto-detection, and `t()` accessor for all UI and CLI strings.
6. `src/config.ts` — Config paths (`~/.abacus-cli/`) and helpers.
7. `src/aliases.ts` — Project/service-type alias resolution and interactive prompts.
8. `src/ui.ts` — Console output helpers (colored output, spinners, user prompts).
9. `src/commands/time.ts` — Time subcommands: `log`, `list`, `status`, `delete`, `batch`.
10. `src/commands/alias.ts` — Alias subcommands: `list`, `add`, `remove`.
11. `src/discover.ts` — Network interceptor that captures XHR/fetch requests for debugging.

**Key pattern:** Vaadin comboboxes require special handling — char-by-char input with 50ms delays + `waitForVaadin()` between interactions. Direct `.fill()` doesn't trigger Vaadin's server-side filtering.

## Development Notes

- Vaadin grids are virtualized; only visible rows can be read from the DOM.
