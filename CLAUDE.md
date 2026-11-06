# CLAUDE.md — ifsmb.de

Website des „Institut für spontane Makespace Buildung“. Jekyll 4, GitHub Pages, Custom Domain `ifsmb.de`.

## Build

```bash
bundle exec jekyll build    # → _site/
bundle exec jekyll serve    # http://localhost:4000
```

Ruby 3.1.2 (`.ruby-version`). `_site/` niemals committen.

## Sprache

Alle sichtbaren Texte sind **Deutsch**.

Immer **Makespace** schreiben, nie „Makerspace“. Grund: „Maker“ ist im Deutschen ein männliches Wort, und wir wollen die Gender-Diskussion vermeiden. Das gilt für alle Texte: Seiten, Posts, Projekte, Profile, Meta-Beschreibungen, Alt-Texte und Commit-Messages.

## Struktur

- `_posts/` Neuigkeiten (`/news/`)
- `_team/` Collection, ein Profil pro Datei (`/team/:name/`), Layout `member`
- `_projects/` Collection (`/projekte/:name/`), Layout `project`; `status: abgeschlossen` → Archiv `/projekte/archiv/`
- `_data/partners.yml` Partnerliste; `logo_dark: true` für helle Logos
- `_events/` Kalender-Termine (`/kalender/:name/`), Layout `event`; Felder `start`, `end`, `all_day`, `location`, `location_url`, `summary`
- `kalender.ics` erzeugt den iCal-Feed. Die Datei enthält echte CRLF-Zeilenenden (RFC 5545) – nur mit Werkzeugen bearbeiten, die `\r\n` erhalten (`.gitattributes`: `-text`). Lange Zeilen bricht `_includes/ics-line.txt` um.
- `_press/` Pressemitteilungen (`/presse/:slug/`), Layout `press`; Kurzprofil & Pressekontakt in `_data/presse.yml`, Downloads in `_data/pressematerial.yml`
- Posts mit `original_url` / `original_site` / `author` (Team-Kürzel) zeigen automatisch den Hinweis „Ursprünglich veröffentlicht von … auf …“
- Navigation steht in `_config.yml` unter `nav`
- `future: true` in `_config.yml`, sonst baut Jekyll Termine mit Datum in der Zukunft nicht
- CMS: [Pages CMS](https://pagescms.org), Konfiguration in `.pages.yml` – bei neuen Feldern dort mitpflegen

## Konventionen

- Kein CSS-/JS-Framework, alle Styles in `assets/css/style.css` mit CSS-Variablen
- Keine externen Ressourcen (Fonts, Skripte, Tracker) einbinden – Datenschutzhinweis im Impressum verspricht das
- E-Mail-Adressen nur über das `.obf-mail`-Muster (siehe README)
- Original-Logos in `_logo/`, `_logo/README.md` aktuell halten
- Platzhalter sind mit `<span class="todo">` markiert
- Bilder in Posts: `<div class="gallery">` mit `<a class="lightbox" href="groß.jpg"><img src="klein-600w.jpg"></a>` – die Lightbox in `_layouts/default.html` greift automatisch
- Keine externen Einbettungen (YouTube-iframes, fremde Videos/Bilder): Videos lokal als 720p-MP4 in `assets/video/`, YouTube nur als Link mit lokalem Vorschaubild
- Fotos immer ohne Metadaten ausliefern (Handyfotos enthalten GPS-Daten): mit Pillow neu speichern, Originale von Personenfotos nicht committen
