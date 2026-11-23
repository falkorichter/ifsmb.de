# Abhängigkeiten

Alles, worauf ifsmb.de angewiesen ist – im Browser, beim Bauen, in den Tests und in lokalen Skripten. Regeln in `CLAUDE.md` unter „Abhängigkeiten“: **Was hier nicht steht, wird nicht benutzt.** Neue, aktualisierte und entfernte Einträge kommen mit genauer Version auch ins `CHANGELOG.md` und in die PR-Beschreibung.

Stand: 23.11.2026

## 1. Im Browser (wird an Besucher*innen ausgeliefert)

### OverType – Markdown-Editor der Formulare

| | |
|---|---|
| Zweck | Textfelder „Text (Markdown)“ und „Lösung“ der ➕- und ✏️-Formulare: Hervorhebung, Werkzeugleiste, Tastenkürzel |
| Version | **2.9.0** – npm `overtype@2.9.0`, veröffentlicht 14.11.2026; Kopfzeile der Datei: `OverType v2.9.0` |
| Herkunft | https://github.com/panphora/overtype · geholt mit `npm pack overtype@2.9.0` in einen leeren Ordner, daraus `dist/overtype.min.js` und `LICENSE` (17.11.2026) |
| Liegt in | `assets/js/third-party/overtype/` (`overtype.min.js`, `LICENSE`, `README.md`) |
| SHA-256 | `4fb8cd12aea96708cb0078018e84861fb5976e16038ba5682180edf7d992498a` (`overtype.min.js`) |
| Lizenz | MIT (© 2025 David Miranda), Lizenztext liegt daneben |
| Größe | 158 KB minifiziert |
| Benutzt von | `assets/js/neu.js` (`createMarkdownEditors`, `createEditor`, `toolbarButtons`, `onEditorKeydown`) über `window.ladeSkripte` |
| Wann geladen | erst, wenn ein Formular mit Markdown-Feld aufgeht – normale Seiten laden es nie |
| Geprüft | keine externen Adressen im Code (nur ein GitHub-Link als Text), kein `@import`, kein `fetch`/Beacon, keine Schriften; Datei-Upload ist nur mit `fileUpload`-Option aktiv – wir setzen sie nicht |
| Änderungen | keine – unveränderte Kopie. Anpassungen nur von außen: Optionen und eigene Knöpfe in `neu.js`, CSS in `style.css` (`.form-md…`, inkl. `!important` gegen OverTypes Werkzeugleisten-Stil) |
| Aktualisieren | neue Version wie oben holen, beide Dateien ersetzen, Version/SHA-256 hier und in der README daneben eintragen, Bundle wieder auf externe Adressen prüfen, Formulare im Browser testen (Editor da, Werkzeugleiste und 🛠️-Schalter, Kürzel aus dem Beitrag `_posts/2026-11-17-mitschreiben-leicht-gemacht.md`, ✏️ markiert nur geänderte Zeilen), `CHANGELOG.md` |
| Entfernen | Ordner löschen und `markdown: true` bzw. `createMarkdownEditors()` in `neu.js` entfernen – die Formulare fallen dann auf das normale Textfeld zurück |

### Pagefind – Volltextsuche (`/search/`)

| | |
|---|---|
| Zweck | Suchindex und Such-Oberfläche; `/pagefind/pagefind.js` wird von unserer Domain geladen |
| Version | **1.5.2** |
| Herkunft | npm, beim Deployment mit `npx -y pagefind@1.5.2 --site _site` (`.github/workflows/pages.yml`) – erzeugt `_site/pagefind/` |
| Liegt in | nicht im Repo; entsteht bei jedem Deployment |
| Lizenz | MIT |
| Benutzt von | `search/`, `_includes/formular-config.html` (Volltextsuche in den Chip-Feldern der Formulare), `_includes/verknuepft.html`, `_includes/todos-knopf.html` |
| Aktualisieren | Version in `pages.yml` ändern, nach dem Deployment `/search/` und die Seitensuche in den Formularen testen |

### VT323 – Schrift für Themes

| | |
|---|---|
| Zweck | Theme „Offene Werkstätten“: Navigation, Überschriften, Buttons, Abzeichen (Pixelschrift wie auf offene-werkstaetten.org) |
| Version | **5.3.0** – npm `@fontsource/vt323@5.3.0` (Fontsource, nur das Teilset „latin“ – enthält Umlaute, ß, „“ und –) |
| Herkunft | https://fontsource.org · geholt mit `npm pack @fontsource/vt323@5.3.0` in einen leeren Ordner, daraus `files/vt323-latin-400-normal.woff2` und `LICENSE` (21.11.2026) – **nicht** von der Website der Organisation |
| Liegt in | `assets/fonts/vt323/` (Schrift, `LICENSE`, `README.md`) |
| SHA-256 | `8ddbebcc1048154132e1d78eb9b1f7850bca1b7d857035ccf1cb4318ebc615b6` |
| Lizenz | SIL Open Font License 1.1 (Copyright 2011 The VT323 Project Authors), Lizenztext liegt daneben |
| Größe | 20 KB (WOFF2) |
| Benutzt von | `assets/css/themes.css` (`@font-face`) |
| Wann geladen | nur, wenn das Theme aktiv ist – Browser laden eine Schrift erst, wenn ein Element sie benutzt; das Standard-Theme lädt nie eine |
| Geprüft | reine Schriftdatei, keine externen Adressen; kein CSS von Fontsource übernommen (eigene `@font-face`-Regeln) |
| Änderungen | keine – unveränderte Kopie |
| Aktualisieren | `npm pack` mit neuer Version, Datei(en) ersetzen, SHA-256 hier und in der README daneben eintragen, Seiten mit `?theme=…` ansehen, `CHANGELOG.md` |
| Entfernen | Ordner und `@font-face`-Regel löschen, Schrift aus den Variablen in `themes.css` nehmen – Theme fällt auf `ui-monospace` zurück |

### Carlito – Schrift für Themes

| | |
|---|---|
| Zweck | Theme „Offene Werkstätten“: Fließtext und die schräg-fette Hervorhebung im Slogan (wie auf offene-werkstaetten.org; Carlito ist metrisch gleich zu Calibri) |
| Version | **5.3.0** – npm `@fontsource/carlito@5.3.0` (Fontsource, nur das Teilset „latin“ – enthält Umlaute, ß, „“ und –) |
| Herkunft | https://fontsource.org · geholt mit `npm pack @fontsource/carlito@5.3.0` in einen leeren Ordner, daraus `files/carlito-latin-{400,700}-{normal,italic}.woff2 (4 Dateien)` und `LICENSE` (21.11.2026) – **nicht** von der Website der Organisation |
| Liegt in | `assets/fonts/carlito/` (Schrift, `LICENSE`, `README.md`) |
| SHA-256 | `a29c4a4e61863753cf6a10831efaa05f849dcaa8f580422dbc41bc058c3b6b64` (400-normal), `6bbdd83c5797d207bd2027f2687a70e428513c56130feaad1ffc0a1a7ace7c07` (400-italic), `af249cfe4107221070ff077c29a043004e8f2efea977dcbaaf217a24f3b7680e` (700-normal), `e1bbd00245b0b22d0c540413ac73a91f7afff587899260a683acec3564f06ac3` (700-italic) |
| Lizenz | SIL Open Font License 1.1 (Copyright 2013 The Carlito Project Authors), Lizenztext liegt daneben |
| Größe | 4 × 32 KB (WOFF2) |
| Benutzt von | `assets/css/themes.css` (`@font-face`) |
| Wann geladen | nur, wenn das Theme aktiv ist – Browser laden eine Schrift erst, wenn ein Element sie benutzt; das Standard-Theme lädt nie eine |
| Geprüft | reine Schriftdatei, keine externen Adressen; kein CSS von Fontsource übernommen (eigene `@font-face`-Regeln) |
| Änderungen | keine – unveränderte Kopie |
| Aktualisieren | `npm pack` mit neuer Version, Datei(en) ersetzen, SHA-256 hier und in der README daneben eintragen, Seiten mit `?theme=…` ansehen, `CHANGELOG.md` |
| Entfernen | Ordner und `@font-face`-Regel löschen, Schrift aus den Variablen in `themes.css` nehmen – Theme fällt auf Calibri/Segoe UI/Arial zurück |

### Lexend – Schrift für Themes

| | |
|---|---|
| Zweck | Theme „RFFLabs“: alle Texte (wie auf rfflabs.fr) |
| Version | **5.3.0** – npm `@fontsource-variable/lexend@5.3.0` (Fontsource, nur das Teilset „latin“ – enthält Umlaute, ß, „“ und –) |
| Herkunft | https://fontsource.org · geholt mit `npm pack @fontsource-variable/lexend@5.3.0` in einen leeren Ordner, daraus `files/lexend-latin-wght-normal.woff2 (variable Schrift, Gewichte 100–900)` und `LICENSE` (21.11.2026) – **nicht** von der Website der Organisation |
| Liegt in | `assets/fonts/lexend/` (Schrift, `LICENSE`, `README.md`) |
| SHA-256 | `b7e7538f59bff1812841d7627f8e49e70fe86438f9f7b397a028c0d05301c874` |
| Lizenz | SIL Open Font License 1.1 (Copyright 2019 The Lexend Project Authors), Lizenztext liegt daneben |
| Größe | 40 KB (WOFF2) |
| Benutzt von | `assets/css/themes.css` (`@font-face`) |
| Wann geladen | nur, wenn das Theme aktiv ist – Browser laden eine Schrift erst, wenn ein Element sie benutzt; das Standard-Theme lädt nie eine |
| Geprüft | reine Schriftdatei, keine externen Adressen; kein CSS von Fontsource übernommen (eigene `@font-face`-Regeln) |
| Änderungen | keine – unveränderte Kopie |
| Aktualisieren | `npm pack` mit neuer Version, Datei(en) ersetzen, SHA-256 hier und in der README daneben eintragen, Seiten mit `?theme=…` ansehen, `CHANGELOG.md` |
| Entfernen | Ordner und `@font-face`-Regel löschen, Schrift aus den Variablen in `themes.css` nehmen – Theme fällt auf system-ui zurück |

### Inter – Schrift für Themes

| | |
|---|---|
| Zweck | Theme „Slop ✨“: alle Texte (wie bei Slopstrap) |
| Version | **4.1** – `InterVariable.woff2` (Version 4.001), variable Schrift mit den Achsen `wght` 100–900 und `opsz` 14–32, voller Zeichensatz (nicht nur Latin) |
| Herkunft | https://github.com/rsms/inter · geholt mit `git clone --depth 1 --filter=blob:none --sparse --branch v4.1 https://github.com/rsms/inter && git -C inter sparse-checkout set docs/font-files` (Commit `e3a3d4c57d5ecc01453a575621882a384c1995a3`), daraus `docs/font-files/InterVariable.woff2` und `LICENSE.txt` (23.11.2026) – nicht von Google Fonts oder einem CDN |
| Liegt in | `assets/fonts/inter/` (Schrift, `LICENSE`, `README.md`) |
| SHA-256 | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| Lizenz | SIL Open Font License 1.1 (Copyright 2016 The Inter Project Authors), Lizenztext liegt daneben |
| Größe | 344 KB (WOFF2) – größer als die anderen Schriften, weil ungekürzt (alle Sprachen); ein Latin-Teilset bräuchte ein Werkzeug (fontTools + brotli) und wäre keine unveränderte Kopie mehr |
| Benutzt von | `assets/css/themes.css` (`@font-face`) |
| Wann geladen | nur, wenn das Theme „Slop ✨“ aktiv ist – das Standard-Theme lädt sie nie |
| Geprüft | reine Schriftdatei, keine externen Adressen; Umlaute, ß, „“, – und € vorhanden (mit `fontTools` an der TTF-Version desselben Tags geprüft) |
| Änderungen | keine – unveränderte Kopie |
| Aktualisieren | neuen Tag wie oben holen, Datei ersetzen, SHA-256 hier und in der README daneben eintragen, Seiten mit `?theme=slop` ansehen, `CHANGELOG.md` |
| Entfernen | Ordner und `@font-face`-Regel löschen – das Theme fällt auf system-ui zurück |

### Instrument Serif – Schrift für Themes

| | |
|---|---|
| Zweck | Theme „Slop ✨“: das kursive Serifenwort im Slogan (Hervorhebung `.hl`) |
| Version | **1.000** – nur der Schnitt Italic |
| Herkunft | https://github.com/Instrument/instrument-serif · geholt mit `git clone --depth 1 https://github.com/Instrument/instrument-serif` (Commit `65c0ef225f386a3c7e87570a4aa9cc0262c2fd81` vom 26.04.2023 – das Repo hat keine Tags), daraus `fonts/webfonts/InstrumentSerif-Italic.woff2` und `OFL.txt` (23.11.2026) |
| Liegt in | `assets/fonts/instrument-serif/` (Schrift, `LICENSE`, `README.md`) |
| SHA-256 | `4f7aacc18d491dea8778bbc591db87b9455625899ed5f913957e7fd82604c294` |
| Lizenz | SIL Open Font License 1.1 (Copyright 2022 The Instrument Serif Project Authors), Lizenztext liegt daneben |
| Größe | 28 KB (WOFF2) |
| Benutzt von | `assets/css/themes.css` (`@font-face`) |
| Wann geladen | nur, wenn das Theme „Slop ✨“ aktiv ist und ein hervorgehobenes Wort auf der Seite steht |
| Geprüft | reine Schriftdatei, keine externen Adressen; Umlaute, ß, „“, – und € vorhanden |
| Änderungen | keine – unveränderte Kopie |
| Aktualisieren | Repo neu klonen, Datei ersetzen, SHA-256 und Commit hier und in der README eintragen, `?theme=slop` ansehen, `CHANGELOG.md` |
| Entfernen | Ordner und `@font-face`-Regel löschen – das Theme fällt auf Georgia zurück |

## 2. Bauen und Veröffentlichen (GitHub Actions)

| Was | Version | Festgelegt in | Hinweis |
|---|---|---|---|
| Ruby | 3.1.x (lokal `.ruby-version` 3.1.2) | `pages.yml`, `pruefen.yml` (`ruby/setup-ruby`) | 3.1.2 gibt es auf neuen Runnern nicht mehr, daher „3.1“ |
| Jekyll | `~> 4.3` | `Gemfile` | ⚠️ Bereich, keine genaue Version (siehe offene Punkte) |
| webrick | `~> 1.8` | `Gemfile` | nur für `jekyll serve` lokal |
| kramdown, Liquid, Rouge … | wie Jekyll mitbringt | – | Markdown → HTML; GFM-Eingabe (`~~ ~~` → `<del>`) |
| `actions/checkout` | `@v4` | beide Workflows | ⚠️ Major-Tag, kein Commit-SHA |
| `ruby/setup-ruby` | `@v1` | beide Workflows | ⚠️ Major-Tag |
| `actions/configure-pages` | `@v5` | `pages.yml` | ⚠️ Major-Tag |
| `actions/upload-pages-artifact` | `@v3` | `pages.yml` | ⚠️ Major-Tag |
| `actions/deploy-pages` | `@v4` | `pages.yml` | ⚠️ Major-Tag |
| `actions/setup-node` | `@v4`, Node **22.12.0** | `e2e.yml` | ⚠️ Major-Tag; Node-Version genau festgelegt (E2E-Tests brauchen ≥ 22) |
| Pagefind | 1.5.2 | `pages.yml` | siehe oben |

## 3. Tests und Prüfskripte (laufen auch in CI)

| Was | Version | Benutzt von | Hinweis |
|---|---|---|---|
| Ruby-Standardbibliothek inkl. `minitest` | mit Ruby 3.1 | `_scripts/*.rb` | keine zusätzlichen Gems |
| Node.js | was der Runner mitbringt (`ubuntu-latest`) | `test_formulare.rb` → `formulare_beispiele.js`, `edit_examples.js` | ⚠️ nicht festgelegt; nur Node-Bordmittel (`fs`, `path`, `vm`), keine npm-Pakete |
| Node.js ≥ 22 | lokal: installierte (getestet 26.13.1); CI: **22.12.0** (`actions/setup-node` in `e2e.yml`) | E2E-Tests `_tests/e2e/`, `_scripts/test_e2e.sh` | nur Bordmittel (`node:test`, `node:http`, `node:crypto`, `node:zlib`, eingebautes `WebSocket` ab 22) – **keine npm-Pakete**, kein `package.json`; das Skript bricht bei Node < 22 mit Hinweis ab |
| Google Chrome / Chromium (headless) | lokal: installierte; CI: was `ubuntu-latest` mitbringt (`google-chrome --version` steht im Log) | E2E-Tests (`_tests/e2e/lib/browser.js`, gesteuert über das Chrome DevTools Protocol per WebSocket) | ⚠️ Version nicht festgelegt. Pfad über `$CHROME`; in CI mit `--no-sandbox`. Siehe Abschnitt „E2E-Tests“ unten |

### E2E-Tests – warum kein Playwright/Puppeteer

| | |
|---|---|
| Zweck | Die ➕/✏️-Formulare mit GitHub-Verbindung (Pull Requests aus dem Browser) automatisch durchklicken – gegen ein Fake-GitHub (`_tests/e2e/lib/fake-github.js`), auch für Konfliktfälle |
| Entscheidung | **Keine neue Abhängigkeit.** Testrunner ist `node --test`, der Browser das ohnehin für `pr_vorschau.py` genutzte Chrome, gesteuert mit ~200 Zeilen eigenem CDP-Code (`_tests/e2e/lib/browser.js`: Kontexte, `Runtime.evaluate`, `DOM.setFileInputFiles` über `Page.setInterceptFileChooserDialog`). Playwright (`playwright@<version>` + eigener Browser-Download, Apache-2.0) wäre bequemer bei Wartezeiten und Fehlermeldungen, brächte aber `package.json`, Lockfile, `node_modules` und ~150 MB Browser – für eine Handvoll Szenarien zu viel. |
| Version | Node ≥ 22 (eingebautes `WebSocket`), Chrome: installierte (siehe Tabelle oben) |
| Herkunft | Node: https://nodejs.org (lokal z. B. `brew install node`; CI `actions/setup-node@v4` mit `node-version: "22.12.0"`); Chrome: https://www.google.com/chrome/ (auf `ubuntu-latest` vorinstalliert) |
| Benutzt von | `_scripts/test_e2e.sh`, `_tests/e2e/*.test.js`, `.github/workflows/e2e.yml` – nur Tests, nichts davon wird ausgeliefert (`_tests/` ignoriert Jekyll) |
| Lizenz | Node: MIT; Chrome: Google-Nutzungsbedingungen (Chromium: BSD) – wird nur ausgeführt, nicht weitergegeben |
| Aktualisieren | Node-Version in `e2e.yml` erhöhen, `_scripts/test_e2e.sh` laufen lassen. Bricht das CDP-Protokoll in einer neuen Chrome-Version, zeigt die Fehlermeldung die Methode (`Page.…`, `DOM.…`) – in `browser.js` anpassen |
| Entfernen | `_tests/e2e/`, `_scripts/test_e2e.sh`, `.github/workflows/e2e.yml` löschen und den Abschnitt in `CLAUDE.md` („Build“); die Formulare und `github-api.js` funktionieren ohne (die Test-Weiche für die API-Adresse greift nur auf `localhost`) |

## 4. Nur lokal (Skripte für Menschen, nicht in CI)

| Was | Version | Benutzt von | Hinweis |
|---|---|---|---|
| Python 3 + Pillow | aktuell installierte | `_scripts/pr_vorschau.py` (Screenshots), Bildbearbeitung für Beiträge (Metadaten entfernen, verkleinern) | mit `python3 -I` aufrufen |
| Google Chrome (headless) | aktuell installierte | `_scripts/pr_vorschau.py`, E2E-Tests (siehe 3.) | Pfad über `$CHROME` änderbar |
| OpenSCAD | 2021.01 getestet | `_logo/badge/` (Badge zum Drucken) | – |
| SF Mono Heavy (Schrift von macOS) | mit macOS | `_logo/badge/ifsmb-badge.scad` (nur für Namen auf Badges) | liegt nicht im Repo; andere Systeme: `name_font` |
| Python 3 (ohne Zusatzpakete) | – | `_logo/badge/wordmark_from_svg.py`, `export_colored.py` | – |

## Offene Punkte

Bekannte Lücken – nicht stillschweigend lassen, sondern hier abhaken, wenn erledigt:

- [ ] **`Gemfile.lock` ist in `.gitignore`** – CI und lokal können verschiedene Jekyll-/Gem-Versionen bekommen. Vorschlag: `Gemfile.lock` einchecken.
- [ ] **GitHub Actions nur mit Major-Tag** (`@v4` …) – Vorschlag: auf Commit-SHA festlegen (mit Kommentar zur Version).
- [ ] **Node-Version in CI nicht festgelegt** (`pruefen.yml`, `pages.yml`) – Vorschlag: `actions/setup-node` mit fester Version wie in `e2e.yml` (dort 22.12.0).
- [ ] **Chrome-Version für die E2E-Tests nicht festgelegt** (lokal und auf `ubuntu-latest` die installierte) – bisher unkritisch, das DevTools-Protokoll ist stabil; bei Problemen in CI eine feste Version installieren (z. B. Chrome for Testing).
