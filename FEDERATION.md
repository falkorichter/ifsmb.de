# Föderation – mehrere Instanzen, ein Netzwerk

Dieses Dokument beschreibt das Konzept, das in der Nacht vom 24. auf den 25. November 2026 Schritt für Schritt
entstanden ist: Mehrere Websites aus **demselben Code** („Instanzen“) zeigen ihre Inhalte gemeinsam, ohne Server,
ohne Datenbank, nur mit statischen Dateien auf GitHub Pages.

- **Hauptseite:** [ifsmb.de](https://ifsmb.de/) ([falkorichter/ifsmb.de](https://github.com/falkorichter/ifsmb.de))
- **Erste weitere Instanz:** [35services.ifsmb.de](https://35services.ifsmb.de/) ([35services/ifsmb](https://github.com/35services/ifsmb)),
  ein Fork, der nur die Inhalte von 35 services e. V. trägt (Startseite, Beiträge, Termin, Team, eigene Geräte).

## 1. Grundidee: eine Heimat, andere verweisen

Jede Sache (Person, Gerät, Beitrag, Projekt …) hat **genau eine Heimat** – die Instanz, zu der sie gehört. Andere
Instanzen kopieren sie nicht, sondern **verweisen mit der vollen Adresse** darauf:

```markdown
Der [Snapmaker U1](https://35services.ifsmb.de/equipment/snapmaker-u1/) steht an der KTG.
```

Beispiele aus dieser Nacht: Der Snapmaker U1, der Bambu Lab A1 mini und der Prusa MK4 gehören 35services – ihre
Seiten liegen jetzt nur noch dort. Auf ifsmb.de leitet die alte Adresse weiter (`layout: weiterleitung` mit absolutem
`target`), alle Links zeigen auf die neue Heimat.

**Kurze Kürzel bleiben im Markdown** (`team: [falko-richter]`): Adressen ändern sich (`/projekte/` → `/projects/`),
Kürzel nicht. Volle Adressen braucht es nur für Verweise auf **andere** Instanzen. (Offene Idee: dieselben Felder
nehmen zusätzlich volle URLs an, z. B. `team: [falko-richter, https://35services.ifsmb.de/team/anton/]`.)

## 2. Identität: absolute Adresse + uuid

| | bedeutet | ändert sich |
|---|---|---|
| **Adresse** (`https://ifsmb.de/team/falko-richter/`) | *wo* etwas zu finden ist | bei Umzug, neuer Domain, neuem Adressschema |
| **uuid** (`12917a5c-…`) | *was* es ist | nie |

- Knoten-IDs und alle Verweise in `/network/graph.json` sind **absolute Adressen** – weltweit eindeutig, auch unter
  einem `baseurl`, ohne „auflösen gegen `site`“.
- **Gleiche uuid = dasselbe in der echten Welt.** Ist Falko auf ifsmb.de und bei 35services aktiv, trägt sein Profil
  auf beiden dieselbe uuid. Verschiedene Personen haben nie dieselbe uuid, auch bei gleichem Namen. Eine neue Seite
  bekommt immer eine neue uuid, auch wenn sie aus einer anderen Datei kopiert wurde.
- **`same_as` = „das ist dasselbe wie diese Seite dort“** (schema.org `sameAs`): für Partner, Geräte und Personen, eine
  absolute https-Adresse oder eine Liste. Braucht keine gemeinsame uuid – Partner aus `_data/` haben gar keine:

  ```yaml
  # _data/partners.yml auf ifsmb.de
  - name: 35 services e. V.
    page: /partners/35services/
    same_as: https://35services.ifsmb.de/partners/35-services-e-v/
  ```

  Steht in den Microdata (`<link itemprop="sameAs">`), in der Box „🤖 Maschinenlesbar“ und am Knoten in `graph.json`
  (`"same_as": […]`, nur wenn gesetzt – Format bleibt Version 1). `_plugins/same_as.rb` prüft beim Bauen: nur https;
  Adressen der eigenen Website werden mit Warnung ignoriert (ein Fork, der unsere Daten übernimmt, scheitert so nicht).

## 3. Was jede Instanz veröffentlicht (maschinenlesbar)

```
 /meta_graph.json ──▶ graphs[]: /network/graph.json   Knoten + Verbindungen (absolute Adressen, uuid, Typ)
                  ├─▶ search_index: /search/index.json   Personen, Projekte, Stichworte, Seiten (für Formulare)
                  ├─▶ fulltext_search: /pagefind/        Volltextsuche (Pagefind, zusammenführbar)
                  └─▶ federation[]: verbundene Instanzen (aus _config.yml)

 jede Ressourcen-Seite ──▶ Microdata (schema.org): itemtype, itemid = Adresse, name, identifier = uuid, …
```

**Microdata pro Seite** (`_includes/microdata.html`, unsichtbare `meta`/`link`-Elemente):

| Ressource | schema.org | Eigenschaften |
|---|---|---|
| Ausstattung | `Product` | name, description, image, category, identifier, sameAs |
| Person | `Person` | name, description, image, jobTitle, identifier, sameAs |
| Beitrag | `BlogPosting` | name, headline, datePublished, … |
| Termin | `Event` | name, startDate, endDate, location, … |
| Projekt | `Project` | name, description, foundingDate, … |
| Herausforderung | `CreativeWork` | name, description, … |
| Presse | `NewsArticle` | name, headline, datePublished |
| Partnerseite | `Organization` | name, description, sameAs |

Alle mit `itemid` = absolute Adresse und `identifier` = uuid. Andere Software kann dasselbe Format liefern – z. B.
sichtbares Markup wie `<h1 itemprop="name">` funktioniert genauso.

## 4. Einbeziehen: Netzwerk und Suche

- `_config.yml` → `federation:` listet die verbundenen Instanzen (ifsmb.de: 35services.ifsmb.de; 35services: ifsmb.de).
- **„🌐 Verbundene Instanzen einbeziehen“** (`?verbund=1`) – erst danach fragt der Browser andere Instanzen an
  (Datenschutz-Versprechen im Impressum). Die Wahl gilt für den **Browser-Tab** (sessionStorage), „🌐 Nur diese Seite“
  (`?verbund=0`) beendet sie.
- **„➕ Instanz hinzufügen“** trägt zur Laufzeit eine weitere Adresse ein (`&instanz=https://…`, nur https bzw.
  http://localhost, nichts gespeichert).
- **Netzwerk:** lädt über `<instanz>/meta_graph.json` deren Graphen und führt sie zusammen: gleiche uuid + gleicher Typ
  = ein Knoten mit mehreren Adressen (`aliases`) und den Verbindungen aller Instanzen; alles andere kommt mit blauem
  Rand und „🌐 <host>“ dazu.
- **Suche:** hängt die Pagefind-Indizes an (`mergeIndex`); Treffer anderer Instanzen mit „🌐 <host>“.
- **Permalinks:** `/network/?verbund=1#/team/falko-richter/` (eigener Knoten),
  `/network/?verbund=1#35services.ifsmb.de/equipment/snapmaker-u1/` (Knoten einer anderen Instanz, Host + Pfad). Steht
  eine Instanz im `#`, die nicht eingetragen ist, wird sie mitgeladen.

## 5. Links auf andere Instanzen lösen sich selbst auf

Ein Link wie `[Snapmaker U1](https://35services.ifsmb.de/equipment/snapmaker-u1/)` im Markdown wird zu einem
„verstandenen“ Link:

1. **Beim Bauen** (`_plugins/federation_links.rb`, im Pages-Workflow): Die verlinkte Seite wird einmal abgerufen, ihre
   Microdata gelesen. Der Link bekommt den **Typ** (Symbol davor, z. B. 🛠️ für ein Gerät), den **aktuellen Namen** als
   Tooltip und – wenn der Linktext eine Kopie des Namens ist – den aktuellen Namen als Text (der geschriebene Text
   bleibt als `data-fed-fallback` erhalten). Gibt es die Seite nicht mehr (404/410), wird der Link durchgestrichen
   und „(nicht mehr vorhanden)“ angehängt. Besucher*innen machen dafür **keine** Anfrage.
2. **Live im Browser** (`assets/js/federation-links.js`, nur mit eingeschalteter Föderation): dieselbe Prüfung noch
   einmal; ein geänderter Name erscheint mit dem „Scramble“-Effekt der Startseite.
3. **„Verbindungen“** unten auf jeder Seite sortiert `linked`-Einträge auf andere Instanzen **in die Gruppe ihres Typs**:
   Ein Gerät von 35services erscheint auf ifsmb.de unter „Ausstattung“, eine Person unter „Beteiligt“, ein Projekt unter
   den Projekten – jeweils mit Symbol, aktuellem Namen und „🌐 35services.ifsmb.de“. Nur Seiten ohne bekannten Typ, nicht
   erreichbare oder nicht mehr vorhandene bleiben in der Gruppe „Verbundene Instanzen“. (Liquid-Filter
   `federation_resolve` in `_plugins/federation_links.rb`, Eintrag: `_includes/federation-item.html`.)

**„Titel-Link“-Regel:** Nur Links, deren Text der Name ist, eine **gekürzte** Kopie davon („Snapmaker U1“ →
„Snapmaker U1 mit Einhausung“) oder die nackte Adresse, bekommen den aktuellen Namen. Texte mit eigenen Worten behalten
sie: `[der Drucker der AG](…)`, `[Spenden für die AG](…)`, `[Pressemitteilung: …](…)`. Links auf einen Abschnitt
(`…/partners/#ktg`) zeigen auf einen Teil einer Seite – dafür zählt nur, ob es die Seite noch gibt.

**Termine:** Aus `startDate`/`endDate` der Microdata liest der Build den letzten Tag eines Termins einer anderen
Instanz (`data-event-end`); vergangene Termine verblassen – entschieden im Browser, nicht beim Bauen.

## 5b. Externe Links mit Titel und Art

Nicht jede Seite gehört zu einer Instanz: ein Artikel bei 35services.de, ein Instagram-Beitrag, ein Herstellerhandbuch.
Solche Links stehen mit Titel und Art im Front Matter:

```yaml
links:
  - title: Sicherheit an der Drehmaschine
    url: https://35services.de/2026/sicherheit-an-der-drehmachine/
    category: post        # equipment, person, partner, event, post, project, challenge, press, link
```

- **Im Formular** („🌍 Externe Links“): Adresse einfügen und ➕ – das Formular liest die Seite einmal und schlägt
  Titel und Art vor (Microdata unserer Instanzen, sonst JSON-LD wie bei WordPress, sonst `og:title`/`<title>`). Lässt
  sich die Seite nicht lesen (CORS, z. B. Instagram) oder verrät sie nichts, trägt man beides selbst ein.
- **Kategorie `link`:** jede beliebige Seite im Internet (z. B. unsere Instagram-Beiträge) – erscheint unter „Links“.
- **„Verbindungen“** sortiert die Einträge in die Gruppe ihrer Art (wie bei Links auf Instanzen); ohne Art oder mit
  `link` stehen sie unter „Links“. Auf Teamprofilen bleiben Links ohne Art (GitHub, Website) im Profil selbst.
- Zeigt die Adresse auf eine verbundene Instanz, gewinnen deren Microdata; Titel und Art im Front Matter sind die
  Rückfall-Kopie.

## 6. Vertrauen und Sicherheit

- **Die Adresse sagt nichts über den Typ.** `…/equipment/…` könnte bei anderer Software eine Person sein – nur die
  Microdata der abgerufenen Seite entscheidet, und nur bekannte schema.org-Typen werden übernommen.
- Abgerufen werden nur **eingetragene Instanzen** (bzw. vom Besucher selbst eingetragene); Namen werden als Text
  eingesetzt (nie als HTML), Links aus fremden Graphen nur mit `http(s)` (kein `javascript:`).
- Voraussetzung im Browser: CORS (`access-control-allow-origin: *`) – bei GitHub Pages Standard; `jekyll serve`
  sendet es per `webrick: headers:` in `_config.yml`, damit zwei lokale Server sich lesen können.

## 7. Arbeitsweise mit dem Fork

- Der Fork wird mit **Merges** von `falkorichter/ifsmb.de` `main` aktuell gehalten (kein Rebase): Inhalte von ifsmb.de,
  die es dort nicht gibt, bleiben entfernt; Konflikte entstehen vor allem in Dateien, die der Fork gelöscht hat.
- Allgemeine Code-Änderungen gehören nach ifsmb.de (z. B. `page_exists`, Host aus `_config.yml` im Link-Check), damit
  sich der Fork nur in Inhalt und Konfiguration unterscheidet.
- Todos gehören nicht zum Netzwerk und bleiben lokal.

## 8. Offene Fragen / nächste Schritte

- **Live-Auflösung bei jedem Besuch?** Technisch fertig (`federation-links.js`), aber das bräche das Versprechen
  „keine externen Anfragen ohne Klick“. Entscheidung: bewusst nur nach dem Klick; beim Bauen ist alles schon aufgelöst.
- **Volle URLs in Verweisfeldern** (`team`, `projects` …) für Personen/Projekte anderer Instanzen.
- **Neubau bei Änderungen anderer Instanzen:** Namen werden beim Bauen eingelesen – ändert 35services einen Titel,
  aktualisiert ifsmb.de ihn erst beim nächsten Bauen (oder live nach dem Klick). Ein nächtlicher Bau wäre eine Option.
- **e2e-Tests im Fork** testen Inhalte von ifsmb.de und schlagen dort fehl – eigener Test-Satz oder Workflow aus.
- **Rückverweise** (wer verlinkt mich?) über die Graphen der anderen Instanzen, z. B. „Verlinkt von 35services“ –
  geplant in [#299](https://github.com/falkorichter/ifsmb.de/issues/299): eigene, eingeklappte Box „🌐 Erwähnt auf anderen
  Instanzen“, beim Bauen gesammelt (mit Cache), Zustimmung entscheidet die verlinkte Seite (`backlinks: aus | vertraut |
  geprüft` in `_config.yml`). Erster Schritt ist erledigt: `same_as` (Abschnitt 2).
- Standards zum Weiterdenken: JSON-LD (dieselben schema.org-Typen), ActivityPub (`id`/`alsoKnownAs`), Webmention.
