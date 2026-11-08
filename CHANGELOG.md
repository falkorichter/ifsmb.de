# Changelog

Alle nennenswerten Änderungen an ifsmb.de stehen in dieser Datei.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/). Die Seite hat keine Versionsnummern: Jeder Abschnitt ist ein Tag, an dem Änderungen live gegangen sind (Datum im Format JJJJ-MM-TT).

## [Unreleased]

### Hinzugefügt

- Link-Check `_scripts/check_site.rb`: findet tote interne Links, fehlende Anker und verwaiste Seiten; läuft im Pages-Workflow und stoppt das Deployment bei Fehlern (`--extern` prüft zusätzlich externe Links).
- Dauerhaft tote externe Links werden mit 🪦 markiert und unten auf der Seite erklärt.

### Geändert

- Suche lokal: Pagefind-Index bleibt beim Neubauen erhalten, `/suche/` funktioniert auch mit `jekyll serve`.
- Tote externe Links in FLSUN V400, im AG-Beitrag von 2024 und beim Lastenlaufrad-Projekt markiert.

- Team: Falkos Profilfoto wieder ohne verpixelte Gesichter im Hintergrund (Ausschnitt aus dem Foto im Beitrag zum Jugend Hackt Congress 2026).

## [2026-11-08]

### Hinzugefügt

- Bearbeiten-Button: Jede Seite verlinkt ihre Quelldatei im GitHub-Editor.
- Kalender: Besuch der KTG-AG bei der Firma von Nima am Südkreuz (März 2027, Tag noch offen).
- Kalender: Chaos Communication Camp 2027 (August, Termin und Ort noch offen).
- Kalender: Jugend hackt Congress 2026 – Falko zum ersten Mal als Mentor.
- Kalender: Winterfest in der Kulturfabrik mit 3D-Druck.
- Kalender: all about automation 2027 mit Stichwort `rosalind-franklin-gym`.
- Projekt-Ideen: VW-Bus T3 auf Cults.
- Treffpunkt Modellbau: Stand der Anmeldung und Links zu Falkos Mogster-Beiträgen, Stichwort `mogster`.
- Regel für Pull Requests: zu jedem gepushten Branch ein PR mit Vorschaubildern.

### Geändert

- Navigation: „Projekt-Ideen“ im Menü „Wir“.
- Projektseite: Autor*in nur anzeigen, wenn der Beitrag `author` hat.
- Bearbeiten-Button bündig mit dem Seiteninhalt.
- Workflow: Code-Kommentare auf Englisch.
- Kleine Textkorrekturen in einzelnen Beiträgen.

### Behoben

- Suche: Workflow prüft die Pages-Quelle, README erklärt die Ursache von #13.

## [2026-11-07]

### Hinzugefügt

- Projekte, Pressemitteilung, neue Beiträge, Partner und Termine.
- Projekt: 3D-Druck AG an der Platanus Schule (seit September 2026); Archiv mit KTG-AG Jahr 1 und 2 und der Programmierwerkstatt am Lessing-Gymnasium.
- Ausstattung: Prusa MK4 mit MMU, zwei Prusa MK3S, 3D-Scanner Lynx und Ferret SE mit Vergleich, LulzBot TAZ 6, LulzBot Mini, AxiDraw V3, Snapmaker U1, A1 mini der Platanus Schule, Core-XY von Anton; Übersicht nach Gerätetyp mit Status und Standort.
- Projekt-Ideen-Seite mit der Linksammlung; Projektidee „Einen OpenScan bauen?“.
- Angebot-Seite mit „Warum ein Institut?“ und Transparenzhinweis; Name im Impressum.
- Persönliche Projekte und persönliche Blogs fürs Team.
- Team: Jan, Frieder Euteneuer, Anton (mit Profilfotos und Projekten).
- Mogster-Projekt mit mehreren persönlichen Beiträgen.
- Volltextsuche `/suche/` mit Pagefind.
- Stichworte verknüpfen Projekte, Beiträge, Termine und Geräte („Verknüpft“-Box).
- Spenden: Kontakt für Materialspenden, Abschnitt „Wir sammeln Geld für folgende Projekte“.
- Pressekontakt mit verschleierter Telefonnummer (`.obf-tel`); Logo als SVG.
- Startseite: Slogan „Kompetent improvisieren seit gestern.“ mit Scramble-Effekt.
- Termine: Treffpunkt Modellbau in Paaren im Glien, Chaos Communication Camp 2023, Ausflug zu happybite, Besuch von augenrahmen.de u. a.

### Geändert

- Navigation aufgeräumt: „Wir“ mit Projekte, Angebot, Ausstattung, Team.
- Projekt-Updates als Zeitleiste und als eigene Beiträge.
- Spenden-Button: alle sechs Emoji der Spendenseite kreisen.
- Ausstattung: Rohfotos durch bereinigte Web-Versionen ersetzt.

### Entfernt

- Nachtschicht-Bericht aus dem Repo.

### Behoben

- Build: Worktree-Ordner nicht mehr als Submodule im Repo.
- Pages-Workflow: Ruby 3.1 statt 3.1.2 (auf ubuntu-26.04 nicht verfügbar).

## [2026-11-06]

### Hinzugefügt

- Jekyll-Seite für das Institut für spontane Makespace Buildung.
- Kalender mit iCal-Feed, Presseseite, Pages CMS, Teamfotos und erste Beiträge.
- Partner PC-Spende (Das macht Schule) mit Logo.
- Termine: Herbstfest beim Zazza, Winterfest in der Kulturfabrik.

### Entfernt

- Beispieltermin „Offener Bastelnachmittag“.

[Unreleased]: https://github.com/falkorichter/ifsmb.de/commits/main
[2026-11-08]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-08&until=2026-11-08
[2026-11-07]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-07&until=2026-11-07
[2026-11-06]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-06&until=2026-11-06
