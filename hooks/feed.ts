// Reads what a ticket feed prints - without $ and therefore directly testable.
// A feed is any command that prints one JSON object: { tickets: [{ key, summary, url }], since?, message? }.

import type { FeedTicket } from '../types'

export type FeedResult = { list: FeedTicket[]; since: string; note: string }

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Tickets, first day and a note from the output of a feed. Never throws: broken output becomes a note. */
export const parseFeed = (stdout: string): FeedResult => {
  let data: unknown
  try {
    data = JSON.parse(stdout)
  } catch {
    return { list: [], since: '', note: 'no-json' }
  }

  if (typeof data !== 'object' || data === null) return { list: [], since: '', note: 'no-json' }

  const feed = data as { tickets?: unknown; since?: unknown; message?: unknown; error?: unknown }
  const rows = Array.isArray(feed.tickets) ? feed.tickets : []
  const list = rows
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map(row => ({ key: text(row.key), summary: text(row.summary), url: text(row.url) }))
    .filter(row => row.key.length > 0)

  return { list, since: text(feed.since), note: text(feed.message) || text(feed.error) }
}
