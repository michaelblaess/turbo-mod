# Turbo-MOD - Entscheidungen und offene Punkte

Was der Mod kann und wie man ihn bedient, steht in der [README](README.de.md). Hier steht,
warum er so gebaut ist und was noch aussteht. Grundlage ist die Mod-Schnittstelle von Claude
Code, sie ist "early access" und ändert sich zwischen Versionen.

## Entscheidungen

- **Ein Pane, mehrere Widgets.** Jedes Widget ist ein Abschnitt mit eigener Kopfzeile. Der
  Zustand "eingeklappt" liegt im Sitzungszustand des Hosts und übersteht ein Neuladen des Mods.
- **Plattform wird erkannt, nicht eingestellt.** `OS=Windows_NT` heißt Windows, sonst
  entscheidet `uname -s`. `WT_SESSION` heißt Windows Terminal, `TMUX` heißt tmux. Ohne eines
  der beiden bietet das Terminal-Widget nichts an und sagt das auch.
- **Bash kann nicht teilen.** Unter Linux teilt tmux das Fenster. Andere Terminals (kitty,
  WezTerm, GNOME Terminal) haben je eigene Kommandos und sind nicht eingebaut.
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

## Offen

- **Andere Sitzungen anzeigen.** Ginge nur über einen Dienst außerhalb des Mods und wäre damit
  eine Abhängigkeit, die ein öffentlicher Mod nicht haben soll. Nicht eingebaut.
- **Weitere Widgets:** laufende Hintergrundaufgaben, zuletzt benutzte Befehle.
- **Weitere Effekte.** `print` und `slide` aus retro-text-effects.js lassen sich nach
  demselben Muster nachbauen.
- **Andere Terminals.** kitty und WezTerm haben eigene Kommandos zum Teilen, die sich neben
  Windows Terminal und tmux einhängen ließen.
