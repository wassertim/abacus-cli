import type { Translations } from "..";

export const de: Translations = {
  // UI strings
  navLeistungen: "Leistungen",
  filterMonth: "Monat",
  filterWeek: "Woche",
  menuDelete: "Löschen",
  emptyGridMessage: "Für diese Auswahl sind keine Leistungen vorhanden",

  // Navigation & session
  navigatingToPortal: "Navigating to Abacus portal...",
  captchaDetected: "FortiADC captcha detected. Reopening in headed mode...",
  captchaSolve: "Please solve the captcha in the browser window.",
  captchaWaiting: "Waiting for portal to load...",
  captchaRetry: "Captcha solved. Retrying...",
  sessionExpired: (url) =>
    `Session abgelaufen oder Seite nicht geladen (URL: ${url}). Bitte 'abacus login' erneut ausführen.`,
  openingTimeTracking: "Rapportierung-Menü wird geöffnet...",
  openingServices: "Leistungen werden geöffnet...",

  // Filters
  settingViewMonth: "Ansicht auf Monat setzen...",
  settingViewWeek: "Ansicht auf Woche setzen...",
  settingDate: (date) => `Datum auf ${date} setzen...`,

  // Grid reading
  readingEntries: "Einträge werden gelesen...",
  readingExistingEntries: "Bestehende Einträge werden gelesen...",
  noEntriesFound: "Keine Einträge gefunden.",
  entriesTotal: (count) => `${count} Einträge total.`,

  // Status
  readingTimeReport: "Rapportmatrix wird gelesen...",
  timeReportNotFound: "Rapportmatrix nicht gefunden.",
  statusWeekHeader: (weekNum, from, to) => `Woche ${String(weekNum).padStart(2, "0")} · ${from} – ${to}`,
  statusWorked: "Gearbeitet",
  statusRemaining: "Verbleibend",
  statusMissingDaysLabel: "Fehlende Tage",
  statusBalancesHeader: "Salden",
  statusOvertime: "Überstunden",
  statusExtraTime: "Überzeit",
  statusVacationHeader: "Ferien",
  statusVacationRemaining: "Restguthaben",
  statusVacationPlannedByDec: "Geplant bis 31. Dez",
  statusHoursUnit: "Stunden",
  statusDaysUnit: "d",
  hintQuickActions: "Quick actions",
  hintLogSingle: "Einzelnen Tag buchen:",
  hintBatchFill: "Alle fehlenden Tage auf einmal buchen:",
  hintBatchGenerate: "Vorlage generieren & pro Tag anpassen:",

  // Table headers
  headerDate: "Datum",
  headerProject: "Projekt",
  headerServiceType: "Leistungsart",
  headerHours: "Stunden",
  headerText: "Text",

  // Form filling
  settingDateField: (date) => `Setting Datum: ${date}`,
  settingProject: (project) => `Setting Projekt-Nr.: ${project}`,
  settingServiceType: (la) => `Setting Leistungsart: ${la}`,
  settingHours: (hours) => `Setting Stunden: ${hours}`,
  settingDescription: (text) => `Setting Buchungstext: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} bereits gebucht am ${date} für Projekt ${project}`,
  serviceTypeLabel: "Leistungsart",
  textLabel: "Text",
  promptUpdateOrNew: "Bestehenden updaten oder neuen hinzufügen? [u/n] ",
  promptYes: "u",
  promptNo: "n",
  openingExistingEntry: "Opening existing entry for editing...",
  creatingNewEntry: "Creating new entry...",
  noExistingEntryCreating: "No existing entry found, creating new...",

  // Save
  saving: "Saving...",
  saved: "Gespeichert.",
  saveButtonNotFound: "Save button not found. Entry was NOT saved.",

  // Delete
  noEntryFound: (date, project) =>
    `Kein Eintrag gefunden am ${date} für Projekt ${project}.`,
  foundEntry: (hours, date, project) =>
    `Gefunden: ${hours} am ${date} — ${project}`,
  promptConfirmDelete: "Wirklich löschen? [j/n] ",
  cancelled: "Abgebrochen.",
  multipleEntriesFound: (count, date, project) =>
    `${count} Einträge gefunden am ${date} für Projekt ${project}:`,
  noText: "(kein Text)",
  promptWhichDelete: (count) =>
    `Welchen löschen? [1-${count} / a=alle / n=abbrechen] `,
  deletingEntry: (current, total) =>
    `Lösche Eintrag ${current}/${total}...`,
  entriesDeleted: (count) => `${count} Einträge gelöscht.`,
  invalidSelection: "Ungültige Auswahl. Abgebrochen.",
  entryDeleted: "Eintrag gelöscht.",
  selectEntriesToDelete: "Einträge zum Löschen auswählen:",
  selectHint: "Leertaste=umschalten, a=alle, Enter=bestätigen",
  noEntriesSelected: "Keine Einträge ausgewählt.",
  confirmDeleteSelected: (count) => `${count} Einträge löschen? [j/n] `,

  // List report
  missingDayRow: "Keine Einträge",
  missingDaysSummary: (count) =>
    `${count} Arbeitstag${count > 1 ? "e" : ""} ohne Einträge.`,

  // Time command
  listingEntries: (monthYear) => `Listing entries for ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Deleting entry for ${date} / ${project}...`,
  timeEntryLabel: "Time entry:",

  // Batch
  batchCreating: (current, total, date) => `[${current}/${total}] Eintrag für ${date} wird erstellt...`,
  batchSkipping: (date, project) => `Übersprungen: ${date} — ${project} (bereits vorhanden)`,
  batchSummary: (created, skipped) => `${created} Einträge erstellt, ${skipped} übersprungen.`,
  batchDryRun: "Vorschau (dry-run):",
  batchNoEntries: "Keine Einträge zu erstellen.",
  batchWeekendSkipped: (date) => `Übersprungen: ${date} (Wochenende)`,
  batchFileNotFound: (path) => `Datei nicht gefunden: ${path}`,
  batchInvalidFormat: "Ungültiges Dateiformat. Erwartet: .json oder .csv",
  batchGenerated: (path, count) => `${path} mit ${count} fehlenden Tagen generiert.`,
  batchGenerateHint: (path) => `Datei bearbeiten, dann ausführen: abacus time batch --file ${path}`,

  // Dry-run status
  headerStatus: "Status",
  dryRunNew: "+ neu",
  dryRunSkip: "übersprungen",
  dryRunExisting: "vorhanden",
  dryRunSummary: (n, s, e) => `${n} neu, ${s} übersprungen (Duplikat), ${e} vorhanden.`,

  // Summary / check
  summaryLine1: (weekNum, worked, target, remaining, missingDays) =>
    `KW ${weekNum} · ${worked} / ${target}h · ${remaining}h verbleibend${missingDays ? ` · ${missingDays} fehlt` : ""}`,
  summaryLine2: (overtime, overtimeDays, vacationDays) =>
    `Überstunden: ${overtime}h (${overtimeDays}d) · Ferien: ${vacationDays}d übrig`,
  summaryUpdatedAgo: (ago) => `(aktualisiert vor ${ago})`,
  summaryFetching: "Status wird abgerufen...",
  checkWarning: (missingDays) => `Abacus: ${missingDays} nicht gebucht`,
  checkReminder: "Sind deine Stunden eingetragen? Prüfe mit: abacus summary",
  timeAgoMinutes: (n) => `${n}min`,
  timeAgoHours: (n) => `${n}h`,
  timeAgoDays: (n) => `${n}d`,
  updatingCache: "Status-Cache wird aktualisiert...",
  defaultBookingText: "Entwicklung",
};
