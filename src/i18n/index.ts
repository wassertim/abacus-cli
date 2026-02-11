import { config } from "../config";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import { es } from "./locales/es";

export type Locale = "de" | "en" | "fr" | "it" | "es";
const validLocales: readonly string[] = ["de", "en", "fr", "it", "es"];

export interface Translations {
  // --- Vaadin UI strings (critical for selectors) ---
  navLeistungen: string;
  filterMonth: string;
  filterWeek: string;
  menuDelete: string;
  emptyGridMessage: string;

  // --- CLI output: navigation & session ---
  navigatingToPortal: string;
  captchaDetected: string;
  captchaSolve: string;
  captchaWaiting: string;
  captchaRetry: string;
  sessionExpired: (url: string) => string;
  openingTimeTracking: string;
  openingServices: string;

  // --- CLI output: filters ---
  settingViewMonth: string;
  settingViewWeek: string;
  settingDate: (date: string) => string;

  // --- CLI output: grid reading ---
  readingEntries: string;
  readingExistingEntries: string;
  noEntriesFound: string;
  entriesTotal: (count: number) => string;

  // --- CLI output: status (time report) ---
  readingTimeReport: string;
  timeReportNotFound: string;
  statusWeekHeader: (weekNum: number, from: string, to: string) => string;
  statusWorked: string;
  statusRemaining: string;
  statusMissingDaysLabel: string;
  statusBalancesHeader: string;
  statusOvertime: string;
  statusExtraTime: string;
  statusVacationHeader: string;
  statusVacationRemaining: string;
  statusVacationPlannedByDec: string;
  statusHoursUnit: string;
  statusDaysUnit: string;
  hintQuickActions: string;
  hintLogSingle: string;
  hintBatchFill: string;
  hintBatchGenerate: string;

  // --- CLI output: table headers ---
  headerDate: string;
  headerProject: string;
  headerServiceType: string;
  headerHours: string;
  headerText: string;

  // --- CLI output: form filling ---
  settingDateField: (date: string) => string;
  settingProject: (project: string) => string;
  settingServiceType: (la: string) => string;
  settingHours: (hours: number) => string;
  settingDescription: (text: string) => string;

  // --- CLI output: log (duplicate check) ---
  alreadyBooked: (hours: string, date: string, project: string) => string;
  serviceTypeLabel: string;
  textLabel: string;
  promptUpdateOrNew: string;
  promptYes: string;
  promptNo: string;
  openingExistingEntry: string;
  creatingNewEntry: string;
  noExistingEntryCreating: string;

  // --- CLI output: save ---
  saving: string;
  saved: string;
  saveButtonNotFound: string;

  // --- CLI output: delete ---
  noEntryFound: (date: string, project: string) => string;
  foundEntry: (hours: string, date: string, project: string) => string;
  promptConfirmDelete: string;
  cancelled: string;
  multipleEntriesFound: (count: number, date: string, project: string) => string;
  noText: string;
  promptWhichDelete: (count: number) => string;
  deletingEntry: (current: number, total: number) => string;
  entriesDeleted: (count: number) => string;
  invalidSelection: string;
  entryDeleted: string;
  selectEntriesToDelete: string;
  selectHint: string;
  noEntriesSelected: string;
  confirmDeleteSelected: (count: number) => string;

  // --- CLI output: list report ---
  missingDayRow: string;
  missingDaysSummary: (count: number) => string;

  // --- CLI output: time command ---
  listingEntries: (monthYear: string) => string;
  deletingEntryFor: (date: string, project: string) => string;
  timeEntryLabel: string;

  // --- CLI output: batch ---
  batchCreating: (current: number, total: number, date: string) => string;
  batchSkipping: (date: string, project: string) => string;
  batchSummary: (created: number, skipped: number) => string;
  batchDryRun: string;
  batchNoEntries: string;
  batchWeekendSkipped: (date: string) => string;
  batchFileNotFound: (path: string) => string;
  batchInvalidFormat: string;
  batchGenerated: (path: string, count: number) => string;
  batchGenerateHint: (path: string) => string;

  // --- CLI output: dry-run status ---
  headerStatus: string;
  dryRunNew: string;
  dryRunSkip: string;
  dryRunExisting: string;
  dryRunSummary: (newCount: number, skipCount: number, existingCount: number) => string;

  // --- CLI output: summary / check ---
  summaryLine1: (weekNum: string, worked: string, target: string, remaining: string, missingDays: string) => string;
  summaryLine2: (overtime: string, overtimeDays: string, vacationDays: string) => string;
  summaryUpdatedAgo: (ago: string) => string;
  summaryFetching: string;
  checkWarning: (missingDays: string) => string;
  checkReminder: string;
  timeAgoMinutes: (n: number) => string;
  timeAgoHours: (n: number) => string;
  timeAgoDays: (n: number) => string;

  // --- CLI output: cache refresh ---
  updatingCache: string;
  defaultBookingText: string;
}

const locales: Record<Locale, Translations> = { de, en, fr, it, es };

// --- Locale resolution ---

export type LocaleSource = "env" | "file" | "system" | "default";

/** Resolve locale from env var → config file → system locale → "en" fallback. */
export function resolveLocale(): { locale: Locale; source: LocaleSource } {
  // 1. ABACUS_LOCALE env var
  if (process.env.ABACUS_LOCALE && validLocales.includes(process.env.ABACUS_LOCALE)) {
    return { locale: process.env.ABACUS_LOCALE as Locale, source: "env" };
  }

  // 2. config.json locale field (already resolved env → file in config.ts)
  if (config.locale && validLocales.includes(config.locale)) {
    return { locale: config.locale as Locale, source: "file" };
  }

  // 3. System locale
  const systemLang =
    Intl.DateTimeFormat().resolvedOptions().locale ||
    process.env.LC_ALL ||
    process.env.LANG ||
    "";
  const short = systemLang.split(/[-_.]/)[0];
  if (short && validLocales.includes(short)) {
    return { locale: short as Locale, source: "system" };
  }

  // 4. Fallback
  return { locale: "en", source: "default" };
}

// --- Module-level state ---

const resolved = resolveLocale();
let currentLocale: Locale = resolved.locale;
export let localeSource: LocaleSource = resolved.source;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Get the current translations object. */
export function t(): Translations {
  return locales[currentLocale];
}

/**
 * The confirm key for the current locale's delete prompt.
 * de="j", en="y", fr="o", it="s", es="s"
 */
export function confirmDeleteKey(): string {
  const map: Record<Locale, string> = {
    de: "j",
    en: "y",
    fr: "o",
    it: "s",
    es: "s",
  };
  return map[currentLocale];
}
