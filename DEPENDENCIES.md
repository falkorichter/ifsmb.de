# Abhängigkeiten

Alles, worauf ifsmb.de angewiesen ist – im Browser, beim Bauen, in den Tests und in lokalen Skripten. Regeln in `CLAUDE.md` unter „Abhängigkeiten“: **Was hier nicht steht, wird nicht benutzt.** Neue, aktualisierte und entfernte Einträge kommen mit genauer Version auch ins `CHANGELOG.md` und in die PR-Beschreibung.

Stand: 17.11.2026

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

### Pagefind – Volltextsuche (`/suche/`)

| | |
|---|---|
| Zweck | Suchindex und Such-Oberfläche; `/pagefind/pagefind.js` wird von unserer Domain geladen |
| Version | **1.5.2** |
| Herkunft | npm, beim Deployment mit `npx -y pagefind@1.5.2 --site _site` (`.github/workflows/pages.yml`) – erzeugt `_site/pagefind/` |
| Liegt in | nicht im Repo; entsteht bei jedem Deployment |
| Lizenz | MIT |
| Benutzt von | `suche/`, `_includes/formular-config.html` (Volltextsuche in den Chip-Feldern der Formulare), `_includes/verknuepft.html`, `_includes/todos-knopf.html` |
| Aktualisieren | Version in `pages.yml` ändern, nach dem Deployment `/suche/` und die Seitensuche in den Formularen testen |

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
| Pagefind | 1.5.2 | `pages.yml` | siehe oben |

## 3. Tests und Prüfskripte (laufen auch in CI)

| Was | Version | Benutzt von | Hinweis |
|---|---|---|---|
| Ruby-Standardbibliothek inkl. `minitest` | mit Ruby 3.1 | `_scripts/*.rb` | keine zusätzlichen Gems |
| Node.js | was der Runner mitbringt (`ubuntu-latest`) | `test_formulare.rb` → `formulare_beispiele.js`, `edit_examples.js` | ⚠️ nicht festgelegt; nur Node-Bordmittel (`fs`, `path`, `vm`), keine npm-Pakete |

## 4. Nur lokal (Skripte für Menschen, nicht in CI)

| Was | Version | Benutzt von | Hinweis |
|---|---|---|---|
| Python 3 + Pillow | aktuell installierte | `_scripts/pr_vorschau.py` (Screenshots), Bildbearbeitung für Beiträge (Metadaten entfernen, verkleinern) | mit `python3 -I` aufrufen |
| Google Chrome (headless) | aktuell installierte | `_scripts/pr_vorschau.py` | Pfad über `$CHROME` änderbar |
| OpenSCAD | 2021.01 getestet | `_logo/badge/` (Badge zum Drucken) | – |
| SF Mono Heavy (Schrift von macOS) | mit macOS | `_logo/badge/ifsmb-badge.scad` (nur für Namen auf Badges) | liegt nicht im Repo; andere Systeme: `name_font` |
| Python 3 (ohne Zusatzpakete) | – | `_logo/badge/wordmark_from_svg.py`, `export_colored.py` | – |

## Offene Punkte

Bekannte Lücken – nicht stillschweigend lassen, sondern hier abhaken, wenn erledigt:

- [ ] **`Gemfile.lock` ist in `.gitignore`** – CI und lokal können verschiedene Jekyll-/Gem-Versionen bekommen. Vorschlag: `Gemfile.lock` einchecken.
- [ ] **GitHub Actions nur mit Major-Tag** (`@v4` …) – Vorschlag: auf Commit-SHA festlegen (mit Kommentar zur Version).
- [ ] **Node-Version in CI nicht festgelegt** – Vorschlag: `actions/setup-node` mit fester Version, falls die Tests einmal Node-Eigenheiten brauchen.
