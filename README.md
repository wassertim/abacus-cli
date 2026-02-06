# abacus-cli

CLI tool for automating time entry logging in Abacus ERP via Playwright browser automation.

Abacus uses Vaadin (a server-side Java UI framework) with no REST API, so all interaction is done through headless browser automation. The CLI drives a real Chromium browser, fills forms, reads grids, and handles Vaadin's async server round-trips.

## Prerequisites

- Node.js 18+
- A running Abacus instance you have credentials for

## Setup

```bash
git clone https://github.com/youruser/abacus-cli.git
cd abacus-cli
npm install
npm run build
npm link          # makes `abacus` available globally
```

### Configuration

Set your Abacus instance URL via environment variable:

```bash
export ABACUS_URL="https://your-abacus-instance.example.com/portal/myabacus"
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ABACUS_URL` | `https://abacus.example.com/portal/myabacus` | Base URL of your Abacus portal |
| `ABACUS_CONFIG_DIR` | `~/.abacus-cli` | Directory for session state and discovery data |

## Usage

### Login

Opens a real browser window for manual login. Session cookies are persisted locally so subsequent commands run headlessly.

```bash
abacus login
```

### Log time

```bash
abacus time log --project 71100000001 --hours 8 --service-type 1435 --text "Development" --date 2025-01-15
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--project <id>` | yes | — | Project number |
| `--hours <n>` | yes | — | Hours to log |
| `--service-type <id>` | no | `1435` | Service type ID |
| `--text <text>` | no | — | Description |
| `--date <YYYY-MM-DD>` | no | today | Entry date |

If a matching entry (same date + project) already exists, you'll be prompted to update it or create a new one.

### List entries

```bash
abacus time list --monthYear 01.2025
```

### Weekly status

Shows the time report (weekly summary) for the week containing the given date, plus hints about missing days and remaining hours.

```bash
abacus time status --date 2025-01-15
```

### Batch create entries

Create multiple time entries in a single browser session — much faster than running `time log` repeatedly.

**Range fill** (default) — fills all weekdays in a date range:

```bash
# Fill current week (Mon-Fri)
abacus time batch --project 71100000001 --hours 8 --service-type 1435 --text "Development"

# Fill specific date range
abacus time batch --from 2026-01-26 --to 2026-01-30 --project 71100000001 --hours 8 --text "Dev"

# Preview what would be created
abacus time batch --project 71100000001 --hours 8 --text "Dev" --dry-run
```

**Generate template** — finds missing days and writes a pre-filled file:

```bash
abacus time batch --generate
abacus time batch --generate --from 2026-01-26 --to 2026-01-30 --out entries.json
# Edit the file, then import it
abacus time batch --file entries.json
```

**File import** — create entries from a JSON or CSV file:

```bash
abacus time batch --file entries.json
abacus time batch --file entries.csv
abacus time batch --file entries.json --include-weekends
```

JSON format:
```json
[
  { "date": "2026-02-02", "project": "71100000001", "serviceType": "1435", "hours": 8, "text": "Development" }
]
```

CSV format:
```
date,project,serviceType,hours,text
2026-02-02,71100000001,1435,8,Development
```

| Flag | Description |
|------|-------------|
| `--project <id>` | Project number or alias (required for range fill) |
| `--hours <n>` | Hours per entry (required for range fill) |
| `--service-type <id>` | Service type (default: 1435) |
| `--text <text>` | Description |
| `--from <YYYY-MM-DD>` | Start date (default: Monday of current week) |
| `--to <YYYY-MM-DD>` | End date (default: Friday of current week) |
| `--file <path>` | Import from JSON or CSV file |
| `--generate` | Generate template file with missing days |
| `--out <path>` | Output path for `--generate` (default: batch.json) |
| `--dry-run` | Preview entries without creating them |
| `--include-weekends` | Allow weekend dates from file import |

Duplicate detection: entries with the same date + project as an existing entry are automatically skipped.

### Delete entries

**Interactive mode** — run without flags to select entries from the current month:

```bash
abacus time delete
```

This opens a checkbox picker with all entries for the current month. Navigate with arrow keys, toggle with space, `a` to select all, and enter to confirm. Selected entries are deleted in one browser session.

**Targeted mode** — delete a specific entry by date and project:

```bash
abacus time delete --date 2025-01-15 --project 71100000001
```

| Flag | Required | Description |
|------|----------|-------------|
| `--date <YYYY-MM-DD>` | no | Date of the entry (required if `--project` is used) |
| `--project <id>` | no | Project number or alias |

### Summary

Prints a compact one-line weekly status. Reads from a local cache written by `time status` — if the cache is missing or from a previous week, it auto-fetches fresh data (opens browser, ~10s).

```bash
abacus summary
```

```
Week 06 · 32.5 / 40h · 7.5h remaining · Wed, Thu missing
Overtime: +12.5h (1.6d) · Vacation: 15.0d left
(updated 2h ago)
```

### Check

Silent check designed for `.zshrc`. Prints a warning only when there are missing days this week. If the cache is missing or stale, prints a gentle reminder instead.

```bash
abacus check
```

```
⚠ Abacus: Wed, Thu not logged — 7.5h remaining this week
```

Add to your `~/.zshrc` for a greeting reminder:

```bash
abacus check 2>/dev/null
```

### Discover API calls

Captures network requests while you interact with Abacus manually. Useful for understanding Vaadin's communication protocol.

```bash
abacus discover
```

## How it works

1. **Login** — Opens a headed browser for manual SSO/login. Saves cookies and localStorage to `~/.abacus-cli/state.json`.
2. **Automation** — Restores the saved session in a headless browser. Navigates to the Leistungen (time entries) page via Vaadin's menu system.
3. **Vaadin handling** — Comboboxes require character-by-character input with delays to trigger server-side filtering. `waitForVaadin()` polls the client to ensure no pending server requests before proceeding.
4. **Duplicate detection** — Before creating an entry, existing entries for the same date and project are checked. You can choose to update or create new.
5. **Captcha fallback** — If a FortiADC captcha is detected, the browser reopens in headed mode for manual solving, then retries automatically.

## Development

```bash
npm run dev        # Run from source via ts-node
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled version
```

## License

[MIT](LICENSE)
