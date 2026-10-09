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
