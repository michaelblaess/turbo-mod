import { expect, test } from 'claude-code/testing'

import { decryptFrame, effectFrame, errorcorrectFrame, wipeFrame } from './effects'
import { demoState } from './demo'
import { parseFeed } from './feed'
import {
  barCells,
  dotsFor,
  fileHref,
  formatDay,
  formatReset,
  formatSize,
  formatStamp,
  formatTokens,
  formatUsd,
  shortenDir,
  splitPath,
  ticketHref,
  ticketOf,
  workingLabel,
} from './format'
import { isClean, parseStatus, repoCounts, sortRepos } from './git'
import {
  copyFileArgv,
  copyTextArgv,
  detectHost,
  isPath,
  joinPath,
  openDefaultArgv,
  openEditorArgv,
  pickFolderArgv,
  splitCommand,
  splitRoots,
  terminalActions,
  whereArgv,
} from './platform'
import { findLanguage, textsFor } from './texts'
import { findTheme, lookFor, themeNames } from './theme'

test('formatSize writes German with a comma', () => {
  expect(formatSize(512)).toEqual('512 B')
  expect(formatSize(12595)).toEqual('12,3 KB')
  expect(formatSize(4 * 1024 * 1024)).toEqual('4,0 MB')
})

test('a busy label moves its dots in a fixed width', () => {
  expect([0, 1, 2, 3].map(dotsFor)).toEqual(['.  ', '.. ', '...', '.  '])
  expect(workingLabel('liest ...', 0)).toEqual('liest .  ')
  expect(workingLabel('reading ...', 2)).toEqual('reading ...')
  // The pull button shows nothing but the dots
  expect(workingLabel('...', 1)).toEqual('.. ')
})

test('splitPath splits Windows and POSIX paths', () => {
  expect(splitPath('C:\\Users\\me\\notiz.md')).toEqual({ dir: 'C:\\Users\\me', name: 'notiz.md' })
  expect(splitPath('/tmp/a/b.txt')).toEqual({ dir: '/tmp/a', name: 'b.txt' })
})

test('fileHref builds a file: URL, spaces encoded, drive kept', () => {
  expect(fileHref('C:\\Mein Ordner\\a b.md')).toEqual('file:///C:/Mein%20Ordner/a%20b.md')
  expect(fileHref('/tmp/a.txt')).toEqual('file:///tmp/a.txt')
})

test('shortenDir keeps the end', () => {
  expect(shortenDir('C:\\Users\\me\\.claude\\memory-global', 16)).toEqual('...memory-global')
})

test('detectHost detects Windows Terminal, tmux and macOS', () => {
  expect(detectHost({ os: 'Windows_NT', wtSession: 'abc' })).toEqual({ os: 'windows', terminal: 'wt' })
  expect(detectHost({ tmux: '/tmp/tmux-1000/default,1,0' }, 'Linux\n')).toEqual({ os: 'linux', terminal: 'tmux' })
  expect(detectHost({}, 'Darwin')).toEqual({ os: 'mac', terminal: 'none' })
  // tmux inside Windows Terminal: tmux splits
  expect(detectHost({ wtSession: 'abc', tmux: 'x' }, 'Linux').terminal).toEqual('tmux')
})

test('openDefaultArgv picks the matching program per system', () => {
  expect(openDefaultArgv({ os: 'windows', terminal: 'wt' }, 'C:/tmp/a b.md')).toEqual([
    'explorer.exe',
    'C:\\tmp\\a b.md',
  ])
  expect(openDefaultArgv({ os: 'linux', terminal: 'none' }, '/tmp/a.md')).toEqual(['xdg-open', '/tmp/a.md'])
  expect(openDefaultArgv({ os: 'mac', terminal: 'none' }, '/tmp/a.md')).toEqual(['open', '/tmp/a.md'])
})

test('openEditorArgv opens a split, nothing without a splittable terminal', () => {
  expect(openEditorArgv({ os: 'windows', terminal: 'wt' }, 'nvim', 'C:\\a.md', 'C:\\repo')).toEqual([
    'wt.exe',
    '-w',
    '0',
    'split-pane',
    '-V',
    '-d',
    'C:\\repo',
    'nvim',
    'C:\\a.md',
  ])
  expect(openEditorArgv({ os: 'linux', terminal: 'tmux' }, 'nvim', '/a.md', '/repo')).toEqual([
    'tmux',
    'split-window',
    '-h',
    '-c',
    '/repo',
    'nvim',
    '/a.md',
  ])
  expect(openEditorArgv({ os: 'linux', terminal: 'none' }, 'nvim', '/a.md', '/repo')).toEqual(undefined)
})

test('terminalActions: four directions and a close with confirmation', () => {
  const keys = ['split-left', 'split-right', 'split-down', 'new-tab', 'close-last']
  const wt = terminalActions({ os: 'windows', terminal: 'wt' }, 'C:\\repo')
  expect(wt.map(one => one.key)).toEqual(keys)
  // Left does not exist on the command line: split right, then swap
  expect(wt[0]?.argv).toEqual(['wt.exe', '-w', '0', 'split-pane', '-V', '-d', 'C:\\repo', ';', 'swap-pane', 'left'])
  expect(wt[1]?.argv).toEqual(['wt.exe', '-w', '0', 'split-pane', '-V', '-d', 'C:\\repo'])
  expect(wt.filter(one => one.needsConfirm === true).map(one => one.key)).toEqual(['close-last'])

  const tmux = terminalActions({ os: 'linux', terminal: 'tmux' }, '/repo')
  expect(tmux.map(one => one.key)).toEqual(keys)
  expect(tmux[0]?.argv).toEqual(['tmux', 'split-window', '-h', '-b', '-c', '/repo'])
  expect(terminalActions({ os: 'linux', terminal: 'none' }, '/repo')).toEqual([])
})

test('joinPath uses the separator of the folder', () => {
  expect(joinPath('C:\\repos', 'a')).toEqual('C:\\repos\\a')
  expect(joinPath('/home/me/repos/', 'a')).toEqual('/home/me/repos/a')
})

const STATUS = [
  '# branch.oid abc12345',
  '# branch.head develop',
  '# branch.upstream origin/develop',
  '# branch.ab +1 -2',
  '1 M. N... 100644 100644 100644 aaa bbb build.bat',
  '2 R. N... 100644 100644 100644 aaa bbb R100 neu.md\talt.md',
  '? PLAN.md',
  '',
].join('\n')

test('parseStatus reads branch, ahead, behind and counts changes', () => {
  const repo = parseStatus('shop', STATUS, '/r', '/r/shop')
  expect(repo).toEqual({
    root: '/r',
    dir: '/r/shop',
    name: 'shop',
    branch: 'develop',
    ahead: 1,
    behind: 2,
    changed: 2,
    untracked: 1,
    isRead: true,
  })
  expect(repoCounts(repo)).toEqual('~2 ?1 \u21911 \u21932')
  expect(isClean(repo)).toEqual(false)
  expect(isClean(parseStatus('leer', '# branch.head main\n# branch.ab +0 -0\n'))).toEqual(true)
})

test('sortRepos puts repos that need attention first', () => {
  const clean = parseStatus('aaa', '# branch.head main\n')
  const dirty = parseStatus('zzz', '# branch.head main\n? x\n')
  expect(sortRepos([clean, dirty]).map(one => one.name)).toEqual(['zzz', 'aaa'])
})

test('decryptFrame leaves spaces in place and ends at the text', () => {
  const text = 'Turbo MOD'
  const first = decryptFrame(text, 0, 10, () => 0)
  expect(first).toEqual('##### ###')
  expect(decryptFrame(text, 5, 10, () => 0)).toEqual('Turb# ###')
  expect(decryptFrame(text, 10, 10, () => 0)).toEqual(text)
})

test('wipe writes from the left, errorcorrect only swaps and ends at the text', () => {
  expect(wipeFrame('Turbo', 0, 5)).toEqual('\u2588    ')
  expect(wipeFrame('Turbo', 2, 5)).toEqual('Tu\u2588  ')
  expect(wipeFrame('Turbo', 5, 5)).toEqual('Turbo')

  const text = 'Turbo MOD'
  const mixed = errorcorrectFrame(text, 0, 10, 7)
  expect(mixed === text).toEqual(false)
  expect(Array.from(mixed).sort().join('')).toEqual(Array.from(text).sort().join(''))
  expect(mixed.charAt(5)).toEqual(' ')
  // The same seed gives the same frame, otherwise the pairs jump between two frames
  expect(errorcorrectFrame(text, 0, 10, 7)).toEqual(mixed)
  expect(errorcorrectFrame(text, 10, 10, 7)).toEqual(text)
  for (const name of ['decrypt', 'wipe', 'errorcorrect'] as const) {
    expect(effectFrame(name, text, 14, 14, 3)).toEqual(text)
    expect(effectFrame(name, text, 3, 14, 3).length).toEqual(text.length)
  }
})

test('pickFolderArgv picks the matching dialog per system', () => {
  const windows = pickFolderArgv({ os: 'windows', terminal: 'wt' }, "Ordner 'mit' $Repos")
  expect(windows.slice(0, 4)).toEqual(['powershell.exe', '-NoProfile', '-STA', '-Command'])
  // Quotes and $ in the title must not break the command text
  expect(windows[4]).toMatch(/Description = 'Ordner mit Repos'/)
  expect(pickFolderArgv({ os: 'linux', terminal: 'none' }, 'Ordner')).toEqual([
    'zenity',
    '--file-selection',
    '--directory',
    '--title=Ordner',
  ])
  expect(pickFolderArgv({ os: 'mac', terminal: 'none' }, 'Ordner')[0]).toEqual('osascript')
})

test('the editor is looked up via where or which, a path counts as found', () => {
  expect(whereArgv({ os: 'windows', terminal: 'wt' }, 'nvim')).toEqual(['where.exe', 'nvim'])
  expect(whereArgv({ os: 'linux', terminal: 'tmux' }, 'nvim')).toEqual(['which', 'nvim'])
  expect(isPath('nvim')).toEqual(false)
  expect(isPath('C:\\Tools\\nvim.exe')).toEqual(true)
  expect(isPath('/usr/bin/nvim')).toEqual(true)
})

test('texts exist in German and English, unknown languages fall back to English', () => {
  expect(findLanguage(' EN ')).toEqual('en')
  expect(findLanguage('fr')).toEqual(undefined)
  expect(textsFor('en').fileCount(1)).toEqual('1 file')
  expect(textsFor('en').reposCount(2, 7)).toEqual('2 of 7 with changes')
  expect(textsFor('fr').reposCount(2, 7)).toEqual('2 of 7 with changes')
  expect(textsFor('de').reposCount(2, 7)).toEqual('2 von 7 mit Änderungen')
  // Every language knows the same keys, otherwise the pane shows the raw key
  expect(Object.keys(textsFor('en').actions).sort()).toEqual(Object.keys(textsFor('de').actions).sort())
  expect(Object.keys(textsFor('en').notes).sort()).toEqual(Object.keys(textsFor('de').notes).sort())
  expect(formatSize(12595, 'en')).toEqual('12.3 KB')
  expect(formatStamp(0, 'en')).toMatch(/^\d\d-\d\d \d\d:\d\d:\d\d$/)
  expect(formatStamp(0)).toMatch(/^\d\d\.\d\d\. \d\d:\d\d:\d\d$/)
})

test('color schemes: standard follows the host, lenseflare brings its own colors', () => {
  expect(themeNames()[0]).toEqual('standard')
  expect(findTheme(' Lenseflare ')).toEqual('lenseflare')
  expect(findTheme('gibtsnicht')).toEqual(undefined)
  expect(lookFor('standard').background).toEqual(undefined)
  expect(lookFor('lenseflare').title).toEqual('#FF8C42')
  expect(lookFor('christophorus').background).toEqual('#102640')
  // A button takes no color: on light schemes it gets a dark ground
  expect(lookFor('christophorus').chip).toEqual(undefined)
  expect(lookFor('cupertino').chip).toEqual(lookFor('cupertino').text)
})

const PANE_PROPS = { title: 'Turbo-MOD', isFocused: false, bodyColumns: 40, placement: 'dock' } as never
const MOUNT = { plugin: 'turbo-mod', component: 'Pane', requestId: 'turbo-mod', props: PANE_PROPS } as const
// The default is English, these tests check the German texts
const GERMAN = { options: { language: 'de' } }

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a Write lands in the list with link, size and button (${surface})`, GERMAN, async ($, on) => {
    let isWritten = false
    const started: string[][] = []
    on('fs.stat', () =>
      isWritten
        ? { value: { kind: 'file', size: 2048, mtimeMs: 1760000000000, isLink: false } }
        : { value: { kind: 'other', size: 0, mtimeMs: 0, isLink: false } },
    )
    on('tool.call', { tool: 'Write' }, () => {
      isWritten = true

      return {
        result: { type: 'create', filePath: '/tmp/neu.md', content: 'x', structuredPatch: [], originalFile: null },
      }
    })
    on('process.run', (_$, e) => {
      started.push([...e.argv])

      return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })

    await $.tool.call({ tool: 'Write', file_path: '/tmp/neu.md', content: 'x' } as never)

    const ui = await $.ui.mount({ ...MOUNT, surface })
    expect(await ui.find({ text: /Turbo-MOD/ })).toBeDefined()
    expect(await ui.find({ text: /2026 Michael Blaess/ })).toBeDefined()
    // The desktop gets no file: links, there the name is plain text. The links to the repo and the author stay.
    const links = await ui.findAll({ type: 'Link' })
    expect(links.length).toEqual(surface === 'terminal' ? 5 : 3)
    expect(await ui.find({ text: /neu\.md/ })).toBeDefined()
    expect(await ui.find({ text: /2,0 KB/ })).toBeDefined()
    expect(await ui.find({ text: /^\+ / })).toBeDefined()
    expect(await ui.find({ text: /1 Datei · 2,0 KB/ })).toBeDefined()

    // Without a detected system Linux applies: the default application starts via xdg-open
    await ui.press({ key: 'open:/tmp/neu.md' })
    expect(started).toEqual([['xdg-open', '/tmp/neu.md']])

    await ui.press({ key: 'leeren' })
    expect(await ui.find({ text: /Noch nichts geschrieben/ })).toBeDefined()
  })
}

test('a denied call does not land in the list', GERMAN, async ($, on) => {
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'nein' }))

  await $.tool.call({ tool: 'Edit', file_path: 'C:\\tmp\\alt.md', old_string: 'a', new_string: 'b' } as never)

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /Noch nichts geschrieben/ })).toBeDefined()
})

test('a widget can be collapsed and expanded again', GERMAN, async $ => {
  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /Noch nichts geschrieben/ })).toBeDefined()

  await ui.press({ key: 'fold:files' })
  expect((await ui.findAll({ text: /Noch nichts geschrieben/ })).length).toEqual(0)

  await ui.press({ key: 'fold:files' })
  expect(await ui.find({ text: /Noch nichts geschrieben/ })).toBeDefined()
})

test('/turbo repos reads the state of the repos and shows only the open ones', GERMAN, async ($, on) => {
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1760000000000 }))
  on('fs.list', () => ({
    value: [
      { name: 'sauber', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      { name: 'offen', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      { name: 'kein-repo', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      { name: 'notiz.txt', kind: 'file', size: 1, mtimeMs: 0, isLink: false },
    ],
  }))
  on('fs.stat', (_$, e) => ({
    value: String(e.path).includes('kein-repo')
      ? { kind: 'other', size: 0, mtimeMs: 0, isLink: false }
      : { kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
  }))
  on('process.run', (_$, e) => ({
    value: {
      exitCode: 0,
      stdout: String(e.init?.cwd).endsWith('offen') ? STATUS : '# branch.head main\n# branch.ab +0 -0\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))

  const answer = await $.command.run({ command: 'turbo', args: 'repos /repos' } as never)
  expect(answer.text).toEqual('2 Repos unter /repos, 1 mit Änderungen.')

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /1 von 2 mit Änderungen/ })).toBeDefined()
  expect(await ui.find({ text: /offen/ })).toBeDefined()
  expect(await ui.find({ text: /develop/ })).toBeDefined()
  expect((await ui.findAll({ text: /sauber/ })).length).toEqual(0)
})

test('/turbo theme switches the color scheme and remembers it', GERMAN, async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_$, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })

  expect((await $.command.run({ command: 'turbo', args: 'theme gibtsnicht' } as never)).text).toMatch(/Kein Farbschema/)
  expect((await $.command.run({ command: 'turbo', args: 'theme Lenseflare' } as never)).text).toEqual(
    'Farbschema: lenseflare',
  )
  expect(stored).toEqual({ theme: 'lenseflare' })
})

test('every file keeps its running number, the header shows the count', GERMAN, async ($, on) => {
  on('fs.stat', () => ({ value: { kind: 'file', size: 10, mtimeMs: 1760000000000, isLink: false } }))
  on('tool.call', { tool: 'Write' }, (_$, e) => ({
    result: {
      type: 'update',
      filePath: String((e as { file_path?: string }).file_path),
      content: 'x',
      structuredPatch: [],
      originalFile: 'x',
    },
  }))

  for (const path of ['/tmp/eins.md', '/tmp/zwei.md', '/tmp/eins.md']) {
    await $.tool.call({ tool: 'Write', file_path: path, content: 'x' } as never)
  }

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /2 Dateien · 20 B/ })).toBeDefined()
  // eins.md was written last and is on top, but keeps number 1
  const numbers = (await ui.findAll({ text: /^\d+ $/ })).map(one => String(one.text).trim())
  expect(numbers).toEqual(['1', '2'])
  expect(await ui.find({ text: / · 2x/ })).toBeDefined()
})

test(
  'a list longer than its room is paged, the arrows wrap around, a new write goes back to page one',
  GERMAN,
  async ($, on) => {
    on('fs.stat', () => ({ value: { kind: 'file', size: 10, mtimeMs: 1760000000000, isLink: false } }))
    on('tool.call', { tool: 'Write' }, (_$, e) => ({
      result: {
        type: 'update',
        filePath: String((e as { file_path?: string }).file_path),
        content: 'x',
        structuredPatch: [],
        originalFile: 'x',
      },
    }))

    for (const path of ['/tmp/eins.md', '/tmp/zwei.md', '/tmp/drei.md']) {
      await $.tool.call({ tool: 'Write', file_path: path, content: 'x' } as never)
    }

    // Without a body height the pane counts 30 rows, that leaves room for two files
    const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
    expect(await ui.find({ text: /1-2 von 3/ })).toBeDefined()
    expect(await ui.find({ text: 'drei.md' })).toBeDefined()
    expect(await ui.findAll({ text: 'eins.md' })).toEqual([])

    await ui.press({ key: 'files:next' })
    expect(await ui.find({ text: /3-3 von 3/ })).toBeDefined()
    expect(await ui.find({ text: 'eins.md' })).toBeDefined()
    expect(await ui.findAll({ text: 'drei.md' })).toEqual([])

    // After the last page the first one follows, backwards the other way round
    await ui.press({ key: 'files:next' })
    expect(await ui.find({ text: /1-2 von 3/ })).toBeDefined()
    await ui.press({ key: 'files:prev' })
    expect(await ui.find({ text: /3-3 von 3/ })).toBeDefined()

    await $.tool.call({ tool: 'Write', file_path: '/tmp/vier.md', content: 'x' } as never)
    expect(await ui.find({ text: /1-2 von 4/ })).toBeDefined()
    expect(await ui.find({ text: 'vier.md' })).toBeDefined()
  },
)

test('without a repo folder the widget offers the folder dialog and takes the choice', GERMAN, async ($, on) => {
  const started: string[] = []
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1760000000000 }))
  on('fs.list', () => ({ value: [{ name: 'eins', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }))
  on('process.run', (_$, e) => {
    started.push(String(e.argv[0]))

    return {
      value: {
        exitCode: 0,
        stdout: e.argv[0] === 'git' ? '# branch.head main\n? neu.txt\n' : '/home/me/repos\n',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  await ui.press({ key: 'fold:repos' })
  expect(await ui.find({ text: /Noch kein Ordner gesetzt/ })).toBeDefined()

  await ui.press({ key: 'repos:pick' })
  expect(started).toEqual(['zenity', 'git'])
  expect(await ui.find({ text: /1 von 1 mit Änderungen/ })).toBeDefined()
  expect(await ui.find({ text: /\/home\/me\/repos/ })).toBeDefined()
})

test('the arrows next to "Theme" switch the scheme and remember it', GERMAN, async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_$, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /^standard$/ })).toBeDefined()

  await ui.press({ key: 'theme:next' })
  expect(stored).toEqual({ theme: 'brotkasten' })
  expect(await ui.find({ text: /^brotkasten$/ })).toBeDefined()

  await ui.press({ key: 'theme:prev' })
  await ui.press({ key: 'theme:prev' })
  expect(stored).toEqual({ theme: 'christophorus' })
})

test('/turbo sprache en switches pane and answers to English', GERMAN, async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_$, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })

  expect((await $.command.run({ command: 'turbo', args: 'sprache fr' } as never)).text).toMatch(/Keine Sprache "fr"/)
  expect((await $.command.run({ command: 'turbo', args: 'sprache en' } as never)).text).toEqual('Language: English')
  expect(stored).toEqual({ lang: 'en' })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /^Files$/ })).toBeDefined()
  expect(await ui.find({ text: /Nothing written yet/ })).toBeDefined()
  expect(await ui.find({ text: /^Theme$/ })).toBeDefined()
  expect((await $.command.run({ command: 'turbo', args: 'clear' } as never)).text).toEqual('List of files cleared.')
})

test('without a setting the pane is English, the button next to the theme switches the language', async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.set', (_$, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /^Files$/ })).toBeDefined()
  expect(await ui.find({ text: /Open Source @ 16 MHz/ })).toBeDefined()
  // Without files the link to the repo is the only one
  expect((await ui.findAll({ type: 'Link' })).length).toEqual(3)

  await ui.press({ key: 'lang:next' })
  expect(stored).toEqual({ lang: 'de' })
  expect(await ui.find({ text: /^Dateien$/ })).toBeDefined()

  await ui.press({ key: 'lang:next' })
  expect(stored).toEqual({ lang: 'en' })
})

test('after a /clear has dropped the state, the next command brings the settings back', async ($, on) => {
  const kept: Record<string, unknown> = { ticketUrl: 'https://jira.example.com/browse/{id}', lang: 'de' }
  // The state of the session, held here so that the test can drop it as the host does on /clear
  const held = new Map<string, { value: unknown; version: number }>()
  on('store.get', (_$, e) => ({ value: kept[e.key] }))
  on('clock.now', () => ({ value: 1760000000000 }))
  on('state.get', (_$, e) => ({ value: held.get(e.key) ?? { value: undefined, version: 0 } }))
  on('state.set', (_$, e) => {
    const now = held.get(e.key)?.version ?? 0
    if (e.ifVersion !== undefined && e.ifVersion !== now) return { value: { isSet: false, version: now } }
    held.set(e.key, { value: e.value, version: now + 1 })

    return { value: { isSet: true, version: now + 1 } }
  })

  const ask = async (): Promise<string> =>
    String((await $.command.run({ command: 'turbo', args: 'ticket' } as never)).text)
  expect(await ask()).toMatch(/jira\.example\.com/)
  expect(held.get('ready')?.value).toEqual(true)

  // The module keeps running, only the values are gone
  held.clear()
  expect(await ask()).toMatch(/jira\.example\.com/)
  expect(held.get('lang')?.value).toEqual('de')
  expect(held.get('ready')?.value).toEqual(true)
})

test('splitRoots reads several folders and drops blanks and duplicates', () => {
  expect(splitRoots(' C:\\Repos ; C:\\Tools;;C:\\Repos\n/home/me/src ')).toEqual([
    'C:\\Repos',
    'C:\\Tools',
    '/home/me/src',
  ])
  expect(splitRoots('')).toEqual([])
})

test('a second repo folder is listed under its own heading, pull and fetch run git there', async ($, on) => {
  const stored: Record<string, unknown> = {}
  const git: string[] = []
  on('store.set', (_$, e) => {
    stored[e.key] = e.value

    return { value: undefined }
  })
  on('clock.now', () => ({ value: 1760000000000 }))
  on('fs.list', (_$, e) => ({
    value: [
      { name: String(e.path).endsWith('tools') ? 'own' : 'work', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
    ],
  }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }))
  on('process.run', (_$, e) => {
    git.push(`${e.argv[1]} ${String(e.init?.cwd)}`)

    return {
      value: {
        exitCode: 0,
        stdout: '# branch.head main\n# branch.ab +0 -2\n',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  await $.command.run({ command: 'turbo', args: 'repos /repos' } as never)
  const answer = await $.command.run({ command: 'turbo', args: 'repos /tools' } as never)
  expect(answer.text).toEqual('2 repos under /repos, /tools, 2 with changes.')
  expect(stored.reposRoots).toEqual(['/repos', '/tools'])

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /^work$/ })).toBeDefined()
  // Before the notice is confirmed neither pull nor fetch reaches git
  expect(await ui.find({ text: /^Disclaimer$/ })).toBeDefined()
  const before = git.length
  await ui.press({ key: 'pull:/tools/own' })
  await ui.press({ key: 'repos:fetch' })
  expect(git.length).toEqual(before)
  await ui.press({ key: 'notice:accept' })
  expect(stored.accepted).toEqual('yes')
  expect((await ui.findAll({ text: /^Disclaimer$/ })).length).toEqual(0)
  expect(await ui.find({ text: /^own$/ })).toBeDefined()

  git.length = 0
  await ui.press({ key: 'pull:/tools/own' })
  expect(git).toEqual(['pull /tools/own', 'status /tools/own'])

  git.length = 0
  await ui.press({ key: 'repos:fetch' })
  expect(git).toEqual(['fetch /repos/work', 'status /repos/work', 'fetch /tools/own', 'status /tools/own'])

  await ui.press({ key: 'repos:remove:/repos' })
  expect(stored.reposRoots).toEqual(['/tools'])
  expect((await $.command.run({ command: 'turbo', args: 'repos remove /nope' } as never)).text).toEqual(
    'No repo folder "/nope" set.',
  )
})

test('tokens, reset time, dollars and ticket keys are formatted', () => {
  expect(barCells(0, 20)).toEqual(0)
  expect(barCells(1, 20)).toEqual(1)
  expect(barCells(48, 20)).toEqual(10)
  expect(barCells(140, 20)).toEqual(20)
  expect(formatTokens(950)).toEqual('950')
  expect(formatTokens(84400)).toEqual('84k')
  expect(formatTokens(1200000)).toEqual('1.2M')
  const now = new Date(2026, 9, 8, 15, 0, 0).getTime()
  expect(formatReset(new Date(2026, 9, 8, 17, 30, 0).toISOString(), now)).toEqual('17:30')
  expect(formatReset(new Date(2026, 9, 12, 9, 0, 0).toISOString(), now)).toEqual('12.10. 09:00')
  expect(formatReset(new Date(2026, 9, 12, 9, 0, 0).toISOString(), now, 'en')).toEqual('10-12 09:00')
  expect(formatReset('', now)).toEqual('')
  expect(formatUsd(3.214)).toEqual('3,21 $')
  expect(formatUsd(3.214, 'en')).toEqual('$3.21')
  expect(ticketOf('feature/ABC-123-fix-login')).toEqual('ABC-123')
  expect(ticketOf('main')).toEqual(undefined)
  expect(ticketHref('https://jira.example.com/browse/{id}', 'ABC-123')).toEqual(
    'https://jira.example.com/browse/ABC-123',
  )
  expect(ticketHref('https://jira.example.com/browse/', 'ABC-123')).toEqual('https://jira.example.com/browse/ABC-123')
})

test('the clipboard commands carry path and text as data, never as script', () => {
  const windows = { os: 'windows', terminal: 'wt' } as const
  expect(copyTextArgv(windows, "C:\\it's\\a.md")[4]).toEqual("Set-Clipboard -Value 'C:\\it''s\\a.md'")
  expect(copyFileArgv(windows, 'C:\\a.md')[4]).toMatch(
    /Get-Content -Raw -Encoding UTF8 -LiteralPath 'C:\\a\.md' \| Set-Clipboard/,
  )
  expect(copyTextArgv({ os: 'mac', terminal: 'none' }, '/a b.md').slice(-2)).toEqual(['sh', '/a b.md'])
  expect(copyFileArgv({ os: 'linux', terminal: 'none' }, '/a; rm x').slice(-2)).toEqual(['sh', '/a; rm x'])
})

test('the session widget shows context, limits and cost, a ticket key in a branch becomes a link', async ($, on) => {
  const started: string[][] = []
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: new Date(2026, 9, 8, 15, 0, 0).getTime() }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84000, window: 200000, percent: 42 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 37.4, resetsAt: new Date(2026, 9, 8, 17, 30, 0).toISOString() }],
      cost: { usd: 3.214 },
    },
  }))
  on('fs.list', () => ({ value: [{ name: 'shop', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
  on('fs.stat', () => ({ value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }))
  on('process.run', (_$, e) => {
    started.push([...e.argv])

    return {
      value: {
        exitCode: 0,
        stdout: '# branch.head feature/ABC-123-fix\n? new.txt\n',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  expect((await $.command.run({ command: 'turbo', args: 'ticket' } as never)).text).toMatch(/No ticket address set/)
  await $.command.run({ command: 'turbo', args: 'ticket https://jira.example.com/browse/{id}' } as never)
  await $.command.run({ command: 'turbo', args: 'repos /repos' } as never)

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: / +42 %$/ })).toBeDefined()
  expect(await ui.find({ text: /84k of 200k · Cost \$3\.21/ })).toBeDefined()
  expect(await ui.find({ text: /^Current session$/ })).toBeDefined()
  expect(await ui.find({ text: / +37 %$/ })).toBeDefined()
  expect(await ui.find({ text: /^Resets 17:30$/ })).toBeDefined()
  await ui.press({ key: 'session:refresh' })
  expect(await ui.find({ text: /^15:00$/ })).toBeDefined()
  // Author, repo, cheat sheet and the ticket
  expect((await ui.findAll({ type: 'Link' })).length).toEqual(4)
})

test('the buttons at a file copy its path and its content', GERMAN, async ($, on) => {
  const started: string[][] = []
  on('fs.stat', () => ({ value: { kind: 'file', size: 10, mtimeMs: 1760000000000, isLink: false } }))
  on('tool.call', { tool: 'Write' }, () => ({
    result: { type: 'create', filePath: '/tmp/ticket.md', content: 'x', structuredPatch: [], originalFile: null },
  }))
  on('process.run', (_$, e) => {
    started.push([...e.argv])

    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.tool.call({ tool: 'Write', file_path: '/tmp/ticket.md', content: 'x' } as never)
  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  await ui.press({ key: 'copy-path:/tmp/ticket.md' })
  await ui.press({ key: 'copy-content:/tmp/ticket.md' })
  expect(started.map(argv => argv.slice(-1)[0])).toEqual(['/tmp/ticket.md', '/tmp/ticket.md'])
  expect(started[1]?.[2]).toMatch(/< "\$1"/)
})

test('a feed is read tolerantly: broken output becomes a note, rows without a key are dropped', () => {
  expect(splitCommand('"C:\\Program Files\\tool.exe" --json  --days 2')).toEqual([
    'C:\\Program Files\\tool.exe',
    '--json',
    '--days',
    '2',
  ])
  expect(formatDay('2026-10-07')).toEqual('07.10.')
  expect(formatDay('2026-10-07', 'en')).toEqual('10-07')
  expect(parseFeed('not json')).toEqual({ list: [], since: '', note: 'no-json' })
  expect(parseFeed('{"error":"team","message":"The list is empty.","tickets":[]}').note).toEqual('The list is empty.')
  const feed = parseFeed(
    '{"since":"2026-10-07","tickets":[{"key":"ABC-1","summary":"One","url":"https://x/ABC-1"},{"summary":"no key"},7]}',
  )
  expect(feed).toEqual({
    list: [{ key: 'ABC-1', summary: 'One', url: 'https://x/ABC-1' }],
    since: '2026-10-07',
    note: '',
  })
})

test('the widget New tickets appears only with a feed command and lists what the command prints', async ($, on) => {
  const started: string[][] = []
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: new Date(2026, 9, 8, 15, 0, 0).getTime() }))
  on('process.run', (_$, e) => {
    started.push([...e.argv])

    return {
      value: {
        exitCode: 0,
        stdout:
          '{"since":"2026-10-07","tickets":[{"key":"ABC-1","summary":"Counter overflows","url":"https://x/ABC-1"}]}',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  await ui.press({ key: 'notice:accept' })
  expect((await ui.findAll({ text: /^New tickets$/ })).length).toEqual(0)

  expect((await $.command.run({ command: 'turbo', args: 'feed' } as never)).text).toMatch(/No command set/)
  const answer = await $.command.run({ command: 'turbo', args: 'feed tickets --json' } as never)
  expect(answer.text).toEqual('New tickets come from: tickets --json')
  expect(started.filter(argv => argv[0] === 'tickets')).toEqual([['tickets', '--json']])

  expect(await ui.find({ text: /^New tickets$/ })).toBeDefined()
  expect(await ui.find({ text: /^1 since 10-07$/ })).toBeDefined()
  expect(await ui.find({ text: / Counter overflows$/ })).toBeDefined()

  await ui.press({ key: 'feed:refresh' })
  expect(started.filter(argv => argv[0] === 'tickets').length).toEqual(2)

  expect((await $.command.run({ command: 'turbo', args: 'feed off' } as never)).text).toEqual(
    'New tickets switched off.',
  )
})

test('/compact and /clear in the Claude widget run only on a second press', async ($, on) => {
  const ran: string[] = []
  on('clock.now', () => ({ value: 1760000000000 }))
  on('session.compact', () => {
    ran.push('compact')

    return { skip: 'nothing to compact' }
  })
  on('command.run', { command: 'clear' }, () => {
    ran.push('clear')

    return { text: '' }
  })

  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  await ui.press({ key: 'session:compact' })
  expect(ran).toEqual([])
  expect(await ui.find({ text: /^\[Really\?\]$/ })).toBeDefined()

  await ui.press({ key: 'session:compact' })
  expect(ran).toEqual(['compact'])

  await ui.press({ key: 'session:clear' })
  expect(ran).toEqual(['compact'])
  await ui.press({ key: 'session:clear' })
  expect(ran).toEqual(['compact', 'clear'])
})

test('/turbo demo fills the pane with made-up data and gives the real state back', async ($, on) => {
  const started: string[] = []
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: new Date(2026, 9, 9, 15, 0, 0).getTime() }))
  on('process.run', (_$, e) => {
    started.push(String(e.argv[0]))

    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const sample = demoState(0)
  // Nothing in the sample may point at a real machine or a real ticket system
  expect(sample.files.every(file => file.path.startsWith('/home/sam/projects/'))).toEqual(true)
  expect(sample.feed.list.every(ticket => ticket.url.startsWith('https://tickets.example.com/'))).toEqual(true)

  expect((await $.command.run({ command: 'turbo', args: 'demo' } as never)).text).toMatch(/^Sample data shown/)
  const ui = await $.ui.mount({ ...MOUNT, surface: 'terminal' })
  expect(await ui.find({ text: /release-notes\.md/ })).toBeDefined()
  expect(await ui.find({ text: /^shop$/ })).toBeDefined()
  expect(await ui.find({ text: /^New tickets$/ })).toBeDefined()
  expect(await ui.find({ text: /42k of 200k/ })).toBeDefined()

  // While the sample is shown, a pull must not reach a real repo
  const before = started.length
  await ui.press({ key: 'pull:/home/sam/projects/shop' })
  expect(started.length).toEqual(before)

  expect((await $.command.run({ command: 'turbo', args: 'demo' } as never)).text).toEqual('Sample data hidden.')
  expect((await ui.findAll({ text: /release-notes\.md/ })).length).toEqual(0)
  expect((await ui.findAll({ text: /^New tickets$/ })).length).toEqual(0)
})
