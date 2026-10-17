// The quick commands - without $ and therefore directly testable.
// Which slash commands there are comes from the host, how often they were used from the input
// history Claude Code keeps below the home folder.

/** The input history below the home folder. Only the first word of a line counts, and only if it starts with a slash. */
export const HISTORY_FILE = '.claude/history.jsonl'

/** A slash command as the dialog lists it. */
export type CommandEntry = { name: string; description: string; count: number }

const SLASH = /^\/([A-Za-z0-9:_-]+)/

/**
 * Counts how often each slash command was typed. A line that is no JSON or has no text is
 * skipped, so a change of the format leaves an empty count instead of an error.
 */
export const countSlashCommands = (history: string): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const row of history.split('\n')) {
    if (row.trim().length === 0) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(row)
    } catch {
      continue
    }
    const text = typeof parsed === 'object' && parsed !== null ? (parsed as { display?: unknown }).display : undefined
    if (typeof text !== 'string') continue

    const found = SLASH.exec(text.trim())
    if (found?.[1] !== undefined) counts[found[1]] = (counts[found[1]] ?? 0) + 1
  }

  return counts
}

/**
 * The order of the dialog: ticked commands first, then the used ones by their count, the rest by
 * name. Commands in `hidden` are left out, they have a place of their own in the pane.
 */
export const sortCommands = (
  commands: readonly CommandEntry[],
  picked: readonly string[],
  hidden: readonly string[],
): CommandEntry[] => {
  const rank = (entry: CommandEntry): number => (picked.includes(entry.name) ? 0 : entry.count > 0 ? 1 : 2)

  return commands
    .filter(entry => !hidden.includes(entry.name))
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count || a.name.localeCompare(b.name))
}

/** The commands whose name or description holds the filter, regardless of case. An empty filter keeps all. */
export const filterCommands = (commands: readonly CommandEntry[], filter: string): CommandEntry[] => {
  const wanted = filter.trim().toLowerCase()
  if (wanted.length === 0) return [...commands]

  return commands.filter(
    entry => entry.name.toLowerCase().includes(wanted) || entry.description.toLowerCase().includes(wanted),
  )
}

/** Full path of the input history below the home folder, with the slashes of that folder. */
export const historyPathIn = (home: string): string => {
  const base = home.replace(/[\\/]+$/, '')
  const slash = base.includes('\\') ? '\\' : '/'

  return `${base}${slash}${HISTORY_FILE.replace(/\//g, slash)}`
}
