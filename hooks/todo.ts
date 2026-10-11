// The TODO list as a Markdown file - without $ and therefore directly testable.
// One task per line: "- [ ] text". Every other line of the file stays as it is.

import type { TodoItem } from '../types'

/** Name of the list below the home folder. It lies outside every git repo on purpose. */
export const TODO_FILE = '.claude/turbo-mod-todo.md'

const ROW = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/

/** One line of text without line breaks and without spaces at the ends. */
export const cleanTodoText = (text: string): string => text.replace(/\s+/g, ' ').trim()

const parseRow = (row: string, line: number): TodoItem | undefined => {
  const found = ROW.exec(row)
  if (found === null) return undefined

  const text = cleanTodoText(found[2] ?? '')
  if (text.length === 0) return undefined

  return { line, text, isDone: found[1] !== ' ' }
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

/** A task as its line in the file. */
export const formatTodo = (item: Pick<TodoItem, 'text' | 'isDone'>): string =>
  `- [${item.isDone ? 'x' : ' '}] ${cleanTodoText(item.text)}`

/** Open tasks first in the order of the file, the done ones below. */
export const sortTodos = (items: readonly TodoItem[]): TodoItem[] =>
  [...items].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1

    return a.line - b.line
  })

/** Appends a task. An empty text changes nothing. */
export const addTodo = (content: string, text: string): string => {
  const clean = cleanTodoText(text)
  if (clean.length === 0) return content

  const body = content.length === 0 || content.endsWith('\n') ? content : `${content}\n`

  return `${body}${formatTodo({ text: clean, isDone: false })}\n`
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
export const changeTodo = (
  content: string,
  item: TodoItem,
  change: (now: TodoItem) => Pick<TodoItem, 'text' | 'isDone'> | undefined,
): string => {
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

/** Removes every task that is ticked off. */
export const clearDoneTodos = (content: string): string =>
  content
    .split('\n')
    .filter((row, line) => parseRow(row, line)?.isDone !== true)
    .join('\n')

/** Full path of the list below the home folder, with the slashes of that folder. */
export const todoPathIn = (home: string): string => {
  const base = home.replace(/[\\/]+$/, '')
  const slash = base.includes('\\') ? '\\' : '/'

  return `${base}${slash}${TODO_FILE.replace(/\//g, slash)}`
}
