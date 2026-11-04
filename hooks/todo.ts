// The TODO list as a Markdown file - without $ and therefore directly testable.
// One task per line: "- [ ] text". Every other line of the file stays as it is.

import type { TodoItem } from '../types'

/** Name of the list below the home folder. It lies outside every git repo on purpose. */
export const TODO_FILE = '.claude/turbo-mod-todo.md'

const ROW = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/
// The day a task was noted, as an HTML comment at the end of its line. Markdown does not show it,
// so the file stays readable by hand.
const STAMP = /\s*<!--\s*(\d{4}-\d{2}-\d{2})\s*-->\s*$/

/** One line of text without line breaks and without spaces at the ends. */
export const cleanTodoText = (text: string): string => text.replace(/\s+/g, ' ').trim()

const parseRow = (row: string, line: number): TodoItem | undefined => {
  const found = ROW.exec(row)
  if (found === null) return undefined

  const raw = found[2] ?? ''
  const stamp = STAMP.exec(raw)
  const text = cleanTodoText(stamp === null ? raw : raw.slice(0, stamp.index))
  if (text.length === 0) return undefined

  return { line, text, isDone: found[1] !== ' ', addedOn: stamp?.[1] ?? '' }
}

/** The text cut to the room it has, three dots mark the cut. A button does not shorten its label by itself. */
export const fitTodoText = (text: string, room: number): string => {
  const width = Math.max(4, room)

  return text.length <= width ? text : `${text.slice(0, width - 3).trimEnd()}...`
}

/** Reads the tasks of the file in the order of their lines. Lines that are no task are skipped. */
export const parseTodos = (content: string): TodoItem[] => {
  const items: TodoItem[] = []
  const rows = content.split(/\r?\n/)
  for (let line = 0; line < rows.length; line += 1) {
    const item = parseRow(rows[line] ?? '', line)
    if (item !== undefined) items.push(item)
  }

  return items
}

/** What a line of the file holds. The day it was noted is optional. */
export type TodoRow = Pick<TodoItem, 'text' | 'isDone'> & { addedOn?: string }

/** A task as its line in the file. */
export const formatTodo = (item: TodoRow): string => {
  const stamp = item.addedOn !== undefined && item.addedOn.length > 0 ? ` <!-- ${item.addedOn} -->` : ''

  return `- [${item.isDone ? 'x' : ' '}] ${cleanTodoText(item.text)}${stamp}`
}

/** The local day of a point in time as YYYY-MM-DD. */
export const dayStamp = (at: number): string => {
  const day = new Date(at)
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`
}

/** Open tasks first in the order of the file, the done ones below. */
export const sortTodos = (items: readonly TodoItem[]): TodoItem[] =>
  [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1

    return a.line - b.line
  })

/** Appends a task, with the day it was noted if one is given. An empty text changes nothing. */
export const addTodo = (content: string, text: string, addedOn = ''): string => {
  const clean = cleanTodoText(text)
  if (clean.length === 0) return content

  const body = content.length === 0 || content.endsWith('\n') ? content : `${content}\n`

  return `${body}${formatTodo({ text: clean, isDone: false, addedOn })}\n`
}

// The file may have been edited by hand since the pane drew it. The task is therefore found by
// its line and its text, and by its text alone if the line moved.
const findRow = (rows: readonly string[], item: TodoItem): number => {
  const atLine = parseRow(rows[item.line] ?? '', item.line)
  if (atLine !== undefined && atLine.text === item.text) return item.line

  return rows.findIndex((row, line) => parseRow(row, line)?.text === item.text)
}

/**
 * Rewrites the line of one task, `undefined` removes it. A task that is no longer in the file
 * changes nothing.
 */
export const changeTodo = (content: string, item: TodoItem, change: (now: TodoItem) => TodoRow | undefined): string => {
  const rows = content.split('\n')
  const at = findRow(rows, item)
  if (at < 0) return content

  const now = parseRow(rows[at] ?? '', at)
  if (now === undefined) return content

  const next = change(now)
  if (next === undefined) rows.splice(at, 1)
  else if (cleanTodoText(next.text).length > 0) rows[at] = formatTodo(next)

  return rows.join('\n')
}

/**
 * Removes the tasks that are ticked off. With `only` just those with one of these texts, so a
 * task ticked off after the archive was written stays in the list.
 */
export const clearDoneTodos = (content: string, only?: readonly string[]): string =>
  content
    .split('\n')
    .filter((row, line) => {
      const item = parseRow(row, line)

      return item?.isDone !== true || (only !== undefined && !only.includes(item.text))
    })
    .join('\n')

/** A file next to the list: the same name without `.md` and the given ending. */
const besideList = (path: string, ending: string): string => `${path.replace(/\.md$/i, '')}${ending}`

/** The archive of the done tasks, next to the list. */
export const archivePathOf = (path: string): string => besideList(path, '-archive.md')

/** The JSON export, next to the list. */
export const exportPathOf = (path: string): string => besideList(path, '.json')

/**
 * Appends the done tasks to the archive under a heading of the day. A second tidying on the same
 * day adds to the heading that is already there.
 */
export const archiveTodos = (archive: string, items: readonly TodoItem[], day: string): string => {
  if (items.length === 0) return archive

  const rows = items.map(item => `${formatTodo(item)}\n`).join('')
  const heading = `## ${day}`
  const body = archive.length === 0 || archive.endsWith('\n') ? archive : `${archive}\n`
  const headings = body.split('\n').filter(row => row.startsWith('## '))
  if (headings[headings.length - 1] === heading) return `${body}${rows}`

  return `${body}${body.length === 0 ? '' : '\n'}${heading}\n\n${rows}`
}

/** The open tasks as a plain list, one per line, for the clipboard. */
export const todosAsText = (items: readonly TodoItem[]): string =>
  items
    .filter(item => !item.isDone)
    .map(item => `- ${item.text}`)
    .join('\n')

/** Every task of the list as JSON. `addedOn` is null for a task without a day. */
export const todosAsJson = (items: readonly TodoItem[], file: string, exportedAt: string): string =>
  `${JSON.stringify(
    {
      exportedAt,
      file,
      tasks: items.map(item => ({
        text: item.text,
        isDone: item.isDone,
        addedOn: item.addedOn.length > 0 ? item.addedOn : null,
      })),
    },
    null,
    2,
  )}\n`

/** Full path of the list below the home folder, with the slashes of that folder. */
export const todoPathIn = (home: string): string => {
  const base = home.replace(/[\\/]+$/, '')
  const slash = base.includes('\\') ? '\\' : '/'

  return `${base}${slash}${TODO_FILE.replace(/\//g, slash)}`
}
