import type { Translations } from "..";

export const fr: Translations = {
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
  statusDaysUnit: "j",
  hintQuickActions: "Actions rapides",
  hintLogSingle: "Réserver un seul jour :",
  hintBatchFill: "Réserver tous les jours manquants :",
  hintBatchGenerate: "Générer un modèle & personnaliser par jour :",

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

  // Summary / check
  summaryLine1: (weekNum, worked, target, remaining, missingDays) =>
    `Sem. ${weekNum} · ${worked} / ${target}h · ${remaining}h restant${missingDays ? ` · ${missingDays} manquant` : ""}`,
  summaryLine2: (overtime, overtimeDays, vacationDays) =>
    `Heures sup.: ${overtime}h (${overtimeDays}j) · Vacances: ${vacationDays}j restant`,
  summaryUpdatedAgo: (ago) => `(mis à jour il y a ${ago})`,
  summaryFetching: "Récupération du statut...",
  checkWarning: (missingDays, remaining) => `Abacus: ${missingDays} non enregistré — ${remaining}h restant cette semaine`,
  checkReminder: "Avez-vous enregistré vos heures cette semaine ? Vérifiez avec : abacus summary",
  timeAgoMinutes: (n) => `${n}min`,
  timeAgoHours: (n) => `${n}h`,
  timeAgoDays: (n) => `${n}j`,
};
