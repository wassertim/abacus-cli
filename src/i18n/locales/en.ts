import type { Translations } from "..";

export const en: Translations = {
  // UI strings
  navLeistungen: "Services",
  filterMonth: "Month",
  filterWeek: "Week",
  menuDelete: "Delete",
  emptyGridMessage: "No services available for this selection",

  // Navigation & session
  navigatingToPortal: "Navigating to Abacus portal...",
  captchaDetected: "FortiADC captcha detected. Reopening in headed mode...",
  captchaSolve: "Please solve the captcha in the browser window.",
  captchaWaiting: "Waiting for portal to load...",
  captchaRetry: "Captcha solved. Retrying...",
  sessionExpired: (url) =>
    `Session expired or page not loaded (URL: ${url}). Please run 'abacus login' again.`,
  openingTimeTracking: "Opening time tracking menu...",
  openingServices: "Opening Services...",

  // Filters
  settingViewMonth: "Setting view to Month...",
  settingViewWeek: "Setting view to Week...",
  settingDate: (date) => `Setting date to ${date}...`,

  // Grid reading
  readingEntries: "Reading entries...",
  readingExistingEntries: "Reading existing entries...",
  noEntriesFound: "No entries found.",
  entriesTotal: (count) => `${count} entries total.`,

  // Status
  readingTimeReport: "Reading time report...",
  timeReportNotFound: "Time report not found.",
  statusWeekHeader: (weekNum, from, to) => `Week ${String(weekNum).padStart(2, "0")} · ${from} – ${to}`,
  statusWorked: "Worked",
  statusRemaining: "Remaining",
  statusMissingDaysLabel: "Missing days",
  statusBalancesHeader: "Balances",
  statusOvertime: "Overtime",
  statusExtraTime: "Extra time",
  statusVacationHeader: "Vacation",
  statusVacationRemaining: "Remaining",
  statusVacationPlannedByDec: "Planned by Dec 31",
  statusHoursUnit: "hours",
  statusDaysUnit: "d",
  hintQuickActions: "Quick actions",
  hintLogSingle: "Book a single day:",
  hintBatchFill: "Book all missing days at once:",
  hintBatchGenerate: "Generate template & customize per day:",

  // Table headers
  headerDate: "Date",
  headerProject: "Project",
  headerServiceType: "Service Type",
  headerHours: "Hours",
  headerText: "Text",

  // Form filling
  settingDateField: (date) => `Setting date: ${date}`,
  settingProject: (project) => `Setting project: ${project}`,
  settingServiceType: (la) => `Setting service type: ${la}`,
  settingHours: (hours) => `Setting hours: ${hours}`,
  settingDescription: (text) => `Setting description: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} already booked on ${date} for project ${project}`,
  serviceTypeLabel: "Service Type",
  textLabel: "Text",
  promptUpdateOrNew: "Update existing or add new? [u/n] ",
  promptYes: "u",
  promptNo: "n",
  openingExistingEntry: "Opening existing entry for editing...",
  creatingNewEntry: "Creating new entry...",
  noExistingEntryCreating: "No existing entry found, creating new...",

  // Save
  saving: "Saving...",
  saved: "Saved.",
  saveButtonNotFound: "Save button not found. Entry was NOT saved.",

  // Delete
  noEntryFound: (date, project) =>
    `No entry found on ${date} for project ${project}.`,
  foundEntry: (hours, date, project) =>
    `Found: ${hours} on ${date} — ${project}`,
  promptConfirmDelete: "Really delete? [y/n] ",
  cancelled: "Cancelled.",
  multipleEntriesFound: (count, date, project) =>
    `${count} entries found on ${date} for project ${project}:`,
  noText: "(no text)",
  promptWhichDelete: (count) =>
    `Which one to delete? [1-${count} / a=all / n=cancel] `,
  deletingEntry: (current, total) =>
    `Deleting entry ${current}/${total}...`,
  entriesDeleted: (count) => `${count} entries deleted.`,
  invalidSelection: "Invalid selection. Cancelled.",
  entryDeleted: "Entry deleted.",
  selectEntriesToDelete: "Select entries to delete:",
  selectHint: "space=toggle, a=all, enter=confirm",
  noEntriesSelected: "No entries selected.",
  confirmDeleteSelected: (count) => `Delete ${count} entries? [y/n] `,

  // List report
  missingDayRow: "No entries",
  missingDaysSummary: (count) =>
    `${count} workday${count > 1 ? "s" : ""} without entries.`,

  // Time command
  listingEntries: (monthYear) => `Listing entries for ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Deleting entry for ${date} / ${project}...`,
  timeEntryLabel: "Time entry:",

  // Batch
  batchCreating: (current, total, date) => `[${current}/${total}] Creating entry for ${date}...`,
  batchSkipping: (date, project) => `Skipped: ${date} — ${project} (already exists)`,
  batchSummary: (created, skipped) => `${created} entries created, ${skipped} skipped.`,
  batchDryRun: "Preview (dry-run):",
  batchNoEntries: "No entries to create.",
  batchWeekendSkipped: (date) => `Skipped: ${date} (weekend)`,
  batchFileNotFound: (path) => `File not found: ${path}`,
  batchInvalidFormat: "Invalid file format. Expected: .json or .csv",
  batchGenerated: (path, count) => `Generated ${path} with ${count} missing days.`,
  batchGenerateHint: (path) => `Edit the file, then run: abacus time batch --file ${path}`,

  // Dry-run status
  headerStatus: "Status",
  dryRunNew: "+ new",
  dryRunSkip: "skip",
  dryRunExisting: "exists",
  dryRunSummary: (n, s, e) => `${n} new, ${s} skipped (duplicate), ${e} existing.`,

  // Summary / check
  summaryLine1: (weekNum, worked, target, remaining, missingDays) =>
    `Week ${weekNum} · ${worked} / ${target}h · ${remaining}h remaining${missingDays ? ` · ${missingDays} missing` : ""}`,
  summaryLine2: (overtime, overtimeDays, vacationDays) =>
    `Overtime: ${overtime}h (${overtimeDays}d) · Vacation: ${vacationDays}d left`,
  summaryUpdatedAgo: (ago) => `(updated ${ago} ago)`,
  summaryFetching: "Fetching status...",
  checkWarning: (missingDays, remaining) => `Abacus: ${missingDays} not logged — ${remaining}h remaining this week`,
  checkReminder: "Did you log your hours this week? Check with: abacus summary",
  timeAgoMinutes: (n) => `${n}min`,
  timeAgoHours: (n) => `${n}h`,
  timeAgoDays: (n) => `${n}d`,
  updatingCache: "Updating status cache...",
  defaultBookingText: "Development",
};
