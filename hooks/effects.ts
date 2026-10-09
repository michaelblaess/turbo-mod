// Text effects for the title line - without $ and therefore directly testable.
// Three effects from retro-text-effects.js are rebuilt here as small functions: decrypt,
// wipe and errorcorrect. The library itself needs the DOM and requestAnimationFrame,
// neither exists in a mod. Each function returns ONE frame, the host sets the pace.

const GLYPHS = Array.from('#%&$@*+=<>/\\|[]{}0123456789')
// U+2588, the full block as the cursor
const CURSOR = '█'

export const EFFECTS = ['decrypt', 'wipe', 'errorcorrect'] as const
export type EffectName = (typeof EFFECTS)[number]

/** Random numbers in [0, 1) from a seed (mulberry32): same seed, same sequence. */
export const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * decrypt: the first characters are already in place, the rest flickers through random characters.
 *
 * @param text The finished text.
 * @param frame Number of the frame, from 0.
 * @param frames Number of frames, at `frame >= frames` the whole text is shown.
 * @param random Random number in [0, 1), fixed in tests.
 */
export const decryptFrame = (text: string, frame: number, frames: number, random: () => number): string => {
  const cells = Array.from(text)
  if (frame >= frames || frames <= 0) return text

  const settled = Math.floor((cells.length * Math.max(0, frame)) / frames)

  return cells
    .map((ch, i) => {
      // Spaces stay in place so that the line does not jump
      if (i < settled || ch === ' ') return ch

      return GLYPHS[Math.floor(random() * GLYPHS.length) % GLYPHS.length]
    })
    .join('')
}

/** wipe: the text is written from the left, with a cursor running ahead of it. */
export const wipeFrame = (text: string, frame: number, frames: number): string => {
  const cells = Array.from(text)
  if (frame >= frames || frames <= 0) return text

  const written = Math.floor((cells.length * Math.max(0, frame)) / frames)

  return cells.map((ch, i) => (i < written ? ch : i === written ? CURSOR : ' ')).join('')
}

/** errorcorrect: letters are swapped and move pair by pair to their place. */
export const errorcorrectFrame = (text: string, frame: number, frames: number, seed: number): string => {
  const cells = Array.from(text)
  if (frame >= frames || frames <= 0) return text

  // The pairs depend only on the seed, so that every frame of the same run knows the same pairs
  const random = seeded(seed)
  const places = cells.map((ch, i) => (ch === ' ' ? -1 : i)).filter(i => i >= 0)
  for (let i = places.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const held = places[i] as number
    places[i] = places[j] as number
    places[j] = held
  }

  const pairs = Math.floor(places.length / 2)
  const corrected = Math.floor((pairs * Math.max(0, frame)) / frames)
  for (let pair = corrected; pair < pairs; pair += 1) {
    const a = places[pair * 2] as number
    const b = places[pair * 2 + 1] as number
    const held = cells[a] as string
    cells[a] = cells[b] as string
    cells[b] = held
  }

  return cells.join('')
}

/** One frame of the named effect. The same seed gives the same result for the same frame. */
export const effectFrame = (name: EffectName, text: string, frame: number, frames: number, seed: number): string => {
  if (name === 'wipe') return wipeFrame(text, frame, frames)
  if (name === 'errorcorrect') return errorcorrectFrame(text, frame, frames, seed)

  return decryptFrame(text, frame, frames, seeded(seed * 31 + frame))
}
