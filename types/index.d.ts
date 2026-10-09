export type FileEntry = {
  /** Absolute path, exactly as the tool received it. */
  path: string
  /** Bytes after the last write. */
  size: number
  /** Last change, milliseconds since 1970. */
  mtimeMs: number
  /** True if the file was newly created in this session. */
  isNew: boolean
  /** How often the file was written in this session. */
  writes: number
  /** Running number in order of the first write, from 1. Stays the same on later writes. */
  no: number
}

export type HostInfo = {
  /** Operating system, detected via `OS` and `uname -s`. */
  os: 'windows' | 'mac' | 'linux'
  /** Terminal that can be split from outside: Windows Terminal, tmux or none. */
  terminal: 'wt' | 'tmux' | 'none'
}

export type RepoEntry = {
  /** Root folder the repo was found under. */
  root: string
  /** Full path of the repo. */
  dir: string
  /** Folder name under the root folder. */
  name: string
  /** Current branch, "(detached)" for a detached HEAD. */
  branch: string
  /** Commits ahead of the upstream, as of the last fetch. */
  ahead: number
  /** Commits behind the upstream, as of the last fetch. */
  behind: number
  /** Changed and staged entries of files git knows. */
  changed: number
  /** Files git does not know yet. */
  untracked: number
  /** False if `git status` failed for this repo. */
  isRead: boolean
}

export type ReposState = {
  /** Root folders of the repos, empty as long as none is set. */
  roots: string[]
  /** True while a run also fetches every repo from its server. */
  isFetching: boolean
  /** Full path of the repo that is being pulled right now, otherwise empty. */
  pulling: string
  list: RepoEntry[]
  /** Time of the last run, 0 as long as none has run. */
  checkedAt: number
  isBusy: boolean
  /** Key of a note for the display ("unreadable", "empty"), otherwise empty. */
  note: string
}

export type FeedTicket = {
  key: string
  summary: string
  /** Address of the ticket, empty if the feed gives none. */
  url: string
}

export type FeedState = {
  /** Command line that prints the tickets as JSON, empty turns the widget off. */
  command: string
  list: FeedTicket[]
  /** First day the feed covers, ISO date, empty if the feed does not say. */
  since: string
  /** Time of the last run, 0 as long as none has run. */
  checkedAt: number
  isBusy: boolean
  /** What the feed or the mod has to say about a failed run, otherwise empty. */
  note: string
}

export type UsageLimit = {
  /** Name of the window as the host reports it, for example "five_hour". */
  kind: string
  percentUsed: number
  /** When the window resets, ISO 8601, empty if the host does not say. */
  resetsAt: string
}

export type UsageState = {
  /** Time of the reading, 0 as long as there is none. */
  measuredAt: number
  /** Tokens in the context window right now. */
  tokens: number
  /** Size of the context window of the model. */
  window: number
  limits: UsageLimit[]
  /** Cost of the session in US dollars, -1 where the host keeps no ledger. */
  usd: number
}

declare module 'claude-code' {
  interface PluginState {
    'turbo-mod': {
      files: FileEntry[]
      /** Page of the file list that is shown, from 0. A new write goes back to 0. */
      filePage: number
      /** Per widget: true means collapsed. */
      collapsed: Record<string, boolean>
      repos: ReposState
      host: HostInfo
      /** Name of the color scheme, "standard" follows the theme of Claude Code. */
      theme: string
      /** The title as it is currently drawn (runs through an effect at intervals). */
      title: string
      /** True once the state is restored. False again after the host dropped it, as on /clear. */
      ready: boolean
      /** True once the notice of the first start is confirmed on this machine. */
      accepted: boolean
      /** Step of the moving dots behind a busy label, 0 to 2. */
      pulse: number
      /** Key of the button currently waiting for the second confirmation, otherwise empty. */
      armed: string
      /** Language of the pane, "de" or "en". */
      lang: string
      /** Full path of the editor, empty if it was not found on this machine. */
      editorPath: string
      usage: UsageState
      feed: FeedState
      /** Address of a ticket with the placeholder {id}, empty if none is set. */
      ticketUrl: string
    }
  }
}
