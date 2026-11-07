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
- `_projects/` Collection (`/projekte/:name/`), Layout `project`; `status: abgeschlossen` → Archiv `/projekte/archiv/`; `status: idee` = Projektidee (eigener Abschnitt „Ideen“, nicht auf der Startseite); `status: anfrage` = eingegangene Anfrage, die vielleicht ein Projekt wird (eigener Abschnitt „Anfragen“, nicht auf der Startseite). `start` muss immer ein Datum sein (wird zum Sortieren genutzt), `event_tag` ein eigenes Stichwort – nie ein allgemeines wie `35services`, sonst landen alle Beiträge dazu auf der Projektseite; `event_tag: ktg` listet alle Termine und Posts mit `tags: [ktg]` auf der Projektseite, und die Terminseite verlinkt zurück aufs Projekt. Fortschritt als `updates:` pflegen (Liste aus `datum` und `text` in Markdown, ohne Liquid) – die Projektseite zeigt daraus „Stand / Updates“ (neuestes zuerst) und „Letztes Update“ im Kopf und auf der Projektkarte
- `_data/partners.yml` Partnerliste; `logo_dark: true` für helle Logos; `page: /partner/<name>/` verlinkt eine eigene Partnerseite (`partner/<name>/index.md`)
- `_events/` Kalender-Termine (`/kalender/:name/`), Layout `event`; Felder `start`, `end`, `all_day`, `location`, `location_url`, `summary`, optional `gallery` (Liste aus `image`, `thumb`, `alt`; Bilder unter `assets/images/kalender/<termin>/`, Originale in `_logo/kalender/` – nicht committet) und `date_label` (Text statt Datum, wenn der Tag noch nicht feststeht – iCal nutzt weiter `start`/`end`)
- `kalender.ics` erzeugt den iCal-Feed. Die Datei enthält echte CRLF-Zeilenenden (RFC 5545) – nur mit Werkzeugen bearbeiten, die `\r\n` erhalten (`.gitattributes`: `-text`). Lange Zeilen bricht `_includes/ics-line.txt` um.
- `_press/` Pressemitteilungen (`/presse/:slug/`), Layout `press`; Kurzprofil & Pressekontakt in `_data/presse.yml`, Downloads in `_data/pressematerial.yml`
- Posts mit `original_url` / `original_site` / `author` (Team-Kürzel) zeigen automatisch den Hinweis „Ursprünglich veröffentlicht von … auf …“
- `_equipment/` Ausstattung (`/ausstattung/:name/`), Layout `equipment`. Das Institut besitzt (noch) nichts: jedes Gerät hat `owner_partner` (Name aus `_data/partners.yml`) **oder** `owner_team` (Team-Kürzel) **oder** `owner_name` (freier Name). `status:` `in-aussicht` (kommt vielleicht), `in-reparatur`, `im-test`. Standort mit `standort` (Text) und optional `standort_partner` (Partnername → Link). Weitere Fotos als `gallery` (Liste aus `image`, `thumb`, `alt`), Videos als `videos` (Liste aus `src`, `poster`, `caption`). Die Übersicht `/ausstattung/` gruppiert automatisch nach `kategorie` (enthält „3D-Drucker“ / „3D-Scanner“ / Rest). Ohne freies Foto: eigene SVG-Illustration mit `image_is_illustration: true` – keine Hersteller- oder Shopfotos übernehmen (Urheberrecht). Partnerseite und Teamprofil listen die Geräte automatisch.
- **Stichworte (`tags`)** verknüpfen alles miteinander: Posts, Termine, Ausstattung, Pressemitteilungen tragen `tags: [...]`, Projekte ihr `event_tag`. `_includes/verknuepft.html` zeigt auf jeder Seite alles mit gemeinsamen Stichworten, `/stichworte/` listet alle. Anzeigenamen in `_data/stichworte.yml`. Sehr allgemeine Stichworte (`_data/stichworte_breit.yml`: `ktg`, `35services`, `3d-drucker`) werden auf Geräteseiten für „Verknüpft“ ignoriert, wenn das Gerät eigene Stichworte hat.
- Stichwort-Konventionen: Kleinbuchstaben mit Bindestrich. Projekt-Ort (`ktg`, `rosalind-franklin-gym`), Herkunft (`35services` für alle von 35services.de übernommenen Beiträge), Besitzer*in eines Geräts (`35services`, `bietenholz`), Gerät (`bambu-lab-a1-mini`, `waermebildkamera`, `u1` für den Snapmaker U1 …), Gerätetyp (`3d-drucker`).
- `/projekte/ideen/` (`projekte/ideen.md`): Linksammlung mit Projektideen; ✅ = schon gebaut. Links immer ohne Tracking-Parameter (`?si=`, `?is=`, `&pp=`, `spm=` …).
- `/angebot/`: Angebote und „Warum ein Institut?“
- Navigation steht in `_config.yml` unter `nav`; Einträge mit `children` werden zu einem Untermenü (z. B. „Wir“ mit Projekte, Angebot, Ausstattung, Team)
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
- Fotos mit Kindern: Gesichter (auch Profile und Hinterköpfe) unkenntlich machen, bevor sie auf die Seite kommen. Die macOS-Vision-Gesichtserkennung findet nicht alle Gesichter – Ergebnis immer selbst in voller Größe prüfen und fehlende Köpfe von Hand ergänzen. Originale bleiben in `_logo/news/`, `_logo/kalender/`, `_logo/team/` (in `.gitignore`)

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
   Zusätzlich immer `tags: [35services]` setzen (plus Stichworte für erwähnte Geräte/Projekte).
   Das Layout `post` zeigt daraus oben automatisch „Ursprünglich veröffentlicht von Falko Richter auf 35services.de“ mit Link.
3. **Text** wörtlich übernehmen (Absätze, Listen, Links als Markdown). Einzige Änderung: „Makerspace“ → „Makespace“. E-Mail-Adressen nur in der schon verschleierten Form des Originals („falko [at] 35services [punkt] de“) oder per `.obf-mail`.
4. **Bilder** lokal speichern, nie von 35services.de einbinden: größte Version laden, mit Pillow ohne Metadaten neu speichern als `assets/images/news/<slug>/NN.jpg` (max. 1600 px) und `NN-600w.jpg`; einbinden als `<div class="gallery">` mit `a.lightbox` (Einzelbild: `gallery gallery-single`). Aussagekräftige Alt-Texte, Screenshots beschreiben.
5. **Videos** (`wp-block-video`, oft 4K oder `.mov`) mit ffmpeg auf 720p verkleinern (`-crf 28 -preset slow -movflags +faststart -map_metadata -1`) nach `assets/video/news/<slug>/NN.mp4` plus Vorschaubild `NN.jpg`; einbinden als `<video class="post-video" controls preload="none" playsinline poster=… src=…>` an der Stelle wie im Original.
6. **YouTube** nie als iframe: Vorschaubild `img.youtube.com/vi/<id>/hqdefault.jpg` lokal speichern und als `<a class="video-link">` auf youtube.com verlinken.
7. Danach `bundle exec jekyll build`, Seite ansehen, Größe von `assets/` im Blick behalten.

## Spenden

- Seite `/spenden/`: Das Institut ist (noch) keine eigene Rechtsform – Geldspenden laufen über betterplace an die 3D-Druck AG an der KTG (offiziell ein Projekt von 35services e.V.): https://www.betterplace.org/de/projects/138560-3d-druck-und-elektronik-ag
- Der schwebende „Spenden“-Button (`.badge-donate`) steht in `_layouts/default.html` und erscheint auf allen Seiten außer `/spenden/` selbst; Animation respektiert `prefers-reduced-motion`.

## Transparenz („Institut“)

„Institut“ ist kein geschützter Begriff, aber es gilt das Irreführungsverbot. Deshalb immer klarstellen: Das IfsMB ist **keine Hochschule, keine Behörde und kein Forschungsinstitut**, sondern eine private, ehrenamtliche Initiative von **Falko Richter** ohne eigene Rechtsform. Der Hinweis steht im Footer jeder Seite, auf `/angebot/` und im Impressum („Institut für spontane Makespace Buildung – Falko Richter“). Texte nie so formulieren, als sei das Institut eine offizielle Einrichtung oder besitze Geräte.

## Privatsphäre bei Inhalten

- Keine Wohnadressen/Wohnstraßen von Personen, keine fremden E-Mail-Adressen veröffentlichen (auch wenn sie in Quellen stehen).
- Auf Fotos auch handschriftliche Namen, Zugangscodes (z. B. Classroom-Links) und Autokennzeichen unkenntlich machen.
- Fremde Videos (TikTok, YouTube, Instagram) nur verlinken, nie einbetten.
