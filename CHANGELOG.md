# Changelog

Alle nennenswerten Änderungen an ifsmb.de stehen in dieser Datei.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/). Die Seite hat keine Versionsnummern: Jeder Abschnitt ist ein Tag, an dem Änderungen live gegangen sind (Datum im Format JJJJ-MM-TT).

## [Unreleased]

### Hinzugefügt

- Projekt „junior1stein für die KTG“: Falkos Anfrage bei der Berliner MINT-Initiative junior1stein, welche Möglichkeiten es für die KTG gibt (wie im Cluster Mitte). Verlinkt von der KTG-AG und von „Geld für Makespaces“; neues Stichwort `junior1stein`.
- „Geld für Makespaces“: Die Platanus Schule als zweites Beispiel für den IfsMB-Weg (eigener Drucker, AG, erste Lehrkräfte mit Ideen wie einem Stempel für den Töpferunterricht); Stand auch im Projekt der Platanus Schule.
- Rosalind-Franklin-Gymnasium (Projekt, Eröffnungstermin, „Geld für Makespaces“): Die 6 Drucker kommen aus der Förderung über junior1stein.

### Geändert

- Suche lokal: Pagefind-Index bleibt beim Neubauen erhalten, `/suche/` funktioniert auch mit `jekyll serve`.
- Tote externe Links in FLSUN V400, im AG-Beitrag von 2024 und beim Lastenlaufrad-Projekt markiert.

- Team: Falkos Profilfoto wieder ohne verpixelte Gesichter im Hintergrund (Ausschnitt aus dem Foto im Beitrag zum Jugend Hackt Congress 2026).

### Behoben

- Rosalind-Franklin-Gymnasium: Der Makespace eröffnet nicht erst im Januar 2027 – die Drucker sind seit Beginn des Schuljahres 2026/27 im Einsatz und die AG läuft; im Januar gibt es nur eine kleine feierliche Eröffnung (Projekt, Termin, Teamprofil Frieder, „Geld für Makespaces“, junior1stein für die KTG). Der Termin heißt jetzt „Kleine feierliche Eröffnung des Makespace am Rosalind-Franklin-Gymnasium“ und ist mit dem Besuch von Schulstadtrat Benjamin Fritz an der KTG gegenseitig verlinkt.
- Link-Check `_scripts/check_site.rb`: findet tote interne Links, fehlende Anker und verwaiste Seiten; läuft im Pages-Workflow und stoppt das Deployment bei Fehlern (`--extern` prüft zusätzlich externe Links).
- Dauerhaft tote externe Links werden mit 🪦 markiert und unten auf der Seite erklärt.
- Termine mit Personen verknüpfen (`team:`): Teamprofile zeigen kommende und vergangene Termine, die Terminseite zeigt „Dabei aus dem Team“. Alle bisherigen Termine sind eingetragen (Falko war nicht beim Ausflug zu happybite).
- Kalender: Jeder Termin zeigt oben rechts die Gesichter der Beteiligten aus dem Team als kleine runde Fotos (Mini-Fotos `photo_icon`, 48 px; ohne Foto die Initialen).
- Projektidee „Tarmo5 bauen?“: ein 3D-gedrucktes RC-Auto mit Links zu Printables, YouTube und Reddit, auch in der Ideen-Linksammlung.
- Termin und Beitrag „Chaos macht Kita – 3D Druck für Kinder 1.0“: Falkos 3D-Druck-Livestream für Kita-Kinder vom 21.05.2020 (Terminseite mit Vorschaubild der Aufzeichnung), Beitrag übernommen aus seinem Blog volkersfreunde.
- Kalender: „Chaos macht Kita (3D-Druck)“ – Falkos 3D-Druck-Einführung in der INA Habersaathstraße am 20.10.2023, verlinkt mit dem Beitrag „3D-Druck in der Kita“.
- Besuch von Schulstadtrat Benjamin Fritz (Termin und Pressemitteilung): Links zu den Beiträgen des Bezirksamts Mitte auf Bluesky und X sowie zum Facebook-Beitrag.
- Presse: neuer Abschnitt „Wir in der Presse“ mit Berichten anderer über uns (`_data/presseberichte.yml`).

- Neue Seite „Geld für Makespaces“ (`/geld-fuer-makespaces/`, im Menü unter „Wir“, noch im Aufbau): wie Schulen einen Makespace finanzieren können – Bootstrapping wie an der KTG, das Programm „Maker Spaces“ von #wirfürschule (bis zu 10.000 €), die Berliner MINT-Initiative junior1stein und gebrauchte Hardware über „Das macht Schule“. Dazu Infos aus dem Maker-Space-Newsletter von #wirfürschule: Newsletter und Social-Media-Kanäle, InnovatorsMap, Podcast, Ideen und Termine. Hinweis, dass das Rosalind-Franklin-Gymnasium junior1stein wohl genutzt hat (auch auf der Projektseite). Verlinkt von Angebot und Spenden.

### Geändert

- Angebot, „Warum ein Institut?“: Falkos eigentlicher Grund – alles dokumentieren und auf ein unabhängiges Fundament stellen; „Jeder kann ein Institut gründen“.
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
