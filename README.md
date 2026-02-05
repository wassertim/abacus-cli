# abacus-cli

CLI tool for automating time entry logging in Abacus ERP via Playwright browser automation.

Abacus uses Vaadin (a server-side Java UI framework) with no REST API, so all interaction is done through headless browser automation. The CLI drives a real Chromium browser, fills forms, reads grids, and handles Vaadin's async server round-trips.

> **Note:** The Abacus UI is in German. CLI output, field names (Leistungsart, Buchungstext, etc.), and prompts reflect this.

## Prerequisites

- Node.js 18+
- A running Abacus instance you have credentials for

## Setup

```bash
git clone https://github.com/youruser/abacus-cli.git
cd abacus-cli
npm install
npm run build
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
npx abacus login
```

### Log time

```bash
npx abacus time log --project 71100000001 --hours 8 --leistungsart 1435 --text "Development" --date 2025-01-15
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--project <id>` | yes | — | Project number |
| `--hours <n>` | yes | — | Hours to log |
| `--leistungsart <id>` | no | `1435` | Service type ID |
| `--text <text>` | no | — | Booking text |
| `--date <YYYY-MM-DD>` | no | today | Entry date |

If a matching entry (same date + project) already exists, you'll be prompted to update it or create a new one.

### List entries

```bash
npx abacus time list --monthYear 01.2025
```

### Weekly status

Shows the Rapportmatrix (time account summary) for the week containing the given date, plus hints about missing days and remaining hours.

```bash
npx abacus time status --date 2025-01-15
```

### Delete an entry

```bash
npx abacus time delete --date 2025-01-15 --project 71100000001
```

### Discover API calls

Captures network requests while you interact with Abacus manually. Useful for understanding Vaadin's communication protocol.

```bash
npx abacus discover
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
