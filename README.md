# abacus-cli

CLI tool for logging time entries in [Abacus ERP](https://www.abacus.ch) from the terminal.

[Abacus](https://www.abacus.ch) is a Swiss ERP system widely used for accounting, payroll, and time tracking. Its web portal does not expose a REST API, so this tool uses Playwright to drive a headless Chromium browser — filling forms, reading grids, and handling the UI automatically.

**[Documentation](https://wassertim.github.io/abacus-cli/en/)**

## Who is this for?

If you log your work hours in Abacus and want to do it from the terminal — especially batch-filling whole weeks, checking your status, or scripting entries — this tool is for you.

This project is open source under the MIT license. You're welcome to fork it, adapt it to your Abacus setup, and submit pull requests if you build something others could use too.

## Prerequisites

- Node.js 18+
- Access to an Abacus web portal (provided by your company)

## Setup

```bash
npm install -g abacus-cli
```

Chromium is downloaded automatically on install for browser automation.

### From source

```bash
git clone https://github.com/wassertim/abacus-cli.git
cd abacus-cli
npm install
npm run build
npm link
```

### Configure your Abacus URL

```bash
abacus config set url https://your-abacus-instance.example.com/portal/myabacus
```

### Login

Opens a real browser window for manual login. Session cookies are persisted locally so subsequent commands run headlessly.

```bash
abacus login
```

## Usage

### Log time

```bash
abacus time log --project 12345 --hours 8 --service-type 100 --text "Development" --date 2025-01-15
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--project <id>` | no | — | Project number or alias (interactive prompt if omitted) |
| `--hours <n>` | yes | — | Hours to log |
| `--service-type <id>` | no | `100` | Service type ID or alias |
| `--text <text>` | yes | — | Description |
| `--date <YYYY-MM-DD>` | no | today | Entry date |

If a matching entry (same date + project) already exists, you'll be prompted to update it or create a new one.

### List entries

```bash
abacus time list                      # current month
abacus time list --monthYear 01.2025  # specific month
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
abacus time batch --project 12345 --hours 8 --service-type 100 --text "Development"

# Fill specific date range
abacus time batch --from 2026-01-26 --to 2026-01-30 --project 12345 --hours 8 --text "Dev"

# Preview what would be created
abacus time batch --project 12345 --hours 8 --text "Dev" --dry-run
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
  { "date": "2026-02-02", "project": "12345", "serviceType": "100", "hours": 8, "text": "Development" }
]
```

CSV format:
```
date,project,serviceType,hours,text
2026-02-02,12345,100,8,Development
```

| Flag | Description |
|------|-------------|
| `--project <id>` | Project number or alias (required for range fill) |
| `--hours <n>` | Hours per entry (required for range fill) |
| `--service-type <id>` | Service type (default: 100) |
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
abacus time delete --date 2025-01-15 --project 12345
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

### Aliases

Create short names for frequently used project numbers and service types.

```bash
abacus alias list
abacus alias add project myproj 12345
abacus alias add service-type dev 100
abacus alias remove project myproj
```

Once defined, use aliases anywhere instead of numeric IDs:

```bash
abacus time log --project myproj --hours 8 --text "Development"
```

### Configuration

```bash
abacus config show                          # Show current config and sources
abacus config set url https://your-instance.example.com/portal/myabacus
abacus config set locale de                 # Override locale (de, en, fr, it, es)
```

Environment variables can also be used:

| Variable | Default | Description |
|----------|---------|-------------|
| `ABACUS_URL` | — | Base URL of your Abacus portal |
| `ABACUS_CONFIG_DIR` | `~/.abacus-cli` | Directory for session state |

### Session refresh

Keep your saved session alive by refreshing it periodically. On macOS, you can install a launchd agent to do this automatically.

```bash
abacus refresh                    # Refresh session once
abacus refresh --install          # Install auto-refresh daemon (default: every 15 min)
abacus refresh --install --interval 30   # Custom interval
abacus refresh --uninstall        # Remove daemon
```

### Discover API calls

Captures network requests while you interact with Abacus manually. Useful for understanding Vaadin's communication protocol.

```bash
abacus discover
```

## How it works

Abacus's web portal is built on [Vaadin](https://vaadin.com/), a server-side Java UI framework. There is no REST API — every interaction happens through the browser DOM with server round-trips for each action.

1. **Login** — Opens a headed browser for manual SSO/login. Saves cookies and localStorage to `~/.abacus-cli/state.json`.
2. **Automation** — Restores the saved session in a headless browser and navigates through Vaadin's menu system to the time entries page.
3. **Vaadin handling** — Comboboxes require character-by-character input with delays to trigger server-side filtering. `waitForVaadin()` polls the client to ensure no pending server requests before proceeding.
4. **Duplicate detection** — Before creating an entry, existing entries for the same date and project are checked. You can choose to update or create new.
5. **Captcha fallback** — If a captcha is detected, the browser reopens in headed mode for manual solving, then retries automatically.

## Development

```bash
npm run dev        # Run from source via ts-node
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled version
```

## Contributing

Found a bug or want to add a feature? Fork the repo, make your changes, and open a pull request. There's no formal contribution guide — just keep it clean and consistent with the existing code.

## License

[MIT](LICENSE)
