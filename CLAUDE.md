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
- `_projects/` Collection (`/projekte/:name/`), Layout `project`; `status: abgeschlossen` → Archiv `/projekte/archiv/`; `event_tag: ktg` listet alle Termine mit `tags: [ktg]` auf der Projektseite, und die Terminseite verlinkt zurück aufs Projekt
- `_data/partners.yml` Partnerliste; `logo_dark: true` für helle Logos; `page: /partner/<name>/` verlinkt eine eigene Partnerseite (`partner/<name>/index.md`); `thanks` + `thanks_url` zeigen ein Dankeschön mit Link (z. B. auf einen Termin)
- `_events/` Kalender-Termine (`/kalender/:name/`), Layout `event`; Felder `start`, `end`, `all_day`, `location`, `location_url`, `summary`, optional `gallery` (Liste aus `image`, `thumb`, `alt`; Bilder unter `assets/images/kalender/<termin>/`, Originale in `_logo/kalender/` – nicht committet) und `date_label` (Text statt Datum, wenn der Tag noch nicht feststeht – iCal nutzt weiter `start`/`end`)
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

## Beiträge von 35services.de übernehmen

Falko schreibt Beiträge zuerst auf https://35services.de. Soll ein Beitrag hier erscheinen, gilt dieses Muster:

1. **Datum & Titel** aus der WordPress-API holen (genaue Veröffentlichungszeit):
   `curl -s "https://35services.de/wp-json/wp/v2/posts?slug=<slug>&_fields=slug,date,title"`
   → Datei `_posts/<YYYY-MM-DD>-<slug>.md`, `date: <YYYY-MM-DD HH:MM:SS> +0100/+0200` (MEZ/MESZ beachten)
2. **Front Matter**:
   ```yaml
   title: "<Titel wie im Original>"
   date: 2026-05-25 14:37:44 +0200
   author: falko-richter
   original_url: https://35services.de/<jahr>/<slug>/
   original_site: 35services.de
   ```
   Das Layout `post` zeigt daraus oben automatisch „Ursprünglich veröffentlicht von Falko Richter auf 35services.de“ mit Link.
3. **Text** wörtlich übernehmen (Absätze, Listen, Links als Markdown). Einzige Änderung: „Makerspace“ → „Makespace“. E-Mail-Adressen nur in der schon verschleierten Form des Originals („falko [at] 35services [punkt] de“) oder per `.obf-mail`.
4. **Bilder** lokal speichern, nie von 35services.de einbinden: größte Version laden, mit Pillow ohne Metadaten neu speichern als `assets/images/news/<slug>/NN.jpg` (max. 1600 px) und `NN-600w.jpg`; einbinden als `<div class="gallery">` mit `a.lightbox` (Einzelbild: `gallery gallery-single`). Aussagekräftige Alt-Texte, Screenshots beschreiben.
5. **Videos** (`wp-block-video`, oft 4K oder `.mov`) mit ffmpeg auf 720p verkleinern (`-crf 28 -preset slow -movflags +faststart -map_metadata -1`) nach `assets/video/news/<slug>/NN.mp4` plus Vorschaubild `NN.jpg`; einbinden als `<video class="post-video" controls preload="none" playsinline poster=… src=…>` an der Stelle wie im Original.
6. **YouTube** nie als iframe: Vorschaubild `img.youtube.com/vi/<id>/hqdefault.jpg` lokal speichern und als `<a class="video-link">` auf youtube.com verlinken.
7. Danach `bundle exec jekyll build`, Seite ansehen, Größe von `assets/` im Blick behalten.
