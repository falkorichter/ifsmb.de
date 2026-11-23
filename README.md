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
| Team-Mitglied | `_team/vorname-nachname.md` | `title` (Name), `role`, `order`, optional `not_in_team: true` (eigene Seite zum Verlinken, nicht auf `/team/` gelistet), `photo`, `links` |
| Projekt | `_projects/slug.md` | `title`, `summary`, `status` (`aktuell` / `abgeschlossen`), `start`, `period`, `location`, `team` (Slugs aus `_team`), `partners` (Namen aus `_data/partners.yml`) |
| Partner | `_data/partners.yml` oder `_data/partner/<name>.yml` (ein Partner pro Datei) | Logo nach `assets/images/partner/` legen, Original nach `_logo/partner/` |
| Termin | `_events/YYYY-MM-DD-slug.md` | `title`, `start` / `end` (`2026-11-28 15:00`), `all_day`, `location`, `summary` |
| Pressemitteilung | `_press/YYYY-MM-DD-slug.md` | `title`, `subtitle`, `date` |
| Presse-Kurzprofil & Kontakt | `_data/press.yml` | |
| Pressematerial | `_data/press_kit.yml` | Dateien nach `assets/presse/` |
| Wir in der Presse | `_data/press_reports.yml` oder `_data/press_report/<name>.yml` (wird nach `date` einsortiert) | neueste zuerst; `title`, optional `date`, `note`, `medium`, `url`, optional `occasion` (eigene Seite zum Anlass) |
| Impressum | `impressum/index.md` | |

Projekte mit `status: abgeschlossen` erscheinen automatisch unter **Vergangene Projekte** (`/projects/archive/`).

**Adressen:** Die Ordner für Ressourcen-Typen sind englisch (`/projects/`, `/calendar/`, `/challenges/`, `/equipment/`, `/partners/`, `/press/`, `/news/personal/`, dazu `/search/`, `/network/`, `/map/`, `/tags/`), die Texte bleiben deutsch. Einzelne Textseiten wie `/angebot/` oder `/impressum/` behalten ihre deutsche Adresse. Die früheren deutschen Adressen (`/projekte/…`, `/kalender/…` usw.) leitet `_plugins/alte_adressen.rb` automatisch weiter; Kalender- und RSS-Feeds gibt es dort weiter als Kopie.

Neue Inhalte brauchen **keinen Eintrag in `CHANGELOG.md`** – dort stehen nur Funktionen der Website. Welche Inhalte wann dazukamen, zeigt das [Netzwerk](https://ifsmb.de/network/) mit seiner Zeitleiste.

Teamfotos: Original nach `_logo/team/` (wird nicht committet, enthält oft GPS-Daten), auf das Gesicht quadratisch zuschneiden und als `name-480w.jpg` + `name-960w.jpg` nach `assets/images/team/` legen; im Profil `photo` und `photo_2x` setzen.

## Gelesen-Markierung

Besucher*innen sehen an einem kleinen ✓, welche Seiten sie schon geöffnet haben; Neuigkeiten und Projekte zeigen „X von Y gelesen“. Gespeichert wird nur im Browser (`localStorage`, Schlüssel `gelesen_<uuid>`), nichts wird übertragen.

- Jede Inhaltsseite braucht eine eigene `uuid` im Front Matter. Formulare und Vorlagen der ➕-Buttons setzen sie automatisch.
- Fehlende ergänzen: `ruby _scripts/uuids_ergaenzen.rb` – Prüfen (scheitert bei doppelten uuids, z. B. nach dem Kopieren einer Datei): `ruby _scripts/uuids_ergaenzen.rb --pruefen`
- Markierungen zum Testen löschen: Button im [Impressum](https://ifsmb.de/impressum/) oder in der Konsole
  `Object.keys(localStorage).filter(k => k.startsWith('gelesen_')).forEach(k => localStorage.removeItem(k))`

## Kalender (iCal)

Alle Termine stehen als Abo unter **https://ifsmb.de/calendar.ics** (bzw. `webcal://ifsmb.de/calendar.ics`) bereit. Der Feed wird bei jedem Build neu erzeugt.

## Suche

Die Suche (`/search/`) nutzt [Pagefind](https://pagefind.app): Der Index wird aus dem fertigen HTML nach `jekyll build` erzeugt (macht der Pages-Workflow) und liegt unter `/pagefind/` – alles lokal, keine externen Ressourcen. `jekyll serve` erzeugt keinen Index. Lokal einfach neben dem laufenden `jekyll serve` einmal ausführen (und nach größeren Änderungen wiederholen) – `keep_files: [pagefind]` in `_config.yml` sorgt dafür, dass Jekyll den Index beim Neubauen nicht löscht:

```sh
npx -y pagefind@1.5.2 --site _site   # danach funktioniert http://localhost:4000/search/
```

**Wichtig:** Unter Settings → Pages → Build and deployment muss „Source: GitHub Actions“ stehen. Bei „Deploy from a branch“ baut GitHub zusätzlich selbst und überschreibt die Version mit Index – `/pagefind/` liefert dann 404 und die Suche zeigt nur „Der Suchindex fehlt“. Der Workflow bricht in diesem Fall mit einer Fehlermeldung ab.

Indexiert wird der Seiteninhalt (`data-pagefind-body` in `_layouts/default.html`) mit den Filtern „Bereich“ und „Stichwort“ (`_includes/suche-meta.html`). Übersichtsseiten tragen `search: false` und fehlen im Index; der Block „Verknüpft“ wird ignoriert.

## CMS (Pages CMS)

Inhalte lassen sich ohne Git im Browser pflegen:

1. https://app.pagescms.org öffnen und mit GitHub anmelden
2. Die Pages-CMS-GitHub-App für das Repo `falkorichter/ifsmb.de` installieren (wird beim ersten Login angeboten)
3. Repo auswählen – Kalender, Neuigkeiten, Projekte, Team, Presse und Partner erscheinen links

Jede Änderung ist ein Commit auf `main`, GitHub Pages veröffentlicht sie automatisch. Uploads landen in `assets/uploads/`.
**Achtung:** Fotos, die über das CMS hochgeladen werden, werden nicht automatisch von GPS-Daten befreit.

### Social-Media-Vorschau (Open Graph / Twitter Card)

Jede Seite liefert Open-Graph- und Twitter/X-Card-Metadaten (`summary_large_image`, 1200 × 630 px) für WhatsApp, Signal, Mastodon, LinkedIn, Discord und X:

- **Standardbild:** `assets/images/og-preview.jpg` (1200 × 630 px, Instituts-Karte)
- **Automatisch aus dem Inhalt:** Hat ein Beitrag, Projekt, Termin, Gerät oder Teamprofil ein eigenes Foto (Titelbild, Profilfoto, Galerie oder erstes Foto im Text), wird es automatisch als Vorschaubild genutzt.
- **Eigenes Vorschaubild pro Seite:** Im Front Matter (oder in Pages CMS sowie in den ➕-Formularen auf der Website unter „Mehr Optionen“) lässt sich `social_media_preview_image: /assets/images/...` setzen; die ➕-Formulare zeigen rechts außerdem live eine Social-Media-Vorschaukarte.
- **Lokale Vorschau-Seite:** `_logo/social-preview.html` im Browser öffnen, um die Darstellung für Facebook/LinkedIn, X/Twitter und WhatsApp/Signal zu prüfen.

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
