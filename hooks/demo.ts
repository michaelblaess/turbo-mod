// Invented data for screenshots - without $ and therefore directly testable.
// Nothing here comes from a real machine: the paths, repos and tickets are made up.

import type { FeedState, FileEntry, ReposState, UsageState } from '../types'

const HOME = '/home/sam/projects'
const MINUTE = 60000
const HOUR = 60 * MINUTE

export type DemoState = { files: FileEntry[]; repos: ReposState; feed: FeedState; usage: UsageState }

/** Everything the pane shows, filled with made-up content around the moment `now`. */
export const demoState = (now: number): DemoState => {
  const file = (no: number, path: string, size: number, minutesAgo: number, isNew: boolean, writes = 1): FileEntry => ({
    path: `${HOME}/${path}`,
    size,
    mtimeMs: now - minutesAgo * MINUTE,
    isNew,
    writes,
    no,
  })
  const repo = (name: string, branch: string, changed: number, untracked: number, ahead: number, behind: number) => ({
    root: HOME,
    dir: `${HOME}/${name}`,
    name,
    branch,
    ahead,
    behind,
    changed,
    untracked,
    isRead: true,
  })
  const ticket = (key: string, summary: string) => ({ key, summary, url: `https://tickets.example.com/browse/${key}` })

  return {
    files: [
      file(4, 'shop/docs/release-notes.md', 2150, 1, true),
      file(3, 'shop/src/cart/checkout.ts', 12595, 3, false, 3),
      file(2, 'shop/src/cart/checkout.test.ts', 5420, 4, true),
      file(1, 'shop/package.json', 1002, 9, false),
    ],
    repos: {
      roots: [HOME],
      list: [
        repo('shop', 'feature/ABC-123-checkout', 3, 1, 1, 0),
        repo('website', 'main', 0, 0, 0, 2),
        repo('design-system', 'main', 0, 2, 0, 0),
        repo('api', 'main', 0, 0, 0, 0),
        repo('docs', 'main', 0, 0, 0, 0),
        repo('infra', 'main', 0, 0, 0, 0),
      ],
      checkedAt: now,
      isBusy: false,
      isFetching: false,
      pulling: '',
      note: '',
    },
    feed: {
      command: 'demo',
      list: [
        ticket('ABC-131', 'Checkout: total is wrong with two vouchers'),
        ticket('ABC-130', 'Add dark mode to the order history'),
        ticket('ABC-129', 'Search returns nothing for umlauts'),
        ticket('ABC-128', 'Update the payment provider SDK'),
      ],
      since: new Date(now - 24 * HOUR).toISOString().slice(0, 10),
      checkedAt: now,
      isBusy: false,
      note: '',
    },
    usage: {
      measuredAt: now,
      tokens: 42000,
      window: 200000,
      limits: [
        { kind: 'five_hour', percentUsed: 48, resetsAt: new Date(now + 2 * HOUR + 20 * MINUTE).toISOString() },
        { kind: 'seven_day', percentUsed: 10, resetsAt: new Date(now + 6 * 24 * HOUR).toISOString() },
      ],
      usd: 1.37,
    },
  }
}
