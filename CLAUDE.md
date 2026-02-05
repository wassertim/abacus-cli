# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

abacus-cli is a TypeScript CLI tool that automates time entry logging in Abacus ERP. Abacus uses Vaadin (server-side Java UI framework) with no REST API, so all interaction is done via **Playwright browser automation**. The target instance URL is configured via the `ABACUS_URL` environment variable.

The project language/UI context is **German** (e.g., Leistungsart, Buchungstext, Wochenrapport).

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
abacus time log --project <id> --hours <n> [--leistungsart <id>] [--text <text>] [--date <YYYY-MM-DD>]
```

## Architecture

**Entry point:** `src/index.ts` — Commander.js CLI with three commands: `login`, `discover`, `time`.

**Core automation flow:**
1. `src/auth.ts` — Session management. Opens a real browser for manual login, persists cookies/localStorage to `~/.abacus-cli/state.json`, restores session for subsequent commands.
2. `src/api.ts` — Vaadin browser automation. The key abstraction layer:
   - `waitForVaadin(page)` — Polls `Vaadin.Flow.clients` to ensure no pending server requests before proceeding.
   - `fillCombobox(page, movieId, value)` — Types character-by-character with delays to trigger Vaadin's filter events, then presses Enter to select.
   - `logTime(entry)` — Full workflow: navigate to page, check for duplicates, fill form fields, save automatically.
   - Form fields are identified by Vaadin's `movie-id` attribute (e.g., ProjNr2, LeArtNr, Menge, Text).
3. `src/config.ts` — Config paths (`~/.abacus-cli/`) and helpers.
4. `src/commands/time.ts` — The `time log` subcommand with flag parsing.
5. `src/discover.ts` — Network interceptor that captures XHR/fetch requests for debugging.

**Key pattern:** Vaadin comboboxes require special handling — char-by-char input with 50ms delays + `waitForVaadin()` between interactions. Direct `.fill()` doesn't trigger Vaadin's server-side filtering.

## Development Notes

- Vaadin grids are virtualized; only visible rows can be read from the DOM.
