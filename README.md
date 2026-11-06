# ifsmb.de – Institut für spontane Makespace Buildung

Website des Instituts, gebaut mit [Jekyll](https://jekyllrb.com/) und ausgeliefert über GitHub Pages unter **https://ifsmb.de**.

## Lokal starten

```bash
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

Benötigt Ruby 3.1.2 (siehe `.ruby-version`).

## Inhalte pflegen

| Was | Wo | Hinweise |
|---|---|---|
| Neuigkeiten | `_posts/YYYY-MM-DD-slug.md` | Front Matter: `title`, `date` |
| Team-Mitglied | `_team/vorname-nachname.md` | `title` (Name), `role`, `order`, optional `photo`, `links` |
| Projekt | `_projects/slug.md` | `title`, `summary`, `status` (`aktuell` / `abgeschlossen`), `start`, `zeitraum`, `ort`, `team` (Slugs aus `_team`), `partners` (Namen aus `_data/partners.yml`) |
| Partner | `_data/partners.yml` | Logo nach `assets/images/partner/` legen, Original nach `_logo/partner/` |
| Impressum | `impressum/index.md` | |

Projekte mit `status: abgeschlossen` erscheinen automatisch unter **Vergangene Projekte** (`/projekte/archiv/`).

Teamfotos: quadratisch, ca. 480×480 px, nach `assets/images/team/`.

## E-Mail-Adressen

E-Mail-Adressen nie im Klartext ins HTML schreiben, sondern base64-kodiert:

```html
<a href="#" class="obf-mail" data-em="BASE64_DER_ADRESSE">name [at] ifsmb.de</a>
```

Base64 erzeugen: `printf 'name@ifsmb.de' | base64`

## Deployment

Push auf `main` → GitHub Pages baut und veröffentlicht automatisch.
In den Repo-Einstellungen unter *Pages*: Source = „Deploy from a branch“, Branch = `main` / root, Custom domain = `ifsmb.de`.

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
