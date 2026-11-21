# Plan: Hauptmenü besser strukturieren

Status: **Entwurf** – zur Diskussion im Pull Request. Noch keine Änderung an der Seite.

Der Ordner `_plaene/` beginnt mit `_` und ist keine Collection. Jekyll ignoriert ihn also, und der Plan wird nicht ausgeliefert.

## 1. Ist-Zustand

Das Menü steht in `_config.yml` unter `nav` und wird in `_layouts/default.html` gebaut. Styles stehen in `assets/css/style.css` (`.site-nav`, `.nav-group`, `.nav-sub`).

```
Neuigkeiten · Kalender · Wir ▾ · Partner · Presse · Suche
                         │
                         ├─ Netzwerk
                         ├─ Karte
                         ├─ Projekte
                         ├─ Projekt-Ideen
                         ├─ Angebot
                         ├─ Geld für Makespaces
                         ├─ Ausstattung
                         └─ Team
```

### Probleme

1. **„Wir“ ist eine Sammelkiste.** Darin stehen acht Einträge, die nichts miteinander zu tun haben:
   - Inhalte: Projekte, Ideen, Ausstattung, Team
   - Angebote: Angebot, Geld für Makespaces
   - Ansichten auf alles: Netzwerk, Karte

   Der Name „Wir“ verrät nicht, was drin ist. Wer Projekte sucht, findet sie nicht auf den ersten Blick.
2. **Die Reihenfolge ist zufällig.** Netzwerk und Karte stehen ganz oben, die Projekte erst an dritter Stelle. Dabei sind die Projekte der Kern der Seite.
3. **Partner und Presse** stehen oben in der Leiste. Team liegt dagegen versteckt unter „Wir“, obwohl alle drei die Frage „Wer steckt dahinter?“ beantworten.
4. **Doppelt markiert:** Die aktive Seite wird mit `page.url contains c.url` erkannt. Auf `/projekte/ideen/` sind deshalb **Projekte und Projekt-Ideen** gleichzeitig hervorgehoben. Dasselbe gilt für `/projekte/archiv/` und `/projekte/persoenlich/`, sobald sie im Menü stehen.
5. **Seiten, die nur im Footer oder gar nicht verlinkt sind:**
   - Vergangene Projekte (`/projekte/archiv/`) und Spenden (`/spenden/`) stehen nur im Footer. Spenden hat zusätzlich den schwebenden Button.
   - Stichworte (`/stichworte/`) ist nirgends im Menü.
   - „Warum ein Institut?“ ist nur ein Anker auf `/angebot/`.
6. **Am Handy** sind alle Untermenüs immer aufgeklappt (`.nav-sub { display: flex; position: static }`). Das ergibt eine Liste aus 13 Zeilen ohne Gruppierung.
7. **„Suche“** steht als Wort zwischen den Inhaltsbereichen und nimmt in der engen Leiste (721–1080 px) Platz weg.
8. **Barrierefreiheit:** Der Gruppen-Button hat `aria-haspopup`, aber kein `aria-expanded`. Am Desktop öffnet das Untermenü nur bei Hover oder Fokus, Escape schließt es nicht.

## 2. Vorschlag

Das Menü wird nach den Fragen geordnet, mit denen Besucher*innen kommen: *Was passiert?* – *Was wird gebaut?* – *Wie kann ich mitmachen?* – *Wer steckt dahinter?* Die Ansichten auf alles (Netzwerk, Karte, Stichworte) kommen in eine eigene Gruppe.

### Variante A (empfohlen): fünf Bereiche plus Suche

```
Neuigkeiten · Kalender · Projekte ▾ · Mitmachen ▾ · Über uns ▾ · Entdecken ▾ · 🔍
                         │            │             │            │
                         ├─ Aktuelle  ├─ Angebot    ├─ Team      ├─ Netzwerk
                         │  Projekte  ├─ Geld für   ├─ Partner   ├─ Karte
                         ├─ Ideen     │  Makespaces ├─ Presse    └─ Stichworte
                         ├─ Archiv    └─ Spenden    └─ Warum ein
                         └─ Ausstattung                Institut?
```

- **Neuigkeiten** und **Kalender** bleiben direkte Links. Sie werden am häufigsten aufgerufen.
- **Projekte ▾** bündelt alles, was gebaut wird oder werden könnte. Das Archiv kommt neu dazu, die Ausstattung zieht aus „Wir“ hierher, weil Geräte immer zu Projekten gehören.
- **Mitmachen ▾** fasst die Angebote zusammen: Angebot, Geld für Makespaces und Spenden (Spenden bleibt zusätzlich als schwebender Button).
- **Über uns ▾** ersetzt „Wir“ und holt Partner und Presse aus der obersten Ebene. Der Eintrag „Warum ein Institut?“ (`/angebot/#warum-ein-institut`) erfüllt nebenbei die Transparenzregel noch sichtbarer.
- **Entdecken ▾** enthält die Ansichten auf alles: Netzwerk, Karte und Stichworte.
- **🔍** ganz rechts als Symbol mit `aria-label="Suche"`. Am Handy steht dort der ausgeschriebene Eintrag „🔍 Suche“.

### Variante B: flacher, weniger Umbau

```
Neuigkeiten · Kalender · Projekte ▾ · Über uns ▾ · Partner · Suche
```

Hier landen „Wir“-Einträge nur in den Gruppen „Projekte ▾“ (Projekte, Ideen, Archiv, Ausstattung) und „Über uns ▾“ (Team, Angebot, Geld für Makespaces, Presse, Netzwerk, Karte). Das ist schneller umgesetzt, aber „Über uns“ wird wieder zur Sammelkiste.

### Optional: kurze Beschreibung im Untermenü

Jeder Untereintrag bekommt in `_config.yml` ein Feld `info:`, das im Untermenü klein unter dem Titel steht, z. B.:

```yaml
- title: Projekte
  children:
    - title: Aktuelle Projekte
      url: /projekte/
      info: Was gerade gebaut wird
    - title: Ideen
      url: /projekte/ideen/
      info: Linksammlung – ✅ schon gebaut
```

Am Desktop hilft das bei der Orientierung. Am Handy wird `info` ausgeblendet, damit die Liste kurz bleibt.

## 3. Umsetzung (Schritte)

1. **`_config.yml`**: `nav` nach Variante A umbauen. Alle URLs bleiben gleich, es braucht also keine Weiterleitungen.
2. **Aktiven Eintrag richtig erkennen** (`_layouts/default.html`): Pro Gruppe gewinnt der Untereintrag mit dem **längsten passenden Präfix**. Auf `/projekte/ideen/` ist dann nur „Ideen“ aktiv, auf `/projekte/3d-druck-ag-ktg/` nur „Aktuelle Projekte“. Die Gruppe selbst ist aktiv, wenn einer ihrer Einträge aktiv ist. Wer will, kann mit einem optionalen Feld `aktiv: [/pfad/, …]` weitere Pfade einem Eintrag zuordnen (z. B. `/projekte/persoenlich/` → „Aktuelle Projekte“, `/news/persoenlich/` → „Neuigkeiten“).
3. **Mobiles Menü**: Gruppen als `<details>`/`<summary>` bauen. Das funktioniert ohne JS, und die Gruppe mit der aktuellen Seite ist mit `open` vorgeöffnet. Am Desktop bleibt das Dropdown bei Hover und Fokus wie bisher, `<details>` wird dort per CSS überspielt.
4. **Barrierefreiheit**: `aria-expanded` am Gruppen-Button pflegen und mit Escape schließen. Das sind ein paar Zeilen Inline-JS in `default.html`, ohne Bibliothek. Dazu `aria-current="page"` am aktiven Link.
5. **Suche als Symbol**: neues Feld `icon: 🔍` im `nav`-Eintrag. Am Desktop wird nur das Symbol mit `aria-label` gezeigt, am Handy der Text.
6. **Footer** aufräumen: „Vergangene Projekte“ steht dann im Menü und kann aus dem Footer raus. Spenden und Impressum bleiben im Footer.
7. **Doku**: In `CLAUDE.md` den Satz zur Navigation (Untermenü-Beispiel „Wir“) und die neuen Felder `info`/`aktiv`/`icon` anpassen. `CHANGELOG.md` unter `[Unreleased]` → `### Geändert`.
8. **Prüfen**: `bundle exec jekyll build`, `ruby _scripts/check_site.rb` und Screenshots für den PR (Desktop und Handy, aufgeklapptes Menü) mit `python3 -I _scripts/pr_vorschau.py / /projekte/ideen/ /netzwerk/`. Außerdem den Zwischenbereich 721–1080 px ansehen, damit die Leiste nicht umbricht.

Aufwand: etwa ein Nachmittag. Die Schritte 1, 2 und 7 reichen für eine erste Version, 3–5 können ein eigener PR werden.

## 4. Offene Fragen

- **Variante A oder B?** Oder ganz andere Gruppen?
- **Namen der Gruppen:** „Mitmachen“ oder „Angebot“? „Über uns“ oder „Wir“ behalten? „Entdecken“ oder „Überblick“?
- Soll die **Ausstattung** unter Projekte oder eher unter „Über uns“ (Geräte gehören Partnern und Team)?
- Soll **Spenden** zusätzlich ins Menü, oder reicht der schwebende Button?
- **`info:`-Beschreibungen** im Untermenü: ja oder nein?
- Sollen die **persönlichen Seiten** (`/projekte/persoenlich/`, `/news/persoenlich/`) ins Menü, oder bleiben sie wie bisher nur unten auf den Listenseiten verlinkt? Vorschlag: nicht ins Menü, damit klar bleibt, was Institut ist und was privat.
