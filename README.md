# ifsmb.de – Institut für spontane Makespace Buildung

Website des Instituts, gebaut mit [Jekyll](https://jekyllrb.com/) und ausgeliefert über GitHub Pages unter **https://ifsmb.de**.

## Lokal starten

```bash
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

Benötigt Ruby 3.1.2 (siehe `.ruby-version`).

### Links prüfen

```bash
bundle exec jekyll build && ruby _scripts/check_site.rb            # tote interne Links, fehlende Anker, verwaiste Seiten
ruby _scripts/check_site.rb --extern                                # zusätzlich externe Links (langsam, 403/429 = meist Bot-Sperre)
```

„Verwaist“ heißt: von der Startseite aus über keinen Link (Menü, Listen, Texte) erreichbar. Der Pages-Workflow führt die interne Prüfung bei jedem Push aus und bricht bei Fehlern ab.

## Inhalte pflegen

| Was | Wo | Hinweise |
|---|---|---|
| Neuigkeiten | `_posts/YYYY-MM-DD-slug.md` | Front Matter: `title`, `date` |
| Team-Mitglied | `_team/vorname-nachname.md` | `title` (Name), `role`, `order`, optional `photo`, `links` |
| Projekt | `_projects/slug.md` | `title`, `summary`, `status` (`aktuell` / `abgeschlossen`), `start`, `zeitraum`, `ort`, `team` (Slugs aus `_team`), `partners` (Namen aus `_data/partners.yml`) |
| Partner | `_data/partners.yml` oder `_data/partner/<name>.yml` (ein Partner pro Datei) | Logo nach `assets/images/partner/` legen, Original nach `_logo/partner/` |
| Termin | `_events/YYYY-MM-DD-slug.md` | `title`, `start` / `end` (`2026-11-28 15:00`), `all_day`, `location`, `summary` |
| Pressemitteilung | `_press/YYYY-MM-DD-slug.md` | `title`, `subtitle`, `date` |
| Presse-Kurzprofil & Kontakt | `_data/presse.yml` | |
| Pressematerial | `_data/pressematerial.yml` | Dateien nach `assets/presse/` |
| Wir in der Presse | `_data/presseberichte.yml` oder `_data/pressebericht/<name>.yml` (wird nach `datum` einsortiert) | neueste zuerst; `titel`, optional `datum`, `hinweis`,, `medium`, `url`, optional `anlass` (eigene Seite zum Anlass) |
| Impressum | `impressum/index.md` | |

Projekte mit `status: abgeschlossen` erscheinen automatisch unter **Vergangene Projekte** (`/projekte/archiv/`).

Teamfotos: Original nach `_logo/team/` (wird nicht committet, enthält oft GPS-Daten), auf das Gesicht quadratisch zuschneiden und als `name-480w.jpg` + `name-960w.jpg` nach `assets/images/team/` legen; im Profil `photo` und `photo_2x` setzen.

## Kalender (iCal)

Alle Termine stehen als Abo unter **https://ifsmb.de/kalender.ics** (bzw. `webcal://ifsmb.de/kalender.ics`) bereit. Der Feed wird bei jedem Build neu erzeugt.

## Suche

Die Suche (`/suche/`) nutzt [Pagefind](https://pagefind.app): Der Index wird aus dem fertigen HTML nach `jekyll build` erzeugt (macht der Pages-Workflow) und liegt unter `/pagefind/` – alles lokal, keine externen Ressourcen. `jekyll serve` erzeugt keinen Index. Lokal einfach neben dem laufenden `jekyll serve` einmal ausführen (und nach größeren Änderungen wiederholen) – `keep_files: [pagefind]` in `_config.yml` sorgt dafür, dass Jekyll den Index beim Neubauen nicht löscht:

```sh
npx -y pagefind@1.5.2 --site _site   # danach funktioniert http://localhost:4000/suche/
```

**Wichtig:** Unter Settings → Pages → Build and deployment muss „Source: GitHub Actions“ stehen. Bei „Deploy from a branch“ baut GitHub zusätzlich selbst und überschreibt die Version mit Index – `/pagefind/` liefert dann 404 und die Suche zeigt nur „Der Suchindex fehlt“. Der Workflow bricht in diesem Fall mit einer Fehlermeldung ab.

Indexiert wird der Seiteninhalt (`data-pagefind-body` in `_layouts/default.html`) mit den Filtern „Bereich“ und „Stichwort“ (`_includes/suche-meta.html`). Übersichtsseiten tragen `suche: false` und fehlen im Index; der Block „Verknüpft“ wird ignoriert.

## CMS (Pages CMS)

Inhalte lassen sich ohne Git im Browser pflegen:

1. https://app.pagescms.org öffnen und mit GitHub anmelden
2. Die Pages-CMS-GitHub-App für das Repo `falkorichter/ifsmb.de` installieren (wird beim ersten Login angeboten)
3. Repo auswählen – Kalender, Neuigkeiten, Projekte, Team, Presse und Partner erscheinen links

Jede Änderung ist ein Commit auf `main`, GitHub Pages veröffentlicht sie automatisch. Uploads landen in `assets/uploads/`.
**Achtung:** Fotos, die über das CMS hochgeladen werden, werden nicht automatisch von GPS-Daten befreit.

## E-Mail-Adressen

E-Mail-Adressen nie im Klartext ins HTML schreiben, sondern base64-kodiert:

```html
<a href="#" class="obf-mail" data-em="BASE64_DER_ADRESSE">name [at] ifsmb.de</a>
```

Base64 erzeugen: `printf 'name@ifsmb.de' | base64`

Telefonnummern genauso: `<a href="#" class="obf-tel" data-tel="BASE64">Telefon</a>` (Base64 von z. B. `0151 2345678`); das Skript setzt Text und `tel:`-Link.

## Deployment

Push auf `main` → der Workflow `.github/workflows/pages.yml` baut die Seite, erzeugt den Suchindex und veröffentlicht.
In den Repo-Einstellungen unter *Pages*: Source = „GitHub Actions“, Custom domain = `ifsmb.de`.

DNS für `ifsmb.de` (Apex):

```
A     185.199.108.153
A     185.199.109.153
A     185.199.110.153
A     185.199.111.153
AAAA  2606:50c0:8000::153
AAAA  2606:50c0:8001::153
AAAA  2606:50c0:8002::153
AAAA  2606:50c0:8003::153
www   CNAME  falkorichter.github.io.
```
