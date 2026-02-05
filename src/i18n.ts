import { Page } from "rebrowser-playwright-core";

export type Locale = "de" | "en" | "fr" | "it" | "es";

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
  openingRapportierung: string;
  openingLeistungen: string;

  // --- CLI output: filters ---
  settingAnsichtMonth: string;
  settingAnsichtWeek: string;
  settingDatum: (date: string) => string;

  // --- CLI output: grid reading ---
  readingEntries: string;
  readingExistingEntries: string;
  noEntriesFound: string;
  entriesTotal: (count: number) => string;

  // --- CLI output: status (Rapportmatrix) ---
  readingRapportmatrix: string;
  rapportmatrixNotFound: string;
  rapportmatrixTitle: string;
  colDay: string;
  colTotal: string;
  missingDays: (count: number, days: string) => string;
  missingHours: (hours: string) => string;
  exampleLabel: string;

  // --- CLI output: table headers ---
  headerDatum: string;
  headerProjekt: string;
  headerLeistungsart: string;
  headerStunden: string;
  headerText: string;

  // --- CLI output: form filling ---
  settingDatumField: (date: string) => string;
  settingProjekt: (project: string) => string;
  settingLeistungsart: (la: string) => string;
  settingStunden: (hours: number) => string;
  settingBuchungstext: (text: string) => string;

  // --- CLI output: log (duplicate check) ---
  alreadyBooked: (hours: string, date: string, project: string) => string;
  leistungsartLabel: string;
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

  // --- CLI output: list report ---
  missingDayRow: string;
  missingDaysSummary: (count: number) => string;

  // --- CLI output: time command ---
  listingEntries: (monthYear: string) => string;
  deletingEntryFor: (date: string, project: string) => string;
  timeEntryLabel: string;
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
  openingRapportierung: "Opening Rapportierung menu...",
  openingLeistungen: "Opening Leistungen...",

  // Filters
  settingAnsichtMonth: "Setting Ansicht to Monat...",
  settingAnsichtWeek: "Setting Ansicht to Woche...",
  settingDatum: (date) => `Setting Datum to ${date}...`,

  // Grid reading
  readingEntries: "Reading entries...",
  readingExistingEntries: "Reading existing entries...",
  noEntriesFound: "Keine Einträge gefunden.",
  entriesTotal: (count) => `${count} Einträge total.`,

  // Status
  readingRapportmatrix: "Reading Rapportmatrix...",
  rapportmatrixNotFound: "Rapportmatrix nicht gefunden.",
  rapportmatrixTitle: "Rapportmatrix",
  colDay: "Tag",
  colTotal: "Total",
  missingDays: (count, days) =>
    `Du hast an ${count} Tag${count > 1 ? "en" : ""} nicht gebucht: ${days}`,
  missingHours: (hours) => `Dir fehlen noch ${hours} Stunden.`,
  exampleLabel: "Beispiel:",

  // Table headers
  headerDatum: "Datum",
  headerProjekt: "Projekt",
  headerLeistungsart: "Leistungsart",
  headerStunden: "Stunden",
  headerText: "Text",

  // Form filling
  settingDatumField: (date) => `Setting Datum: ${date}`,
  settingProjekt: (project) => `Setting Projekt-Nr.: ${project}`,
  settingLeistungsart: (la) => `Setting Leistungsart: ${la}`,
  settingStunden: (hours) => `Setting Stunden: ${hours}`,
  settingBuchungstext: (text) => `Setting Buchungstext: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} bereits gebucht am ${date} für Projekt ${project}`,
  leistungsartLabel: "Leistungsart",
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

  // List report
  missingDayRow: "Keine Einträge",
  missingDaysSummary: (count) =>
    `${count} Arbeitstag${count > 1 ? "e" : ""} ohne Einträge.`,

  // Time command
  listingEntries: (monthYear) => `Listing entries for ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Deleting entry for ${date} / ${project}...`,
  timeEntryLabel: "Time entry:",
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
  openingRapportierung: "Opening Rapportierung menu...",
  openingLeistungen: "Opening Services...",

  // Filters
  settingAnsichtMonth: "Setting view to Month...",
  settingAnsichtWeek: "Setting view to Week...",
  settingDatum: (date) => `Setting date to ${date}...`,

  // Grid reading
  readingEntries: "Reading entries...",
  readingExistingEntries: "Reading existing entries...",
  noEntriesFound: "No entries found.",
  entriesTotal: (count) => `${count} entries total.`,

  // Status
  readingRapportmatrix: "Reading time report...",
  rapportmatrixNotFound: "Time report not found.",
  rapportmatrixTitle: "Time Report",
  colDay: "Day",
  colTotal: "Total",
  missingDays: (count, days) =>
    `You have ${count} day${count > 1 ? "s" : ""} without entries: ${days}`,
  missingHours: (hours) => `You are still missing ${hours} hours.`,
  exampleLabel: "Example:",

  // Table headers
  headerDatum: "Date",
  headerProjekt: "Project",
  headerLeistungsart: "Service Type",
  headerStunden: "Hours",
  headerText: "Text",

  // Form filling
  settingDatumField: (date) => `Setting date: ${date}`,
  settingProjekt: (project) => `Setting project: ${project}`,
  settingLeistungsart: (la) => `Setting service type: ${la}`,
  settingStunden: (hours) => `Setting hours: ${hours}`,
  settingBuchungstext: (text) => `Setting description: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} already booked on ${date} for project ${project}`,
  leistungsartLabel: "Service Type",
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

  // List report
  missingDayRow: "No entries",
  missingDaysSummary: (count) =>
    `${count} workday${count > 1 ? "s" : ""} without entries.`,

  // Time command
  listingEntries: (monthYear) => `Listing entries for ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Deleting entry for ${date} / ${project}...`,
  timeEntryLabel: "Time entry:",
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
  openingRapportierung: "Ouverture du menu Rapportierung...",
  openingLeistungen: "Ouverture des Prestations...",

  // Filters
  settingAnsichtMonth: "Réglage de la vue sur Mois...",
  settingAnsichtWeek: "Réglage de la vue sur Semaine...",
  settingDatum: (date) => `Réglage de la date à ${date}...`,

  // Grid reading
  readingEntries: "Lecture des entrées...",
  readingExistingEntries: "Lecture des entrées existantes...",
  noEntriesFound: "Aucune entrée trouvée.",
  entriesTotal: (count) => `${count} entrées au total.`,

  // Status
  readingRapportmatrix: "Lecture du rapport horaire...",
  rapportmatrixNotFound: "Rapport horaire introuvable.",
  rapportmatrixTitle: "Rapport horaire",
  colDay: "Jour",
  colTotal: "Total",
  missingDays: (count, days) =>
    `Vous avez ${count} jour${count > 1 ? "s" : ""} sans entrées: ${days}`,
  missingHours: (hours) => `Il vous manque encore ${hours} heures.`,
  exampleLabel: "Exemple:",

  // Table headers
  headerDatum: "Date",
  headerProjekt: "Projet",
  headerLeistungsart: "Type de prestation",
  headerStunden: "Heures",
  headerText: "Texte",

  // Form filling
  settingDatumField: (date) => `Réglage de la date: ${date}`,
  settingProjekt: (project) => `Réglage du projet: ${project}`,
  settingLeistungsart: (la) => `Réglage du type de prestation: ${la}`,
  settingStunden: (hours) => `Réglage des heures: ${hours}`,
  settingBuchungstext: (text) => `Réglage de la description: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} déjà réservé le ${date} pour le projet ${project}`,
  leistungsartLabel: "Type de prestation",
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

  // List report
  missingDayRow: "Aucune entrée",
  missingDaysSummary: (count) =>
    `${count} jour${count > 1 ? "s" : ""} ouvrable${count > 1 ? "s" : ""} sans entrées.`,

  // Time command
  listingEntries: (monthYear) => `Liste des entrées pour ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Suppression de l'entrée pour ${date} / ${project}...`,
  timeEntryLabel: "Entrée horaire:",
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
  openingRapportierung: "Apertura del menu Rapportierung...",
  openingLeistungen: "Apertura delle Prestazioni...",

  // Filters
  settingAnsichtMonth: "Impostazione vista su Mese...",
  settingAnsichtWeek: "Impostazione vista su Settimana...",
  settingDatum: (date) => `Impostazione data a ${date}...`,

  // Grid reading
  readingEntries: "Lettura delle voci...",
  readingExistingEntries: "Lettura delle voci esistenti...",
  noEntriesFound: "Nessuna voce trovata.",
  entriesTotal: (count) => `${count} voci totali.`,

  // Status
  readingRapportmatrix: "Lettura del rapporto orario...",
  rapportmatrixNotFound: "Rapporto orario non trovato.",
  rapportmatrixTitle: "Rapporto orario",
  colDay: "Giorno",
  colTotal: "Totale",
  missingDays: (count, days) =>
    `Hai ${count} giorn${count > 1 ? "i" : "o"} senza voci: ${days}`,
  missingHours: (hours) => `Ti mancano ancora ${hours} ore.`,
  exampleLabel: "Esempio:",

  // Table headers
  headerDatum: "Data",
  headerProjekt: "Progetto",
  headerLeistungsart: "Tipo di prestazione",
  headerStunden: "Ore",
  headerText: "Testo",

  // Form filling
  settingDatumField: (date) => `Impostazione data: ${date}`,
  settingProjekt: (project) => `Impostazione progetto: ${project}`,
  settingLeistungsart: (la) => `Impostazione tipo di prestazione: ${la}`,
  settingStunden: (hours) => `Impostazione ore: ${hours}`,
  settingBuchungstext: (text) => `Impostazione descrizione: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} già prenotato il ${date} per il progetto ${project}`,
  leistungsartLabel: "Tipo di prestazione",
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

  // List report
  missingDayRow: "Nessuna voce",
  missingDaysSummary: (count) =>
    `${count} giorn${count > 1 ? "i" : "o"} lavorativ${count > 1 ? "i" : "o"} senza voci.`,

  // Time command
  listingEntries: (monthYear) => `Elenco voci per ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Eliminazione voce per ${date} / ${project}...`,
  timeEntryLabel: "Voce oraria:",
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
  openingRapportierung: "Abriendo menú Rapportierung...",
  openingLeistungen: "Abriendo Servicios...",

  // Filters
  settingAnsichtMonth: "Configurando vista a Mes...",
  settingAnsichtWeek: "Configurando vista a Semana...",
  settingDatum: (date) => `Configurando fecha a ${date}...`,

  // Grid reading
  readingEntries: "Leyendo entradas...",
  readingExistingEntries: "Leyendo entradas existentes...",
  noEntriesFound: "No se encontraron entradas.",
  entriesTotal: (count) => `${count} entradas en total.`,

  // Status
  readingRapportmatrix: "Leyendo informe horario...",
  rapportmatrixNotFound: "Informe horario no encontrado.",
  rapportmatrixTitle: "Informe horario",
  colDay: "Día",
  colTotal: "Total",
  missingDays: (count, days) =>
    `Tienes ${count} día${count > 1 ? "s" : ""} sin entradas: ${days}`,
  missingHours: (hours) => `Te faltan ${hours} horas.`,
  exampleLabel: "Ejemplo:",

  // Table headers
  headerDatum: "Fecha",
  headerProjekt: "Proyecto",
  headerLeistungsart: "Tipo de servicio",
  headerStunden: "Horas",
  headerText: "Texto",

  // Form filling
  settingDatumField: (date) => `Configurando fecha: ${date}`,
  settingProjekt: (project) => `Configurando proyecto: ${project}`,
  settingLeistungsart: (la) => `Configurando tipo de servicio: ${la}`,
  settingStunden: (hours) => `Configurando horas: ${hours}`,
  settingBuchungstext: (text) => `Configurando descripción: ${text}`,

  // Log (duplicate check)
  alreadyBooked: (hours, date, project) =>
    `${hours} ya reservado el ${date} para el proyecto ${project}`,
  leistungsartLabel: "Tipo de servicio",
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

  // List report
  missingDayRow: "Sin entradas",
  missingDaysSummary: (count) =>
    `${count} día${count > 1 ? "s" : ""} laborable${count > 1 ? "s" : ""} sin entradas.`,

  // Time command
  listingEntries: (monthYear) => `Listando entradas para ${monthYear}...`,
  deletingEntryFor: (date, project) =>
    `Eliminando entrada para ${date} / ${project}...`,
  timeEntryLabel: "Entrada horaria:",
};

const locales: Record<Locale, Translations> = { de, en, fr, it, es };

// --- Module-level state ---

let currentLocale: Locale = "de";

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

/**
 * Auto-detect the Abacus UI locale from the page.
 * Reads document.documentElement.lang, falling back to matching known nav text.
 */
export async function detectLocale(page: Page): Promise<Locale> {
  const lang = await page.evaluate(() =>
    document.documentElement.lang?.toLowerCase()
  );

  if (lang) {
    const short = lang.split("-")[0] as Locale;
    if (short in locales) return short;
  }

  // Fallback: read the nav link's title attribute and match against known translations
  const navTitle = await page
    .locator('a[href^="proj_services"]')
    .getAttribute("title")
    .catch(() => null);

  if (navTitle) {
    for (const [locale, tr] of Object.entries(locales) as [Locale, Translations][]) {
      if (tr.navLeistungen === navTitle) return locale;
    }
  }

  return "de"; // default
}
