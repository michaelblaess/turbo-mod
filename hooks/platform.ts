// Which commands the given operating system and terminal need - without $ and therefore directly testable.

import type { HostInfo } from '../types'

export type TerminalAction = {
  /** Key of the command, also the key of its label in texts.ts. */
  key: string
  argv: string[]
  /** True for commands that close something: the button then asks once. */
  needsConfirm?: true
}

export const CHEAT_SHEET = 'https://www.michaelblaess.de/helfer/windows-terminal.html'

/** Detects operating system and terminal from environment variables and the output of `uname -s`. */
export const detectHost = (env: { os?: string; wtSession?: string; tmux?: string }, uname?: string): HostInfo => {
  const isWindows = (env.os ?? '').toLowerCase() === 'windows_nt'
  const os = isWindows ? 'windows' : (uname ?? '').trim().toLowerCase() === 'darwin' ? 'mac' : 'linux'
  const isSet = (value?: string): boolean => value !== undefined && value.trim().length > 0
  // tmux first: if it runs inside Windows Terminal (WSL), tmux splits the window
  const terminal = isSet(env.tmux) ? 'tmux' : isSet(env.wtSession) ? 'wt' : 'none'

  return { os, terminal }
}

/** Command that opens a file or folder with the default application. */
export const openDefaultArgv = (host: HostInfo, path: string): string[] => {
  // explorer.exe only understands backslashes, in return it needs no shell and no quoting
  if (host.os === 'windows') return ['explorer.exe', path.replace(/\//g, '\\')]

  return host.os === 'mac' ? ['open', path] : ['xdg-open', path]
}

/** Command that opens the file in the editor in a new split, or undefined without a splittable terminal. */
export const openEditorArgv = (host: HostInfo, editor: string, path: string, cwd: string): string[] | undefined => {
  if (host.terminal === 'wt') return ['wt.exe', '-w', '0', 'split-pane', '-V', '-d', cwd, editor, path]
  if (host.terminal === 'tmux') return ['tmux', 'split-window', '-h', '-c', cwd, editor, path]

  return undefined
}

// Windows Terminal has no command for closing. So: focus the last active pane,
// then send the key combination for "close pane" to the foreground window.
const WT_CLOSE_LAST =
  "wt.exe -w 0 move-focus previous; Start-Sleep -Milliseconds 400; (New-Object -ComObject WScript.Shell).SendKeys('^+w')"

/** The window commands of the terminal, empty without a splittable terminal. */
export const terminalActions = (host: HostInfo, cwd: string): TerminalAction[] => {
  if (host.terminal === 'wt') {
    const split = ['wt.exe', '-w', '0', 'split-pane']

    return [
      // A split to the left is missing on the command line: split right and swap the two panes
      { key: 'split-left', argv: [...split, '-V', '-d', cwd, ';', 'swap-pane', 'left'] },
      { key: 'split-right', argv: [...split, '-V', '-d', cwd] },
      { key: 'split-down', argv: [...split, '-H', '-d', cwd] },
      { key: 'new-tab', argv: ['wt.exe', '-w', '0', 'new-tab', '-d', cwd] },
      { key: 'close-last', argv: ['powershell.exe', '-NoProfile', '-Command', WT_CLOSE_LAST], needsConfirm: true },
    ]
  }

  if (host.terminal === 'tmux') {
    return [
      { key: 'split-left', argv: ['tmux', 'split-window', '-h', '-b', '-c', cwd] },
      { key: 'split-right', argv: ['tmux', 'split-window', '-h', '-c', cwd] },
      { key: 'split-down', argv: ['tmux', 'split-window', '-v', '-c', cwd] },
      { key: 'new-tab', argv: ['tmux', 'new-window', '-c', cwd] },
      // The active pane is Claude's own, so the last used other one
      { key: 'close-last', argv: ['tmux', 'kill-pane', '-t', '{last}'], needsConfirm: true },
    ]
  }

  return []
}

const windowsPicker = (title: string): string =>
  [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    `$dialog.Description = '${title}'`,
    // Without a window in the foreground the dialog opens behind the terminal
    '$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }',
    "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.SelectedPath) }",
  ].join('; ')

/**
 * Command that shows a folder dialog and prints the chosen path.
 * The title ends up in a command text, so quotes in it are removed.
 */
export const pickFolderArgv = (host: HostInfo, title: string): string[] => {
  const safe = title.replace(/['"`$]/g, '')
  if (host.os === 'windows') return ['powershell.exe', '-NoProfile', '-STA', '-Command', windowsPicker(safe)]
  if (host.os === 'mac') return ['osascript', '-e', `POSIX path of (choose folder with prompt "${safe}")`]

  return ['zenity', '--file-selection', '--directory', `--title=${safe}`]
}

/**
 * Command that prints the full path of a program. A new pane inherits the environment of the
 * terminal and not that of Claude Code, so the bare name is not always enough there.
 */
export const whereArgv = (host: HostInfo, program: string): string[] =>
  host.os === 'windows' ? ['where.exe', program] : ['which', program]

/** Splits a list of folders written with ; or line breaks, without blanks and without duplicates. */
export const splitRoots = (text: string): string[] => [
  ...new Set(
    text
      .split(/[;\n]/)
      .map(one => one.trim())
      .filter(one => one.length > 0),
  ),
]

/** True if the name is already a path and does not have to be looked up first. */
export const isPath = (program: string): boolean => /[\\/]/.test(program)

/** Appends a name to a folder, with the separator the folder itself uses. */
export const joinPath = (dir: string, name: string): string => {
  const separator = dir.includes('\\') ? '\\' : '/'

  return dir.endsWith('/') || dir.endsWith('\\') ? `${dir}${name}` : `${dir}${separator}${name}`
}

export const CLAUDE_SHEET = 'https://www.michaelblaess.de/helfer/claude-code.html'

// The text travels as an argument and never as part of the script, so nothing in it is run
const POSIX_COPY = 'if command -v wl-copy >/dev/null 2>&1; then wl-copy; else xclip -selection clipboard; fi'

const quoted = (text: string): string => `'${text.replace(/'/g, "''")}'`

const powershell = (script: string): string[] => ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script]

/** Command that puts a text on the clipboard. */
export const copyTextArgv = (host: HostInfo, text: string): string[] => {
  if (host.os === 'windows') return powershell(`Set-Clipboard -Value ${quoted(text)}`)
  if (host.os === 'mac') return ['sh', '-c', 'printf %s "$1" | pbcopy', 'sh', text]

  return ['sh', '-c', `printf %s "$1" | { ${POSIX_COPY}; }`, 'sh', text]
}

/** Command that puts the content of a text file on the clipboard. */
export const copyFileArgv = (host: HostInfo, path: string): string[] => {
  if (host.os === 'windows') {
    return powershell(`Get-Content -Raw -Encoding UTF8 -LiteralPath ${quoted(path)} | Set-Clipboard`)
  }
  if (host.os === 'mac') return ['sh', '-c', 'pbcopy < "$1"', 'sh', path]

  return ['sh', '-c', `{ ${POSIX_COPY}; } < "$1"`, 'sh', path]
}

/** Splits a command line into program and arguments. Double quotes keep blanks together. */
export const splitCommand = (line: string): string[] =>
  (line.match(/"[^"]*"|\S+/g) ?? []).map(part => part.replace(/^"(.*)"$/, '$1'))
