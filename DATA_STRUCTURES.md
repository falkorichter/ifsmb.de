# Datenstruktur von ifsmb.de

Wie die Inhalte der Seite zusammenhängen. Alles ist eine Markdown-Datei mit Front Matter;
Verbindungen entstehen über Felder im Front Matter. Unten auf jeder Seite zeigt
`_includes/verbindungen.html` alle Verbindungen als Buttons – immer gleich gestylt, immer in
beide Richtungen (ein Eintrag auf einer der beiden Seiten reicht).

## Die Ressourcen

```
 Ressource      Datei                          Adresse
 ─────────────  ─────────────────────────────  ───────────────────────────────
 PROJEKT        _projects/<name>.md            /projects/<name>/
 TERMIN         _events/<name>.md              /calendar/<name>/
 BEITRAG        _posts/<datum>-<name>.md       /news/<jahr>/<monat>/<tag>/<name>/
 PERSON         _team/<name>.md                /team/<name>/
 AUSSTATTUNG    _equipment/<name>.md           /equipment/<name>/
 HERAUSFORDERUNG _challenges/<name>.md  /challenges/<name>/
 PRESSE         _press/<name>.md               /press/<name>/
 PARTNER        _data/partners.yml (+ Seite    /partners/<name>/  (immer; ohne `page:` erzeugt)
                partners/<name>/index.md)
```

Frühere deutsche Adressen (`/projekte/…`, `/kalender/…`, `/herausforderungen/…`, `/ausstattung/…`,
`/partner/…`, `/presse/…`, `/news/persoenlich/`, `/suche/`, `/netzwerk/`, `/karte/`, `/stichworte/`) leitet `_plugins/alte_adressen.rb` automatisch weiter.

## Wie sie zusammenhängen

Jede Ressource zeigt mit ihren Feldern auf andere. Die Pfeile gelten immer auch rückwärts:
Die Zielseite zeigt die Verbindung ebenfalls an.

```
 ┌─ PROJEKT ──────────────────────┐      ┌─ TERMIN ───────────────────────┐
 │ teil_von  ──► PROJEKT (Eltern) │      │ projekte  ──► PROJEKT          │
 │ verwandt  ──► PROJEKT          │      │ tags      ──► PROJEKT          │
 │ team      ──► PERSON           │      │               (= event_tag)    │
 │ partners  ──► PARTNER          │      │ team      ──► PERSON           │
 │ event_tag ◄── tags von TERMIN, │      │ partners  ──► PARTNER          │
 │               BEITRAG, AUSST.  │      │ verlinkt  ──► jede Seite       │
 │ verlinkt  ──► jede Seite       │      └────────────────────────────────┘
 └────────────────────────────────┘
 ┌─ BEITRAG ──────────────────────┐      ┌─ AUSSTATTUNG ──────────────────┐
 │ tags      ──► PROJEKT          │      │ BESITZ (Liste, mehrere mögl.): │
 │               (= event_tag)    │      │  owner_partner ══► PARTNER     │
 │ author    ──► PERSON (Liste)   │      │  owner_team    ══► PERSON      │
 │ verlinkt  ──► jede Seite       │      │  owner_name    ══► Name (Text) │
 └────────────────────────────────┘      │ STANDORT:                      │
                                         │  standort_partner ┄┄► PARTNER  │
                                         │  standort (Text)  ┄┄► ORT      │
                                         │ tags             ──► PROJEKT   │
                                         │ verlinkt         ──► jede Seite│
 ┌─ HERAUSFORDERUNG ──────────────┐                     (Aufgabe, Problem, Frage)
 │ projekte  ──► PROJEKT (viele   │      ein Projekt hat viele Herausforderungen;
 │               je Projekt)      │      sie stehen auf der Projektseite als Karten
 │ tags      ──► PROJEKT          │
 │               (= event_tag)    │
 │ team      ──► PERSON (zustän-  │      Teamprofil listet „Herausforderungen“
 │               dig, Liste)      │
 │ verlinkt  ──► jede Seite       │      Termine, Geräte, Beiträge, Partner …
 │ wichtig + dringend ──► MATRIX  │      Eisenhower auf /challenges/:
 │                                │      sofort / einplanen / abgeben / später
 └────────────────────────────────┘
 ┌─ PERSON ───────────────────────┐      └────────────────────────────────┘
 │ verlinkt       ──► jede Seite  │      ┌─ PARTNER ──────────────────────┐
 │ nicht_im_team  = nicht auf     │      │ in _data/partners.yml, keine   │
 │                  /team/        │      │ eigenen Felder – andere zeigen │
 │ (alles andere zeigt auf sie)   │      │ per Name oder Adresse auf ihn  │
 └────────────────────────────────┘      └────────────────────────────────┘
```

## Orte auf der Karte

`/map/` zeigt die Orte aus `_data/places.yml`. Wie eine Seite zu ihrem Ort kommt (die erste
passende Regel gewinnt):

```
 orte: [<id>]                       ──► ORT        jede Seite, fest zugeordnet
 ort / location / standort (Text)   ──► ORT        enthält eines der `match`-Wörter
 standort_partner, partners,        ──► ORT        Partnername = `partner` des Orts
 owner_partner (Gerät ohne standort)
 BEITRAG: tags / projekte           ──► PROJEKT ──► ORT des Projekts
```

Termine mit `location: "Berlin"` oder „Online“ landen nirgends – lieber gar kein Punkt als ein falscher.

## Besitz und Standort (Ausstattung)

Besitz und Standort sind **besondere Verbindungen**: Sie haben auf der Geräteseite eigene Gruppen
(„Gehört“, „Standort“), auf Partnerseiten ein Etikett am Gerät („Besitz“, „Standort“) und im
Netzwerk eigene Linien.

```
                    ┌─────────────────────────────┐
                    │  AUSSTATTUNG                │
                    │  German RepRap X400         │
                    └──┬──────────┬───────────┬───┘
     owner_partner:    │          │ owner_    │ standort_partner / standort
     [A, B]            │          │ team: x   │
          ═════════════╪══════    │           ┊
          ║            ║     ║    ║           ┊
          ▼            ▼     ▼    ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌────────┐  ┌─────────────────────┐
     │PARTNER A│ │PARTNER B│ │PERSON x│  │ PARTNER oder ORT    │
     └─────────┘ └─────────┘ └────────┘  │ (Text wird ein Ort) │
                                         └─────────────────────┘
   ══ gehört (rot, durchgezogen)       ┄┄ steht bei (blau, gestrichelt)
```

```yaml
owner_partner: [35 services e. V., Kurt-Tucholsky-Grundschule]   # Liste oder ein Wert
owner_team: [falko-richter]
owner_name: [pebcak]                    # wenn weder Partner noch Team
standort: Kurt-Tucholsky-Grundschule (3D-Druck AG)
standort_partner: Kurt-Tucholsky-Grundschule   # verlinkt den Standort mit dem Partner
```

- Ohne `location_partner` wird der Text aus `location` im Netzwerk ein eigener **Ort** (Quadrat);
  Geräte mit gleichem Text teilen sich den Ort.
- `owner_name` wird im Netzwerk ein Quadrat „Weitere Besitzer*innen“.
- Das Institut selbst besitzt (noch) nichts – jedes Gerät braucht mindestens einen Besitz-Eintrag.

**Filtern per Link:** `/equipment/?owner=<schlüssel>` zeigt nur die Geräte einer Besitzer*in, `/equipment/?location=<schlüssel>` die Geräte, die bei einem Partner stehen (`assets/js/equipment-filter.js`, Leiste mit allen Besitzer*innen und Standorten oben auf der Seite). Schlüssel: bei Partnern der letzte Teil ihrer Seite (`page: /partners/35services/` → `35services`), sonst der Name als Slug; bei Teammitgliedern das Kürzel (`falko-richter`); `owner_name` als Slug (`_includes/equipment-keys.html`). Partnerseiten verlinken das mit `{% include partner-equipment-links.html partner="35 services e. V." %}` – „Ausstattung von …“ und „Ausstattung bei …“ mit Anzahl, nichts, wenn der Partner keine Geräte hat.

## Projekte und Teilprojekte

```
                 ┌───────────────────────────┐
                 │ 3D-Druck AG an der KTG    │   event_tag: ktg
                 └─────────────┬─────────────┘
          teil_von: [3d-druck-ag-ktg]   (auf den Teilprojekten)
      ┌──────────────┬─────────┴─────┬──────────────────┐
      ▼              ▼               ▼                  ▼
 ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────┐
 │Open Press│  │ Blockface  │  │ iPad-Stifte  │  │ junior1stein│
 │  bauen   │  │ Klassensatz│  │ wiederbeleben│  │  für die KTG│
 └──────────┘  └────────────┘  └──────┬───────┘  └────────────┘
                                      │ verwandt (beide Richtungen)
                                      ▼
 ┌────────────────────────────┐  ┌──────────────────────────────┐
 │ 3D-Druck AG am Rosalind-   │◄─│ iPad-Stifte testen am RFG    │
 │ Franklin-Gymnasium         │  │ teil_von: [3d-druck-ag-      │
 └────────────────────────────┘  │   rosalind-franklin-gymnasium]│
                                 └──────────────────────────────┘
```

- Ein Teilprojekt kann **mehrere Eltern** haben: `part_of: [a, b]`.
- Teilprojekte stehen **nicht** in den Übersichten (Startseite, `/projects/`, Archiv), sondern als
  Karten unter „Teilprojekte“ auf jeder Elternseite.
- Teilprojekte zeigen oben und unten „Dieses Projekt ist ein Teil von: …“ (gelbe Buttons).

## Verbindungen – alle Wege

| Feld | steht in | zeigt auf | Beispiel |
|---|---|---|---|
| `linked` | **allen** Ressourcen | beliebige Seite (Adresse) | `linked: [/team/anton/, /partners/taschenstation/]` |
| `part_of` | Projekt | Eltern-Projekt(e) | `part_of: [3d-druck-ag-ktg]` |
| `related` | Projekt | Projekt(e) | `related: [ipad-stifte-wiederbeleben]` |
| `event_tag` / `tags` | Projekt / Termin, Beitrag, Ausstattung | gleiches Stichwort | `event_tag: ktg` ↔ `tags: [ktg]` |
| `projects` | Termin, Herausforderung | Projekt(e) | `projects: [openpress-bauen]` |
| `team` | Projekt, Termin, Herausforderung (= zuständig) | Person(en) | `team: [falko-richter, anton]` |
| `author` | Beitrag | Person(en) – ein Kürzel oder eine Liste | `author: [falko-richter, frieder-euteneuer]` |
| `partners` | Projekt, Termin | Partner (Name) | `partners: [Kurt-Tucholsky-Grundschule]` |
| `owner_partner` / `owner_team` / `owner_name` | Ausstattung | **Besitz** – Partner / Person / Name, je eine Liste | `owner_partner: [35 services e. V., Kurt-Tucholsky-Grundschule]` |
| `location_partner` / `location` | Ausstattung | **Standort** – Partner / Ort (Text) | `location_partner: Kurt-Tucholsky-Grundschule` |

`links: [{ title, url, category }]` sind **externe Links** mit Titel und Art (`category`: equipment, person, partner, event, post, project, challenge, press, `link`) – „Verbindungen“ zeigt sie in der Gruppe ihrer Art, `link` und solche ohne Art unter „Links“ (siehe `FEDERATION.md`).

`linked` ist die allgemeine Verbindung (auch zu normalen Seiten wie `/geld-fuer-makespaces/` – die erscheinen unten unter „Seiten“; solche Seiten zeigen ihre Verbindungen, wenn sie `{% include verbindungen.html %}` einbinden): Es nimmt die **Adresse** der anderen Seite, so wie sie im
Browser steht (ohne `https://ifsmb.de`). So lässt sich alles mit allem verbinden – auch Person mit
Termin, Beitrag mit Beitrag oder Ausstattung mit Partnerseite.

## Wie die Verbindungen unten auf der Seite erscheinen

```
 ┌──────────────────────────────────────────────────────────────┐
 │ Dieses Projekt ist ein Teil von   [↑ Elternprojekt]  (gelb)  │  nur Projekte
 │ Verwandte Projekte / Projekte     [🔧 Projekt] [🔧 …]          │
 │ Termine                           [📅 Termin 04.01.2027]       │
 │ Beiträge                          [📰 Beitrag 29.09.2026]      │
 │ Herausforderungen                 [🧗 Frage offen]             │
 │ Beteiligt                         [👤 Person]                  │
 │ Partner                           [🤝 Partner]                 │
 │ Ausstattung                       [🛠️ Gerät]                   │
 ├──────────────────────────────────────────────────────────────┤
 │ Verknüpft (automatisch über gemeinsame Stichworte)           │
 └──────────────────────────────────────────────────────────────┘
```

- Persönliche Projekte, Termine und Beiträge bekommen im Button das Etikett „persönlich“.
- Auf **Projektseiten** fehlen Termine und Beiträge mit dem `event_tag` des Projekts – die stehen
  schon oben unter „Termine & Berichte“ und „Stand / Updates“.
- Auf **Teamprofilen** stehen nur `linked`-Verbindungen – alles andere listet das Profil selbst.
- **Persönliche Termine** zeigen die Person als große Karte statt als Button.
- **Herausforderungen** eines Projekts (über `projects` oder `event_tag`) stehen auf der Projektseite
  als Karten unter „Herausforderungen“, die eines Menschen (`team`) im Teamprofil – dort fehlen sie
  unten bei „Verbindungen“.

## Netzwerk-Ansicht

`/network/` (Menü „Wir“ → „Netzwerk“) zeigt alle Ressourcen als Punkte und alle Verbindungen als
Linien. Jekyll schreibt beim Bauen die Rohdaten (Felder oben) in eine eigene Datei
[`/network/graph.json`](https://ifsmb.de/network/graph.json) (`network/graph.json`; Kopf mit `format`, `version`,
`site`, `generated`, dann `nodes` – auch für andere Instanzen gedacht, Föderation; Todos gehören nicht zum Netzwerk).
Jeder Knoten hat seine **absolute** Adresse als `id` (`https://ifsmb.de/team/falko-richter/` – weltweit eindeutig, auch beim Zusammenführen von Graphen mehrerer Instanzen und unter einem `baseurl`) und – außer Partnern aus `_data/` – seine `uuid` (bleibt auch bei neuen Adressen gleich).
**Gleiche uuid = dasselbe in der echten Welt:** Ist eine Person (oder ein Beitrag, ein Gerät) auf mehreren Instanzen aktiv,
trägt sie überall dieselbe uuid – beim Zusammenführen der Graphen wird daraus ein Knoten mit mehreren Adressen. Verschiedene
Personen haben nie dieselbe uuid, auch nicht bei gleichem Namen oder Kürzel.
**`same_as`** (Partner, Geräte, Personen; eine absolute https-Adresse oder eine Liste) sagt: „das ist dasselbe wie diese Seite
auf einer anderen Instanz oder Website“ – auch ohne gemeinsame uuid, also auch für Partner aus `_data/`. Der Knoten trägt dann
`"same_as": ["https://35services.ifsmb.de/partners/35-services-e-v/"]` (nur wenn gesetzt; Format bleibt Version 1), die
Microdata der Seite `<link itemprop="sameAs" href="…">` (Partnerseiten nehmen den Wert aus dem Partner-Eintrag). Damit kann
eine andere Instanz Knoten finden, die auf eine ihrer eigenen Seiten zeigen (eingehende Links, #299). `_plugins/same_as.rb`
prüft beim Bauen: nur https, keine Adresse der eigenen Website.
In den Verweisfeldern (`team`, `author`, `owner_team`, `projects`, `part_of`, `related`,
`partners`, `owner_partner`, `location_partner`) stehen ebenfalls Knoten-IDs, also `https://ifsmb.de/team/falko-richter/` statt `falko-richter`; `linked` wird genauso zu absoluten Adressen
(`_includes/graph-refs.html` löst die Kürzel und Namen aus dem Markdown beim Bauen auf).
`assets/js/netzwerk.js` lädt die Datei und macht daraus die Linien – nach denselben Regeln wie
`_includes/verbindungen.html` – und zeichnet sie ohne externe Bibliothek auf ein Canvas.

Für andere Instanzen gibt es einen Einstieg: [`/meta_graph.json`](https://ifsmb.de/meta_graph.json)
(`meta_graph.json`) verweist auf alle Graphen der Seite (`graphs`, je mit `url`, `format` und `node_types` –
eine Seite könnte z. B. getrennte Graphen für Team, Partner und Ausstattung haben, wir haben einen), auf den
Suchindex (`search_index` → `/search/index.json`) und auf die Volltextsuche (`fulltext_search` → Pagefind).

```
 /meta_graph.json ──▶ graphs[]: /network/graph.json  (nodes: projekt, termin, beitrag, person, …)
                  ├─▶ search_index: /search/index.json
                  ├─▶ fulltext_search: /pagefind/
                  └─▶ federation[]: https://35services.ifsmb.de  ──▶ deren /meta_graph.json …
```

**Föderation:** Mit „🌐 Verbundene Instanzen einbeziehen“ (`?verbund=1`) lädt `/network/` die Graphen aller Instanzen aus
`federation` (und per „➕ Instanz hinzufügen“ eingetragene) und führt sie zusammen:

```
 ifsmb.de/network/graph.json            35services.ifsmb.de/network/graph.json
 ┌───────────────────────────────┐      ┌────────────────────────────────────────┐
 │ id  https://ifsmb.de/team/falko│      │ id  https://35services.ifsmb.de/team/fa…│
 │ uuid 12917a5c…   type person   │      │ uuid 12917a5c…   type person            │
 └───────────────┬───────────────┘      └────────────────────┬───────────────────┘
                 └────── gleiche uuid + gleicher Typ ─────────┘
                                   ▼
             ein Knoten: id = eigene Adresse, aliases = [fremde Adresse],
             instances = [ifsmb.de, 35services.ifsmb.de], Verbindungen beider Seiten
```

Gleiche `id` ist ebenfalls derselbe Knoten (z. B. `partner:<Name>`); alles andere kommt mit `instance` (blauer Rand) dazu.
Die Suche hängt die Pagefind-Indizes der Instanzen an (`mergeIndex`).

**Microdata pro Seite** (`_includes/microdata.html`): Ausstattung → `schema.org/Product`, Team → `Person`, Beiträge →
`BlogPosting`, Termine → `Event`, Projekte → `Project`, Herausforderungen → `CreativeWork`, Presse → `NewsArticle`,
Partnerseiten → `Organization`; jeweils `itemid` = absolute Adresse, `name`, `description`, `image`, `identifier` = uuid.
Damit lösen andere Instanzen Links auf (`_plugins/federation_links.rb`, `assets/js/federation-links.js`). Konzept: `FEDERATION.md`.

```
 Jekyll-Build                          Browser
 ─────────────                         ────────────────────────────────────────
 _projects, _events, _posts,   ──►     JSON  ──►  Linien aus den Feldern  ──►  Canvas
 _team, _equipment, _press,            (eine Zeile    (teil_von, verwandt,       (Kräfte-Layout,
 _challenges,                   pro Seite)      team, verlinkt, …)          Zoom, Filter)
 _data/partners.yml
```

- Klick auf einen Punkt: Verbindungen rechts als Buttons, Klick darauf springt weiter.
- Doppelklick oder „Seite öffnen“: zur Seite. Die Adresse `/network/#/projects/<name>/` öffnet
  das Netzwerk direkt mit diesem Punkt.
- Gestrichelter Rand = persönlich, dicke Linie = Teilprojekt, rote Linie = gehört,
  blau gestrichelt = steht bei, Quadrate = Orte und weitere Besitzer*innen (aus Text).

## Aussehen (Themes)

Jede Seite kann ein eigenes Aussehen haben. Welches gilt, entscheidet (das erste, was passt, gewinnt):

```
 Besucher*in: „Aussehen“ im Footer        localStorage["ifsmb-theme"]   (überall, bis „Wie die Seite“)
              oder Link mit ?theme=<id>   (setzt dieselbe Wahl; ?theme=auto vergisst sie)
 Seite:       theme: <id>                 Front Matter jeder Seite (Beitrag, Termin, Projekt, Gerät,
                                          Herausforderung, Person, Presse – auch normale Seiten)
 Website:     default_theme: <id>         _config.yml (nicht `theme:` – das ist bei Jekyll ein Gem-Theme)
 sonst:       ifsmb                       das gewohnte Aussehen (erster Eintrag in _data/themes.yml)
```

| id | Name | Vorbild |
|---|---|---|
| `ifsmb` | IfsMB (Standard) | – |
| `offene-werkstaetten` | Offene Werkstätten | [offene-werkstaetten.org](https://offene-werkstaetten.org/de) |
| `rfflabs` | RFFLabs | [rfflabs.fr](https://www.rfflabs.fr/) |
| `slop` | Slop ✨ | [Slopstrap](https://slopstrap.mikelacher.com/) (Parodie auf den „vibecoded“-Look; nur nachgebaut, kein Code übernommen) |

- Liste: `_data/themes.yml`; das Layout schreibt `data-theme` und `data-page-theme` auf `<html>`, Stile in
  `assets/css/themes.css`, Auswahl im Footer `assets/js/theme.js`.
- `theme` ist keine Verbindung – es ändert nur das Aussehen, nicht die Inhalte oder die Links.
- Neues Theme: Eintrag in `_data/themes.yml`, Block in `themes.css`, Auswahlwerte in `.pages.yml`,
  Kommentar in den Vorlagen (`_includes/vorlagen/`); die ➕/✏️-Formulare lesen die Liste selbst (über
  `_includes/formular-config.html`) –
  `ruby _scripts/test_formulare.rb` prüft, dass alles zusammenpasst, `check_site.rb` meldet unbekannte Werte.

## Einfache Seiten im ✏️-Formular

Seiten außerhalb der Sammlungen mit `layout: page` – und die Startseite `index.html` (`layout: default`) – lassen sich ebenfalls im ✏️-Formular bearbeiten (#154):

| Datei | Formular | Felder |
|---|---|---|
| Markdown (`partners/<name>/index.md`, `angebot/index.md`, `spenden/index.md` …) | `seite` | `title`, `lead`, `linked`, Text, `social_media_preview_image`, `theme` |
| HTML (`index.html` (Startseite), `team/index.html`, `partners/index.html`, `projects/index.html` …) | `uebersicht` | `title`, `lead`, `social_media_preview_image`, `theme` und das HTML selbst (unter „Weitere Felder“, wird vor dem Speichern geprüft) |

Alle anderen Felder (`i18n_title`, `search` …) bleiben unverändert. `edit_form: false` im Front Matter lässt eine Seite beim GitHub-Editor. Vorlage für neue Markdown-Seiten: `_includes/vorlagen/seite.md`.

## Mehrere Instanzen: `_data/instanz/`

Dieselbe Code-Basis läuft als ifsmb.de und als weitere Instanzen (z. B. 35services.ifsmb.de). Was nur eine Instanz betrifft, steht nicht in den gemeinsamen Dateien, sondern in `_data/instanz/` – an derselben Stelle wie das Original:

| Datei | wirkt auf | wie |
|---|---|---|
| `_data/instanz/i18n/de.yml` (en, fr) | `_data/i18n/de.yml` | nur die Schlüssel darin; muss es im Original geben, gleiche Platzhalter |
| `_data/instanz/<name>.yml` | `_data/<name>.yml` | Hash: Schlüssel für Schlüssel, Liste: ersetzt |

Beispiel für eine Instanz:

```yaml
# _data/instanz/i18n/de.yml
footer:
  disclaimer: Ein Angebot von 35services.
```

Links auf Seiten, die eine Instanz nicht hat (`/spenden/`, `/angebot/`, `/todos/` …), stehen in den Layouts in `{% ifpage … %}` und fallen dann weg (`_plugins/instanz.rb`).

## Sichtbarkeit

```
                         Startseite  /calendar/  iCal  /projects/  Teamprofil  Projektseite
 Projekt                     ✔           –        –        ✔           ✔            –
 Teilprojekt (teil_von)      –           –        –        –           ✔        ✔ (Eltern)
 Persönliches Projekt        –           –        –   /persoenlich/   ✔            –
 Termin                      ✔           ✔        ✔        –           ✔        ✔ (Stichwort)
 Termin nur_projekt   (vorher) –         –        –        –           ✔        ✔ (Stichwort)
                      (danach) –         ✔        ✔        –           ✔        ✔
 Persönlicher Termin         –           –        –        –           ✔            –
 Beitrag                     ✔         /news/     –        –           ✔        ✔ (Stichwort)
 Beitrag nur_projekt         –           –        –        –           –        ✔ (Stichwort)
 Persönlicher Beitrag        –    /news/personal/       –           ✔        ✔ (Stichwort)
```

Jede Seite ist trotzdem über ihre Adresse erreichbar und erscheint unten bei allen Seiten, mit
denen sie verbunden ist.
