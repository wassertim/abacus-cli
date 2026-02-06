import type { Translations } from "..";

export const es: Translations = {
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
  statusDaysUnit: "d",
  hintQuickActions: "Acciones rápidas",
  hintLogSingle: "Registrar un solo día:",
  hintBatchFill: "Registrar todos los días faltantes:",
  hintBatchGenerate: "Generar plantilla y personalizar por día:",

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

  // Summary / check
  summaryLine1: (weekNum, worked, target, remaining, missingDays) =>
    `Sem. ${weekNum} · ${worked} / ${target}h · ${remaining}h restante${missingDays ? ` · ${missingDays} faltante` : ""}`,
  summaryLine2: (overtime, overtimeDays, vacationDays) =>
    `Horas extra: ${overtime}h (${overtimeDays}d) · Vacaciones: ${vacationDays}d restante`,
  summaryUpdatedAgo: (ago) => `(actualizado hace ${ago})`,
  summaryFetching: "Obteniendo estado...",
  checkWarning: (missingDays, remaining) => `Abacus: ${missingDays} no registrado — ${remaining}h restante esta semana`,
  checkReminder: "¿Registraste tus horas esta semana? Verifica con: abacus summary",
  timeAgoMinutes: (n) => `${n}min`,
  timeAgoHours: (n) => `${n}h`,
  timeAgoDays: (n) => `${n}d`,
};
