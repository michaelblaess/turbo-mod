import type { EngineInterface, PluginOptions, Register } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { FeedState, FileEntry, HostInfo, RepoEntry, ReposState, UsageState } from '../types'
import type { EffectName } from './effects'
import { EFFECTS, effectFrame } from './effects'
import { demoState } from './demo'
import { parseFeed } from './feed'
import {
  barCells,
  dotsFor,
  fileHref,
  formatClock,
  formatDay,
  formatReset,
  formatSize,
  formatStamp,
  formatTokens,
  formatUsd,
  shortenDir,
  splitPath,
  ticketHref,
  ticketOf,
  workingLabel,
} from './format'
import { FETCH_ARGV, isClean, PULL_ARGV, parseStatus, repoCounts, STATUS_ARGV, sortRepos } from './git'
import {
  CHEAT_SHEET,
  CLAUDE_SHEET,
  copyFileArgv,
  copyTextArgv,
  detectHost,
  isPath,
  joinPath,
  openDefaultArgv,
  openEditorArgv,
  pickFolderArgv,
  splitCommand,
  splitRoots,
  terminalActions,
  whereArgv,
} from './platform'
import type { Lang } from './texts'
import { findLanguage, LANGUAGES, textsFor } from './texts'
import { findTheme, lookFor, STANDARD, themeNames } from './theme'

// Must match the version in .claude-plugin/plugin.json
const VERSION = '0.13.0'

const PANE = 'turbo-mod'
const PANE_TITLE = 'Turbo-MOD'
const COMMAND = 'turbo'
// U+265E is the knight from the chess symbols
const TITLE = '♞ Turbo-MOD'
const AUTHOR = '(c) 2026 Michael Blaess'
const AUTHOR_URL = 'https://www.michaelblaess.de'
const TAGLINE = ' · Open Source @ 16 MHz'
const REPO_URL = 'https://github.com/michaelblaess/turbo-mod'
// Share of the terminal width the pane gets (Claude 80 %, pane 20 %)
const SHARE = 0.2
const MIN_COLUMNS = 30
const MAX_FILES = 200
const MAX_REPOS = 80
// Tools that write a file and carry its path in the call
const WRITERS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']
const TITLE_FRAMES = 14
const TITLE_FRAME_MS = 70
// One second of rest between two runs
const TITLE_PAUSE_TICKS = Math.round(1000 / TITLE_FRAME_MS)
const REPOS_EVERY_MS = 120000
const PULSE_EVERY_MS = 350
const USAGE_EVERY_MS = 60000
// The feed asks a ticket system, so it runs rarely
const FEED_EVERY_MS = 600000
const FEED_TIMEOUT_MS = 30000
const MAX_FEED_ROWS = 8
const RUN_TIMEOUT_MS = 10000
// Fetch and pull talk to a server
const NET_TIMEOUT_MS = 60000
const PICK_TIMEOUT_MS = 300000
const ARMED_MS = 5000
// The three splits share one row, each as an arrow in the direction the new pane opens
const SPLIT_SYMBOLS: Record<string, string> = {
  'split-left': '[←]',
  'split-right': '[→]',
  'split-down': '[↓]',
}

const NO_REPOS: ReposState = {
  roots: [],
  list: [],
  checkedAt: 0,
  isBusy: false,
  isFetching: false,
  pulling: '',
  note: '',
}
const NO_HOST: HostInfo = { os: 'linux', terminal: 'none' }
const NO_FEED: FeedState = { command: '', list: [], since: '', checkedAt: 0, isBusy: false, note: '' }
const NO_USAGE: UsageState = { measuredAt: 0, tokens: 0, window: 0, limits: [], usd: -1 }

const files = atom({ plugin: 'turbo-mod', key: 'files' } as const, [] as FileEntry[])
// The repo overview starts collapsed so that git does not run unasked
const collapsed = atom({ plugin: 'turbo-mod', key: 'collapsed' } as const, { repos: true } as Record<string, boolean>)
const repos = atom({ plugin: 'turbo-mod', key: 'repos' } as const, NO_REPOS)
const host = atom({ plugin: 'turbo-mod', key: 'host' } as const, NO_HOST)
const theme = atom({ plugin: 'turbo-mod', key: 'theme' } as const, STANDARD)
const title = atom({ plugin: 'turbo-mod', key: 'title' } as const, TITLE)
const filePage = atom({ plugin: 'turbo-mod', key: 'filePage' } as const, 0)
const pulse = atom({ plugin: 'turbo-mod', key: 'pulse' } as const, 0)
const accepted = atom({ plugin: 'turbo-mod', key: 'accepted' } as const, false)
const ready = atom({ plugin: 'turbo-mod', key: 'ready' } as const, false)
const armed = atom({ plugin: 'turbo-mod', key: 'armed' } as const, '')
const lang = atom({ plugin: 'turbo-mod', key: 'lang' } as const, '')
const editorPath = atom({ plugin: 'turbo-mod', key: 'editorPath' } as const, '')
const usage = atom({ plugin: 'turbo-mod', key: 'usage' } as const, NO_USAGE)
const ticketUrl = atom({ plugin: 'turbo-mod', key: 'ticketUrl' } as const, '')
const feed = atom({ plugin: 'turbo-mod', key: 'feed' } as const, NO_FEED)

// Applies per module load: after a reload the timers are gone and the start runs again
let isStarted = false
let isRestoring = false
let isTitleLooping = true
// While sample data is shown, nothing real may be read or written into the pane
let isDemo = false
let beforeDemo:
  | { files: FileEntry[]; repos: ReposState; feed: FeedState; usage: UsageState; collapsed: Record<string, boolean> }
  | undefined
// The language from the options, it applies until the start has read the remembered choice
let optionLanguage: Lang = 'en'

const languageNow = async ($: EngineInterface): Promise<Lang> => findLanguage(await read($, lang)) ?? optionLanguage

const pathOf = (e: unknown): string | undefined => {
  const input = e as { file_path?: unknown; notebook_path?: unknown }
  const path = input.file_path ?? input.notebook_path

  return typeof path === 'string' && path.length > 0 ? path : undefined
}

const wantedColumns = (terminalColumns: number): number => Math.max(MIN_COLUMNS, Math.round(terminalColumns * SHARE))

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const isPaneUp = async ($: EngineInterface): Promise<boolean> =>
  (await $.ui.panes()).some(pane => pane.id === PANE && pane.isPlaced)

type Reading = {
  context: { tokens?: number; window: number; percent?: number }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

/** Keeps what the host measured: context window, rate-limit windows and cost. */
const keepUsage = async ($: EngineInterface, reading: Reading): Promise<void> => {
  if (isDemo) return

  const measuredAt = await $.clock.now()
  const window = reading.context.window
  // Some hosts report only the share, some only the tokens
  const tokens = reading.context.tokens ?? Math.round(((reading.context.percent ?? 0) / 100) * window)
  await update($, usage, () => ({
    measuredAt,
    tokens,
    window,
    limits: reading.rateLimits.map(one => ({
      kind: one.kind,
      percentUsed: one.percentUsed,
      resetsAt: one.resetsAt ?? '',
    })),
    usd: reading.cost?.usd ?? -1,
  }))
}

/** True once the notice of the first start is confirmed, otherwise says so in a toast. */
const isAccepted = async ($: EngineInterface): Promise<boolean> => {
  if ((await read($, accepted)) === true) return true
  $.ui.toast(textsFor(await languageNow($)).acceptFirst)

  return false
}

/** Runs the feed command and keeps the tickets it prints. */
const refreshFeed = async ($: EngineInterface): Promise<void> => {
  if (isDemo) return

  const before = (await read($, feed)) ?? NO_FEED
  const argv = splitCommand(before.command)
  if (argv.length === 0 || before.isBusy) return
  if (!(await isAccepted($))) return

  await update($, feed, now => ({ ...now, isBusy: true }))
  const result = await $.process.run(argv, { timeoutMs: FEED_TIMEOUT_MS }).catch(() => undefined)
  const checkedAt = await $.clock.now()
  // A feed may end with an error code and still say why in its JSON
  const parsed = result === undefined ? { list: [], since: '', note: 'no-start' } : parseFeed(result.stdout)
  await update($, feed, now => ({ ...now, ...parsed, checkedAt, isBusy: false }))
}

/** Sets the feed command for this machine. An empty command switches the widget off. */
const setFeed = async ($: EngineInterface, command: string): Promise<void> => {
  await update($, feed, () => ({ ...NO_FEED, command }))
  await $.store.set('feedCommand', command)
  if (command.length > 0) {
    await update($, collapsed, now => ({ ...now, feed: false }))
    await refreshFeed($)
  }
}

/**
 * Shows or hides sample data. What the pane showed before is kept and comes back, the
 * figures of the session are read again right away.
 */
const toggleDemo = async ($: EngineInterface): Promise<boolean> => {
  if (isDemo) {
    isDemo = false
    const kept = beforeDemo
    beforeDemo = undefined
    if (kept !== undefined) {
      await update($, files, () => kept.files)
      await update($, repos, () => kept.repos)
      await update($, feed, () => kept.feed)
      await update($, usage, () => kept.usage)
      await update($, collapsed, () => kept.collapsed)
    }
    await readUsage($)

    return false
  }

  beforeDemo = {
    files: await read($, files),
    repos: await read($, repos),
    feed: (await read($, feed)) ?? NO_FEED,
    usage: (await read($, usage)) ?? NO_USAGE,
    collapsed: await read($, collapsed),
  }
  const sample = demoState(await $.clock.now())
  isDemo = true
  await update($, files, () => sample.files)
  await update($, repos, () => sample.repos)
  await update($, feed, () => sample.feed)
  await update($, usage, () => sample.usage)
  // Everything open, so one screenshot shows every widget
  await update($, collapsed, () => ({ files: false, terminal: false, repos: false, feed: false, session: false }))

  return true
}

/** Asks the host for its current figures. Costs no request, the host has them at hand. */
const readUsage = async ($: EngineInterface): Promise<void> => {
  const reading = await $.session.usage().catch(() => undefined)
  if (reading !== undefined) await keepUsage($, reading).catch(() => undefined)
}

/**
 * True on the second press of a button within a few seconds, the first press only arms it.
 * For everything that cannot be undone.
 */
const isSecondPress = async ($: EngineInterface, key: string): Promise<boolean> => {
  if ((await read($, armed)) === key) {
    await update($, armed, () => '')

    return true
  }

  await update($, armed, () => key)
  $.clock.after(ARMED_MS, () => {
    void update($, armed, now => (now === key ? '' : now))
  })

  return false
}

/** Compacts the conversation as /compact does, then reads the figures again. */
const compactSession = async ($: EngineInterface): Promise<void> => {
  const t = textsFor(await languageNow($))
  const result = await $.session.compact().catch(() => undefined)
  if (result === undefined) $.ui.toast(t.hostFailed('/compact'))
  // The host says why it did not compact, for example when there is nothing to compact yet
  else $.ui.toast(typeof result.skip === 'string' ? `/compact: ${result.skip}` : t.compacted)
  await readUsage($)
}

/** Starts a fresh conversation as /clear does. */
const clearSession = async ($: EngineInterface): Promise<void> => {
  const result = await $.command.run({ command: 'clear' }).catch(() => undefined)
  if (result === undefined) $.ui.toast(textsFor(await languageNow($)).hostFailed('/clear'))
}

/** Starts a program on the machine and shows a toast if that fails. True if it ran without complaint. */
const run = async ($: EngineInterface, argv: readonly string[], what: string): Promise<boolean> => {
  const result = await $.process.run(argv, { timeoutMs: RUN_TIMEOUT_MS }).catch(() => undefined)
  if (result === undefined) {
    $.ui.toast(textsFor(await languageNow($)).runFailed(what, argv[0] ?? ''))

    return false
  }

  // explorer.exe returns 1 even on success, so only an error message counts
  const complaint = result.stderr.trim().split('\n')[0] ?? ''
  if (result.exitCode !== 0 && complaint.length > 0) {
    $.ui.toast(`${what}: ${complaint}`)

    return false
  }

  return true
}

/**
 * Looks up the full path of the editor. A new pane inherits the environment of the terminal, where
 * the editor's folder is sometimes missing from PATH even though Claude Code knows it.
 */
const findEditor = async ($: EngineInterface, hostInfo: HostInfo, editor: string): Promise<string> => {
  if (isPath(editor)) {
    const stat = await $.fs.stat(editor).catch(() => undefined)

    return stat !== undefined && stat.kind === 'file' ? editor : ''
  }

  const found = await $.process.run(whereArgv(hostInfo, editor), { timeoutMs: RUN_TIMEOUT_MS }).catch(() => undefined)
  if (found === undefined || found.exitCode !== 0) return ''

  return (found.stdout.split('\n')[0] ?? '').trim()
}

/** The root folders of a state. A state kept from before 0.6.0 has one `root` and no `roots`. */
const rootsOf = (state: ReposState): string[] => {
  const old = (state as { root?: unknown }).root

  return Array.isArray(state.roots) ? state.roots : typeof old === 'string' && old.length > 0 ? [old] : []
}

/** Reads the state of one repo from `git status`. */
const readRepo = async ($: EngineInterface, root: string, dir: string, name: string): Promise<RepoEntry> => {
  const status = await $.process.run(STATUS_ARGV, { cwd: dir, timeoutMs: RUN_TIMEOUT_MS }).catch(() => undefined)

  return status === undefined || status.exitCode !== 0
    ? { root, dir, name, branch: '?', ahead: 0, behind: 0, changed: 0, untracked: 0, isRead: false }
    : parseStatus(name, status.stdout, root, dir)
}

/**
 * Reads the state of all git repos under the root folders. Contacts no server, unless `isFetching`
 * asks for a `git fetch` in every repo first.
 */
const refreshRepos = async ($: EngineInterface, isFetching = false): Promise<void> => {
  if (isDemo) return

  const before = await read($, repos)
  const roots = rootsOf(before)
  if (roots.length === 0 || before.isBusy) return
  // Reading the local state is plain display, only the fetch talks to a server
  if (isFetching && !(await isAccepted($))) return

  await update($, repos, now => ({ ...now, isBusy: true, isFetching, note: '' }))
  const list: RepoEntry[] = []
  let unreadable = 0
  for (const root of roots) {
    const entries = await $.fs.list(root).catch(() => undefined)
    if (entries === undefined) {
      unreadable += 1
      continue
    }

    for (const entry of entries.filter(one => one.kind === 'dir').slice(0, MAX_REPOS)) {
      const dir = joinPath(root, entry.name)
      // .git is a file in a worktree, otherwise a folder
      const marker = await $.fs.stat(joinPath(dir, '.git')).catch(() => undefined)
      if (marker === undefined || marker.kind === 'other') continue

      // A failed fetch (no remote, no network) leaves the counters as they were
      if (isFetching) await $.process.run(FETCH_ARGV, { cwd: dir, timeoutMs: NET_TIMEOUT_MS }).catch(() => undefined)
      list.push(await readRepo($, root, dir, entry.name))
    }
  }

  const checkedAt = await $.clock.now()
  await update($, repos, now => ({
    ...now,
    isBusy: false,
    isFetching: false,
    list: sortRepos(list),
    checkedAt,
    note: unreadable === roots.length ? 'unreadable' : list.length === 0 ? 'empty' : '',
  }))
}

/** Fetches one repo and pulls it fast-forward only, then reads its state again. */
const pullRepo = async ($: EngineInterface, repo: RepoEntry): Promise<void> => {
  if (isDemo) return

  const before = await read($, repos)
  if (before.isBusy || (before.pulling ?? '').length > 0) return
  if (!(await isAccepted($))) return

  await update($, repos, now => ({ ...now, pulling: repo.dir }))
  const t = textsFor(await languageNow($))
  const result = await $.process.run(PULL_ARGV, { cwd: repo.dir, timeoutMs: NET_TIMEOUT_MS }).catch(() => undefined)
  if (result === undefined) {
    $.ui.toast(t.runFailed(`${repo.name}: pull`, 'git'))
  } else if (result.exitCode !== 0) {
    // git says why: diverged branches, local changes in the way, no upstream
    $.ui.toast(`${repo.name}: ${result.stderr.trim().split('\n')[0] ?? 'git pull'}`)
  } else {
    $.ui.toast(t.pulled(repo.name))
  }

  const after = await readRepo($, repo.root, repo.dir, repo.name)
  await update($, repos, now => ({
    ...now,
    pulling: '',
    list: sortRepos(now.list.map(one => (one.dir === repo.dir ? after : one))),
  }))
}

/** Sets the repo folders for this machine, expands the widget and reads. */
const setReposRoots = async ($: EngineInterface, roots: string[]): Promise<void> => {
  await update($, repos, now => ({ ...now, roots, list: [], checkedAt: 0, note: '' }))
  await $.store.set('reposRoots', roots)
  await update($, collapsed, now => ({ ...now, repos: false }))
  await refreshRepos($)
}

const addReposRoot = async ($: EngineInterface, root: string): Promise<void> => {
  const roots = rootsOf(await read($, repos))
  await setReposRoots($, roots.includes(root) ? roots : [...roots, root])
}

/** Shows the folder dialog and takes the choice as the repo folder. */
const pickReposRoot = async ($: EngineInterface): Promise<void> => {
  const t = textsFor(await languageNow($))
  const argv = pickFolderArgv(await read($, host), t.pickTitle)
  const result = await $.process.run(argv, { timeoutMs: PICK_TIMEOUT_MS }).catch(() => undefined)
  if (result === undefined) {
    $.ui.toast(t.pickFailed(argv[0] ?? ''))

    return
  }

  // Cancelled means: nothing printed
  const root = result.stdout.trim()
  if (root.length > 0) await addReposRoot($, root)
}

/** Switches to the next or previous color scheme and remembers it for this machine. */
const stepTheme = async ($: EngineInterface, step: number): Promise<void> => {
  const names = themeNames()
  const current = Math.max(0, names.indexOf(await read($, theme)))
  const next = names[(current + step + names.length) % names.length] ?? STANDARD
  await update($, theme, () => next)
  await $.store.set('theme', next)
}

/** Changes the language and remembers it for this machine. */
const setLanguage = async ($: EngineInterface, language: Lang): Promise<void> => {
  await update($, lang, () => language)
  await $.store.set('lang', language)
}

/** Switches to the next language. */
const stepLanguage = async ($: EngineInterface): Promise<void> => {
  const current = Math.max(0, LANGUAGES.indexOf(await languageNow($)))
  await setLanguage($, LANGUAGES[(current + 1) % LANGUAGES.length] ?? 'en')
}

/**
 * Runs the title through an effect at intervals: effect, one second of rest, next effect.
 * While the pane is not visible, the loop rests.
 */
const startTitleLoop = ($: EngineInterface): void => {
  let tick = 0
  let seed = 1
  let effect: EffectName = 'decrypt'
  let isVisible = false
  // Writes one frame after the other so that no late frame overtakes an earlier one
  let queue: Promise<unknown> = Promise.resolve()
  const show = (text: string): void => {
    queue = queue.then(() => update($, title, () => text)).catch(() => undefined)
  }

  $.clock.every(TITLE_FRAME_MS, () => {
    const position = tick % (TITLE_FRAMES + TITLE_PAUSE_TICKS)
    tick += 1

    if (position === 0) {
      seed += 1
      // Never the same effect twice in a row
      const others = EFFECTS.filter(one => one !== effect)
      effect = others[Math.floor(Math.random() * others.length)] ?? 'decrypt'
      void isPaneUp($)
        .then(isUp => {
          isVisible = isUp
        })
        .catch(() => undefined)
    }

    if (!isTitleLooping || !isVisible || position > TITLE_FRAMES) return

    show(position === TITLE_FRAMES ? TITLE : effectFrame(effect, TITLE, position, TITLE_FRAMES, seed))
  })
}

/**
 * Brings the session state back from the store, the options and the environment. Runs again
 * whenever the host has dropped the state, which a /clear does without loading the mod anew.
 */
const restore = async ($: EngineInterface, options: PluginOptions): Promise<void> => {
  // Each step may fail on its own, the rest of the start still runs
  const stored = async (key: string): Promise<string> => textOf(await $.store.get(key).catch(() => undefined))
  const language = findLanguage(await stored('lang')) ?? optionLanguage
  await update($, lang, () => language)

  await $.command
    .register({
      name: COMMAND,
      description: textsFor(language).commandDescription,
      argumentHint:
        '[theme <name> | repos [remove] <path> | ticket <url> | feed <command> | lang <de|en> | clear | effect | demo]',
    })
    .catch(() => undefined)

  const os = await $.env.get('OS').catch(() => undefined)
  const wtSession = await $.env.get('WT_SESSION').catch(() => undefined)
  const tmux = await $.env.get('TMUX').catch(() => undefined)
  const uname =
    (os ?? '').toLowerCase() === 'windows_nt'
      ? undefined
      : await $.process
          .run(['uname', '-s'])
          .then(result => result.stdout)
          .catch(() => undefined)
  const detected = detectHost({ os, wtSession, tmux }, uname)
  await update($, host, () => detected)

  const found = await findEditor($, detected, textOf(options.editor) || 'nvim').catch(() => '')
  await update($, editorPath, () => found)

  // What /turbo has set on this machine takes precedence over the options and the environment
  const chosen = findTheme(await stored('theme')) ?? findTheme(textOf(options.theme)) ?? STANDARD
  await update($, theme, () => chosen)
  const kept = await $.store.get('reposRoots').catch(() => undefined)
  const roots = Array.isArray(kept)
    ? kept.filter((one): one is string => typeof one === 'string' && one.length > 0)
    : splitRoots(
        // Before 0.6.0 there was one folder under the key reposRoot
        (await stored('reposRoot')) ||
          textOf(options.reposRoot) ||
          textOf(await $.env.get('TURBO_MOD_REPOS').catch(() => undefined)),
      )
  await update($, repos, now => ({ ...now, roots, isBusy: false, isFetching: false, pulling: '' }))
  const tickets = (await stored('ticketUrl')) || textOf(options.ticketUrl)
  await update($, ticketUrl, () => tickets)
  const feedCommand = (await stored('feedCommand')) || textOf(options.ticketFeed)
  await update($, feed, now => ({ ...NO_FEED, ...now, command: feedCommand, isBusy: false }))
  // Only ever switches on: a click that came before the end of the start must not be undone
  if ((await stored('accepted')) === 'yes') await update($, accepted, () => true)
  await readUsage($)
  isTitleLooping = (await stored('effect')) !== 'aus'
  await update($, armed, () => '')
  await update($, title, () => TITLE)
  await update($, ready, () => true)
}

/** The timers of the mod. They survive a /clear, so they start once per module load. */
const startTimers = ($: EngineInterface): void => {
  startTitleLoop($)
  // The dots behind a busy label move only while something is being read
  $.clock.every(PULSE_EVERY_MS, () => {
    void (async () => {
      const repoState = await read($, repos)
      const feedState = (await read($, feed)) ?? NO_FEED
      const isWorking = repoState.isBusy || (repoState.pulling ?? '').length > 0 || feedState.isBusy
      if (isWorking) await update($, pulse, now => (now + 1) % 3)
    })().catch(() => undefined)
  })
  $.clock.every(FEED_EVERY_MS, () => {
    void (async () => {
      const isFolded = (await read($, collapsed)).feed ?? true
      // Without the confirmation the timer stays quiet instead of raising a toast every time
      const isConfirmed = (await read($, accepted)) === true
      if (isConfirmed && !isFolded && (await isPaneUp($))) await refreshFeed($)
    })().catch(() => undefined)
  })
  // The host reports after every answer. In between, a look once a minute keeps the reset times fresh.
  $.clock.every(USAGE_EVERY_MS, () => {
    void (async () => {
      const isFolded = (await read($, collapsed)).session ?? false
      if (!isFolded && (await isPaneUp($))) await readUsage($)
    })().catch(() => undefined)
  })
  $.clock.every(REPOS_EVERY_MS, () => {
    void (async () => {
      const isFolded = (await read($, collapsed)).repos ?? false
      if (!isFolded && (await isPaneUp($))) await refreshRepos($)
    })().catch(() => undefined)
  })
}

/**
 * Runs on session.start and, because that does not fire after reloading the mod, resuming a
 * session or a /clear, also on every render and before every command. Does nothing while the
 * state is in place.
 */
const start = async ($: EngineInterface, options: PluginOptions): Promise<void> => {
  if (isRestoring) return
  if (isStarted && (await read($, ready)) === true) return

  isRestoring = true
  try {
    await restore($, options)
    if (!isStarted) {
      isStarted = true
      startTimers($)
    }
  } finally {
    isRestoring = false
  }
}

export const register: Register = (on, options) => {
  optionLanguage = findLanguage(textOf(options.language)) ?? 'en'
  const editorName = splitPath(textOf(options.editor) || 'nvim').name.replace(/\.exe$/i, '')

  on('session.start', async ($, e, next) => {
    await start($, options)
    // Opened unasked, the pane only appears from 144 columns on, below that via /turbo
    void $.ui.open({ id: PANE, title: PANE_TITLE })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    await start($, options)
    const t = textsFor(await languageNow($))
    const args = e.args.trim()
    const verb = (args.split(/\s+/)[0] ?? '').toLowerCase()
    const argument = args.slice(verb.length).trim()

    if (verb === '') {
      if (await isPaneUp($)) {
        await $.ui.close({ id: PANE })

        return { text: t.hidden }
      }

      await $.ui.open({ id: PANE, title: PANE_TITLE, columns: wantedColumns(e.presentation.columns) })

      return { text: t.shown(VERSION) }
    }

    if (verb === 'demo') {
      return { text: (await toggleDemo($)) ? t.demoOn : t.demoOff }
    }

    if (verb === 'leeren' || verb === 'clear') {
      await update($, files, () => [])

      return { text: t.cleared }
    }

    if (verb === 'effekt' || verb === 'effect') {
      isTitleLooping = !isTitleLooping
      await $.store.set('effect', isTitleLooping ? 'an' : 'aus')
      await update($, title, () => TITLE)

      return { text: isTitleLooping ? t.effectOn : t.effectOff }
    }

    if (verb === 'theme' || verb === 'farben' || verb === 'colors') {
      if (argument.length === 0) return { text: t.themeList(themeNames().join(', ')) }

      const found = findTheme(argument)
      if (found === undefined) return { text: t.themeUnknown(argument) }

      await update($, theme, () => found)
      await $.store.set('theme', found)

      return { text: t.themeSet(found) }
    }

    if (verb === 'sprache' || verb === 'lang' || verb === 'language') {
      const found = findLanguage(argument)
      if (found === undefined) return { text: t.languageUnknown(argument) }

      await setLanguage($, found)

      return { text: textsFor(found).languageSet }
    }

    if (verb === 'feed') {
      if (argument.length === 0) {
        const now = ((await read($, feed)) ?? NO_FEED).command

        return { text: now.length > 0 ? t.feedSet(now) : t.feedNone }
      }

      if (argument === 'aus' || argument === 'off') {
        await setFeed($, '')

        return { text: t.feedOff }
      }

      await setFeed($, argument)
      const after = (await read($, feed)) ?? NO_FEED
      const note = t.feedNotes[after.note] ?? after.note

      return { text: note.length > 0 ? note : t.feedSet(argument) }
    }

    if (verb === 'ticket') {
      if (argument.length === 0) {
        const now = await read($, ticketUrl)

        return { text: now.length > 0 ? t.ticketSet(now) : t.ticketNone }
      }

      await update($, ticketUrl, () => argument)
      await $.store.set('ticketUrl', argument)

      return { text: t.ticketSet(argument) }
    }

    if (verb === 'repos') {
      const roots = rootsOf(await read($, repos))
      const removal = /^(remove|entfernen)\s+(.+)$/i.exec(argument)
      if (removal !== null) {
        const root = (removal[2] ?? '').trim()
        if (!roots.includes(root)) return { text: t.rootUnknown(root) }

        await setReposRoots(
          $,
          roots.filter(one => one !== root),
        )

        return { text: t.rootRemoved(root) }
      }

      if (argument.length === 0 && roots.length === 0) return { text: t.rootMissing }

      if (argument.length > 0) await addReposRoot($, argument)
      else await refreshRepos($)
      const after = await read($, repos)
      const dirty = after.list.filter(one => !isClean(one)).length

      return { text: t.notes[after.note] ?? t.reposResult(after.list.length, rootsOf(after).join(', '), dirty) }
    }

    return { text: t.help }
  })

  on('session.measure', async ($, e, next) => {
    await keepUsage($, e).catch(() => undefined)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const path = WRITERS.includes(String(e.tool)) ? pathOf(e) : undefined
    if (path === undefined || isDemo) return next(e)

    // Check before writing whether the file already existed: new or changed
    const before = await $.fs.stat(path).catch(() => undefined)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran

    const after = await $.fs.stat(path).catch(() => undefined)
    if (after === undefined || after.kind !== 'file') return ran

    await update($, files, list => {
      const known = list.find(one => one.path === path)
      const entry: FileEntry = {
        path,
        size: after.size,
        mtimeMs: after.mtimeMs,
        isNew: known !== undefined ? known.isNew : before === undefined || before.kind !== 'file',
        writes: (known?.writes ?? 0) + 1,
        no: known?.no ?? list.reduce((highest, one) => Math.max(highest, one.no), 0) + 1,
      }

      return [entry, ...list.filter(one => one.path !== path)].slice(0, MAX_FILES)
    })
    // The written file is on top, so the list goes back to the first page
    await update($, filePage, () => 0)

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    // Nothing may be written while rendering, so the start runs right after
    if (!isStarted || (await read($, ready)) !== true) {
      $.clock.after(1, () => {
        void start($, options).catch(() => undefined)
      })
    }

    const { Box, Text, Link, Button } = $.ui.resolve(e)
    const list = await read($, files)
    const folded = await read($, collapsed)
    const repoState = await read($, repos)
    const hostInfo = await read($, host)
    const themeName = await read($, theme)
    const look = lookFor(themeName)
    const heading = await read($, title)
    const armedKey = await read($, armed)
    const isConfirmed = (await read($, accepted)) === true
    const language = await languageNow($)
    const t = textsFor(language)
    const editor = await read($, editorPath)
    const usageState = (await read($, usage)) ?? NO_USAGE
    const feedState = (await read($, feed)) ?? NO_FEED
    const ticketPattern = (await read($, ticketUrl)) ?? ''
    const contextPercent = usageState.window > 0 ? Math.round((usageState.tokens / usageState.window) * 100) : 0

    const columns = Math.max(16, e.props.bodyColumns)
    // The height of the pane body, in tests and on other surfaces the value is missing
    const bodyRows = e.props.scroll?.bodyRows
    const rows = bodyRows ?? e.viewport?.rows ?? 30
    // A prop with the value undefined counts as invalid, so it is left out entirely then
    const ink = look.text === undefined ? {} : { color: look.text }
    const ground = look.background === undefined ? {} : { backgroundColor: look.background }
    // Without a minimum height the area of the color scheme ends below the last line
    const tall = look.background === undefined || bodyRows === undefined ? {} : { minHeight: bodyRows }
    const chip = look.chip === undefined ? {} : { backgroundColor: look.chip }
    const isFolded = (id: string): boolean => folded[id] ?? false
    const foldedNow = (id: string): boolean => folded[id] ?? id === 'feed'
    const actions = terminalActions(hostInfo, '')
    const dirty = repoState.list.filter(one => !isClean(one))
    const total = list.reduce((sum, one) => sum + one.size, 0)
    const note = t.notes[repoState.note] ?? ''

    // How many rows the other widgets need, the rest belongs to the files (four rows per file)
    const terminalRows = isFolded('terminal') ? 1 : 3
    const repoRoom = Math.max(3, Math.floor(rows / 4))
    const roots = rootsOf(repoState)
    const pulling = repoState.pulling ?? ''
    // One to three dots in a fixed width, so the button does not change its size
    const step = (await read($, pulse)) ?? 0
    const dots = dotsFor(step)
    const working = (label: string): string => workingLabel(label, step)
    const repoRows = isFolded('repos') ? 1 : 2 + 2 * roots.length + Math.min(dirty.length, repoRoom)
    const sessionRows = isFolded('session') ? 1 : 5 + 3 * usageState.limits.length
    // The feed widget exists only with a command and starts collapsed
    const isFeedOn = feedState.command.length > 0
    const isFeedFolded = folded.feed ?? true
    const shownTickets = feedState.list.slice(0, MAX_FEED_ROWS)
    const feedNote = t.feedNotes[feedState.note] ?? feedState.note
    const feedRows = !isFeedOn ? 0 : isFeedFolded ? 2 : 4 + shownTickets.length
    const fileRoom = Math.max(1, Math.floor((rows - 4 - terminalRows - repoRows - sessionRows - feedRows - 7) / 4))
    // The list is paged instead of scrolled, so the other widgets stay where they are
    const pageCount = Math.max(1, Math.ceil(list.length / fileRoom))
    const page = Math.min(Math.max(0, await read($, filePage)), pageCount - 1)
    const shownFiles = list.slice(page * fileRoom, (page + 1) * fileRoom)
    const numberWidth = String(list.reduce((highest, one) => Math.max(highest, one.no), 1)).length
    const shownRepos = dirty.slice(0, repoRoom)

    // A button takes no color. On light schemes it therefore sits on a dark ground.
    // Square brackets mark what can be clicked. A single glyph (an arrow, the cross) stays bare.
    const press = (key: string, label: string, onPress: () => unknown, isQuiet = false) => {
      const shown = label.length > 1 && !label.startsWith('[') ? `[${label}]` : label

      return (
        <Box {...chip}>
          {isQuiet ? (
            <Button key={key} plain dimColor onPress={onPress}>
              {shown}
            </Button>
          ) : (
            <Button key={key} plain onPress={onPress}>
              {shown}
            </Button>
          )}
        </Box>
      )
    }

    const splits = actions.filter(action => action.key in SPLIT_SYMBOLS)
    const others = actions.filter(action => !(action.key in SPLIT_SYMBOLS))
    const termButton = (action: (typeof actions)[number]) =>
      press(
        `term:${action.key}`,
        armedKey === action.key && action.needsConfirm === true
          ? t.confirmClose
          : (SPLIT_SYMBOLS[action.key] ?? t.actions[action.key] ?? action.key),
        async () => {
          // A command that closes something needs two presses within a few seconds
          if (action.needsConfirm === true && (await read($, armed)) !== action.key) {
            await update($, armed, () => action.key)
            $.clock.after(ARMED_MS, () => {
              void update($, armed, now => (now === action.key ? '' : now))
            })

            return
          }

          await update($, armed, () => '')
          const cwd = await $.session.cwd()
          const now = terminalActions(hostInfo, cwd).find(one => one.key === action.key)
          if (now !== undefined) await run($, now.argv, t.actions[now.key] ?? now.key)
        },
      )

    // Green while there is room, then the warning and the error color of the scheme
    const gauge = (percent: number) => (percent >= 95 ? look.bad : percent >= 80 ? look.warn : look.ok)

    // A ticket key in the branch name becomes a link once a ticket address is set
    const branchText = (branch: string) => {
      const ticket = ticketPattern.length > 0 ? ticketOf(branch) : undefined
      if (ticket === undefined) {
        return (
          <Text dimColor wrap="truncate-end" {...ink}>
            {branch}
          </Text>
        )
      }

      const at = branch.indexOf(ticket)

      return (
        <Text dimColor wrap="truncate-end" {...ink}>
          {branch.slice(0, at)}
          <Link href={ticketHref(ticketPattern, ticket)}>{ticket}</Link>
          {branch.slice(at + ticket.length)}
        </Text>
      )
    }

    const head = (id: string, label: string, count: string, sheet = '') => (
      <Box flexDirection="row" gap={1}>
        {press(`fold:${id}`, foldedNow(id) ? '▸' : '▾', async () => {
          const wasFolded = (await read($, collapsed))[id] ?? id === 'feed'
          await update($, collapsed, now => ({ ...now, [id]: !wasFolded }))
          // Read right away when the repos are expanded for the first time
          if (id === 'repos' && wasFolded && (await read($, repos)).checkedAt === 0) await refreshRepos($)
          if (id === 'feed' && wasFolded && ((await read($, feed)) ?? NO_FEED).checkedAt === 0) await refreshFeed($)
        })}
        <Text bold color={look.accent}>
          {label}
        </Text>
        <Text dimColor wrap="truncate-end" {...ink}>
          {count}
          {sheet.length > 0 ? `${count.length > 0 ? ' ' : ''}· ` : ''}
          {sheet.length > 0 && <Link href={sheet}>{t.sheet}</Link>}
        </Text>
      </Box>
    )

    // A bar as /usage draws it: the used share in color, the rest dimmed, the figure behind it
    // Separates two widgets. It takes the row the empty line had, so the pane grows no taller.
    const rule = (
      <Text dimColor wrap="truncate-end" {...ink}>
        {'─'.repeat(Math.max(4, columns - 1))}
      </Text>
    )

    const meter = (label: string, percent: number, footer: string) => {
      // The figure has a fixed width so that all bars end in the same column
      const suffix = `${String(Math.round(percent)).padStart(4)} %`
      const width = Math.max(6, columns - 4 - suffix.length)
      const filled = barCells(percent, width)

      return (
        <Box flexDirection="column">
          <Text bold wrap="truncate-end" {...ink}>
            {label}
          </Text>
          <Text wrap="truncate-end" {...ink}>
            <Text color={gauge(percent)}>{'█'.repeat(filled)}</Text>
            <Text dimColor>{'█'.repeat(width - filled)}</Text>
            {suffix}
          </Text>
          {footer.length > 0 && (
            <Text dimColor wrap="truncate-end" {...ink}>
              {footer}
            </Text>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" flexGrow={1} {...ground} {...tall}>
        <Text wrap="truncate-end">
          <Text bold color={look.title}>
            {heading}
          </Text>
          <Text dimColor {...ink}>
            {` v${VERSION} · `}
            <Link href={AUTHOR_URL}>{AUTHOR}</Link>
            {TAGLINE}
          </Text>
        </Text>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Text bold color={look.accent}>
            {t.colors}
          </Text>
          {press('theme:prev', '◂', () => stepTheme($, -1))}
          <Text {...ink}>{themeName}</Text>
          {press('theme:next', '▸', () => stepTheme($, 1))}
          <Text dimColor {...ink}>
            ·
          </Text>
          {press('lang:next', language.toUpperCase(), () => stepLanguage($))}
          <Text dimColor {...ink}>
            ·
          </Text>
          <Text {...ink}>
            <Link href={REPO_URL}>GitHub</Link>
          </Text>
        </Box>
        {!isConfirmed && (
          <Box flexDirection="column">
            <Text> </Text>
            <Box flexDirection="column" borderStyle="round" borderColor={look.warn} paddingX={1}>
              <Text bold color={look.warn}>
                {t.noticeTitle}
              </Text>
              <Text wrap="wrap" {...ink}>
                {t.notice}
              </Text>
              <Box flexDirection="row">
                {press('notice:accept', t.accept, async () => {
                  await update($, accepted, () => true)
                  await $.store.set('accepted', 'yes')
                })}
              </Box>
            </Box>
          </Box>
        )}
        {rule}

        {head('files', t.files, list.length > 0 ? `${t.fileCount(list.length)} · ${formatSize(total, language)}` : '')}
        {!isFolded('files') && list.length === 0 && (
          <Box marginLeft={2}>
            <Text dimColor wrap="wrap" {...ink}>
              {t.nothingWritten}
            </Text>
          </Box>
        )}
        {!isFolded('files') &&
          shownFiles.map(file => {
            const { dir, name } = splitPath(file.path)
            // The number is right-aligned, the lines below are indented by its width
            const number = `${String(file.no).padStart(numberWidth)} `
            const indent = ' '.repeat(number.length + 2)

            return (
              <Box flexDirection="column">
                <Text wrap="truncate-middle" {...ink}>
                  <Text dimColor>{number}</Text>
                  <Text color={file.isNew ? look.ok : look.warn}>{file.isNew ? '+ ' : '~ '}</Text>
                  <Link href={fileHref(file.path)}>
                    <Text bold>{name}</Text>
                  </Link>
                </Text>
                <Text dimColor wrap="truncate-start" {...ink}>
                  {indent}
                  <Link href={fileHref(dir)}>{shortenDir(dir, columns - indent.length)}</Link>
                </Text>
                <Text dimColor wrap="truncate-end" {...ink}>
                  {indent}
                  {formatSize(file.size, language)} · {formatStamp(file.mtimeMs, language)}
                  {file.writes > 1 ? ` · ${file.writes}x` : ''}
                </Text>
                <Box flexDirection="row" flexWrap="wrap" columnGap={1} marginLeft={indent.length}>
                  {hostInfo.terminal !== 'none' &&
                    editor.length > 0 &&
                    press(
                      `edit:${file.path}`,
                      editorName,
                      async () => {
                        const argv = openEditorArgv(hostInfo, editor, file.path, await $.session.cwd())
                        if (argv !== undefined) await run($, argv, editorName)
                      },
                      true,
                    )}
                  {press(`open:${file.path}`, t.open, () => run($, openDefaultArgv(hostInfo, file.path), t.open), true)}
                  {press(
                    `copy-path:${file.path}`,
                    t.copyPath,
                    async () => {
                      if (await run($, copyTextArgv(hostInfo, file.path), t.copyPath)) $.ui.toast(t.copied(t.copyPath))
                    },
                    true,
                  )}
                  {press(
                    `copy-content:${file.path}`,
                    t.copyContent,
                    async () => {
                      if (await run($, copyFileArgv(hostInfo, file.path), t.copyContent)) $.ui.toast(t.copied(name))
                    },
                    true,
                  )}
                </Box>
              </Box>
            )
          })}
        {!isFolded('files') && pageCount > 1 && (
          <Box flexDirection="row" columnGap={1} marginLeft={2}>
            {press('files:prev', '◂', () => update($, filePage, () => (page + pageCount - 1) % pageCount))}
            <Text dimColor {...ink}>
              {t.range(page * fileRoom + 1, page * fileRoom + shownFiles.length, list.length)}
            </Text>
            {press('files:next', '▸', () => update($, filePage, () => (page + 1) % pageCount))}
          </Box>
        )}
        {!isFolded('files') && list.length > 0 && (
          <Box flexDirection="row" marginLeft={2}>
            {press(
              'leeren',
              t.clearList,
              async () => {
                await update($, files, () => [])
                await update($, filePage, () => 0)
              },
              true,
            )}
          </Box>
        )}

        {rule}
        {head(
          'terminal',
          t.terminal,
          hostInfo.terminal === 'wt' ? 'Windows Terminal' : hostInfo.terminal === 'tmux' ? 'tmux' : '',
          hostInfo.terminal === 'wt' ? CHEAT_SHEET : '',
        )}
        {!isFolded('terminal') && actions.length === 0 && (
          <Box marginLeft={2}>
            <Text dimColor wrap="wrap" {...ink}>
              {t.noTerminal}
            </Text>
          </Box>
        )}
        {!isFolded('terminal') && actions.length > 0 && (
          <Box flexDirection="column" alignItems="flex-start" marginLeft={2}>
            <Box flexDirection="row" gap={1}>
              <Text {...ink}>Split</Text>
              {splits.map(termButton)}
            </Box>
            <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
              {others.map(termButton)}
            </Box>
          </Box>
        )}

        {rule}
        {head('repos', t.repos, repoState.list.length > 0 ? t.reposCount(dirty.length, repoState.list.length) : '')}
        {!isFolded('repos') && roots.length === 0 && (
          <Box flexDirection="column" alignItems="flex-start" marginLeft={2}>
            <Text dimColor wrap="wrap" {...ink}>
              {t.noFolder}
            </Text>
            {press('repos:pick', t.pickFolder, () => pickReposRoot($))}
          </Box>
        )}
        {!isFolded('repos') && note.length > 0 && (
          <Text color={look.warn} wrap="wrap">
            {'  '}
            {note}
          </Text>
        )}
        {!isFolded('repos') &&
          roots.map(root => {
            const here = shownRepos.filter(repo => (repo.root ?? root) === root)
            if (here.length === 0) return null

            return (
              <Box flexDirection="column">
                {roots.length > 1 && (
                  <Text dimColor wrap="truncate-start" {...ink}>
                    {'  '}
                    {shortenDir(root, columns - 2)}
                  </Text>
                )}
                {here.map(repo => (
                  <Box flexDirection="row" gap={1}>
                    <Box flexShrink={0}>
                      <Text {...ink}>
                        <Text color={!repo.isRead || repo.behind > 0 ? look.bad : look.warn}>{'  ● '}</Text>
                        <Text bold>{repo.name}</Text>
                        <Text color={look.warn}>{` ${repo.isRead ? repoCounts(repo) : t.unreadable}`}</Text>
                      </Text>
                    </Box>
                    {/* The button stands before the branch: a long branch name is cut, the button never is */}
                    {repo.isRead && (repo.dir ?? '').length > 0 && (
                      <Box flexShrink={0}>
                        {press(`pull:${repo.dir}`, pulling === repo.dir ? dots : t.pull, () => pullRepo($, repo))}
                      </Box>
                    )}
                    {hostInfo.terminal !== 'none' && (repo.dir ?? '').length > 0 && (
                      <Box flexShrink={0}>
                        {press(`shell:${repo.dir}`, '>_', async () => {
                          const split = terminalActions(hostInfo, repo.dir).find(one => one.key === 'split-right')
                          if (split !== undefined) await run($, split.argv, repo.name)
                        })}
                      </Box>
                    )}
                    <Box flexShrink={1}>{branchText(repo.branch)}</Box>
                  </Box>
                ))}
              </Box>
            )
          })}
        {!isFolded('repos') && dirty.length > shownRepos.length && (
          <Text dimColor {...ink}>
            {'  '}
            {t.more(dirty.length - shownRepos.length)}
          </Text>
        )}
        {!isFolded('repos') && repoState.list.length > 0 && dirty.length === 0 && (
          <Text color={look.ok}>
            {'  '}
            {t.allClean}
          </Text>
        )}
        {!isFolded('repos') && roots.length > 0 && (
          <Box flexDirection="column" marginLeft={2}>
            {roots.map(root => (
              <Box flexDirection="row" gap={1}>
                {press(
                  `repos:remove:${root}`,
                  '×',
                  async () =>
                    setReposRoots(
                      $,
                      rootsOf(await read($, repos)).filter(one => one !== root),
                    ),
                  true,
                )}
                <Text dimColor wrap="truncate-start" {...ink}>
                  {shortenDir(root, columns - 6)}
                </Text>
              </Box>
            ))}
            <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
              {press(
                'repos:refresh',
                repoState.isBusy && !repoState.isFetching ? working(t.reading) : t.reread,
                () => refreshRepos($),
                true,
              )}
              {press(
                'repos:fetch',
                repoState.isFetching ? working(t.fetching) : t.fetchAll,
                () => refreshRepos($, true),
                true,
              )}
              {press('repos:pick', t.addFolder, () => pickReposRoot($), true)}
              <Text dimColor {...ink}>
                {repoState.checkedAt > 0 ? formatClock(repoState.checkedAt) : ''}
              </Text>
            </Box>
          </Box>
        )}

        {isFeedOn && rule}
        {isFeedOn &&
          head(
            'feed',
            t.feed,
            feedState.checkedAt > 0 && feedNote.length === 0
              ? t.feedCount(feedState.list.length, formatDay(feedState.since, language))
              : '',
          )}
        {isFeedOn && !isFeedFolded && (
          <Box flexDirection="column" marginLeft={2}>
            {feedNote.length > 0 && (
              <Text color={look.warn} wrap="wrap">
                {feedNote}
              </Text>
            )}
            {feedNote.length === 0 && feedState.checkedAt > 0 && feedState.list.length === 0 && (
              <Text color={look.ok}>{t.feedEmpty}</Text>
            )}
            {shownTickets.map(ticket => (
              <Text wrap="truncate-end" {...ink}>
                {ticket.url.length > 0 ? <Link href={ticket.url}>{ticket.key}</Link> : <Text bold>{ticket.key}</Text>}
                <Text dimColor>{` ${ticket.summary}`}</Text>
              </Text>
            ))}
            {feedState.list.length > shownTickets.length && (
              <Text dimColor {...ink}>
                {t.more(feedState.list.length - shownTickets.length)}
              </Text>
            )}
            <Box flexDirection="row" gap={2}>
              {press('feed:refresh', feedState.isBusy ? working(t.reading) : t.reread, () => refreshFeed($), true)}
              <Text dimColor {...ink}>
                {feedState.checkedAt > 0 ? formatClock(feedState.checkedAt) : ''}
              </Text>
            </Box>
          </Box>
        )}

        {rule}
        {head('session', t.session, '', CLAUDE_SHEET)}
        {!isFolded('session') && (
          <Box flexDirection="column" marginLeft={2}>
            {usageState.measuredAt === 0 && (
              <Text dimColor wrap="wrap" {...ink}>
                {t.noReading}
              </Text>
            )}
            {usageState.limits.map(limit =>
              meter(
                t.limits[limit.kind] ?? limit.kind,
                limit.percentUsed,
                formatReset(limit.resetsAt, usageState.measuredAt, language).replace(/^(?=.)/, `${t.resets} `),
              ),
            )}
            {usageState.measuredAt > 0 &&
              meter(
                t.context,
                contextPercent,
                `${formatTokens(usageState.tokens)} ${t.of} ${formatTokens(usageState.window)}${
                  usageState.usd >= 0 ? ` · ${t.cost} ${formatUsd(usageState.usd, language)}` : ''
                }`,
              )}
            <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
              {press('session:refresh', t.reread, () => readUsage($), true)}
              <Text dimColor {...ink}>
                {usageState.measuredAt > 0 ? formatClock(usageState.measuredAt) : ''}
              </Text>
              {/* Both change the conversation for good, so each needs a second press */}
              {press('session:compact', armedKey === 'session:compact' ? t.confirmRun : '/compact', async () => {
                if (await isSecondPress($, 'session:compact')) await compactSession($)
              })}
              {press('session:clear', armedKey === 'session:clear' ? t.confirmRun : '/clear', async () => {
                if (await isSecondPress($, 'session:clear')) await clearSession($)
              })}
            </Box>
          </Box>
        )}
      </Box>
    )
  })
}
