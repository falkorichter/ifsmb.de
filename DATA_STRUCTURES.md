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
 PARTNER        _data/partners.yml (+ Seite    /partners/<name>/  (wenn `page:` gesetzt)
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
Linien. Jekyll schreibt beim Bauen die Rohdaten (Felder oben) als JSON in die Seite
(`network/index.html`), `assets/js/netzwerk.js` macht daraus die Linien – nach denselben Regeln wie
`_includes/verbindungen.html` – und zeichnet sie ohne externe Bibliothek auf ein Canvas.

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
  Kommentar in den Vorlagen (`_includes/vorlagen/`) und `THEMES` in `assets/js/neu.js` –
  `ruby _scripts/test_formulare.rb` prüft, dass alles zusammenpasst, `check_site.rb` meldet unbekannte Werte.

## Einfache Seiten im ✏️-Formular

Seiten außerhalb der Sammlungen mit `layout: page` – und die Startseite `index.html` (`layout: default`) – lassen sich ebenfalls im ✏️-Formular bearbeiten (#154):

| Datei | Formular | Felder |
|---|---|---|
| Markdown (`partners/<name>/index.md`, `angebot/index.md`, `spenden/index.md` …) | `seite` | `title`, `lead`, `linked`, Text, `social_media_preview_image`, `theme` |
| HTML (`index.html` (Startseite), `team/index.html`, `partners/index.html`, `projects/index.html` …) | `uebersicht` | `title`, `lead`, `social_media_preview_image`, `theme` und das HTML selbst (unter „Weitere Felder“, wird vor dem Speichern geprüft) |

Alle anderen Felder (`i18n_title`, `search` …) bleiben unverändert. `edit_form: false` im Front Matter lässt eine Seite beim GitHub-Editor. Vorlage für neue Markdown-Seiten: `_includes/vorlagen/seite.md`.

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
