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

## Struktur

- `_posts/` Neuigkeiten (`/news/`)
- `_team/` Collection, ein Profil pro Datei (`/team/:name/`), Layout `member`
- `_projects/` Collection (`/projekte/:name/`), Layout `project`; `status: abgeschlossen` → Archiv `/projekte/archiv/`
- `_data/partners.yml` Partnerliste; `logo_dark: true` für helle Logos
- Navigation steht in `_config.yml` unter `nav`

## Konventionen

- Kein CSS-/JS-Framework, alle Styles in `assets/css/style.css` mit CSS-Variablen
- Keine externen Ressourcen (Fonts, Skripte, Tracker) einbinden – Datenschutzhinweis im Impressum verspricht das
- E-Mail-Adressen nur über das `.obf-mail`-Muster (siehe README)
- Original-Logos in `_logo/`, `_logo/README.md` aktuell halten
- Platzhalter sind mit `<span class="todo">` markiert
