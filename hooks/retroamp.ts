// The bridge to retro-amp - without $ and therefore directly testable.
// retro-amp writes what it plays to a status file below the home folder and takes one command
// word from a second file. Without that status file the widget does not appear at all.
import type { NowPlaying } from '../types'

/** Written by retro-amp since it has the remote control. */
export const STATUS_FILE = '.retro-amp/now-playing.json'
/** Read by retro-amp every half second, then deleted. */
export const CONTROL_FILE = '.retro-amp/control'

/** retro-amp writes at least every 5 seconds while it runs. Older than this means it is gone. */
export const STALE_MS = 20000

export type MusicCommand = 'play_pause' | 'next' | 'previous' | 'stop'

const STATES = ['playing', 'paused', 'stopped'] as const

const textIn = (data: Record<string, unknown>, key: string): string =>
  typeof data[key] === 'string' ? (data[key] as string) : ''

const numberIn = (data: Record<string, unknown>, key: string): number => {
  const value = data[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Reads the status file. Another format or a broken file gives `undefined`, never an error. */
export const parseNowPlaying = (content: string): NowPlaying | undefined => {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined

  const data = parsed as Record<string, unknown>
  if (data.app !== 'retro-amp' || data.version !== 1) return undefined

  const state = STATES.find(one => one === data.state) ?? 'stopped'

  return {
    state,
    title: textIn(data, 'title'),
    artist: textIn(data, 'artist'),
    album: textIn(data, 'album'),
    displayName: textIn(data, 'display_name'),
    positionSeconds: numberIn(data, 'position_seconds'),
    durationSeconds: numberIn(data, 'duration_seconds'),
    updatedMs: numberIn(data, 'updated') * 1000,
    isRunning: data.running === true,
    commands: Array.isArray(data.commands) ? data.commands.filter(one => typeof one === 'string') : [],
  }
}

/** True while retro-amp runs: it says so and has written lately. A crash leaves `running` true, the time tells. */
export const isLive = (now: NowPlaying, at: number): boolean => now.isRunning && at - now.updatedMs < STALE_MS

/** The position at a moment. While a track plays, the time since the writing is added, up to its end. */
export const positionAt = (now: NowPlaying, at: number): number => {
  if (now.state !== 'playing' || !isLive(now, at)) return now.positionSeconds

  const moved = now.positionSeconds + Math.max(0, at - now.updatedMs) / 1000

  return now.durationSeconds > 0 ? Math.min(now.durationSeconds, moved) : moved
}

/** Seconds as the watch shows them: 3:07, from an hour on 1:02:07. */
export const formatPlayTime = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = String(whole % 60).padStart(2, '0')

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

/** Artist and title if both are known, otherwise what retro-amp shows itself. */
export const trackName = (now: NowPlaying): string =>
  now.artist.length > 0 && now.title.length > 0 ? `${now.artist} - ${now.title}` : now.displayName

const inHome = (home: string, file: string): string => {
  const base = home.replace(/[\\/]+$/, '')
  const slash = base.includes('\\') ? '\\' : '/'

  return `${base}${slash}${file.replace(/\//g, slash)}`
}

/** Full path of the status file below the home folder, with the slashes of that folder. */
export const statusPathIn = (home: string): string => inHome(home, STATUS_FILE)

/** Full path of the control file next to it. */
export const controlPathIn = (home: string): string => inHome(home, CONTROL_FILE)
