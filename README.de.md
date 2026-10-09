# turbo-mod

<p align="center">
  <img src="docs/flags/gb.svg" height="13" alt=""> <a href="README.md">English</a> ·
  <img src="docs/flags/de.svg" height="13" alt=""> <b>Deutsch</b>
</p>

---

Ein Pane für [Claude Code](https://claude.com/claude-code). Es steht rechts neben dem Gespräch
und zeigt, wonach Du sonst immer wieder fragst:

- **Dateien** - jede Datei, die Claude in dieser Sitzung geschrieben hat, mit Knöpfen zum
  Öffnen und Kopieren
- **Terminal** - das Fenster teilen oder einen neuen Tab öffnen, im Ordner, in dem Du arbeitest
- **Repos** - welche Deiner Git-Repos offene Änderungen oder nicht gepushte Commits haben, mit
  einem Pull-Knopf an jedem
- **Claude** - wie viel von Deinen Limits verbraucht ist, wann sie zurückgesetzt werden und wie
  voll der Kontext ist
- **Neue Tickets** - optional, in der Vorgabe aus: neue Tickets aus Deinem Ticketsystem

Dazu kommen 41 Retro-Farbschemata, Englisch und Deutsch als Sprache und ein Titel, der einen
kleinen Texteffekt abspielt.

```
♞ Turbo-MOD v0.13.0 · (c) 2026 Michael Blaess · Open Source @ 16 MHz
Theme ◂ lenseflare ▸ · [DE] · GitHub

▾ Dateien 2 Dateien · 14,3 KB
  2 + notizen.md
      ~/projekte/shop/docs
      2,1 KB · 08.10. 15:02:11
      [nvim] [öffnen] [Pfad] [Inhalt]
  1 ~ cart.ts
      ...
  [Liste leeren]

▾ Terminal Windows Terminal · Spickzettel
  Split [←] [→] [↓]
  [Neuer Tab]  [Letztes Pane schließen]

▾ Repos 2 von 9 mit Änderungen
  ● shop ~3 ?1 ↑1 [pull] [>_] feature/ABC-123-fix
  ● website ↓2 [pull] [>_] main
  × ~/projekte
  [neu lesen]  [alle fetchen]  [Ordner hinzufügen]  15:02

▾ Claude · Spickzettel
  Aktuelle Sitzung
  ██████████░░░░░░░░░░░░   48 %
  Reset 17:20
  Aktuelle Woche
  ██░░░░░░░░░░░░░░░░░░░░   10 %
  Reset 15.10. 09:00
  Kontext
  ████░░░░░░░░░░░░░░░░░░   21 %
  42k von 200k · Kosten 1,37 $
  [neu lesen]  15:02  [/compact]  [/clear]
```

Alles in eckigen Klammern ist ein Knopf, ebenso die einzelnen Pfeile und das Kreuz.

> turbo-mod ist ein *Mod*: ein Plugin für Claude Code, das eine eigene Fläche zeichnet. Die
> Mod-Schnittstelle von Claude Code ist "early access" und kann sich zwischen Versionen ändern.
> turbo-mod wurde mit Claude Code 2.1.291 gebaut und getestet.

## Was Du brauchst

- **Claude Code** in einem Terminal. Der Befehl zum Installieren geht nicht in der Desktop-App.
- **git**, für das Widget Repos.
- Für das Widget Terminal, den Editor-Knopf und `[>_]`: **Windows Terminal** unter Windows oder
  **tmux** unter Linux und macOS. Ohne eines der beiden funktioniert der Rest des Panes trotzdem.

**Git Bash unter Windows:** Starte sie als Profil in Windows Terminal. Im eigenständigen
Git-Bash-Fenster (mintty) startet Claude Code nicht interaktiv und endet mit `Input must be
provided either through stdin or as a prompt argument`. Das liegt an diesem Fenster, nicht am
Mod.

## Installieren

1. Claude Code in einem Terminal starten:

   ```
   claude
   ```

2. Diese Zeile in die Eingabe tippen und Enter drücken:

   ```
   /plugin install turbo-mod --marketplace michaelblaess/turbo-mod
   ```

3. Claude Code fragt drei Dinge:
   - `Add marketplace?` - mit `y` antworten. Das sagt Claude Code nur, woher der Mod kommt.
   - Den Scope - Enter für *user*. Der Mod lädt dann in jeder Sitzung, die Du startest.
   - Die Optionen (Theme, Repo-Ordner, Sprache und so weiter) - Enter übernimmt die Vorgaben.
     Alles davon lässt sich später im Pane oder mit `/turbo` ändern.

Danach steht dort `Installed turbo-mod. Plugin is now active.`, und das Pane erscheint rechts.
Ein Neustart ist nicht nötig.

**Das Pane erscheint nicht?** Von selbst öffnet es sich erst ab 144 Spalten Terminalbreite.
In einem schmaleren Fenster tippst Du `/turbo`.

**Lieber auf Deutsch?** Unter dem Titel steht neben dem Theme der Knopf `[EN]`. Ein Klick stellt
das Pane auf Deutsch.

## Erste Schritte

- Beim allerersten Start zeigt das Pane einen kurzen Disclaimer in einem Rahmen. Klick einmal auf `[Verstanden]`.
  Bis dahin bleiben `[pull]`, `[alle fetchen]` und der Ticket-Befehl gesperrt, alles andere
  läuft. Die Antwort merkt sich der Mod auf diesem Rechner.
- Lass Claude eine Datei schreiben. Sie erscheint unter **Dateien**, die jüngste oben.
- Der Pfeil vor einer Überschrift klappt das Widget ein und wieder aus.
- Die Pfeile neben **Theme** unter dem Titel schalten durch die Farbschemata.
- Unter **Repos** wählst Du mit `[Ordner wählen]` den Ordner, in dem Deine Git-Repos liegen.
  `[Ordner hinzufügen]` nimmt einen zweiten dazu, etwa einen für die Arbeit und einen für eigene
  Projekte.

## Die Widgets

### Dateien

Jede Datei, die Claude über `Write`, `Edit` oder `NotebookEdit` geschrieben hat, die jüngste oben:

- laufende Nummer in der Reihenfolge des ersten Schreibens
- `+` für neu angelegt, `~` für geändert
- Dateiname und Ordner als Links
- Größe, Zeitpunkt des letzten Schreibens und wie oft die Datei geschrieben wurde
- ein Knopf mit dem Namen Deines Editors (Vorgabe `[nvim]`), der die Datei in einem neuen Split
  öffnet. Der Knopf erscheint nur, wenn der Editor auf Deinem Rechner gefunden wurde.
- `[öffnen]` öffnet die Datei mit der Standardanwendung des Systems
- `[Pfad]` legt den Pfad der Datei in die Zwischenablage, `[Inhalt]` ihren ganzen Text.
  Praktisch für einen Entwurf, den Du woanders einfügen willst.

Ist die Liste länger als ihr Platz im Pane, blättert eine Zeile mit zwei Pfeilen und dem Bereich
(`◂ 6-10 von 11 ▸`) durch die Seiten. Nach der letzten Seite kommt wieder die erste. Ein neuer
Schreibvorgang bringt die Liste zurück auf Seite 1, weil die gerade geschriebene Datei oben
steht.

### Terminal

Eine Zeile mit den drei Splits, jeder ein Pfeil in die Richtung, in der das neue Pane aufgeht,
und eine Zeile mit `[Neuer Tab]` und `[Letztes Pane schließen]`. Alles startet im Arbeitsordner
der Sitzung. `[Letztes Pane schließen]` fragt einmal nach: Der Knopf wird zu
`[Wirklich schließen?]` und schließt erst beim zweiten Klick innerhalb von fünf Sekunden. Unter
Windows Terminal steht in der Kopfzeile der Link zu einem Spickzettel für dessen Tastenkürzel.

### Repos

Der Zustand aller Git-Repos direkt unter einem oder mehreren Ordnern. Gezeigt werden nur Repos
mit Handlungsbedarf. Hinter dem Namen steht, was offen ist:

| Zeichen | Bedeutung |
|---|---|
| `~3` | drei geänderte Dateien, die git schon kennt |
| `?1` | eine neue Datei, die git noch nicht kennt |
| `↑1` | ein Commit, der noch nicht gepusht ist |
| `↓2` | zwei Commits, die Dir lokal fehlen (Stand des letzten Fetch) |

Das Widget startet eingeklappt und liest beim Aufklappen, danach alle zwei Minuten, solange es
offen ist.

- `[pull]` neben einem Repo führt dort `git pull --ff-only` aus, das holt vorher vom Server.
  Es spult nur vor: kein Merge-Commit, kein Rebase. Geht das nicht, erscheint die Begründung
  von git, und es ändert sich nichts. Ein Pull räumt nur `↓` ab. Ein Repo mit `~` oder `?`
  bleibt danach in der Liste, weil Deine eigenen Änderungen noch da sind.
- `[>_]` öffnet einen Terminal-Split im Ordner dieses Repos.
- `[alle fetchen]` führt in jedem Repo `git fetch` aus und liest neu. Damit siehst Du, welche
  Repos zurückliegen, denn das Lesen allein fragt nie einen Server.
- `[Ordner hinzufügen]` nimmt einen weiteren Ordner dazu, das `×` vor einem Ordner nimmt ihn aus
  der Liste. Bei mehr als einem Ordner stehen die Repos nach Ordner gruppiert.
- Ist eine Ticket-Adresse gesetzt, wird die Ticketnummer im Branchnamen (`ABC-123` in
  `feature/ABC-123-fix`) zum Link auf das Ticket. Einmal setzen mit
  `/turbo ticket https://jira.example.com/browse/{id}`.

### Claude

Was Claude Code für die laufende Sitzung misst, als Balken wie bei `/usage`: jedes Limit-Fenster
mit dem verbrauchten Anteil und der Uhrzeit des Resets, danach das Kontextfenster mit den Kosten
bisher. Ein Balken ist grün, ab 80 % gelb und ab 95 % rot.

Die Werte kommen nach jeder Antwort und einmal je Minute, solange das Widget offen ist,
`[neu lesen]` holt sie sofort. Das Pane fragt dafür keinen Server: Claude Code kennt die Limits
aus seiner letzten Antwort, Verbrauch in einer anderen Sitzung erscheint hier also erst nach der
nächsten Antwort in dieser. In der Kopfzeile steht der Link zu einem Spickzettel für Claude Code.

Neben `[neu lesen]` stehen `[/compact]` und `[/clear]`. Sie tun, was die gleichnamigen Befehle
tun: das Gespräch zusammenfassen, um Kontext freizugeben, oder ein neues beginnen. Beides ändert
das Gespräch endgültig, deshalb wird der Knopf zu `[Wirklich?]` und läuft erst beim zweiten
Klick innerhalb von fünf Sekunden.

### Neue Tickets (optional)

In der Vorgabe aus. Das Widget erscheint, sobald Du einen Befehl nennst, der Tickets als JSON
ausgibt:

```
/turbo feed <befehl>
```

Der Mod startet diesen Befehl beim Aufklappen des Widgets, bei `[neu lesen]` und alle zehn
Minuten, solange es offen ist, und listet, was zurückkommt: die Ticketnummer als Link, dahinter
der Titel, höchstens acht Tickets. Der Mod spricht nie selbst mit einem Ticketsystem und kennt
keine Zugangsdaten, das macht der Befehl. `/turbo feed aus` schaltet das Widget wieder ab.

Der Befehl gibt ein JSON-Objekt aus. Je Ticket ist nur `key` Pflicht, weitere Felder werden
übergangen:

```json
{
  "since": "2026-10-07",
  "tickets": [{ "key": "ABC-123", "summary": "Zähler läuft über", "url": "https://jira.example.com/browse/ABC-123" }]
}
```

Eine `message` in diesem Objekt erscheint statt der Liste, etwa wenn der Befehl den Server nicht
erreicht hat. [jira-timesheet](https://github.com/michaelblaess/jira-timesheet) gibt genau dieses
Format für Jira aus, ab Version 1.25.0:

```
/turbo feed jira-timesheet --new-tickets-json
```

Liegt `jira-timesheet` nicht im PATH, gib den vollen Pfad an. Ein Pfad mit Leerzeichen steht in
doppelten Anführungszeichen.

## Befehle

| Befehl | Wirkung |
|---|---|
| `/turbo` | Pane ein- oder ausblenden |
| `/turbo theme <name>` | Farbschema wählen, ohne Namen kommt die Liste |
| `/turbo repos <pfad>` | Repo-Ordner auf diesem Rechner hinzufügen, ohne Pfad neu lesen |
| `/turbo repos entfernen <pfad>` | Repo-Ordner aus der Liste nehmen |
| `/turbo ticket <adresse>` | Ticket-Adresse mit `{id}`, ohne Adresse: anzeigen |
| `/turbo feed <befehl>` | Widget Neue Tickets einschalten, `aus` schaltet es ab |
| `/turbo sprache <de\|en>` | Sprache des Panes und der Antworten |
| `/turbo leeren` | Liste der Dateien zurücksetzen, die Nummern beginnen wieder bei 1 |
| `/turbo effekt` | Titeleffekt aus- oder einschalten |
| `/turbo demo` | erfundene Beispieldaten ein- oder ausblenden, für ein Bildschirmfoto ohne eigene Arbeit |

Die englischen Wörter `lang`, `clear`, `effect`, `remove` und `off` gehen genauso. Alles, was Du
so setzt, gilt je Rechner und übersteht den Neustart.
Das Schließen-Zeichen des Panes oder `ctrl+x x` blendet es ebenfalls aus.

## Farbschemata

41 Retro-Schemata aus [textual-themes](https://github.com/michaelblaess/textual-themes),
zum Beispiel `brotkasten`, `boing`, `synthwave`, `lenseflare` und `christophorus`. `standard`
folgt dem Theme, das in Claude Code eingestellt ist.

## Einstellungen

Unter `/config` oder in `~/.claude/settings.json` unter `pluginConfigs["turbo-mod"].options`.
Was Du auf einem Rechner im Pane oder mit `/turbo` gesetzt hast, geht dort vor.

| Feld | Vorgabe | Bedeutung |
|---|---|---|
| `theme` | `standard` | Farbschema |
| `reposRoot` | leer | Repo-Ordner, mehrere durch `;` getrennt |
| `language` | `en` | Sprache des Panes, `en` oder `de` |
| `ticketUrl` | leer | Ticket-Adresse mit `{id}` |
| `ticketFeed` | leer | Befehl für das Widget Neue Tickets |
| `editor` | `nvim` | Programm hinter dem Editor-Knopf, Name oder voller Pfad |

Ohne Ordner aus dem Pane und ohne `reposRoot` gilt die Umgebungsvariable `TURBO_MOD_REPOS`.

## Aktualisieren und entfernen

```
claude plugin update turbo-mod
claude plugin uninstall turbo-mod
```

Nach einer Aktualisierung in einer laufenden Sitzung `/reload-plugins` tippen.

## Grenzen

- Dateien, die ein Shell-Kommando erzeugt (Umleitung, Kopie, ein Skript), sieht der Mod nicht.
- In der Desktop-App gibt es keine `file:`-Links, dort steht der Pfad als Text.
- Windows Terminal hat kein Kommando zum Schließen eines Panes und keines für einen Split nach
  links. Der Split nach links teilt deshalb rechts und tauscht die beiden Panes.
  `[Letztes Pane schließen]` setzt den Fokus auf das zuvor aktive Pane und schickt dann
  Strg+Umschalt+W an das Fenster im Vordergrund. Gibt es kein anderes Pane, schließt das den
  Tab, in dem Claude läuft.
- Andere Terminals (kitty, WezTerm, GNOME Terminal) werden beim Teilen nicht unterstützt.
- Die Ordnerauswahl braucht unter Linux `zenity`, die Knöpfe für die Zwischenablage `wl-copy`
  oder `xclip`.
- `[Inhalt]` ist für Textdateien gedacht.
- Windows Terminal öffnet Links nur mit gedrückter Strg-Taste. Die Knöpfe reagieren auf einen
  einfachen Klick.
- Ein Knopf nimmt keine Farbe an, er zeichnet in der Schriftfarbe des Terminals. Auf hellen
  Schemata stehen die Knöpfe deshalb auf einem dunklen Grund. Bei einem hellen Terminal und
  einem dunklen Schema kann ein Knopf schlecht lesbar sein.
- Das Lesen der Repos fragt nie einen Server. "Voraus" und "zurück" stammen vom letzten Fetch,
  nur `[pull]` und `[alle fetchen]` sprechen mit dem Server. Beide warten höchstens eine Minute
  je Repo.
- Gelesen werden höchstens 80 Ordner unter jedem Repo-Ordner.

## Für Entwickler

Repo klonen und den Mod aus dem Ordner laden. Claude Code beobachtet den Ordner und lädt den
Mod beim Speichern einer Datei neu.

```
git clone https://github.com/michaelblaess/turbo-mod
claude --plugin-dir turbo-mod
```

Soll er in jeder Sitzung laden, gehört der absolute Pfad des Klons in die Umgebungsvariable
`CLAUDE_CODE_PLUGIN_DIRS`. Ein Terminal, das schon offen war, behält den alten Wert, starte es
also neu.

Beim Laden legt Claude Code die Typen der Mod-Schnittstelle nach `.claude-plugin/types/`
(von git ausgenommen). Damit laufen:

```
npm install        # einmal: Biome und TypeScript, nur für die Entwicklung
npm run check      # Biome, tsc, claude plugin validate, claude plugin test
npm run format     # Biome richtet die Formatierung und was sich gefahrlos beheben lässt
```

Biome prüft und formatiert `hooks/` und `types/`, die erzeugte `hooks/palettes.ts` bleibt außen
vor. `package-lock.json` wird nicht committet, es hängt an der Registry des Rechners.

Die Texte liegen in `hooks/texts.ts`, ein Block je Sprache. Die Paletten in
`hooks/palettes.ts` sind ein Schnappschuss, geschrieben von `tools/snapshot_palettes.py`.
Was geplant ist und was entschieden wurde, steht in [PLAN.md](PLAN.md).

## Lizenz

[Apache License 2.0](LICENSE) - (c) 2026 Michael Blaess
