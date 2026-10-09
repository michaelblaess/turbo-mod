# turbo-mod

<p align="center">
  <img src="docs/flags/gb.svg" height="13" alt=""> <b>English</b> ·
  <img src="docs/flags/de.svg" height="13" alt=""> <a href="README.de.md">Deutsch</a>
</p>

---

A side pane for [Claude Code](https://claude.com/claude-code). It sits to the right of the
conversation and shows what you otherwise keep asking for:

- **Files** - every file Claude wrote in this session, with buttons to open or copy it
- **Terminal** - split the window or open a new tab, in the folder you are working in
- **Repos** - which of your git repos have uncommitted changes or unpushed commits, with a
  pull button next to each
- **Claude** - how much of your limits is used, when they reset and how full the context is
- **New tickets** - optional, off by default: new tickets from your ticket system

It comes with 41 retro color schemes, speaks English and German, and plays a small text effect
in its title.

```
♞ Turbo-MOD v0.13.0 · (c) 2026 Michael Blaess · Open Source @ 16 MHz
Theme ◂ lenseflare ▸ · [EN] · GitHub

▾ Files 2 files · 14.3 KB
  2 + notes.md
      ~/projects/shop/docs
      2.1 KB · 10-08 15:02:11
      [nvim] [open] [path] [content]
  1 ~ cart.ts
      ...
  [clear list]

▾ Terminal Windows Terminal · cheat sheet
  Split [←] [→] [↓]
  [New tab]  [Close last pane]

▾ Repos 2 of 9 with changes
  ● shop ~3 ?1 ↑1 [pull] [>_] feature/ABC-123-fix
  ● website ↓2 [pull] [>_] main
  × ~/projects
  [refresh]  [fetch all]  [add folder]  15:02

▾ Claude · cheat sheet
  Current session
  ██████████░░░░░░░░░░░░   48 %
  Resets 17:20
  Current week
  ██░░░░░░░░░░░░░░░░░░░░   10 %
  Resets 10-15 09:00
  Context
  ████░░░░░░░░░░░░░░░░░░   21 %
  42k of 200k · Cost $1.37
  [refresh]  15:02  [/compact]  [/clear]
```

Everything in square brackets is a button, and so are the single arrows and the cross.

> turbo-mod is a *mod*: a Claude Code plugin that draws its own surface. The mod interface of
> Claude Code is early access and may change between releases. turbo-mod was built and tested
> with Claude Code 2.1.291.

## What you need

- **Claude Code** in a terminal. The install command below does not work in the desktop app.
- **git**, for the Repos widget.
- For the Terminal widget, the editor button and `[>_]`: **Windows Terminal** on Windows, or
  **tmux** on Linux and macOS. Without one of them the rest of the pane still works.

**Git Bash on Windows:** start it as a profile inside Windows Terminal. In the standalone Git
Bash window (mintty) Claude Code does not start interactively and ends with `Input must be
provided either through stdin or as a prompt argument`. That is a limit of that window, not of
the mod.

## Install

1. Start Claude Code in a terminal:

   ```
   claude
   ```

2. Type this line at the prompt and press Enter:

   ```
   /plugin install turbo-mod --marketplace michaelblaess/turbo-mod
   ```

3. Claude Code asks three things:
   - `Add marketplace?` - answer `y`. This only tells Claude Code where to fetch the mod from.
   - The scope - press Enter for *user*. The mod then loads in every session you start.
   - The options (theme, repo folder, language and so on) - press Enter to keep the defaults.
     You can change all of them later inside the pane or with `/turbo`.

You then see `Installed turbo-mod. Plugin is now active.` and the pane appears on the right.
No restart is needed.

**The pane does not show up?** It opens by itself only when the terminal is at least 144
columns wide. In a narrower window, type `/turbo`.

## First steps

- On the very first start the pane shows a short disclaimer in a frame. Click `[Understood]` once. Until then
  `[pull]`, `[fetch all]` and the ticket command stay locked, everything else works. The
  answer is remembered on this machine.
- Ask Claude to write a file. It shows up under **Files**, newest on top.
- Click the arrow in front of a heading to fold a widget away.
- Click the arrows next to **Theme** below the title to try the color schemes.
- Click `[EN]` next to it to switch the pane to German, and again to switch back.
- Open **Repos** and click `[choose folder]` to pick the folder your git repos live in.
  `[add folder]` adds a second one, for example one for work and one for your own projects.

## The widgets

### Files

Every file Claude wrote through `Write`, `Edit` or `NotebookEdit`, newest on top:

- a running number, in the order the files were first written
- `+` for a new file, `~` for a changed one
- the file name and its folder as links
- size, time of the last write and how often it was written
- a button with the name of your editor (`[nvim]` by default) that opens the file in a new
  split. The button only appears when the editor was found on your machine.
- `[open]` opens the file with the default application of your system
- `[path]` puts the path of the file on the clipboard, `[content]` its whole text. Handy for
  a draft you want to paste somewhere else.

When the list is longer than its room in the pane, a row with two arrows and the range
(`◂ 6-10 of 11 ▸`) pages through it. After the last page the first one follows. A new write
takes the list back to page one, because the file just written is on top.

### Terminal

One row with the three splits, each an arrow in the direction the new pane opens, and one row
with `[New tab]` and `[Close last pane]`. Everything starts in the working folder of the
session. `[Close last pane]` asks once: the button turns into `[Really close?]` and only closes
on a second click within five seconds. Under Windows Terminal the heading carries a link to a
cheat sheet for its shortcuts.

### Repos

The state of all git repos directly below one or more folders. Only repos that need attention
are listed. Behind the name is what is open:

| Sign | Meaning |
|---|---|
| `~3` | three changed files git already knows |
| `?1` | one new file git does not know yet |
| `↑1` | one commit you have not pushed |
| `↓2` | two commits you do not have yet (as of your last fetch) |

The widget starts folded and reads when you open it, then every two minutes while it stays
open.

- `[pull]` next to a repo runs `git pull --ff-only` there, which fetches first. It only ever
  fast-forwards: no merge commit, no rebase. If that is not possible, git's reason is shown
  and nothing is changed. A pull only clears `↓`. A repo with `~` or `?` stays in the list
  afterwards, because your own changes are still there.
- `[>_]` opens a terminal split in the folder of that repo.
- `[fetch all]` runs `git fetch` in every repo and reads again. Use it to see which repos are
  behind, since reading alone never contacts a server.
- `[add folder]` adds another folder, the `×` in front of a folder removes it from the list.
  With more than one folder, the repos are grouped by folder.
- With a ticket address set, a ticket key in a branch name (`ABC-123` in
  `feature/ABC-123-fix`) becomes a link to that ticket. Set it once with
  `/turbo ticket https://jira.example.com/browse/{id}`.

### Claude

What Claude Code measures for the running session, drawn as bars like `/usage` does: each
rate-limit window with the share used and the time it resets, then the context window with the
cost so far. A bar is green, yellow from 80 % and red from 95 %.

The figures arrive after every answer and once a minute while the widget is open, `[refresh]`
reads them right away. The pane never asks a server for them: Claude Code learns the limits
from its last answer, so use in another session shows up only after the next answer in this
one. The heading carries a link to a Claude Code cheat sheet.

Next to `[refresh]` are `[/compact]` and `[/clear]`. They do what the commands of the same name
do: summarize the conversation to free context, or start a fresh one. Both change the
conversation for good, so the button turns into `[Really?]` and only runs on a second click
within five seconds.

### New tickets (optional)

Off by default. The widget appears once you name a command that prints tickets as JSON:

```
/turbo feed <command>
```

The mod runs that command when you open the widget, on `[refresh]` and every ten minutes while
it is open, and lists what comes back: the ticket key as a link, the title behind it, eight
tickets at most. The mod never talks to a ticket system itself and knows no credentials, the
command does that. `/turbo feed off` switches the widget off again.

The command prints one JSON object. Only `key` is required per ticket, other fields are ignored:

```json
{
  "since": "2026-10-07",
  "tickets": [{ "key": "ABC-123", "summary": "Counter overflows", "url": "https://jira.example.com/browse/ABC-123" }]
}
```

A `message` in that object is shown instead of the list, for example when the command could
not reach the server. [jira-timesheet](https://github.com/michaelblaess/jira-timesheet) prints
exactly this format for Jira, from version 1.25.0 on:

```
/turbo feed jira-timesheet --new-tickets-json
```

If `jira-timesheet` is not on the PATH, give the full path. A path with blanks goes in double
quotes.

## Commands

| Command | What it does |
|---|---|
| `/turbo` | show or hide the pane |
| `/turbo theme <name>` | pick a color scheme, without a name you get the list |
| `/turbo repos <path>` | add a repo folder on this machine, without a path: refresh |
| `/turbo repos remove <path>` | remove a repo folder from the list |
| `/turbo ticket <address>` | ticket address with `{id}`, without an address: show it |
| `/turbo feed <command>` | switch on the widget New tickets, `off` switches it off |
| `/turbo lang <de\|en>` | language of the pane and of the answers |
| `/turbo clear` | reset the list of files, numbering starts again at 1 |
| `/turbo effect` | switch the title effect off or on |
| `/turbo demo` | show or hide made-up sample data, for a screenshot that shows nothing of your work |

Everything you set this way is remembered per machine and survives a restart.
The close mark of the pane or `ctrl+x x` hides it as well.

## Color schemes

41 retro schemes, taken from [textual-themes](https://github.com/michaelblaess/textual-themes),
for example `brotkasten`, `boing`, `synthwave`, `lenseflare` and `christophorus`. `standard`
follows the theme you set in Claude Code.

## Settings

Under `/config`, or in `~/.claude/settings.json` under `pluginConfigs["turbo-mod"].options`.
A value set in the pane or with `/turbo` on a machine takes precedence there.

| Field | Default | Meaning |
|---|---|---|
| `theme` | `standard` | color scheme |
| `reposRoot` | empty | repo folder, several separated by `;` |
| `language` | `en` | language of the pane, `en` or `de` |
| `ticketUrl` | empty | ticket address with `{id}` |
| `ticketFeed` | empty | command for the widget New tickets |
| `editor` | `nvim` | program behind the editor button, a name or a full path |

Without a folder from the pane or from `reposRoot`, the environment variable
`TURBO_MOD_REPOS` is used.

## Update and uninstall

```
claude plugin update turbo-mod
claude plugin uninstall turbo-mod
```

After an update, type `/reload-plugins` in a running session.

## Limits

- Files created by a shell command (a redirect, a copy, a script) are not seen.
- The desktop app gets no `file:` links, the path is shown as text there.
- Windows Terminal has no command to close a pane and none to split to the left. The split to
  the left therefore splits to the right and swaps the two panes. `[Close last pane]` moves the
  focus to the pane that was active before and then sends Ctrl+Shift+W to the window in the
  foreground. If there is no other pane, that closes the tab Claude runs in.
- Other terminals (kitty, WezTerm, GNOME Terminal) are not supported for splitting.
- The folder dialog needs `zenity` on Linux, the clipboard buttons `wl-copy` or `xclip`.
- `[content]` is meant for text files.
- Windows Terminal opens links only with Ctrl held down. The buttons react to a plain click.
- A button cannot take a color, it is drawn in the text color of your terminal. On light
  schemes the buttons therefore sit on a dark patch. With a light terminal and a dark scheme
  a button can be hard to read.
- Reading the repos never contacts a server. "Ahead" and "behind" reflect your last fetch,
  only `[pull]` and `[fetch all]` talk to the server. Both wait at most a minute per repo.
- At most 80 folders below each repo folder are read.

## For developers

Clone the repo and load the mod from the folder. Claude Code watches the folder and reloads
the mod when you save a file.

```
git clone https://github.com/michaelblaess/turbo-mod
claude --plugin-dir turbo-mod
```

To load it in every session, put the absolute path of the clone into the environment variable
`CLAUDE_CODE_PLUGIN_DIRS`. A terminal that was already open keeps the old value, so restart it.

On load, Claude Code writes the types of the mod interface to `.claude-plugin/types/`
(ignored by git). With them in place:

```
npm install        # once: Biome and TypeScript, only for development
npm run check      # Biome, tsc, claude plugin validate, claude plugin test
npm run format     # let Biome fix formatting and what it can fix safely
```

Biome lints and formats `hooks/` and `types/`, the generated `hooks/palettes.ts` is left out.
`package-lock.json` is not committed, it depends on the registry of the machine.

Texts live in `hooks/texts.ts`, one block per language. The palettes in `hooks/palettes.ts`
are a snapshot written by `tools/snapshot_palettes.py`. What is planned and what was decided
is in [PLAN.md](PLAN.md) (German).

## License

[Apache License 2.0](LICENSE) - (c) 2026 Michael Blaess
