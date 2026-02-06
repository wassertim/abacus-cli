import { config } from "./config";

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
}

const de: Translations = {
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
};

const en: Translations = {
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
};

const fr: Translations = {
  // UI strings
  navLeistungen: "Prestations",
  filterMonth: "Mois",
  filterWeek: "Semaine",
  menuDelete: "Supprimer",
  emptyGridMessage: "Aucune prestation disponible pour cette sélection",

  // Navigation & session
  navigatingToPortal: "Navigation vers le portail Abacus...",
  captchaDetected: "Captcha FortiADC détecté. Réouverture en mode visible...",
  captchaSolve: "Veuillez résoudre le captcha dans la fenêtre du navigateur.",
  captchaWaiting: "En attente du chargement du portail...",
  captchaRetry: "Captcha résolu. Nouvelle tentative...",
  sessionExpired: (url) =>
    `Session expirée ou page non chargée (URL: ${url}). Veuillez relancer 'abacus login'.`,
  openingTimeTracking: "Ouverture du menu de suivi du temps...",
  openingServices: "Ouverture des Prestations...",

  // Filters
  settingViewMonth: "Réglage de la vue sur Mois...",
  settingViewWeek: "Réglage de la vue sur Semaine...",
  settingDate: (date) => `Réglage de la date à ${date}...`,

  // Grid reading
  readingEntries: "Lecture des entrées...",
  readingExistingEntries: "Lecture des entrées existantes...",
  noEntriesFound: "Aucune entrée trouvée.",
  entriesTotal: (count) => `${count} entrées au total.`,

  // Status
  readingTimeReport: "Lecture du rapport horaire...",
  timeReportNotFound: "Rapport horaire introuvable.",
  statusWeekHeader: (weekNum, from, to) => `Semaine ${String(weekNum).padStart(2, "0")} · ${from} – ${to}`,
  statusWorked: "Travaillé",
  statusRemaining: "Restant",
  statusMissingDaysLabel: "Jours manquants",
  statusBalancesHeader: "Soldes",
  statusOvertime: "Heures sup.",
  statusExtraTime: "Heures en plus",
  statusVacationHeader: "Vacances",
  statusVacationRemaining: "Solde restant",
  statusVacationPlannedByDec: "Prévu au 31 déc",
  statusHoursUnit: "heures",

  // Table headers
  headerDate: "Date",
  headerProject: "Projet",
  headerServiceType: "Type de prestation",
  headerHours: "Heures",
  headerText: "Texte",

  // Form filling
  settingDateField: (date) => `Réglage de la date: ${date}`,
  settingProject: (project) => `Réglage du projet: ${project}`,
  settingServiceType: (la) => `Réglage du type de prestation: ${la}`,
  settingHours: (hours) => `Réglage des heures: ${hours}`,
  settingDescription: (text) => `Réglage de la description: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} déjà réservé le ${date} pour le projet ${project}`,
  serviceTypeLabel: "Type de prestation",
  textLabel: "Texte",
  promptUpdateOrNew: "Mettre à jour l'existant ou en ajouter un nouveau? [m/n] ",
  promptYes: "m",
  promptNo: "n",
  openingExistingEntry: "Ouverture de l'entrée existante...",
  creatingNewEntry: "Création d'une nouvelle entrée...",
  noExistingEntryCreating: "Aucune entrée existante, création...",

  // Save
  saving: "Enregistrement...",
  saved: "Enregistré.",
  saveButtonNotFound: "Bouton d'enregistrement introuvable. L'entrée n'a PAS été enregistrée.",

  // Delete
  noEntryFound: (date, project) =>
    `Aucune entrée trouvée le ${date} pour le projet ${project}.`,
  foundEntry: (hours, date, project) =>
    `Trouvé: ${hours} le ${date} — ${project}`,
  promptConfirmDelete: "Vraiment supprimer? [o/n] ",
  cancelled: "Annulé.",
  multipleEntriesFound: (count, date, project) =>
    `${count} entrées trouvées le ${date} pour le projet ${project}:`,
  noText: "(pas de texte)",
  promptWhichDelete: (count) =>
    `Lequel supprimer? [1-${count} / a=tous / n=annuler] `,
  deletingEntry: (current, total) =>
    `Suppression de l'entrée ${current}/${total}...`,
  entriesDeleted: (count) => `${count} entrées supprimées.`,
  invalidSelection: "Sélection invalide. Annulé.",
  entryDeleted: "Entrée supprimée.",
  selectEntriesToDelete: "Sélectionner les entrées à supprimer:",
  selectHint: "espace=basculer, a=tous, entrée=confirmer",
  noEntriesSelected: "Aucune entrée sélectionnée.",
  confirmDeleteSelected: (count) => `Supprimer ${count} entrées? [o/n] `,

  // List report
  missingDayRow: "Aucune entrée",
  missingDaysSummary: (count) =>
    `${count} jour${count > 1 ? "s" : ""} ouvrable${count > 1 ? "s" : ""} sans entrées.`,

  // Time command
  listingEntries: (monthYear) => `Liste des entrées pour ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Suppression de l'entrée pour ${date} / ${project}...`,
  timeEntryLabel: "Entrée horaire:",

  // Batch
  batchCreating: (current, total, date) => `[${current}/${total}] Création de l'entrée pour ${date}...`,
  batchSkipping: (date, project) => `Ignoré: ${date} — ${project} (existe déjà)`,
  batchSummary: (created, skipped) => `${created} entrées créées, ${skipped} ignorées.`,
  batchDryRun: "Aperçu (dry-run):",
  batchNoEntries: "Aucune entrée à créer.",
  batchWeekendSkipped: (date) => `Ignoré: ${date} (week-end)`,
  batchFileNotFound: (path) => `Fichier introuvable: ${path}`,
  batchInvalidFormat: "Format de fichier invalide. Attendu: .json ou .csv",
  batchGenerated: (path, count) => `${path} généré avec ${count} jours manquants.`,
  batchGenerateHint: (path) => `Modifiez le fichier, puis exécutez: abacus time batch --file ${path}`,

  // Dry-run status
  headerStatus: "Statut",
  dryRunNew: "+ nouveau",
  dryRunSkip: "ignoré",
  dryRunExisting: "existant",
  dryRunSummary: (n, s, e) => `${n} nouveau${n > 1 ? "x" : ""}, ${s} ignoré${s > 1 ? "s" : ""} (doublon), ${e} existant${e > 1 ? "s" : ""}.`,
};

const it: Translations = {
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
};

const es: Translations = {
  // UI strings
  navLeistungen: "Servicios",
  filterMonth: "Mes",
  filterWeek: "Semana",
  menuDelete: "Eliminar",
  emptyGridMessage: "No hay servicios disponibles para esta selección",

  // Navigation & session
  navigatingToPortal: "Navegando al portal Abacus...",
  captchaDetected: "Captcha FortiADC detectado. Reabriendo en modo visible...",
  captchaSolve: "Por favor, resuelva el captcha en la ventana del navegador.",
  captchaWaiting: "Esperando a que cargue el portal...",
  captchaRetry: "Captcha resuelto. Reintentando...",
  sessionExpired: (url) =>
    `Sesión expirada o página no cargada (URL: ${url}). Ejecute 'abacus login' de nuevo.`,
  openingTimeTracking: "Abriendo menú de seguimiento de tiempo...",
  openingServices: "Abriendo Servicios...",

  // Filters
  settingViewMonth: "Configurando vista a Mes...",
  settingViewWeek: "Configurando vista a Semana...",
  settingDate: (date) => `Configurando fecha a ${date}...`,

  // Grid reading
  readingEntries: "Leyendo entradas...",
  readingExistingEntries: "Leyendo entradas existentes...",
  noEntriesFound: "No se encontraron entradas.",
  entriesTotal: (count) => `${count} entradas en total.`,

  // Status
  readingTimeReport: "Leyendo informe horario...",
  timeReportNotFound: "Informe horario no encontrado.",
  statusWeekHeader: (weekNum, from, to) => `Semana ${String(weekNum).padStart(2, "0")} · ${from} – ${to}`,
  statusWorked: "Trabajado",
  statusRemaining: "Restante",
  statusMissingDaysLabel: "Días sin registrar",
  statusBalancesHeader: "Saldos",
  statusOvertime: "Horas extra",
  statusExtraTime: "Tiempo extra",
  statusVacationHeader: "Vacaciones",
  statusVacationRemaining: "Saldo restante",
  statusVacationPlannedByDec: "Previsto al 31 dic",
  statusHoursUnit: "horas",

  // Table headers
  headerDate: "Fecha",
  headerProject: "Proyecto",
  headerServiceType: "Tipo de servicio",
  headerHours: "Horas",
  headerText: "Texto",

  // Form filling
  settingDateField: (date) => `Configurando fecha: ${date}`,
  settingProject: (project) => `Configurando proyecto: ${project}`,
  settingServiceType: (la) => `Configurando tipo de servicio: ${la}`,
  settingHours: (hours) => `Configurando horas: ${hours}`,
  settingDescription: (text) => `Configurando descripción: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} ya reservado el ${date} para el proyecto ${project}`,
  serviceTypeLabel: "Tipo de servicio",
  textLabel: "Texto",
  promptUpdateOrNew: "¿Actualizar existente o añadir nuevo? [a/n] ",
  promptYes: "a",
  promptNo: "n",
  openingExistingEntry: "Abriendo entrada existente...",
  creatingNewEntry: "Creando nueva entrada...",
  noExistingEntryCreating: "No se encontró entrada existente, creando nueva...",

  // Save
  saving: "Guardando...",
  saved: "Guardado.",
  saveButtonNotFound: "Botón de guardar no encontrado. La entrada NO se guardó.",

  // Delete
  noEntryFound: (date, project) =>
    `No se encontró entrada el ${date} para el proyecto ${project}.`,
  foundEntry: (hours, date, project) =>
    `Encontrado: ${hours} el ${date} — ${project}`,
  promptConfirmDelete: "¿Realmente eliminar? [s/n] ",
  cancelled: "Cancelado.",
  multipleEntriesFound: (count, date, project) =>
    `${count} entradas encontradas el ${date} para el proyecto ${project}:`,
  noText: "(sin texto)",
  promptWhichDelete: (count) =>
    `¿Cuál eliminar? [1-${count} / a=todos / n=cancelar] `,
  deletingEntry: (current, total) =>
    `Eliminando entrada ${current}/${total}...`,
  entriesDeleted: (count) => `${count} entradas eliminadas.`,
  invalidSelection: "Selección inválida. Cancelado.",
  entryDeleted: "Entrada eliminada.",
  selectEntriesToDelete: "Selecciona las entradas a eliminar:",
  selectHint: "espacio=alternar, a=todos, intro=confirmar",
  noEntriesSelected: "Ninguna entrada seleccionada.",
  confirmDeleteSelected: (count) => `¿Eliminar ${count} entradas? [s/n] `,

  // List report
  missingDayRow: "Sin entradas",
  missingDaysSummary: (count) =>
    `${count} día${count > 1 ? "s" : ""} laborable${count > 1 ? "s" : ""} sin entradas.`,

  // Time command
  listingEntries: (monthYear) => `Listando entradas para ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Eliminando entrada para ${date} / ${project}...`,
  timeEntryLabel: "Entrada horaria:",

  // Batch
  batchCreating: (current, total, date) => `[${current}/${total}] Creando entrada para ${date}...`,
  batchSkipping: (date, project) => `Omitido: ${date} — ${project} (ya existe)`,
  batchSummary: (created, skipped) => `${created} entradas creadas, ${skipped} omitidas.`,
  batchDryRun: "Vista previa (dry-run):",
  batchNoEntries: "No hay entradas que crear.",
  batchWeekendSkipped: (date) => `Omitido: ${date} (fin de semana)`,
  batchFileNotFound: (path) => `Archivo no encontrado: ${path}`,
  batchInvalidFormat: "Formato de archivo inválido. Esperado: .json o .csv",
  batchGenerated: (path, count) => `${path} generado con ${count} días faltantes.`,
  batchGenerateHint: (path) => `Edite el archivo, luego ejecute: abacus time batch --file ${path}`,

  // Dry-run status
  headerStatus: "Estado",
  dryRunNew: "+ nuevo",
  dryRunSkip: "omitido",
  dryRunExisting: "existente",
  dryRunSummary: (n, s, e) => `${n} nuevo${n > 1 ? "s" : ""}, ${s} omitido${s > 1 ? "s" : ""} (duplicado), ${e} existente${e > 1 ? "s" : ""}.`,
};

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

