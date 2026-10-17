# Turbo-MOD - Entscheidungen und offene Punkte

Was der Mod kann und wie man ihn bedient, steht in der [README](README.de.md). Hier steht,
warum er so gebaut ist und was noch aussteht. Grundlage ist die Mod-Schnittstelle von Claude
Code, sie ist "early access" und ändert sich zwischen Versionen.

## Entscheidungen

- **Ein Pane, mehrere Widgets.** Jedes Widget ist ein Abschnitt mit eigener Kopfzeile. Der
  Zustand "eingeklappt" liegt im Sitzungszustand des Hosts und übersteht ein Neuladen des Mods.
- **Plattform wird erkannt, nicht eingestellt.** `OS=Windows_NT` heißt Windows, sonst
  entscheidet `uname -s`. `WT_SESSION` heißt Windows Terminal, `TMUX` heißt tmux,
  `KITTY_WINDOW_ID` zusammen mit `KITTY_LISTEN_ON` heißt kitty. Ohne eines davon bietet das
  Terminal-Widget nichts an und sagt das auch.
- **Bash kann nicht teilen.** Unter Linux teilen tmux und kitty das Fenster. Andere Terminals
  (WezTerm, GNOME Terminal) haben je eigene Kommandos und sind nicht eingebaut.
- **kitty teilt über `kitty @ launch`.** Das braucht `allow_remote_control` und `listen_on` in
  der `kitty.conf`. Ist kitty erkannt, der Socket aber nicht gesetzt, nennt das Widget genau
  diesen Grund statt des allgemeinen Hinweises. Links gibt es auch hier nicht: rechts teilen,
  dann `action move_window left`. Geschlossen wird mit `close-window --match recent:1`.
  Geprüft am 11.10.2026 mit kitty 0.32.2 gegen ein eigenes Testfenster.
- **Ghostty lässt sich nicht teilen.** Version 1.3.1 kennt unter Linux von außen nur
  `+new-window`, auf `main` zusätzlich `+new-tab`. Unter macOS gibt es seit 1.3.0 AppleScript
  mit `split`, das ist nicht eingebaut, weil kein Mac zum Prüfen da ist. Das Widget erkennt
  Ghostty an `TERM_PROGRAM` und verweist auf tmux.
- **Schließen trifft das zuletzt aktive Pane, nicht das aktive.** Beim Druck auf den Knopf
  ist das Pane von Claude das aktive. Unter tmux schließt `kill-pane -t {last}`. Windows
  Terminal hat kein Kommando dafür, dort wandert der Fokus per `move-focus previous`, danach
  geht Strg+Umschalt+W an das Fenster im Vordergrund. Der Knopf fragt deshalb einmal nach.
- **Was sich nicht zurücknehmen lässt, braucht einen zweiten Klick.** Das gilt für das
  Schließen eines Panes und für `/compact` und `/clear` im Claude-Widget.
- **Der Editor wird mit vollem Pfad gestartet.** Ein neues Pane erbt die Umgebung von
  Windows Terminal und nicht die von Claude Code. Der Start sucht den Editor deshalb per
  `where.exe` oder `which` und zeigt den Knopf nur, wenn er gefunden wurde.
- **Ein Knopf nimmt keine Farbe an.** `Button` kennt nur `dimColor` und einen Stil für den
  Mauszeiger. Auf hellen Schemata liegt deshalb die dunkle Schriftfarbe des Schemas als Grund
  hinter jedem Knopf. Knöpfe mit Text stehen in eckigen Klammern, damit man sie erkennt.
- **Texte liegen je Sprache in `hooks/texts.ts`**, Deutsch und Englisch. Die Vorgabe
  ist Englisch, der Knopf unter dem Titel oder `/turbo lang de` stellt um.
- **Der Start hängt nicht an `session.start`.** Nach einem Neuladen des Mods, beim Fortsetzen
  einer Sitzung und nach `/clear` bleibt das Ereignis aus. Der Start läuft deshalb auch beim
  ersten Zeichnen und vor jedem Befehl.
- **Der Repo-Ordner ist je Rechner verschieden** und steht deshalb nicht im Repo. Reihenfolge:
  `/turbo repos <pfad>` (wird je Rechner im Speicher des Mods gehalten), dann die Option
  `reposRoot`, dann die Umgebungsvariable `TURBO_MOD_REPOS`.
- **Das Lesen der Repos holt nichts vom Server.** Es liest `git status`, "voraus" und
  "zurück" beziehen sich also auf den letzten Fetch.
- **Pull spult nur vor.** Der Knopf ruft `git pull --ff-only`. Ein Klick im Pane soll nie
  einen Merge-Commit erzeugen oder lokale Arbeit umschreiben. Scheitert das, zeigt der Mod
  die erste Zeile der Fehlermeldung von git.
- **Neue Tickets kommen über einen Befehl, nicht über eine Schnittstelle zu einem
  Ticketsystem.** Der Mod startet eine Befehlszeile aus den Einstellungen und liest ein kleines
  JSON-Format. Damit bleibt er ohne Zugangsdaten und ohne Abhängigkeit, und jedes Ticketsystem
  lässt sich anbinden. Ohne Befehl gibt es das Widget nicht.
- **Hinweis beim ersten Start.** Der Mod startet Programme und spricht auf Knopfdruck mit
  Servern. Bis der Disclaimer bestätigt ist, sind pull, fetch und der Ticket-Befehl gesperrt.
- **Beispieldaten für Bildschirmfotos.** `/turbo demo` füllt das Pane mit erfundenen Dateien,
  Repos und Tickets, damit ein Bild nichts aus der eigenen Arbeit zeigt.
- **Farben als Schnappschuss.** `tools/snapshot_palettes.py` schreibt die Paletten aus
  textual-themes einmalig nach `hooks/palettes.ts`. Keine Abhängigkeit zur Laufzeit.
- **Textual-Widgets gehen nicht.** Textual ist Python, der Mod darf nur die Elemente des
  Hosts zeichnen (`Box`, `Text`, `Button`, `Link` und weitere).
- **retro-text-effects.js läuft nicht als Bibliothek**, weil es das DOM und
  `requestAnimationFrame` braucht. Drei Effekte sind als kleine eigene Funktionen nachgebaut,
  getaktet über den Taktgeber des Hosts.
- **Die TODO-Liste ist eine Markdown-Datei außerhalb jedes Repos.** Vorgabe ist
  `~/.claude/turbo-mod-todo.md`, je Rechner eine eigene. Die Aufgaben dürfen in keiner
  Git-Historie landen: Ein Pfad in einem Repo wird abgelehnt, geprüft mit
  `git rev-parse --is-inside-work-tree`. Die Datei wird vor jeder Änderung neu gelesen, weil sie
  jemand von Hand bearbeitet haben kann, und eine Aufgabe wird über Zeile und Text gefunden.
  Zeilen, die keine Aufgabe sind, bleiben stehen. Im Demo-Modus wird nicht gelesen und nicht
  geschrieben.
- **Bearbeiten per Doppelklick auf den Text.** Die Schnittstelle kennt keinen Doppelklick und
  keinen anklickbaren Text. Der Text einer offenen Aufgabe ist deshalb ein `Button`, und zwei
  Klicks innerhalb von 600 Millisekunden öffnen das Textfeld. Ein Knopf kürzt seine Beschriftung
  nicht selbst, der Mod schneidet sie auf die Breite des Panes zu. Eine erledigte Aufgabe bleibt
  `Text`, weil ein Knopf nicht durchstreichen kann.
- **Das Pane bittet beim Plus um die Tastatur.** Ein Klick auf einen Knopf gibt sie ihm nicht.
  `$.ui.open` mit `focus` fragt danach, der Host gewährt sie nur bei leerer Eingabezeile.
- **Text kommt über `Input`, auf dem Handy über den Befehl.** Die Tabelle der Elemente kennt
  `Input` auf jeder Fläche außer der mobilen. Dort fehlt das Plus, `/turbo todo <text>` legt
  die Aufgabe an. Solange die Liste leer ist, bleibt der Abschnitt eingeklappt, damit die
  Dateiliste ihren Platz behält.
- **RetroAmp über zwei Dateien statt über einen Port.** RetroAmp schreibt
  `~/.retro-amp/now-playing.json` und liest ein Befehlswort aus `~/.retro-amp/control`, nach dem
  Muster seines eigenen Play-Requests für die zweite Instanz. Ein lokaler HTTP-Port hätte sofort
  reagiert, wäre aber ein offener Port und für die Prüfung im Verzeichnis ein Punkt mehr unter
  "sends data out". Die Mediensteuerung des Betriebssystems (SMTC, MPRIS) wäre pro System eigen.
  Der Mod liest einmal pro Sekunde, solange der Abschnitt offen ist, und rechnet die Position
  zwischen zwei Schreibvorgängen selbst weiter. Ein Stand älter als 20 Sekunden gilt als beendet,
  so fällt auch ein Absturz auf, nach dem `running` noch auf true steht. Ohne die Datei gibt es
  den Abschnitt nicht, auch keine Trennlinie.

## Offen

- **Andere Sitzungen anzeigen.** Ginge nur über einen Dienst außerhalb des Mods und wäre damit
  eine Abhängigkeit, die ein öffentlicher Mod nicht haben soll. Nicht eingebaut.
- **Weitere Widgets:** laufende Hintergrundaufgaben, zuletzt benutzte Befehle.
- **Weitere Effekte.** `print` und `slide` aus retro-text-effects.js lassen sich nach
  demselben Muster nachbauen.
- **Andere Terminals.** kitty und WezTerm haben eigene Kommandos zum Teilen, die sich neben
  Windows Terminal und tmux einhängen ließen.
