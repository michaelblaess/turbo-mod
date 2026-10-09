// Pure helper functions for the display - without $ and therefore directly testable.

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

/** Bytes as a size: 512 B, 12,3 KB, 4,0 MB. English with a dot instead of a comma. */
export const formatSize = (bytes: number, lang = 'de'): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toFixed(1).replace('.', lang === 'en' ? '.' : ',')} ${units[unit]}`
}

/** Timestamp as dd.MM. HH:mm:ss, in English as MM-dd HH:mm:ss. */
export const formatStamp = (mtimeMs: number, lang = 'de'): string => {
  const d = new Date(mtimeMs)
  const day =
    lang === 'en' ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`

  return `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Time of day as HH:mm. */
export const formatClock = (ms: number): string => {
  const d = new Date(ms)

  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Splits a path into folder and file name, whether \ or /. */
export const splitPath = (path: string): { dir: string; name: string } => {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))

  return cut < 0 ? { dir: '', name: path } : { dir: path.slice(0, cut), name: path.slice(cut + 1) }
}

/** file: URL for an absolute path, also for Windows drives. */
export const fileHref = (path: string): string => {
  const forward = path.replace(/\\/g, '/')
  const encoded = forward
    .split('/')
    .map((part, i) => (i === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)))
    .join('/')

  return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`
}

/** Shortens the folder from the front so that the end (the telling part) stays. */
export const shortenDir = (dir: string, room: number): string =>
  dir.length <= room ? dir : `...${dir.slice(dir.length - Math.max(1, room - 3))}`

/** Tokens in short form: 950, 84k, 1.2M. */
export const formatTokens = (tokens: number): string =>
  tokens >= 1000000
    ? `${(tokens / 1000000).toFixed(1)}M`
    : tokens >= 1000
      ? `${Math.round(tokens / 1000)}k`
      : String(Math.round(tokens))

/** Time of a reset: HH:mm on the same day as `nowMs`, otherwise with the date in front. */
export const formatReset = (iso: string, nowMs: number, lang = 'de'): string => {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''

  const d = new Date(ms)
  const now = new Date(nowMs)
  const isSameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (isSameDay) return formatClock(ms)

  const date =
    lang === 'en' ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`

  return `${date} ${formatClock(ms)}`
}

/** US dollars: 3,21 $ in German, $3.21 in English. */
export const formatUsd = (usd: number, lang = 'de'): string =>
  lang === 'en' ? `$${usd.toFixed(2)}` : `${usd.toFixed(2).replace('.', ',')} $`

/** The first ticket key in a branch name, for example ABC-123 in feature/ABC-123-fix. */
export const ticketOf = (branch: string): string | undefined => /[A-Z][A-Z0-9]+-\d+/.exec(branch)?.[0]

/** Address of a ticket: the key replaces {id}, without a placeholder it is appended. */
export const ticketHref = (pattern: string, id: string): string =>
  pattern.includes('{id}') ? pattern.replace('{id}', id) : `${pattern.replace(/\/+$/, '')}/${id}`

/** How many of `width` cells of a bar are filled at `percent`. Anything above zero shows at least one. */
export const barCells = (percent: number, width: number): number => {
  const share = Math.min(100, Math.max(0, percent)) / 100

  return share > 0 ? Math.max(1, Math.round(share * width)) : 0
}

/** An ISO date as dd.MM. or, in English, MM-dd. Empty for anything else. */
export const formatDay = (iso: string, lang = 'de'): string => {
  const match = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso)
  if (match === null) return ''

  return lang === 'en' ? `${match[2]}-${match[3]}` : `${match[3]}.${match[2]}.`
}

/** One to three dots in a fixed width of three cells, so a label does not change its size. */
export const dotsFor = (step: number): string => '.'.repeat((Math.max(0, Math.trunc(step)) % 3) + 1).padEnd(3)

/** A busy label with moving dots in place of its own three: "reading ..." becomes "reading .  ". */
export const workingLabel = (label: string, step: number): string =>
  `${label.replace(/ ?\.{3}$/, '')} ${dotsFor(step)}`.trimStart()
