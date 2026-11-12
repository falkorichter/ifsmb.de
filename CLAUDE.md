# CLAUDE.md — ifsmb.de

Website des „Institut für spontane Makespace Buildung“. Jekyll 4, GitHub Pages, Custom Domain `ifsmb.de`.

## Build

```bash
bundle exec jekyll build    # → _site/
bundle exec jekyll serve    # http://localhost:4000
ruby _scripts/check_site.rb # nach dem Build: tote Links, verwaiste Seiten (--extern: externe Links)
ruby _scripts/check_galerien.rb # Galerien müssen Markdown sein (keine HTML-Galerien)
```

Nach neuen Seiten/Posts den Link-Check laufen lassen; er läuft auch im Pages-Workflow und stoppt das Deployment bei Fehlern. Externe Links, die dauerhaft tot sind, nicht löschen, sondern in Markdown mit `{: .link-tot}` hinter dem Link markieren (`[Text](url){: .link-tot}`): Das Layout hängt 🪦 an und erklärt das Symbol unten auf der Seite; `--extern` prüft markierte Links nicht mehr. Private Repos („noch privat“) nicht markieren. Das gilt nur für Links, die früher funktioniert haben (ältere Beiträge, übernommene Texte) – einen frisch recherchierten Link, der schon beim Einfügen tot ist, einfach entfernen.

Ruby 3.1.2 (`.ruby-version`). `_site/` niemals committen.

## Sprache

Alle sichtbaren Texte sind **Deutsch**.

**Code-Kommentare sind Englisch** – in Skripten, Workflows, Layouts/Includes (Liquid- und HTML-Kommentare), CSS und JS, auch Docstrings. Deutsch bleibt alles, was Besucher*innen oder Redakteur*innen sehen: Seitentexte, Fehlermeldungen und Hilfetexte von Skripten, Namen von Workflow-Schritten, Commit-Messages und PR-Beschreibungen.

Immer **Makespace** schreiben, nie „Makerspace“. Grund: „Maker“ ist im Deutschen ein männliches Wort, und wir wollen die Gender-Diskussion vermeiden. Das gilt für alle Texte: Seiten, Posts, Projekte, Profile, Meta-Beschreibungen, Alt-Texte und Commit-Messages.

## Struktur

- `_posts/` Neuigkeiten (`/news/`)
- `_team/` Collection, ein Profil pro Datei (`/team/:name/`), Layout `member`; Fremdfotos (Presse, Agentur) nur mit Erlaubnis und mit Bildnachweis in `photo_credit` (erscheint unter dem Namen)
- `_projects/` Collection (`/projekte/:name/`), Layout `project`; `status: abgeschlossen` → Archiv `/projekte/archiv/`; `status: idee` = Projektidee (eigener Abschnitt „Ideen“, nicht auf der Startseite); `status: anfrage` = eingegangene Anfrage, die vielleicht ein Projekt wird (eigener Abschnitt „Anfragen“, nicht auf der Startseite). **Teilprojekte:** `teil_von: [<Dateiname des übergeordneten Projekts>, …]` (z. B. `[3d-druck-ag-ktg]`; ein einzelner Name ohne Liste geht auch) – ein Teilprojekt kann zu mehreren Projekten gehören und erscheint dann auf jeder Elternseite unter „Teilprojekte“, aber nicht in den Übersichten (Startseite, `/projekte/`, Archiv); sie zeigen oben und unten „Dieses Projekt ist ein Teil von: …“. **Verwandte Projekte:** `verwandt: [<Dateiname>, …]` zeigt unten Buttons „Verwandte Projekte“ – in beide Richtungen, ein Eintrag bei einem der Projekte reicht; und haben ein eigenes `event_tag`. `start` muss immer ein Datum sein (wird zum Sortieren genutzt), `event_tag` ein eigenes Stichwort – nie ein allgemeines wie `35services`, sonst landen alle Beiträge dazu auf der Projektseite; `event_tag: ktg` listet alle Termine und Posts mit `tags: [ktg]` auf der Projektseite, und die Terminseite verlinkt zurück aufs Projekt. Fortschritt bevorzugt als **kleine Beiträge** (Posts mit dem `event_tag` des Projekts in `tags`, persönliche mit `persoenlich: true`; mit `nur_projekt: true` erscheint ein Beitrag nicht unter Neuigkeiten, auf der Startseite und im RSS-Feed, sondern nur auf der Projektseite) – so kann jede*r Beteiligte eigene Updates schreiben. Fotos und Videos dürfen auch direkt auf die Projektseite (als Markdown-Galerie im Text, siehe „Bilder und Videos“), vor allem bei einfachen Projekten mit wenigen Bildern; zeigen sie einen bestimmten Fortschritt oder Tag, lieber als Beitrag. Kurze Notizen ohne eigenen Beitrag als `updates:` (Liste aus `datum` und `text` in Markdown, ohne Liquid). Die Projektseite mischt beides zu „Stand / Updates“ (neuestes zuerst, mit Autor*in); „Letztes Update“ im Kopf und auf der Projektkarte kommt aus `_includes/projekt-letztes-update.html`; Projektkarten in den Übersichten kommen aus `_includes/projekt-karte.html` und zeigen mit `_includes/projekt-aktivitaet.html` Symbole mit hochgestellten Zahlen (Teilprojekte, Termine, Updates, Geräte, Beteiligte) als Direktlinks in die Projektseite; Beiträge zeigen oben „Update zum Projekt …“
- `_data/partners.yml` Partnerliste; `logo_dark: true` für helle Logos; `page: /partner/<name>/` verlinkt eine eigene Partnerseite (`partner/<name>/index.md`); die Partnerübersicht listet automatisch alle Projekte, deren `partners:` den Namen enthält (persönliche mit Hinweis), und die Geräte mit `owner_partner`
- `_events/` Kalender-Termine (`/kalender/:name/`), Layout `event`; Felder `start`, `end`, `all_day`, `location`, `location_url`, `summary`, `team` (Team-Kürzel der Leute, die dabei sind/waren → Teamprofil „Termine“, nur eintragen, wer wirklich da war), optional `gallery` (Liste aus `image`, `thumb`, `alt`; Bilder unter `assets/images/kalender/<termin>/`, Originale in `_logo/kalender/` – nicht committet) `date_label` (Text statt Datum, wenn der Tag noch nicht feststeht – iCal nutzt weiter `start`/`end`) `projekte` (Liste von Projekt-Dateinamen – zusätzlich zu Projekten, deren `event_tag` in `tags` steht), `partners` (Namen aus `_data/partners.yml`, erscheinen auf `/partner/`), `persoenlich: true` (private Termine aus dem Team, brauchen `team`: nie auf Startseite, in `/kalender/` oder im iCal-Feed, nur im Teamprofil und auf der Terminseite mit Hinweis „kein Termin des Instituts“) und `nur_projekt: true` (interne Termine, z. B. Ausflüge der KTG-AG: solange sie bevorstehen, nicht auf der Startseite, im Kalender und im iCal-Feed, nur auf der Projektseite über das Stichwort und auf der Terminseite selbst; danach ganz normal unter „Vergangene Termine“ – der Kalender wird bei jedem Build neu berechnet)
- `kalender.ics` erzeugt den iCal-Feed. Die Datei enthält echte CRLF-Zeilenenden (RFC 5545) – nur mit Werkzeugen bearbeiten, die `\r\n` erhalten (`.gitattributes`: `-text`). Lange Zeilen bricht `_includes/ics-line.txt` um.
- `_press/` Pressemitteilungen (`/presse/:slug/`), Layout `press`; Kurzprofil & Pressekontakt in `_data/presse.yml`, Downloads in `_data/pressematerial.yml`, Berichte anderer über uns („Wir in der Presse“) in `_data/presseberichte.yml`
- Posts mit `original_url` / `original_site` / `author` (Team-Kürzel) zeigen automatisch den Hinweis „Ursprünglich veröffentlicht von … auf …“
- `_equipment/` Ausstattung (`/ausstattung/:name/`), Layout `equipment`. Das Institut besitzt (noch) nichts: jedes Gerät hat mindestens einen Besitz-Eintrag: `owner_partner` (Namen aus `_data/partners.yml`), `owner_team` (Team-Kürzel), `owner_name` (freie Namen) – jeweils ein Wert oder eine Liste, kombinierbar (mehrere Besitzer*innen). Besitz und Standort sind besondere Verbindungen: eigene Gruppen „Gehört“/„Standort“ unten auf der Geräteseite, eigene Linien im Netzwerk (`/netzwerk/`); `standort` ohne `standort_partner` wird dort ein eigener Ort. `status:` `in-aussicht` (kommt vielleicht), `in-reparatur`, `im-test`. Standort mit `standort` (Text) und optional `standort_partner` (Partnername → Link). Weitere Fotos als `gallery` (Liste aus `image`, `thumb`, `alt`), Videos als `videos` (Liste aus `src`, `poster`, `caption`). Die Übersicht `/ausstattung/` gruppiert automatisch nach `kategorie` (enthält „3D-Drucker“ / „3D-Scanner“ / Rest). Ohne freies Foto: eigene SVG-Illustration mit `image_is_illustration: true` – keine Hersteller- oder Shopfotos übernehmen (Urheberrecht). Partnerseite und Teamprofil listen die Geräte automatisch.
- **Stichworte (`tags`)** verknüpfen alles miteinander: Posts, Termine, Ausstattung, Pressemitteilungen tragen `tags: [...]`, Projekte ihr `event_tag`. `_includes/verknuepft.html` zeigt auf jeder Seite alles mit gemeinsamen Stichworten, `/stichworte/` listet alle. Anzeigenamen in `_data/stichworte.yml`. Sehr allgemeine Stichworte (`_data/stichworte_breit.yml`: `ktg`, `35services`, `3d-drucker`) werden auf Geräteseiten für „Verknüpft“ ignoriert, wenn das Gerät eigene Stichworte hat.
- Stichwort-Konventionen: Kleinbuchstaben mit Bindestrich. Projekt-Ort (`ktg`, `rosalind-franklin-gym`), Herkunft (`35services` für alle von 35services.de übernommenen Beiträge), Besitzer*in eines Geräts (`35services`, `bietenholz`), Gerät (`bambu-lab-a1-mini`, `waermebildkamera`, `u1` für den Snapmaker U1 …), Gerätetyp (`3d-drucker`).
- `/projekte/ideen/` (`projekte/ideen.md`): Linksammlung mit Projektideen; ✅ = schon gebaut. Links immer ohne Tracking-Parameter (`?si=`, `?is=`, `&pp=`, `spm=` …).
- `/angebot/`: Angebote und „Warum ein Institut?“
- **Persönliche Beiträge und Projekte** (`persoenlich: true`): private Makespace-Updates aus dem Team. Sie erscheinen **nicht** in den Listen des Instituts (Neuigkeiten, Startseite, RSS, Projekte, Archiv), sondern im Teamprofil („Persönliche Projekte“, „Persönlicher Blog“) und auf `/projekte/persoenlich/` bzw. `/news/persoenlich/` (unten auf den Listenseiten verlinkt). Posts brauchen `author` (ein Team-Kürzel oder eine Liste bei mehreren Autor*innen – der Beitrag erscheint dann in jedem persönlichen Blog), Projekte die Person unter `team`. Die Seiten tragen den Hinweis „kein Beitrag/Projekt des Instituts“.
- Navigation steht in `_config.yml` unter `nav`; Einträge mit `children` werden zu einem Untermenü (z. B. „Wir“ mit Projekte, Angebot, Ausstattung, Team)
- `future: true` in `_config.yml`, sonst baut Jekyll Termine mit Datum in der Zukunft nicht
- **Suche** `/suche/` mit Pagefind: Index entsteht erst nach `jekyll build` im Workflow `.github/workflows/pages.yml` (`npx pagefind --site _site`; Pages-Source = „GitHub Actions“). Indexiert wird alles im `data-pagefind-body`-Wrapper aus `_layouts/default.html`, Filter „Bereich“/„Stichwort“ aus `_includes/suche-meta.html`. Reine Übersichtsseiten bekommen `suche: false`. Pagefind-Version im README und Workflow gleich halten.
- **Bearbeiten-Button**: `_layouts/default.html` zeigt unter jeder Seite „✏️ Diese Seite bearbeiten“ → GitHub-Editor für `page.path` (Repo/Branch in `_config.yml` unter `repository`/`branch`)
- **Neu-Buttons**: Unter dem Bearbeiten-Button steht „Neu anlegen:“ mit ➕-Buttons (`_includes/neu-buttons.html`), die den GitHub-Editor für eine neue Datei öffnen (`/new/<branch>/<ordner>?filename=…&value=…`) – mit einer Vorlage aus `_includes/vorlagen/` (Beitrag, Termin, Projekt, Gerät, Teamprofil, Pressemitteilung), die alle Felder mit Kommentar enthält und die Verbindung zur aktuellen Seite schon eingetragen hat (Teamprofil → `author`/`team`/`owner_team`, Projekt → `event_tag`/`teil_von`, Partnerseite → `partners`/`owner_partner`, Termin/Gerät/Beitrag → `tags` + `verlinkt`; Übersichtsseiten → leere Vorlage). `JJJJ-MM-TT`, `JJJJ` und `TZTZ` ersetzt ein kleines Skript beim Klick durch das heutige Datum.
- CMS: [Pages CMS](https://pagescms.org), Konfiguration in `.pages.yml` – bei neuen Feldern dort mitpflegen – und in der passenden Vorlage in `_includes/vorlagen/`
- **Verbindungen**: Alle Ressourcen (Projekte, Termine, Beiträge, Personen, Ausstattung, Presse, Partnerseiten) können mit `verlinkt: [/adresse/, …]` beliebige andere Seiten verlinken. `_includes/verbindungen.html` zeigt unten auf jeder Seite alle Verbindungen in beide Richtungen als gleich gestylte Buttons (Teil von, Projekte, Termine, Beiträge, Beteiligt, Partner, Ausstattung) – zusammen mit den bestehenden Feldern `teil_von`, `verwandt`, `projekte`, `team`, `author`, `partners`, `owner_*`, `event_tag`/`tags`. Übersicht als ASCII-Art in `DATENSTRUKTUR.md` – bei neuen Feldern dort mitpflegen. `/netzwerk/` (`netzwerk/index.html` + `assets/js/netzwerk.js`, ohne Bibliothek) zeichnet alle Verbindungen als Graph; neue Verbindungsfelder auch dort ins JSON und in die Kanten-Regeln aufnehmen. Darunter eine Zeitleiste (gestapelte Balken pro Monat aus dem `date` im JSON: Projektstart, Beiträge, Termine, Presse) im selben Skript – sie nutzt dieselben Filter und Farben wie der Graph.

- **Karte** `/karte/` (`karte/index.html` + `assets/js/karte.js`, ohne Bibliothek): zeigt die Orte aus `_data/orte.yml` (`id`, `name`, `adresse`, `lat`, `lon`, optional `partner`, `finden`, `fern`, `ungefaehr`) auf OpenStreetMap. Projekte, Termine und Geräte landen automatisch an einem Ort, wenn ihr `ort`/`location`/`standort` eines der `finden`-Wörter enthält, sonst über `standort_partner`/`partners`/`owner_partner` = `partner` des Orts. Beiträge erscheinen beim Ort ihres Projekts (über `tags`/`projekte`). Mit `orte: [<id>]` lässt sich jede Seite fest einem Ort zuordnen. Neue Orte: Koordinaten auf openstreetmap.org nachsehen, nur öffentliche Adressen (Schulen, Vereine, Veranstaltungsorte) – nie Wohnadressen; Werkstätten von Privatleuten nur straßengenau mit `ungefaehr: true`. Kommende Termine sind im Ortspanel markiert.

- **Gelöschte Seiten weiterleiten**: Wird eine Seite gelöscht, die schon live war, an ihrer alten Adresse eine Weiterleitung anlegen – Datei mit `layout: weiterleitung`, `permalink: <alte Adresse>`, `ziel: <neue Adresse>` (optional `ziel_titel`), z. B. `projekte/40-monitore-bundesdruckerei.html`. Der Link-Check zählt solche Seiten nicht als verwaist.

## Konventionen

- Kein CSS-/JS-Framework, alle Styles in `assets/css/style.css` mit CSS-Variablen
- Keine externen Ressourcen (Fonts, Skripte, Tracker) einbinden – Datenschutzhinweis im Impressum verspricht das. Einzige Ausnahme: die Kartenbilder von OpenStreetMap auf `/karte/`, und nur nach Klick auf „Karte laden“ (im Impressum unter Datenschutz beschrieben)
- E-Mail-Adressen nur über das `.obf-mail`-Muster, Telefonnummern über `.obf-tel` (siehe README)
- Original-Logos in `_logo/`, `_logo/README.md` aktuell halten
- Platzhalter sind mit `<span class="todo">` markiert
- **Bilder und Videos als Markdown** (Plugin `_plugins/galerie.rb`, läuft im eigenen Pages-Workflow): Bilder direkt untereinander, ohne Leerzeile, darunter `{: .gallery}`:
  ```markdown
  ![Alt-Text 1](/assets/images/news/<slug>/01.jpg)
  ![Alt-Text 2](/assets/images/news/<slug>/02.jpg)
  {: .gallery}
  ```
  Das Plugin baut daraus `<div class="gallery">` mit `a.lightbox` und nimmt automatisch das Vorschaubild `NN-600w.jpg`, wenn es existiert. Ein einzelnes Bild wird automatisch groß (`gallery-single`), kleine Vorschaubilder mit `{: .gallery .gallery-small}`. Jedes Bild braucht einen Alt-Text, sonst bricht der Build ab. Videos: `![Kurze Beschreibung](/assets/video/…/01.mp4)` als eigener Absatz wird zum `<video class="post-video">` mit `01.jpg` als Vorschaubild. Kein HTML für Galerien mehr schreiben – `_scripts/check_galerien.rb` meldet HTML-Galerien (`div.gallery`, `a.lightbox`, WordPress-Galerien) mit Datei und Zeile; der Workflow `.github/workflows/pruefen.yml` lässt damit jeden Pull Request durchfallen, `pages.yml` stoppt das Deployment.
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
4. **Bilder** lokal speichern, nie von 35services.de einbinden: größte Version laden, mit Pillow ohne Metadaten neu speichern als `assets/images/news/<slug>/NN.jpg` (max. 1600 px) und `NN-600w.jpg`; einbinden als Markdown-Galerie (Bilder untereinander, darunter `{: .gallery}`, auch für ein Einzelbild). Aussagekräftige Alt-Texte, Screenshots beschreiben.
5. **Videos** (`wp-block-video`, oft 4K oder `.mov`) mit ffmpeg auf 720p verkleinern (`-crf 28 -preset slow -movflags +faststart -map_metadata -1`) nach `assets/video/news/<slug>/NN.mp4` plus Vorschaubild `NN.jpg`; einbinden als `![Beschreibung](/assets/video/news/<slug>/NN.mp4)` (eigener Absatz) an der Stelle wie im Original.
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

## Durchsicht vor dem Push

- **Viele Änderungen auf einmal** (mehr als 2 betroffene Seiten/Ressourcen, z. B. mehrere Beiträge, Termine und Profile aus einer Nachricht): erst eine Durchsicht `_review.md` im Projektordner schreiben und **nicht pushen**, bis sie durchgesehen ist. Darin pro Änderung: was sich ändert, Link zur lokalen Seite, Annahmen und offene Fragen. Antworten werden direkt in die Datei geschrieben; nach dem Einarbeiten die Datei löschen. `_review.md` steht in `.gitignore` und wird nie committet.
- **Worktree live ansehen**: Wer in einem lokalen Worktree arbeitet (`.claude/worktrees/<name>/`), startet dort im Hintergrund einen eigenen Server, sobald es etwas zu sehen gibt – auf dem nächsten freien Port ab 4001 (Port 4000 gehört dem Haupt-Checkout; frei prüfen mit `lsof -nP -iTCP:<port> -sTCP:LISTEN`): `bundle exec jekyll serve --port <port>`. Die Adresse (`http://localhost:<port>/`) kommt mit klickbaren Links auf die geänderten Seiten in `_review.md` (im Worktree-Ordner) und in den Abschlussbericht, damit alles live angesehen werden kann; Port 4000 nur auf ausdrücklichen Wunsch auf den Worktree umstellen. Server laufen lassen, bis die Änderung gemergt oder verworfen ist.
- **Inline-Links auch semantisch verbinden**: Verlinkt ein Text eine andere Seite der Website (Projekt, Termin, Beitrag, Person, Gerät, Partner- oder normale Seite), die Verbindung zusätzlich im Front Matter eintragen (Ausnahme: `/netzwerk/` – dazu gehört ohnehin alles) – über das passende Feld (`tags`/`event_tag`, `team`, `partners`, `teil_von` …) oder sonst `verlinkt`. Dann erscheint sie unten bei „Verbindungen“ und im Netzwerk.
- **Inhaltsseiten in Markdown**: Texte als `.md` schreiben, HTML nur für Bausteine, die Markdown nicht kann (Karten-Raster, Hinweisboxen, verschleierte E-Mail) – darin mit `markdown="1"` weiter Markdown. Überschriften-Anker explizit setzen (`{: #anker}`), wenn andere Seiten darauf verlinken. Reine Listen-/Übersichtsseiten mit viel Liquid (Startseite, Kalender, Projekte …) bleiben HTML.
- **Links in Markdown immer klickbar**: als `[Text](URL)` schreiben, nie als nackte URL – das gilt für `_review.md`, Feedback-Dateien, PR-Beschreibungen und alle Inhalte.

## Changelog

`CHANGELOG.md` folgt [Keep a Changelog](https://keepachangelog.com/de/1.0.0/), auf Deutsch. Jede nennenswerte Änderung kommt mit in den Commit: zuerst unter `## [Unreleased]`, sortiert nach `### Hinzugefügt`, `### Geändert`, `### Veraltet`, `### Entfernt`, `### Behoben`, `### Sicherheit`. Die Seite hat keine Versionsnummern: Beim Push nach `main` wird `[Unreleased]` zum Tagesabschnitt `## [JJJJ-MM-TT]` (neueste oben, Vergleichslinks unten pflegen). Einträge für Menschen schreiben, nicht Commit-Messages kopieren; Tippfehler-Korrekturen und reine Merges weglassen. `CHANGELOG.md` steht in `exclude` und wird nicht ausgeliefert.

## Branches und Pull Requests

Wer einen Branch pusht (nicht `main`), öffnet dazu immer einen Pull Request mit `gh pr create` – auf Deutsch und mit Vorschaubildern:

1. `bundle exec jekyll build`, dann Screenshots der betroffenen Seiten:
   `python3 -I _scripts/pr_vorschau.py /pfad/der/seite/ …` (Seitenanfang) oder mit `--unten` (Ausschnitt über dem Footer, z. B. für Änderungen am Seitenende). Das Skript nimmt Desktop (1280 px) und Handy (390 px) mit Headless-Chrome auf, lädt die Bilder auf den Branch `pr-previews` (Ordner = Branchname, nie in den Feature-Branch) und gibt eine Markdown-Tabelle für die PR-Beschreibung aus.
2. Bilder vor dem Hochladen selbst ansehen (`--nur-lokal` speichert nur nach `_pr-vorschau/`, in `.gitignore`). Es gelten dieselben Regeln wie auf der Seite: keine erkennbaren Kindergesichter, keine Kennzeichen, Namen oder Zugangscodes.
3. PR-Beschreibung: **Was** sich ändert, **warum**, **wie geprüft** (Build, Link-Check, angesehene Seiten), dann die Vorschau-Tabelle. Titel wie die Commit-Message; die Makespace-Regel gilt auch hier.
4. Bei Inhaltsänderungen reicht ein Screenshot der geänderten Seite. Ohne sichtbare Änderung (Workflow, Skripte) keine Vorschau – dann kurz sagen, warum.
