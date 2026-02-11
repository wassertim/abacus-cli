import type { Translations } from "..";

export const it: Translations = {
  // UI strings
  navLeistungen: "Prestazioni",
  filterMonth: "Mese",
  filterWeek: "Settimana",
  menuDelete: "Elimina",
  emptyGridMessage: "Nessuna prestazione disponibile per questa selezione",

  // Navigation & session
  navigatingToPortal: "Navigazione verso il portale Abacus...",
  captchaDetected: "Captcha FortiADC rilevato. Riapertura in modalità visibile...",
  captchaSolve: "Risolvere il captcha nella finestra del browser.",
  captchaWaiting: "In attesa del caricamento del portale...",
  captchaRetry: "Captcha risolto. Nuovo tentativo...",
  sessionExpired: (url) =>
    `Sessione scaduta o pagina non caricata (URL: ${url}). Eseguire nuovamente 'abacus login'.`,
  openingTimeTracking: "Apertura del menu di monitoraggio del tempo...",
  openingServices: "Apertura delle Prestazioni...",

  // Filters
  settingViewMonth: "Impostazione vista su Mese...",
  settingViewWeek: "Impostazione vista su Settimana...",
  settingDate: (date) => `Impostazione data a ${date}...`,

  // Grid reading
  readingEntries: "Lettura delle voci...",
  readingExistingEntries: "Lettura delle voci esistenti...",
  noEntriesFound: "Nessuna voce trovata.",
  entriesTotal: (count) => `${count} voci totali.`,

  // Status
  readingTimeReport: "Lettura del rapporto orario...",
  timeReportNotFound: "Rapporto orario non trovato.",
  statusWeekHeader: (weekNum, from, to) => `Settimana ${String(weekNum).padStart(2, "0")} · ${from} – ${to}`,
  statusWorked: "Lavorato",
  statusRemaining: "Rimanente",
  statusMissingDaysLabel: "Giorni mancanti",
  statusBalancesHeader: "Saldi",
  statusOvertime: "Straordinario",
  statusExtraTime: "Tempo extra",
  statusVacationHeader: "Ferie",
  statusVacationRemaining: "Saldo residuo",
  statusVacationPlannedByDec: "Previsto al 31 dic",
  statusHoursUnit: "ore",
  statusDaysUnit: "g",
  hintQuickActions: "Azioni rapide",
  hintLogSingle: "Registrare un singolo giorno:",
  hintBatchFill: "Registrare tutti i giorni mancanti:",
  hintBatchGenerate: "Generare modello & personalizzare per giorno:",

  // Table headers
  headerDate: "Data",
  headerProject: "Progetto",
  headerServiceType: "Tipo di prestazione",
  headerHours: "Ore",
  headerText: "Testo",

  // Form filling
  settingDateField: (date) => `Impostazione data: ${date}`,
  settingProject: (project) => `Impostazione progetto: ${project}`,
  settingServiceType: (la) => `Impostazione tipo di prestazione: ${la}`,
  settingHours: (hours) => `Impostazione ore: ${hours}`,
  settingDescription: (text) => `Impostazione descrizione: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} già prenotato il ${date} per il progetto ${project}`,
  serviceTypeLabel: "Tipo di prestazione",
  textLabel: "Testo",
  promptUpdateOrNew: "Aggiornare l'esistente o aggiungerne uno nuovo? [a/n] ",
  promptYes: "a",
  promptNo: "n",
  openingExistingEntry: "Apertura della voce esistente...",
  creatingNewEntry: "Creazione di una nuova voce...",
  noExistingEntryCreating: "Nessuna voce esistente, creazione...",

  // Save
  saving: "Salvataggio...",
  saved: "Salvato.",
  saveButtonNotFound: "Pulsante di salvataggio non trovato. La voce NON è stata salvata.",

  // Delete
  noEntryFound: (date, project) =>
    `Nessuna voce trovata il ${date} per il progetto ${project}.`,
  foundEntry: (hours, date, project) =>
    `Trovato: ${hours} il ${date} — ${project}`,
  promptConfirmDelete: "Eliminare davvero? [s/n] ",
  cancelled: "Annullato.",
  multipleEntriesFound: (count, date, project) =>
    `${count} voci trovate il ${date} per il progetto ${project}:`,
  noText: "(nessun testo)",
  promptWhichDelete: (count) =>
    `Quale eliminare? [1-${count} / a=tutti / n=annulla] `,
  deletingEntry: (current, total) =>
    `Eliminazione voce ${current}/${total}...`,
  entriesDeleted: (count) => `${count} voci eliminate.`,
  invalidSelection: "Selezione non valida. Annullato.",
  entryDeleted: "Voce eliminata.",
  selectEntriesToDelete: "Seleziona le voci da eliminare:",
  selectHint: "spazio=seleziona, a=tutti, invio=conferma",
  noEntriesSelected: "Nessuna voce selezionata.",
  confirmDeleteSelected: (count) => `Eliminare ${count} voci? [s/n] `,

  // List report
  missingDayRow: "Nessuna voce",
  missingDaysSummary: (count) =>
    `${count} giorn${count > 1 ? "i" : "o"} lavorativ${count > 1 ? "i" : "o"} senza voci.`,

  // Time command
  listingEntries: (monthYear) => `Elenco voci per ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Eliminazione voce per ${date} / ${project}...`,
  timeEntryLabel: "Voce oraria:",

  // Batch
  batchCreating: (current, total, date) => `[${current}/${total}] Creazione voce per ${date}...`,
  batchSkipping: (date, project) => `Ignorato: ${date} — ${project} (esiste già)`,
  batchSummary: (created, skipped) => `${created} voci create, ${skipped} ignorate.`,
  batchDryRun: "Anteprima (dry-run):",
  batchNoEntries: "Nessuna voce da creare.",
  batchWeekendSkipped: (date) => `Ignorato: ${date} (fine settimana)`,
  batchFileNotFound: (path) => `File non trovato: ${path}`,
  batchInvalidFormat: "Formato file non valido. Atteso: .json o .csv",
  batchGenerated: (path, count) => `${path} generato con ${count} giorni mancanti.`,
  batchGenerateHint: (path) => `Modifica il file, poi esegui: abacus time batch --file ${path}`,

  // Dry-run status
  headerStatus: "Stato",
  dryRunNew: "+ nuovo",
  dryRunSkip: "ignorato",
  dryRunExisting: "esistente",
  dryRunSummary: (n, s, e) => `${n} nuov${n > 1 ? "i" : "o"}, ${s} ignorat${s > 1 ? "i" : "o"} (duplicato), ${e} esistent${e > 1 ? "i" : "e"}.`,

  // Summary / check
  summaryLine1: (weekNum, worked, target, remaining, missingDays) =>
    `Sett. ${weekNum} · ${worked} / ${target}h · ${remaining}h rimanent${missingDays ? ` · ${missingDays} mancante` : ""}`,
  summaryLine2: (overtime, overtimeDays, vacationDays) =>
    `Straordinario: ${overtime}h (${overtimeDays}g) · Ferie: ${vacationDays}g rimanenti`,
  summaryUpdatedAgo: (ago) => `(aggiornato ${ago} fa)`,
  summaryFetching: "Recupero dello stato...",
  checkWarning: (missingDays) => `Abacus: ${missingDays} non registrato`,
  checkReminder: "Hai registrato le ore? Controlla con: abacus summary",
  timeAgoMinutes: (n) => `${n}min`,
  timeAgoHours: (n) => `${n}h`,
  timeAgoDays: (n) => `${n}g`,
  updatingCache: "Aggiornamento cache di stato...",
  defaultBookingText: "Sviluppo",
};
