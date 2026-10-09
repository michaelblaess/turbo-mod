// Translates a color scheme into the colors the pane needs - without $ and therefore directly testable.

import { PALETTES } from './palettes'

export const STANDARD = 'standard'

export type Look = {
  /** Title line. */
  title: string
  /** Header lines of the widgets. */
  accent: string
  /** Body text, undefined means: color of the terminal. */
  text: string | undefined
  ok: string
  warn: string
  bad: string
  /** Area behind the pane, undefined means: background of the terminal. */
  background: string | undefined
  /**
   * Area behind a button. A button takes no color, it draws in the text color
   * of the terminal. On a light scheme that would be light on light, so there it gets
   * the dark text color of the scheme as its ground.
   */
  chip: string | undefined
}

/** The colors of the host: they follow the theme set in Claude Code. */
const HOST_LOOK: Look = {
  title: 'claude',
  accent: 'suggestion',
  text: undefined,
  ok: 'success',
  warn: 'warning',
  bad: 'error',
  background: undefined,
  chip: undefined,
}

export const themeNames = (): string[] => [STANDARD, ...PALETTES.map(palette => palette.name)]

/** Finds a scheme by name, ignoring case. */
export const findTheme = (name: string): string | undefined => {
  const wanted = name.trim().toLowerCase()

  return themeNames().find(one => one === wanted)
}

export const lookFor = (name: string): Look => {
  const palette = PALETTES.find(one => one.name === name)
  if (palette === undefined) return HOST_LOOK

  return {
    title: palette.primary,
    accent: palette.accent,
    text: palette.foreground,
    ok: palette.success,
    warn: palette.warning,
    bad: palette.error,
    background: palette.background,
    chip: palette.dark ? undefined : palette.foreground,
  }
}
