# Datenstruktur von ifsmb.de

Wie die Inhalte der Seite zusammenhängen. Alles ist eine Markdown-Datei mit Front Matter;
Verbindungen entstehen über Felder im Front Matter. Unten auf jeder Seite zeigt
`_includes/verbindungen.html` alle Verbindungen als Buttons – immer gleich gestylt, immer in
beide Richtungen (ein Eintrag auf einer der beiden Seiten reicht).

## Die Ressourcen

```
 Ressource      Datei                          Adresse
 ─────────────  ─────────────────────────────  ───────────────────────────────
 PROJEKT        _projects/<name>.md            /projekte/<name>/
 TERMIN         _events/<name>.md              /kalender/<name>/
 BEITRAG        _posts/<datum>-<name>.md       /news/<jahr>/<monat>/<tag>/<name>/
 PERSON         _team/<name>.md                /team/<name>/
 AUSSTATTUNG    _equipment/<name>.md           /ausstattung/<name>/
 PRESSE         _press/<name>.md               /presse/<name>/
 PARTNER        _data/partners.yml (+ Seite    /partner/<name>/  (wenn `page:` gesetzt)
                partner/<name>/index.md)
```

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
 ┌─ PERSON ───────────────────────┐      └────────────────────────────────┘
 │ verlinkt  ──► jede Seite       │      ┌─ PARTNER ──────────────────────┐
 │ (alles andere zeigt auf sie)   │      │ in _data/partners.yml, keine   │
 └────────────────────────────────┘      │ eigenen Felder – andere zeigen │
                                         │ per Name oder Adresse auf ihn  │
                                         └────────────────────────────────┘
```

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

- Ohne `standort_partner` wird der Text aus `standort` im Netzwerk ein eigener **Ort** (Quadrat);
  Geräte mit gleichem Text teilen sich den Ort.
- `owner_name` wird im Netzwerk ein Quadrat „Weitere Besitzer*innen“.
- Das Institut selbst besitzt (noch) nichts – jedes Gerät braucht mindestens einen Besitz-Eintrag.

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

- Ein Teilprojekt kann **mehrere Eltern** haben: `teil_von: [a, b]`.
- Teilprojekte stehen **nicht** in den Übersichten (Startseite, `/projekte/`, Archiv), sondern als
  Karten unter „Teilprojekte“ auf jeder Elternseite.
- Teilprojekte zeigen oben und unten „Dieses Projekt ist ein Teil von: …“ (gelbe Buttons).

## Verbindungen – alle Wege

| Feld | steht in | zeigt auf | Beispiel |
|---|---|---|---|
| `verlinkt` | **allen** Ressourcen | beliebige Seite (Adresse) | `verlinkt: [/team/anton/, /partner/taschenstation/]` |
| `teil_von` | Projekt | Eltern-Projekt(e) | `teil_von: [3d-druck-ag-ktg]` |
| `verwandt` | Projekt | Projekt(e) | `verwandt: [ipad-stifte-wiederbeleben]` |
| `event_tag` / `tags` | Projekt / Termin, Beitrag, Ausstattung | gleiches Stichwort | `event_tag: ktg` ↔ `tags: [ktg]` |
| `projekte` | Termin | Projekt(e) | `projekte: [openpress-bauen]` |
| `team` | Projekt, Termin | Person(en) | `team: [falko-richter, anton]` |
| `author` | Beitrag | Person(en) – ein Kürzel oder eine Liste | `author: [falko-richter, frieder-euteneuer]` |
| `partners` | Projekt, Termin | Partner (Name) | `partners: [Kurt-Tucholsky-Grundschule]` |
| `owner_partner` / `owner_team` / `owner_name` | Ausstattung | **Besitz** – Partner / Person / Name, je eine Liste | `owner_partner: [35 services e. V., Kurt-Tucholsky-Grundschule]` |
| `standort_partner` / `standort` | Ausstattung | **Standort** – Partner / Ort (Text) | `standort_partner: Kurt-Tucholsky-Grundschule` |

`verlinkt` ist die allgemeine Verbindung (auch zu normalen Seiten wie `/geld-fuer-makespaces/` – die erscheinen unten unter „Seiten“; solche Seiten zeigen ihre Verbindungen, wenn sie `{% include verbindungen.html %}` einbinden): Es nimmt die **Adresse** der anderen Seite, so wie sie im
Browser steht (ohne `https://ifsmb.de`). So lässt sich alles mit allem verbinden – auch Person mit
Termin, Beitrag mit Beitrag oder Ausstattung mit Partnerseite.

## Wie die Verbindungen unten auf der Seite erscheinen

```
 ┌──────────────────────────────────────────────────────────────┐
 │ Dieses Projekt ist ein Teil von   [↑ Elternprojekt]  (gelb)  │  nur Projekte
 │ Verwandte Projekte / Projekte     [🔧 Projekt] [🔧 …]          │
 │ Termine                           [📅 Termin 04.01.2027]       │
 │ Beiträge                          [📰 Beitrag 29.09.2026]      │
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
- Auf **Teamprofilen** stehen nur `verlinkt`-Verbindungen – alles andere listet das Profil selbst.
- **Persönliche Termine** zeigen die Person als große Karte statt als Button.

## Netzwerk-Ansicht

`/netzwerk/` (Menü „Wir“ → „Netzwerk“) zeigt alle Ressourcen als Punkte und alle Verbindungen als
Linien. Jekyll schreibt beim Bauen die Rohdaten (Felder oben) als JSON in die Seite
(`netzwerk/index.html`), `assets/js/netzwerk.js` macht daraus die Linien – nach denselben Regeln wie
`_includes/verbindungen.html` – und zeichnet sie ohne externe Bibliothek auf ein Canvas.

```
 Jekyll-Build                          Browser
 ─────────────                         ────────────────────────────────────────
 _projects, _events, _posts,   ──►     JSON  ──►  Linien aus den Feldern  ──►  Canvas
 _team, _equipment, _press,            (eine Zeile    (teil_von, verwandt,       (Kräfte-Layout,
 _data/partners.yml                    pro Seite)      team, verlinkt, …)          Zoom, Filter)
```

- Klick auf einen Punkt: Verbindungen rechts als Buttons, Klick darauf springt weiter.
- Doppelklick oder „Seite öffnen“: zur Seite. Die Adresse `/netzwerk/#/projekte/<name>/` öffnet
  das Netzwerk direkt mit diesem Punkt.
- Gestrichelter Rand = persönlich, dicke Linie = Teilprojekt, rote Linie = gehört,
  blau gestrichelt = steht bei, Quadrate = Orte und weitere Besitzer*innen (aus Text).

## Sichtbarkeit

```
                         Startseite  /kalender/  iCal  /projekte/  Teamprofil  Projektseite
 Projekt                     ✔           –        –        ✔           ✔            –
 Teilprojekt (teil_von)      –           –        –        –           ✔        ✔ (Eltern)
 Persönliches Projekt        –           –        –   /persoenlich/   ✔            –
 Termin                      ✔           ✔        ✔        –           ✔        ✔ (Stichwort)
 Termin nur_projekt   (vorher) –         –        –        –           ✔        ✔ (Stichwort)
                      (danach) –         ✔        ✔        –           ✔        ✔
 Persönlicher Termin         –           –        –        –           ✔            –
 Beitrag                     ✔         /news/     –        –           ✔        ✔ (Stichwort)
 Beitrag nur_projekt         –           –        –        –           –        ✔ (Stichwort)
 Persönlicher Beitrag        –    /news/persoenlich/       –           ✔        ✔ (Stichwort)
```

Jede Seite ist trotzdem über ihre Adresse erreichbar und erscheint unten bei allen Seiten, mit
denen sie verbunden ist.
