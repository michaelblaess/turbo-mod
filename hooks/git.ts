// Reads the output of `git status --porcelain=v2 --branch` - without $ and therefore directly testable.

import type { RepoEntry } from '../types'

export const STATUS_ARGV = ['git', 'status', '--porcelain=v2', '--branch'] as const
export const FETCH_ARGV = ['git', 'fetch', '--quiet'] as const
// Fast-forward only: a pull never creates a merge commit and never rewrites local work
export const PULL_ARGV = ['git', 'pull', '--ff-only', '--quiet'] as const

/** State of a repo from the status output: branch, ahead, behind, number of changes. */
export const parseStatus = (name: string, stdout: string, root = '', dir = ''): RepoEntry => {
  const entry: RepoEntry = { root, dir, name, branch: '?', ahead: 0, behind: 0, changed: 0, untracked: 0, isRead: true }

  for (const line of stdout.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      entry.branch = line.slice('# branch.head '.length).trim()
      continue
    }

    if (line.startsWith('# branch.ab ')) {
      const match = /\+(\d+) -(\d+)/.exec(line)
      if (match !== null) {
        entry.ahead = Number(match[1])
        entry.behind = Number(match[2])
      }
      continue
    }

    // 1 = changed, 2 = renamed, u = conflict
    if (/^[12u] /.test(line)) entry.changed += 1
    // ? = a file git does not know yet
    if (line.startsWith('? ')) entry.untracked += 1
  }

  return entry
}

/** True if there is nothing to do in the repo: nothing changed, nothing ahead, nothing behind. */
export const isClean = (repo: RepoEntry): boolean =>
  repo.isRead && repo.changed === 0 && (repo.untracked ?? 0) === 0 && repo.ahead === 0 && repo.behind === 0

/** Repos that need attention first, within the groups by name. */
export const sortRepos = (list: RepoEntry[]): RepoEntry[] =>
  [...list].sort((a, b) => Number(isClean(a)) - Number(isClean(b)) || a.name.localeCompare(b.name))

/** Short form of the counters for one line: "~3 ?1 ↑1 ↓2", empty for a clean repo. */
export const repoCounts = (repo: RepoEntry): string =>
  [
    repo.changed > 0 ? `~${repo.changed}` : '',
    (repo.untracked ?? 0) > 0 ? `?${repo.untracked}` : '',
    repo.ahead > 0 ? `↑${repo.ahead}` : '',
    repo.behind > 0 ? `↓${repo.behind}` : '',
  ]
    .filter(part => part.length > 0)
    .join(' ')

// One call for both: the top folder of the repo and the commit it stands on. Fails outside a repo.
export const TOP_HEAD_ARGV = ['git', 'rev-parse', '--show-toplevel', 'HEAD'] as const
// Every untracked file by name instead of one line per folder
export const CHANGES_ARGV = ['git', 'status', '--porcelain=v2', '--branch', '--untracked-files=all'] as const

/** A file a shell command touched, as git names it: relative to the top folder, forward slashes. */
export type ChangeEntry = { path: string; isNew: boolean; isGone: boolean }

/** Files changed between two commits, without rename detection: a rename is one gone and one new. */
export const diffArgv = (before: string, after: string): string[] => [
  'git',
  'diff',
  '--name-status',
  '--no-renames',
  before,
  after,
]

// The part of a line behind its first `count` fields. Paths may contain spaces, fields may not.
const afterFields = (line: string, count: number): string => {
  let at = 0
  for (let field = 0; field < count; field += 1) {
    const space = line.indexOf(' ', at)
    if (space < 0) return ''
    at = space + 1
  }

  return line.slice(at)
}

// git quotes a path with special characters. Such a path is left out instead of guessed.
const isPlain = (path: string): boolean => path.length > 0 && !path.startsWith('"')

/** The commit and the changed files from `git status --porcelain=v2 --branch`. */
export const parseChanges = (stdout: string): { head: string; list: ChangeEntry[] } => {
  let head = ''
  const list: ChangeEntry[] = []

  for (const line of stdout.split('\n')) {
    if (line.startsWith('# branch.oid ')) {
      head = line.slice('# branch.oid '.length).trim()
      continue
    }

    if (line.startsWith('? ')) {
      const path = line.slice(2).trim()
      if (isPlain(path)) list.push({ path, isNew: true, isGone: false })
      continue
    }

    // 1 = changed (8 fields before the path), 2 = renamed (9, then a tab and the old path), u = conflict (10)
    const fields = line.startsWith('1 ') ? 8 : line.startsWith('2 ') ? 9 : line.startsWith('u ') ? 10 : 0
    if (fields === 0) continue

    const path = (afterFields(line, fields).split('\t')[0] ?? '').trim()
    // XY: X is the index, Y the working tree
    const index = line.charAt(2)
    const tree = line.charAt(3)
    if (isPlain(path))
      list.push({ path, isNew: index === 'A', isGone: tree === 'D' || (index === 'D' && tree === '.') })
  }

  return { head, list }
}

/** The files from `git diff --name-status --no-renames`. */
export const parseDiff = (stdout: string): ChangeEntry[] => {
  const list: ChangeEntry[] = []

  for (const line of stdout.split('\n')) {
    const [status = '', path = ''] = line.split('\t')
    if (status.length === 0 || !isPlain(path.trim())) continue

    list.push({ path: path.trim(), isNew: status.startsWith('A'), isGone: status.startsWith('D') })
  }

  return list
}

/** Absolute path of a file in a repo. On a Windows drive with backslashes, as the write tools name it. */
export const repoPath = (top: string, relative: string): string => {
  const joined = `${top.replace(/[\\/]+$/, '')}/${relative}`

  return /^[A-Za-z]:[\\/]/.test(top) ? joined.replaceAll('/', '\\') : joined
}

/** Two spellings of one Windows path compare equal: slashes and case do not count there. */
export const pathKey = (path: string): string =>
  /^[A-Za-z]:[\\/]/.test(path) ? path.replaceAll('/', '\\').toLowerCase() : path

/**
 * Which repos a sync pulls: behind the server, read, without changes of files git knows and
 * without own commits. Those would stop a fast-forward or need a decision, so they are skipped.
 * Untracked files stay allowed, git refuses the pull by itself if one would be overwritten.
 */
export const syncCandidates = (list: readonly RepoEntry[]): { pull: RepoEntry[]; skipped: RepoEntry[] } => {
  const behind = list.filter(one => one.behind > 0)
  const canPull = (one: RepoEntry): boolean => one.isRead && one.changed === 0 && one.ahead === 0

  return { pull: behind.filter(canPull), skipped: behind.filter(one => !canPull(one)) }
}
