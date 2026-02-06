export default {
  nav: {
    home: 'Start',
    gettingStarted: 'Erste Schritte',
    commands: 'Befehle',
    configuration: 'Konfiguration',
    github: 'GitHub',
  },
  home: {
    title: 'abacus-cli',
    subtitle: 'Zeiteinträge in Abacus ERP automatisieren — direkt aus dem Terminal.',
    description: 'Ein CLI-Tool, das Abacus per Headless-Browser-Automatisierung steuert — weil Abacus keine API hat.',
    install: 'Loslegen',
    viewDocs: 'Dokumentation',
    features: {
      batch: {
        title: 'Batch-Erfassung',
        description: 'Eine ganze Woche Zeiteinträge mit einem einzigen Befehl ausfüllen. Unterstützt Bereichsfüllung, Datei-Import und Vorlagen.',
      },
      summary: {
        title: 'Wochenübersicht',
        description: 'Kompakte Wochenstatus-Anzeige — erfasste Stunden, Reststunden, fehlende Tage, Überstunden und Ferientage.',
      },
      shell: {
        title: 'Shell-Integration',
        description: 'Ein Einzeiler in der .zshrc genügt — und Sie werden bei jedem Terminal-Start an fehlende Zeiteinträge erinnert.',
      },
      i18n: {
        title: 'Mehrsprachig',
        description: 'Unterstützt Deutsch, Englisch, Französisch, Italienisch und Spanisch. Erkennt die Sprache automatisch oder lässt sich manuell setzen.',
      },
    },
    howItWorks: {
      title: 'So funktioniert es',
      step1: 'Login — Öffnet einen echten Browser für manuelles SSO/Login. Die Session wird lokal gespeichert.',
      step2: 'Automatisierung — Stellt die Session headless wieder her und navigiert durch Vaadins UI.',
      step3: 'Smarte Eingabe — Zeichen-für-Zeichen Combobox-Eingabe, Server-Roundtrip-Polling, Duplikaterkennung.',
      step4: 'Captcha-Fallback — Falls ein Captcha erscheint, öffnet sich der Browser zur manuellen Lösung und versucht es dann erneut.',
    },
  },
  gettingStarted: {
    title: 'Erste Schritte',
    description: 'Installieren Sie abacus-cli und erfassen Sie Ihren ersten Zeiteintrag in wenigen Minuten.',
    prerequisites: 'Voraussetzungen',
    installation: 'Installation',
    configuration: 'Konfiguration',
    firstLogin: 'Erster Login',
    firstEntry: 'Ihr erster Zeiteintrag',
    checkStatus: 'Status prüfen',
  },
  docs: {
    title: 'Befehlsreferenz',
    description: 'Vollständige Referenz aller abacus-cli-Befehle, Flags und Optionen.',
  },
  config: {
    title: 'Konfiguration',
    description: 'Umgebungsvariablen, Config-Befehl, Aliase, Spracheinstellungen und Session-Verwaltung.',
  },
  footer: {
    license: 'MIT-Lizenz',
  },
  meta: {
    homeDescription: 'CLI-Tool zur Automatisierung der Zeiterfassung in Abacus ERP per Browser-Automatisierung. Wochen batch-befüllen, Status-Zusammenfassungen abrufen und in die Shell integrieren.',
    gettingStartedDescription: 'Installieren Sie abacus-cli, konfigurieren Sie Ihre Abacus-ERP-Instanz und erfassen Sie Ihren ersten Zeiteintrag aus dem Terminal.',
    docsDescription: 'Vollständige Befehlsreferenz für abacus-cli — log, list, batch, delete, summary, check und mehr.',
    configDescription: 'Konfigurieren Sie abacus-cli mit Umgebungsvariablen, Aliasen, Spracheinstellungen und automatischer Session-Aktualisierung.',
  },
} as const;
