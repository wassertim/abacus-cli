export default {
  nav: {
    home: 'Home',
    gettingStarted: 'Getting Started',
    commands: 'Commands',
    configuration: 'Configuration',
    github: 'GitHub',
  },
  home: {
    title: 'abacus-cli',
    subtitle: 'Automate time entries in Abacus ERP from the command line.',
    description: 'A CLI tool that drives Abacus via headless browser automation — because Abacus has no API.',
    install: 'Get Started',
    viewDocs: 'Read the Docs',
    features: {
      batch: {
        title: 'Batch Fill',
        description: 'Fill an entire week of time entries with a single command. Supports range fill, file import, and template generation.',
      },
      summary: {
        title: 'Weekly Summary',
        description: 'Compact weekly status at a glance — hours logged, remaining hours, missing days, overtime, and vacation balance.',
      },
      shell: {
        title: 'Shell Integration',
        description: 'Add a one-liner to your .zshrc and get reminded about missing time entries every time you open a terminal.',
      },
      i18n: {
        title: 'Multi-Language',
        description: 'Supports German, English, French, Italian, and Spanish. Auto-detects your locale or set it explicitly.',
      },
    },
    howItWorks: {
      title: 'How it works',
      step1: 'Log in once in a real browser window. Your session is saved locally.',
      step2: 'Run any command — it opens a headless browser, restores your session, and does the work.',
      step3: 'Existing entries are detected automatically so you don\'t create duplicates.',
      step4: 'If your company uses a captcha, the browser reopens so you can solve it, then continues.',
    },
  },
  gettingStarted: {
    title: 'Getting Started',
    description: 'Install abacus-cli and log your first time entry in minutes.',
    prerequisites: 'Prerequisites',
    installation: 'Installation',
    configuration: 'Configuration',
    firstLogin: 'First Login',
    firstEntry: 'Your First Time Entry',
    checkStatus: 'Check Your Status',
  },
  docs: {
    title: 'Commands Reference',
    description: 'Complete reference for all abacus-cli commands, flags, and options.',
  },
  config: {
    title: 'Configuration',
    description: 'Environment variables, config command, aliases, locale settings, and session management.',
  },
  footer: {
    license: 'MIT License',
  },
  meta: {
    homeDescription: 'CLI tool for automating time entry logging in Abacus ERP via browser automation. Batch fill weeks, get status summaries, and integrate with your shell.',
    gettingStartedDescription: 'Install abacus-cli, configure your Abacus ERP instance, and log your first time entry from the terminal.',
    docsDescription: 'Complete command reference for abacus-cli — log, list, batch, delete, summary, check, and more.',
    configDescription: 'Configure abacus-cli with environment variables, aliases, locale settings, and automatic session refresh.',
  },
} as const;
