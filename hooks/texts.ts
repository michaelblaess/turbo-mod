// All texts shown in the pane and in the answers of /turbo, per language - without $ and therefore directly testable.

export const LANGUAGES = ['de', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

export type Texts = {
  files: string
  fileCount: (count: number) => string
  nothingWritten: string
  more: (count: number) => string
  range: (from: number, to: number, total: number) => string
  clearList: string
  open: string
  terminal: string
  noTerminal: string
  sheet: string
  confirmClose: string
  confirmRun: string
  compacted: string
  hostFailed: (what: string) => string
  /** Label per terminal command, keys as in platform.ts. */
  actions: Record<string, string>
  repos: string
  reposCount: (dirty: number, total: number) => string
  noFolder: string
  pickFolder: string
  addFolder: string
  fetchAll: string
  fetching: string
  pull: string
  pulled: (name: string) => string
  rootRemoved: (root: string) => string
  rootUnknown: (root: string) => string
  session: string
  context: string
  of: string
  resets: string
  cost: string
  /** Label per rate-limit window, keys as the host reports them. */
  limits: Record<string, string>
  noReading: string
  copyPath: string
  copyContent: string
  copied: (what: string) => string
  ticketSet: (url: string) => string
  ticketNone: string
  feed: string
  feedCount: (count: number, since: string) => string
  feedEmpty: string
  feedSet: (command: string) => string
  feedOff: string
  demoOn: string
  demoOff: string
  feedNone: string
  /** Notes of the feed, keys as in feed.ts and register.tsx. */
  feedNotes: Record<string, string>
  noticeTitle: string
  notice: string
  accept: string
  acceptFirst: string
  reread: string
  reading: string
  allClean: string
  unreadable: string
  /** Notes of the repo overview, keys as in ReposState.note. */
  notes: Record<string, string>
  /** Title of the folder dialog. No apostrophe, it sits inside a PowerShell string. */
  pickTitle: string
  colors: string
  commandDescription: string
  help: string
  hidden: string
  shown: (version: string) => string
  cleared: string
  effectOn: string
  effectOff: string
  themeList: (names: string) => string
  themeUnknown: (name: string) => string
  themeSet: (name: string) => string
  rootMissing: string
  reposResult: (total: number, root: string, dirty: number) => string
  languageSet: string
  languageUnknown: (name: string) => string
  runFailed: (what: string, program: string) => string
  pickFailed: (program: string) => string
}

const DE: Texts = {
  files: 'Dateien',
  fileCount: count => (count === 1 ? '1 Datei' : `${count} Dateien`),
  nothingWritten: 'Noch nichts geschrieben. Hier erscheint jede Datei, die Claude anlegt oder ändert.',
  more: count => `... und ${count} weitere`,
  range: (from, to, total) => `${from}-${to} von ${total}`,
  clearList: 'Liste leeren',
  open: 'öffnen',
  terminal: 'Terminal',
  noTerminal: 'Kein teilbares Terminal erkannt. Unterstützt sind Windows Terminal und tmux.',
  sheet: 'Spickzettel',
  confirmClose: 'Wirklich schließen?',
  confirmRun: 'Wirklich?',
  compacted: 'Gespräch zusammengefasst.',
  hostFailed: what => `${what} ließ sich von hier aus nicht starten. Tippe den Befehl in die Eingabe.`,
  actions: {
    'split-left': 'Split links',
    'split-right': 'Split rechts',
    'split-down': 'Split unten',
    'new-tab': 'Neuer Tab',
    'close-last': 'Letztes Pane schließen',
  },
  repos: 'Repos',
  reposCount: (dirty, total) => `${dirty} von ${total} mit Änderungen`,
  noFolder: 'Noch kein Ordner gesetzt.',
  pickFolder: 'Ordner wählen',
  addFolder: 'Ordner hinzufügen',
  fetchAll: 'alle fetchen',
  fetching: 'fetcht ...',
  pull: 'pull',
  pulled: name => `${name}: auf dem Stand des Servers.`,
  rootRemoved: root => `Repo-Ordner entfernt: ${root}`,
  rootUnknown: root => `Kein Repo-Ordner "${root}" gesetzt.`,
  session: 'Claude',
  context: 'Kontext',
  of: 'von',
  resets: 'Reset',
  cost: 'Kosten',
  limits: { five_hour: 'Aktuelle Sitzung', seven_day: 'Aktuelle Woche', spend_limit: 'Budget' },
  noReading: 'Noch keine Werte. Sie kommen nach der ersten Antwort.',
  copyPath: 'Pfad',
  copyContent: 'Inhalt',
  copied: what => `${what} liegt in der Zwischenablage.`,
  ticketSet: url => `Ticket-Adresse: ${url}`,
  ticketNone: 'Keine Ticket-Adresse gesetzt. Beispiel: /turbo ticket https://jira.example.com/browse/{id}',
  feed: 'Neue Tickets',
  feedCount: (count, since) => (since.length > 0 ? `${count} seit ${since}` : String(count)),
  feedEmpty: 'Keine neuen Tickets.',
  feedSet: command => `Neue Tickets kommen von: ${command}`,
  feedOff: 'Neue Tickets abgeschaltet.',
  demoOn: 'Beispieldaten eingeblendet, nichts davon ist echt. /turbo demo blendet sie wieder aus.',
  demoOff: 'Beispieldaten ausgeblendet.',
  feedNone: 'Kein Befehl gesetzt. /turbo feed <befehl> schaltet das Widget ein, /turbo feed aus schaltet es ab.',
  feedNotes: {
    'no-json': 'Der Befehl hat kein JSON ausgegeben.',
    'no-start': 'Der Befehl ließ sich nicht starten oder hat nicht geantwortet.',
  },
  noticeTitle: 'Disclaimer',
  notice:
    'Turbo-MOD startet Programme auf Deinem Rechner, führt auf Knopfdruck git fetch und git pull in Deinen Repos aus und kann einen von Dir eingestellten Befehl starten. Du nutzt den Mod auf eigene Verantwortung und ohne Gewähr, siehe Lizenz (Apache 2.0).',
  accept: 'Verstanden',
  acceptFirst: 'Bitte zuerst den Hinweis oben im Pane bestätigen.',
  reread: 'neu lesen',
  reading: 'liest ...',
  allClean: 'Alles sauber.',
  unreadable: 'nicht lesbar',
  notes: {
    unreadable: 'Der Ordner ist nicht lesbar.',
    empty: 'Keine Git-Repos in diesem Ordner.',
  },
  pickTitle: 'Ordner mit den Git-Repos',
  colors: 'Theme',
  commandDescription: 'Turbo-MOD: Pane ein- oder ausblenden, Farbschema, Sprache und Repo-Ordner setzen',
  help: [
    '/turbo                 Pane ein- oder ausblenden',
    '/turbo theme <name>    Farbschema wählen, ohne Namen: Liste',
    '/turbo repos <pfad>    Repo-Ordner hinzufügen, ohne Pfad: neu lesen',
    '/turbo repos entfernen <pfad>  Repo-Ordner wieder entfernen',
    '/turbo ticket <adresse>  Ticket-Adresse mit {id}, macht die Ticketnummer im Branch zum Link',
    '/turbo feed <befehl>   Widget Neue Tickets: Befehl, der die Tickets als JSON ausgibt, "aus" schaltet ab',
    '/turbo demo            Beispieldaten für ein Bildschirmfoto ein- oder ausblenden',
    '/turbo sprache <de|en> Sprache des Panes',
    '/turbo leeren          Liste der Dateien zurücksetzen',
    '/turbo effekt          Titeleffekt aus- oder einschalten',
  ].join('\n'),
  hidden: 'Turbo-MOD ausgeblendet. /turbo blendet ihn wieder ein.',
  shown: version => `Turbo-MOD ${version} eingeblendet.`,
  cleared: 'Liste der Dateien geleert.',
  effectOn: 'Titeleffekt läuft.',
  effectOff: 'Titeleffekt aus.',
  themeList: names => `Farbschemata: ${names}`,
  themeUnknown: name => `Kein Farbschema "${name}". /turbo theme zeigt die Liste.`,
  themeSet: name => `Farbschema: ${name}`,
  rootMissing: 'Kein Repo-Ordner gesetzt. /turbo repos <pfad> fügt einen hinzu.',
  reposResult: (total, root, dirty) => `${total} Repos unter ${root}, ${dirty} mit Änderungen.`,
  languageSet: 'Sprache: Deutsch',
  languageUnknown: name => `Keine Sprache "${name}". Es gibt de und en.`,
  runFailed: (what, program) => `${what}: ${program} ließ sich nicht starten oder hat nicht geantwortet.`,
  pickFailed: program =>
    `Ordnerauswahl: ${program} ließ sich nicht starten. /turbo repos <pfad> setzt den Ordner von Hand.`,
}

const EN: Texts = {
  files: 'Files',
  fileCount: count => (count === 1 ? '1 file' : `${count} files`),
  nothingWritten: 'Nothing written yet. Every file Claude creates or changes shows up here.',
  more: count => `... and ${count} more`,
  range: (from, to, total) => `${from}-${to} of ${total}`,
  clearList: 'clear list',
  open: 'open',
  terminal: 'Terminal',
  noTerminal: 'No splittable terminal found. Windows Terminal and tmux are supported.',
  sheet: 'cheat sheet',
  confirmClose: 'Really close?',
  confirmRun: 'Really?',
  compacted: 'Conversation compacted.',
  hostFailed: what => `${what} could not be started from here. Type the command at the prompt.`,
  actions: {
    'split-left': 'Split left',
    'split-right': 'Split right',
    'split-down': 'Split down',
    'new-tab': 'New tab',
    'close-last': 'Close last pane',
  },
  repos: 'Repos',
  reposCount: (dirty, total) => `${dirty} of ${total} with changes`,
  noFolder: 'No folder set yet.',
  pickFolder: 'choose folder',
  addFolder: 'add folder',
  fetchAll: 'fetch all',
  fetching: 'fetching ...',
  pull: 'pull',
  pulled: name => `${name}: up to date with the server.`,
  rootRemoved: root => `Repo folder removed: ${root}`,
  rootUnknown: root => `No repo folder "${root}" set.`,
  session: 'Claude',
  context: 'Context',
  of: 'of',
  resets: 'Resets',
  cost: 'Cost',
  limits: { five_hour: 'Current session', seven_day: 'Current week', spend_limit: 'Budget' },
  noReading: 'No figures yet. They arrive after the first answer.',
  copyPath: 'path',
  copyContent: 'content',
  copied: what => `${what} is on the clipboard.`,
  ticketSet: url => `Ticket address: ${url}`,
  ticketNone: 'No ticket address set. Example: /turbo ticket https://jira.example.com/browse/{id}',
  feed: 'New tickets',
  feedCount: (count, since) => (since.length > 0 ? `${count} since ${since}` : String(count)),
  feedEmpty: 'No new tickets.',
  feedSet: command => `New tickets come from: ${command}`,
  feedOff: 'New tickets switched off.',
  demoOn: 'Sample data shown, none of it is real. /turbo demo hides it again.',
  demoOff: 'Sample data hidden.',
  feedNone: 'No command set. /turbo feed <command> switches the widget on, /turbo feed off switches it off.',
  feedNotes: {
    'no-json': 'The command did not print JSON.',
    'no-start': 'The command could not be started or did not answer.',
  },
  noticeTitle: 'Disclaimer',
  notice:
    'Turbo-MOD starts programs on your machine, runs git fetch and git pull in your repos when you press the buttons, and can start a command you have set. You use the mod at your own risk and without warranty, see the license (Apache 2.0).',
  accept: 'Understood',
  acceptFirst: 'Please confirm the notice at the top of the pane first.',
  reread: 'refresh',
  reading: 'reading ...',
  allClean: 'All clean.',
  unreadable: 'unreadable',
  notes: {
    unreadable: 'The folder cannot be read.',
    empty: 'No git repos in this folder.',
  },
  pickTitle: 'Folder with the git repos',
  colors: 'Theme',
  commandDescription: 'Turbo-MOD: show or hide the pane, set color scheme, language and repo folder',
  help: [
    '/turbo                  show or hide the pane',
    '/turbo theme <name>     pick a color scheme, without a name: the list',
    '/turbo repos <path>     add a repo folder, without a path: refresh',
    '/turbo repos remove <path>  remove a repo folder again',
    '/turbo ticket <address>  ticket address with {id}, turns the ticket key in a branch into a link',
    '/turbo feed <command>   widget New tickets: command that prints the tickets as JSON, "off" switches it off',
    '/turbo demo             show or hide sample data for a screenshot',
    '/turbo lang <de|en>     language of the pane',
    '/turbo clear            reset the list of files',
    '/turbo effect           switch the title effect off or on',
  ].join('\n'),
  hidden: 'Turbo-MOD hidden. /turbo shows it again.',
  shown: version => `Turbo-MOD ${version} shown.`,
  cleared: 'List of files cleared.',
  effectOn: 'Title effect is running.',
  effectOff: 'Title effect is off.',
  themeList: names => `Color schemes: ${names}`,
  themeUnknown: name => `No color scheme "${name}". /turbo theme shows the list.`,
  themeSet: name => `Color scheme: ${name}`,
  rootMissing: 'No repo folder set. /turbo repos <path> adds one.',
  reposResult: (total, root, dirty) => `${total} repos under ${root}, ${dirty} with changes.`,
  languageSet: 'Language: English',
  languageUnknown: name => `No language "${name}". There are de and en.`,
  runFailed: (what, program) => `${what}: ${program} could not be started or did not answer.`,
  pickFailed: program => `Folder dialog: ${program} could not be started. /turbo repos <path> sets the folder by hand.`,
}

const ALL: Record<Lang, Texts> = { de: DE, en: EN }

/** Finds a language by its code, ignoring case. */
export const findLanguage = (name: string): Lang | undefined => {
  const wanted = name.trim().toLowerCase()

  return LANGUAGES.find(one => one === wanted)
}

export const textsFor = (lang: string): Texts => ALL[findLanguage(lang) ?? 'en']
