# Bearbeitungskonflikte – Szenarien, heutiges Verhalten, Lösungsansatz

Stand: 18.11.2026 · gehört zu [`PLAN_DIRECT_EDITING.md`](PLAN_DIRECT_EDITING.md) (offene Punkte 14, 17, 18) · wird nicht ausgeliefert (`exclude` in `_config.yml`)

Seit PR #110 legen die ➕/✏️-Formulare mit einem GitHub-Token selbst Pull Requests an. **Pull Requests sind der Zustand im Hintergrund**: eine Bearbeitung, die gerade läuft, *ist* ein offener PR (Branch `web/<login>-<datei>-<zeit>`). Dieses Dokument sammelt alle Fälle, in denen sich Bearbeitungen in die Quere kommen – zwischen zwei Personen, zwischen zwei Tabs, zwischen Formular und `main`, zwischen Formular und einem PR – und beschreibt, was heute passiert, was passieren soll und wie ein End-to-End-Test den Fall gegen eine Attrappe von GitHub nachstellt.

Ziel: **Konflikte werden im Browser erkannt und gelöst** – die Person bekommt klare Optionen, nie eine rohe GitHub-Meldung, und es geht nie stillschweigend etwas verloren (weder die eigene Arbeit noch die Änderung von jemand anderem).

## Stand der Umsetzung

Offene Szenarien werden in Issue #129 (Abschnitt „Konflikte“) verfolgt.

Umgesetzt mit PR #118 (Integrations-Branch `editing-polish`), jeweils mit End-to-End-Test in `_tests/e2e/conflicts.test.js` (✅ = Test, ☑️ = umgesetzt, aber noch ohne eigenen Test):

| ID | Lösung | Test |
|---|---|---|
| K04, K05, K28 | Senden liest das Ziel neu und führt zusammen (`direct.prepareEdit` + `merge.js`); keine stille Überschreibung mehr, Überschneidungen → Konfliktbox, Senden gesperrt | ✅ |
| K07 | „In #N mitschicken“ führt das schon Eingetragene mit dem PR-Stand zusammen, Fotos bleiben | ✅ |
| K08, K09 | Commit auf festem Parent, `PATCH force:false`; bei „not a fast forward“ neu holen und mergen (max. 3×) | ✅ |
| K10, K11 | PR gemergt/geschlossen → Hinweis + „Neuen Pull Request anlegen“ (Basis = aktueller `main`) | ✅ |
| K12 | Branch gelöscht → wie K11 | ☑️ |
| K14 | Entwurf älter als die Seite → übertragen statt gelöscht (gleiche Werte in anderer Schreibweise sind kein Konflikt) | ✅ |
| K15 | Entwurf merkt sich seinen PR (`pr`, `savedAt`) und arbeitet dort weiter | ☑️ |
| K16 | eigener offener PR → automatisch dort weiter, „Stattdessen eigener Pull Request“ | ✅ |
| K17, K18, K19 | nach dem Senden im PR-Modus bleiben (`direct.sentOk`), auch bei neuen Dateien | ✅ |
| K01, K02, K06 (veralteter Tab) | beim Senden neu nach offenen PRs zur Datei suchen → „In #N mitschicken“ / „Trotzdem eigener Pull Request“ | ✅ |
| K25 | Fotonummern berücksichtigen Dateien in offenen PRs (`namesInOpenPulls`) | ✅ |
| K26 | umziehende Fotos bekommen freie Nummern im neuen Ordner (`direct.relocate`) | ✅ |
| K37–K40 | Fehler mit Art (`err.kind`) und deutscher Meldung, „🔑 Neu verbinden“ | ☑️ (im Browser gegen eine Attrappe geprüft) |
| K41 | PR anlegen scheitert nach dem Branch → nächstes Senden setzt fort (`finishPullRequest`), kein zweiter Branch | ✅ |
| K42 | Antwort verloren → `finishPullRequest` findet den PR über den Branch | ☑️ |
| K46 | neu verlinkte Fotos, die es nicht gibt → Senden stoppt mit Hinweis (`direct.checkMissingImages`) | ✅ |

**Noch offen:** K13 (zwei Tabs), K20/K21 (Entwurf ohne Token / Verwerfen rückgängig), K22–K24 (neue Dateien: „dort weitermachen“), K30, K31 (PR-Branch hinter `main` aktualisieren), K32–K36 (mehrere PRs, Umbenennen/Löschen, Fork-Hinweis, Datei auf `main` gelöscht – teils mit Meldung abgedeckt), K43/K44 (Wiederaufnahme nach Neuladen: `pending` liegt nur im Speicher), K47/K48. Außerdem: Text wird zeilenweise statt absatzweise zusammengeführt (Nachbarzeilen = Konflikt, wie bei git).

## Inhalt

- [Begriffe und Code-Stellen](#begriffe-und-code-stellen)
- [Testaufbau – Schreibweise](#testaufbau--schreibweise)
- [Übersicht aller Szenarien](#übersicht-aller-szenarien)
- [1. Zwei Personen, dieselbe Datei](#1-zwei-personen-dieselbe-datei) (K01–K12)
- [2. Dieselbe Person](#2-dieselbe-person) (K13–K21)
- [3. Neue Dateien und Fotonummern](#3-neue-dateien-und-fotonummern) (K22–K27)
- [4. Veraltete Quellen](#4-veraltete-quellen) (K28–K31)
- [5. Lebenszyklus eines PRs während der Bearbeitung](#5-lebenszyklus-eines-prs-während-der-bearbeitung) (K32–K36)
- [6. Teilweise Fehler und Token](#6-teilweise-fehler-und-token) (K37–K44)
- [7. Fotos](#7-fotos) (K45–K48)
- [Lösungsansatz](#lösungsansatz)
- [Umsetzungsreihenfolge](#umsetzungsreihenfolge)
- [Anforderungen an die GitHub-Attrappe](#anforderungen-an-die-github-attrappe)

## Begriffe und Code-Stellen

| Begriff | Bedeutung | Im Code |
|---|---|---|
| **Quelle** | Text, mit dem das ✏️-Formular gefüllt wurde | `aktiv.edit.source` (aus `readSource`) |
| **`/source/`** | unverarbeitete Datei auf der *ausgelieferten* Website | `edit()` lädt `data.source`; erzeugt von `_plugins/source_files.rb` |
| **Basis** | Stand, von dem eine Bearbeitung ausgeht (Dreiwege-Merge: *base*) | heute nur `aktiv.edit.source`, ohne SHA, ohne Herkunft |
| **Meins** | was das Formular gerade schreiben würde | `dateiInhalt()` → `editedText(schema, aktiv.edit, aktiv.w)` |
| **Ihres** | aktueller Stand auf GitHub (`main` oder PR-Branch) | `GitHubApi.readFile(path, ref)` in `direct.submit` |
| **PR-Modus** | „In #N weiterarbeiten“ gewählt – Commit auf fremden/eigenen PR-Branch | `aktiv.prBase` (gesetzt in `direct.pickUp`) |
| **Entwurf** | localStorage `ifsmb-edit:<pfad>` bzw. `ifsmb-neu:<typ>:<seitenpfad>` = `{ w, beruehrt, source }` | `speichereEntwurf`, `ladeEntwurf`, `loescheEntwurf` |
| **Senden** | `direct.submit` → `GitHubApi.createPullRequest` (Blobs → Tree → Commit → `POST /git/refs` bzw. `PATCH` mit `force: false` → `POST /pulls`) | `github-api.js` |

Wichtige Eigenschaften des heutigen Codes, auf die sich viele Szenarien beziehen:

1. **Es wird immer die ganze Datei geschrieben.** `createPullRequest` legt einen Blob mit dem kompletten Text aus `dateiInhalt()` an und setzt ihn auf den *aktuellen* Kopf von `main` bzw. des PR-Branches. `editedText` schreibt zwar nur geänderte Felder neu – aber relativ zur **Quelle**, nicht zum aktuellen Stand auf GitHub. Ist der aktuelle Stand neuer als die Quelle, macht der Commit dessen Änderungen **rückgängig** (stilles Zurücksetzen).
2. **Die einzige Konfliktprüfung** steht in `direct.submit`: `readFile(path, prBase?.branch)` ≠ `aktiv.edit.source` → Meldung „Die Datei wurde inzwischen auf GitHub geändert. Nochmal klicken legt den Pull Request trotzdem an …“ und `state.overwriteOk = true`. **Der zweite Klick überschreibt** (siehe 1.). `overwriteOk` bleibt danach für die ganze Sitzung gesetzt.
3. `force: false` beim `PATCH` schützt nur im Zeitfenster zwischen `GET /git/ref` und `PATCH` (Millisekunden bis Sekunden) – nicht gegen Änderungen, die vor dem Senden auf dem Branch lagen.
4. **Entwürfe werden stillschweigend gelöscht**, wenn `/source/` nicht mehr genau dem gespeicherten `source` entspricht (`edit()`: `if (draft && !draftFits) loescheEntwurf()`).
5. Offene PRs werden nur **beim Öffnen** des ✏️-Formulars geprüft (`direct.checkOpenPulls`), beim Senden nicht mehr (Ausnahme: neue Dateien).
6. Fotos liegen nur im Speicher (`aktiv.photos`), nie im Entwurf (offener Punkt 6).
7. Der Branchname enthält nur die Minute (`branchName`: `YYYYMMDDHHMM`) – zwei Sendeversuche in derselben Minute erzeugen denselben Namen.

## Testaufbau – Schreibweise

Die Attrappe ist ein GitHub im Speicher mit einer Steuer-API. In den Szenarien steht der Testaufbau in dieser Kurzschreibweise (die Namen sind Vorschläge für die Steuer-API, siehe [Anforderungen](#anforderungen-an-die-github-attrappe)):

```text
users:   alice (Token tA, push), bob (Token tB, push), carol (Token tC, ohne push)
main:    { "_posts/2026-11-01-treffen.md": POST_V1 }          # Dateien auf main (ein Commit)
deployed:{ "_posts/2026-11-01-treffen.md": POST_V1 }          # was /source/<pfad> ausliefert (Route im Browser abfangen)
branch:  web/alice-treffen-1 ← main + { pfad: TEXT }  (author alice)
pull:    #5 head=web/alice-treffen-1 user=alice state=open
act:     als bob: commit(web/alice-treffen-1, { pfad: TEXT })  # zweite Person handelt, während der Browser offen ist
act:     merge(#5) | close(#5) | deleteBranch(x) | advanceMain({ pfad: TEXT })
fault:   next("POST /git/refs", 500)                            # Anfrage scheitert, nichts passiert
fault:   next("POST /pulls", { apply: true, drop: true })       # wird ausgeführt, Antwort geht verloren (Netzwerkfehler)
fault:   revoke(tA) | rateLimit({ remaining: 0 }) | secondaryRateLimit({ retryAfter: 60 })
assert:  pulls(open).length == 1 ; file(branch, pfad) == TEXT ; ui zeigt „…“ ; localStorage[key] …
```

Browser: `localStorage`/`sessionStorage` vorbereiten (`ifsmb-github-token`, Entwürfe), Seite des Beitrags öffnen, ✏️ klicken (oder `#bearbeiten`). Zwei Tabs = zwei Seiten im selben Browser-Kontext (gemeinsamer `localStorage`). Zwei Personen = zwei Browser-Kontexte mit verschiedenen Tokens – oder eine Person im Browser, die andere über `act` direkt an der Steuer-API (meist einfacher).

**Testdatei `POST_V1`** (Beitrag; Felder des Typs `beitrag`: `title`, `date`, `author`, `tags`, `verlinkt`, Text, `social_media_preview_image` …):

```markdown
---
layout: post
title: "Treffen im Makespace"
date: 2026-11-01 18:00:00 +0100
author: alice
tags: [ktg]
uuid: 11111111-1111-4111-8111-111111111111
---

Absatz eins.

Absatz zwei.

Absatz drei.
```

Abwandlungen: `POST_TITLE_A` = Titel „Treffen im Makespace (verschoben)“, `POST_TITLE_B` = Titel „Großes Treffen im Makespace“, `POST_TAGS_A` = `tags: [ktg, 3d-drucker]`, `POST_P2_A` = „Absatz zwei – von Alice ergänzt.“, `POST_P3_B` = „Absatz drei – von Bob ergänzt.“, `POST_P2_B` = „Absatz zwei – von Bob umgeschrieben.“ Kombinationen werden mit `+` geschrieben (`POST_V1+TITLE_A+P2_A`).

## Übersicht aller Szenarien

Priorität: **Muss** = Datenverlust oder doppelte/kaputte PRs im normalen Gebrauch; **Soll** = verwirrend oder vermeidbare Nacharbeit; **Kann** = selten oder schon ausreichend.

| ID | Kurztitel | Heute | Priorität |
|---|---|---|---|
| K01 | A und B ändern verschiedene Felder, beide PRs offen | doppelter PR, ggf. Merge-Konflikt bei Nachbarzeilen | Soll |
| K02 | A und B ändern dasselbe Feld, beide PRs offen | doppelter PR, Merge-Konflikt auf GitHub | Muss |
| K03 | A und B ändern verschiedene Absätze im Text | doppelter PR; Text wird ganz neu geschrieben | Soll |
| K04 | A gemergt, dann sendet B (verschiedene Felder) | **Datenverlust**: B setzt A zurück (2. Klick) | Muss |
| K05 | A gemergt, dann sendet B (dasselbe Feld / derselbe Absatz) | **Datenverlust** wie K04, kein Konfliktdialog | Muss |
| K06 | A hat offenen PR, B öffnet ✏️ und ignoriert den Hinweis | zweiter PR (Hinweis vorhanden) | Soll |
| K07 | B tippt erst, klickt dann „In #N weiterarbeiten“ | **Datenverlust**: Eingaben und Fotos weg | Muss |
| K08 | A und B arbeiten im selben PR; A committet vorher | **Datenverlust**: B setzt A im PR zurück (2. Klick) | Muss |
| K09 | A und B committen im selben PR fast gleichzeitig | rohe Meldung „Update is not a fast forward“ | Soll |
| K10 | B arbeitet in #N weiter, A schließt #N ohne Merge | Commit landet unsichtbar im geschlossenen PR | Muss |
| K11 | B arbeitet in #N weiter, #N wird gemergt (Branch bleibt) | **Datenverlust**: Commit auf gemergtem Branch | Muss |
| K12 | B arbeitet in #N weiter, Branch wird gelöscht | irreführende Meldung („Berechtigung?“) | Soll |
| K13 | Zwei Tabs, dieselbe Seite | Entwürfe überschreiben sich, zwei PRs | Soll |
| K14 | Entwurf älter als die Datei (fremder Merge dazwischen) | **Datenverlust**: Entwurf stillschweigend gelöscht | Muss |
| K15 | Entwurf aus „In #N weiterarbeiten“, Formular neu geöffnet | **Datenverlust**: Entwurf gelöscht, PR-Bezug weg | Muss |
| K16 | Eigener offener PR, ✏️ nochmal geöffnet | wie fremder PR, kein automatisches Weitermachen | Soll |
| K17 | Nach erfolgreichem Senden (neuer PR) weiter ändern | zweiter PR mit allen Änderungen | Muss |
| K18 | Nach erfolgreichem Senden im PR-Modus weiter ändern | Warnung über die *eigene* Änderung | Soll |
| K19 | Neue Datei: nach Senden weiter ändern | Fehler „legt … schon an“, kein Weg weiter | Muss |
| K20 | Ohne Token: „Kopieren“ geklickt, Dialog geschlossen | **Datenverlust**: Entwurf gelöscht, obwohl nie eingefügt | Soll |
| K21 | „Änderungen verwerfen“ ohne Rückfrage | Entwurf + Fotos sofort weg | Kann |
| K22 | Neue Datei: Name gibt es schon auf `main` | Abbruch mit Hinweis | Kann |
| K23 | Neue Datei: offener PR legt sie schon an | Abbruch, kein „dort weitermachen“ | Soll |
| K24 | Zwei Personen legen gleichzeitig dieselbe Datei an | zwei PRs, Konflikt beim zweiten Merge | Soll |
| K25 | Fotonummern NN kollidieren zwischen zwei PRs | Binärkonflikt, im Browser nicht lösbar | Muss |
| K26 | Dateiname ändert sich nach dem Hinzufügen von Fotos | **Datenverlust**: fremde Fotos im Zielordner überschrieben | Muss |
| K27 | Gleicher Slug, anderes Datum → derselbe Bilderordner | Fotos zweier Beiträge in einem Ordner | Kann |
| K28 | `/source/` (ausgeliefert) älter als `main` | Warnung sofort beim Senden, 2. Klick setzt zurück | Muss |
| K29 | `main` hat sich bei *anderen* Dateien bewegt | in Ordnung | Kann |
| K30 | `main` ändert dieselbe Datei zwischen Prüfung und Commit | stilles Zurücksetzen (kleines Zeitfenster) | Kann |
| K31 | PR-Branch hinter `main`, `main` hat dieselbe Datei geändert | Konflikt erst beim Mergen auf GitHub | Soll |
| K32 | Mehrere offene PRs ändern dieselbe Datei | Liste, aber keine Hilfe bei der Wahl | Kann |
| K33 | PR benennt die Datei um (`previous_filename`) | „Die Datei gibt es im Branch nicht“ | Kann |
| K34 | PR löscht die Datei | wie K33; Senden legt sie wieder an | Kann |
| K35 | PR aus einem Fork | kein „weiterarbeiten“ (richtig) | Kann |
| K36 | Datei auf `main` gelöscht/umbenannt, während das Formular offen ist | Senden legt die alte Datei wieder an | Soll |
| K37 | Token abgelaufen/widerrufen mitten im Senden | Meldung ok, aber evtl. verwaister Branch, kein „neu verbinden“ | Soll |
| K38 | Keine Schreibrechte | Fehlermeldung, kein Rückfall auf „Kopieren“ | Soll |
| K39 | Token ohne „Pull requests“-Recht | Branch angelegt, PR scheitert → verwaister Branch | Soll |
| K40 | Rate-Limit (primär/sekundär) | irreführend „fehlt die Berechtigung?“ | Soll |
| K41 | Netzwerkfehler nach Branch, vor PR | zweiter Branch oder „Reference already exists“ | Muss |
| K42 | PR angelegt, Antwort verloren | doppelter PR beim erneuten Senden | Muss |
| K43 | PATCH im PR-Modus ausgeführt, Antwort verloren | Warnung über eigene Änderung, leerer zweiter Commit | Soll |
| K44 | Tab geschlossen/neu geladen während des Sendens | wie K41/K42, Zustand ganz weg | Soll |
| K45 | Foto aus dem Text gelöscht, aber noch in der Ablage | nicht hochgeladen, Hinweis – in Ordnung | Kann |
| K46 | Neu geladen: Text verweist auf Fotos, die nur im Speicher waren | PR mit toten Bildpfaden | Muss |
| K47 | A und B setzen beide `social_media_preview_image` | Feld- und Nummernkonflikt | Soll |
| K48 | A entfernt ein Foto im PR, B verweist noch darauf | toter Bildpfad nach beiden Merges | Kann |

---

## 1. Zwei Personen, dieselbe Datei

### K01 – Verschiedene Felder, beide senden, beide PRs offen

- **Ausgangslage:** `main` = `POST_V1`, ausgeliefert = `POST_V1`. Alice und Bob öffnen ✏️ (beide verbunden), keine offenen PRs.
- **Ablauf:** Alice ändert den Titel und sendet → PR #5. Bob (Formular schon offen) ändert `tags` und sendet → PR #6.
- **Heutiges Verhalten:** `direct.checkOpenPulls` lief bei Bob nur beim Öffnen (da gab es #5 noch nicht). In `direct.submit` ist `readFile(path)` auf `main` noch gleich der Quelle → keine Warnung. Ergebnis: **zwei PRs** für dieselbe Seite. Wer zuerst gemergt wird, ist egal – *aber* `title` und `tags` stehen in benachbarten Zeilen (nur `date`/`author` dazwischen), und Git meldet Konflikte schon, wenn sich die geänderten Bereiche berühren. Bei direkt benachbarten Feldern scheitert der zweite Merge auf GitHub mit „This branch has conflicts“ – lösbar nur im GitHub-Konflikteditor.
- **Gewünschtes Verhalten:** Vor dem Senden erneut nach offenen PRs fragen. Neuer fremder PR gefunden →
  > ⚠️ **@alice hat diese Seite gerade auch geändert (#5 „Beitrag geändert: …“).** Eure Änderungen betreffen verschiedene Felder.
  > [**In #5 mitschicken**] (Commit auf #5, ein PR für beide) · [**Eigenen Pull Request anlegen**] · [Abbrechen]

  „In #5 mitschicken“ macht einen Dreiwege-Merge (Basis = Quelle, Meins = Formular, Ihres = Datei im Branch von #5) und committet das Ergebnis auf #5. „Eigenen Pull Request“ bleibt erlaubt (z. B. wenn Alices PR umstritten ist).
- **Erkennung:** in `direct.submit` vor `createPullRequest`: `GitHubApi.openPullsForFile(path)` und mit `aktiv.openPulls` (Stand beim Öffnen) vergleichen; neue Nummern = neue PRs. Für die Feld-Aussage: `readFile(path, pr.branch)` + Feldvergleich (siehe [Lösungsansatz](#lösungsansatz)).
- **Priorität:** Soll
- **Testaufbau:** `main`/`deployed` = `POST_V1`; Browser als bob öffnet ✏️; dann `act`: branch `web/alice-treffen-1` ← main + `POST_V1+TITLE_A`, pull #5 (alice). Browser: Tags „3d-drucker“ ergänzen, Senden. **Heute:** `pulls(open).length == 2`. **Soll:** Dialog mit Text „@alice hat diese Seite gerade auch geändert“ sichtbar; Klick „In #5 mitschicken“ → `pulls(open).length == 1`, `file(web/alice-treffen-1)` == `POST_V1+TITLE_A+TAGS_A`, Commit-Parent = Alices Commit.

### K02 – Dasselbe Feld, beide senden, beide PRs offen

- **Ausgangslage:** wie K01.
- **Ablauf:** Alice setzt den Titel auf `TITLE_A`, sendet → #5. Bob setzt den Titel auf `TITLE_B`, sendet.
- **Heutiges Verhalten:** wie K01 – zweiter PR #6 ohne Warnung. Nach dem Merge von #5 hat #6 sicher einen **Merge-Konflikt** in der Titelzeile; wer mergt, muss auf GitHub von Hand entscheiden. Niemand wurde gefragt.
- **Gewünschtes Verhalten:** wie K01, aber mit Konfliktanzeige:
  > ⚠️ **@alice hat in #5 ebenfalls den Titel geändert.**
  > Ausgangsstand: „Treffen im Makespace“ · **Ihre Version:** „Treffen im Makespace (verschoben)“ · **Meine Version:** „Großes Treffen im Makespace“
  > [**Meine Version**] · [**Ihre Version**] · [Selbst bearbeiten]
  > danach: [**In #5 mitschicken**] · [Eigenen Pull Request anlegen]

  Bei „Eigenen Pull Request“ zusätzlich: „Beim Mergen gibt es dann einen Konflikt im Titel – besser in #5 mitschicken oder @alice fragen.“
- **Erkennung:** wie K01; Feld-Dreiwege-Vergleich `w0(Basis)`, `w(Meins)`, `w0(Ihres)` – beide ≠ Basis und Meins ≠ Ihres → Konflikt.
- **Priorität:** Muss
- **Testaufbau:** wie K01, aber Alices Branch mit `POST_V1+TITLE_A`, Bob tippt Titel `TITLE_B`. **Soll:** Konfliktkarte „Titel“ mit drei Werten; „Meine Version“ + „In #5 mitschicken“ → `file(web/alice-treffen-1)` == `POST_V1+TITLE_B`, nur ein offener PR; „Ihre Version“ → nichts zu senden, Hinweis „Keine eigenen Änderungen mehr übrig.“

### K03 – Verschiedene Absätze im Text

- **Ausgangslage:** wie K01.
- **Ablauf:** Alice ändert Absatz zwei (`P2_A`) → #5. Bob ändert Absatz drei (`P3_B`) und sendet.
- **Heutiges Verhalten:** zweiter PR. Zusätzlich: Sobald der Text angefasst wurde, schreibt `editedText` den **ganzen Rumpf neu** (`rest = "\n" + "\n" + text.trim() + "\n"`) – Leerzeilen am Anfang/Ende, CRLF und ggf. Umformungen des Markdown-Editors (OverType) ändern Zeilen, die Bob nie angefasst hat. Absatz zwei und drei liegen zwei Zeilen auseinander → Git kann evtl. automatisch mergen, oft aber nicht (Leerzeile als gemeinsamer Kontext).
- **Gewünschtes Verhalten:** Text absatzweise dreiwege-mergen. Nicht überlappend → automatisch:
  > ✅ **@alice hat in #5 einen anderen Absatz geändert – beides wurde zusammengeführt.** [Vorschau ansehen] · [In #5 mitschicken] · [Eigenen Pull Request anlegen]
- **Erkennung:** wie K01, Rumpf mit Absatz-Diff3 (Basis = `edit.file.rest`).
- **Priorität:** Soll
- **Testaufbau:** Alices Branch `POST_V1+P2_A`, Bob ändert im Editor Absatz drei. **Soll:** kein Konfliktdialog, Hinweis „zusammengeführt“; nach „In #5 mitschicken“ `file(...)` == `POST_V1+P2_A+P3_B` **bytegleich** (keine anderen Zeilen verändert).

### K04 – A wurde gemergt, dann sendet B (verschiedene Felder)

- **Ausgangslage:** `main`/`deployed` = `POST_V1`. Bob öffnet ✏️.
- **Ablauf:** Alices PR mit `TITLE_A` wird gemergt (`main` = `POST_V1+TITLE_A`). Bob ändert `tags` und sendet.
- **Heutiges Verhalten:** `direct.submit` → `readFile(path)` (main) ≠ Quelle → „⚠️ Die Datei wurde inzwischen auf GitHub geändert. Nochmal klicken legt den Pull Request trotzdem an – beim Mergen ggf. zusammenführen.“ Bob klickt nochmal (`overwriteOk`) → `createPullRequest` schreibt Bobs ganze Datei (alter Titel + neue Tags) auf den **aktuellen** `main`. Im PR-Diff steht „Titel zurück auf ‚Treffen im Makespace‘“ – wer nicht genau hinsieht, mergt und **macht Alices Änderung rückgängig**. Der Hinweis „beim Mergen ggf. zusammenführen“ stimmt nicht: Git sieht keinen Konflikt, weil Bobs Commit auf Alices Stand aufsetzt. **Datenverlust (fremde Änderung).**
- **Gewünschtes Verhalten:** automatisch dreiwege-mergen, Bob muss nichts tun außer bestätigen:
  > ℹ️ **Die Seite wurde inzwischen geändert** (von @alice, #4 gemergt). Deine Änderung betrifft andere Felder und wurde auf den neuen Stand übertragen.
  > [**Pull Request anlegen**] · [Unterschiede ansehen]

  Das Formular lädt danach den neuen Stand als Basis (Titel zeigt jetzt Alices Wert).
- **Erkennung:** `readFile(path, "main")` ≠ Basis → Dreiwege-Merge; keine überlappenden Felder → automatisch. Wer geändert hat: `GET /repos/{r}/commits?path=<pfad>&sha=main&per_page=5` (Autor, PR-Nummer aus der Commit-Message „Merge pull request #N“).
- **Priorität:** Muss
- **Testaufbau:** `main`/`deployed` = `POST_V1`; Browser bob öffnet ✏️; `act`: advanceMain(`POST_V1+TITLE_A`, author alice, message „Merge pull request #4 …“) – `deployed` bleibt `POST_V1`. Bob ergänzt Tag, Senden. **Heute (Regressionstest, der rot werden soll):** nach zwei Klicks `file(neuer Branch)` == `POST_V1+TAGS_A` (Titel zurückgesetzt). **Soll:** ein Klick → Hinweis „wurde auf den neuen Stand übertragen“ → `file(neuer Branch)` == `POST_V1+TITLE_A+TAGS_A`; Commit-Parent = aktueller `main`-Kopf.

### K05 – A wurde gemergt, dann sendet B (dasselbe Feld oder derselbe Absatz)

- **Ausgangslage:** wie K04.
- **Ablauf:** `main` wird `POST_V1+TITLE_A` (bzw. `+P2_A`). Bob ändert ebenfalls den Titel auf `TITLE_B` (bzw. Absatz zwei auf `P2_B`) und sendet.
- **Heutiges Verhalten:** wie K04: Warnung, zweiter Klick überschreibt Alices Titel/Absatz ohne jede Gegenüberstellung. **Datenverlust.**
- **Gewünschtes Verhalten:** Konfliktdialog pro Feld bzw. Absatz:
  > ⚠️ **Konflikt: @alice hat den Titel inzwischen auch geändert** (#4, gemergt).
  > [**Meine Version**] · [**Ihre Version**] · [Selbst bearbeiten]

  Beim Text zusätzlich [**Beide**] (beide Absätze untereinander, meiner zuerst) – das Ergebnis lässt sich danach im Editor glätten. Gesendet wird erst, wenn alle Konflikte entschieden sind; der Button heißt bis dahin „Erst Konflikte lösen (1)“.
- **Erkennung:** wie K04; Konflikt = Basis ≠ Meins, Basis ≠ Ihres, Meins ≠ Ihres (Feldwert bzw. Absatzbereich).
- **Priorität:** Muss
- **Testaufbau:** a) Titel: advanceMain(`POST_V1+TITLE_A`), Bob tippt `TITLE_B`. Assert: Konfliktkarte „Titel“; „Ihre Version“ + Bob hat sonst nichts geändert → Button aus, „Keine eigenen Änderungen mehr übrig“; „Meine Version“ → `file(neuer Branch)` == `POST_V1+TITLE_B`. b) Text: advanceMain(`POST_V1+P2_A`), Bob schreibt `P2_B`, „Beide“ → Datei enthält `P2_B` und `P2_A` als zwei Absätze, Absatz eins und drei unverändert.

### K06 – A hat einen offenen PR, B öffnet ✏️ und ignoriert den Hinweis

- **Ausgangslage:** `main` = `POST_V1`; PR #5 (alice) ändert den Titel.
- **Ablauf:** Bob öffnet ✏️, sieht „⚠️ Diese Seite wird gerade schon geändert … [In #5 weiterarbeiten]“, ändert trotzdem im Formular und sendet.
- **Heutiges Verhalten:** Hinweis aus `direct.checkOpenPulls` ist da, Senden legt ohne Rückfrage einen zweiten PR an. In Ordnung, aber leicht übersehen (Hinweis steht oben, Button unten).
- **Gewünschtes Verhalten:** beim Senden nachfragen (einmal pro Formular):
  > **#5 von @alice ändert diese Seite auch.** Soll deine Änderung dort hinein?
  > [**In #5 mitschicken**] · [**Eigenen Pull Request anlegen**]

  Mit Dreiwege-Merge (Basis = Quelle von `main`, Ihres = Branch von #5) – dabei geht Bobs Eingabe nicht verloren (anders als heute bei `pickUp`, siehe K07).
- **Erkennung:** `aktiv.openPulls` ist gesetzt und kein `aktiv.prBase`.
- **Priorität:** Soll
- **Testaufbau:** pull #5 (alice, Branch mit `POST_V1+TITLE_A`) vor dem Öffnen. Bob ergänzt Tag, Senden. **Soll:** Rückfrage sichtbar; „Eigenen Pull Request“ → 2 offene PRs; „In #5 mitschicken“ → 1 offener PR, Branch = `POST_V1+TITLE_A+TAGS_A`.

### K07 – B tippt zuerst und klickt dann „In #N weiterarbeiten“

- **Ausgangslage:** wie K06. Der Hinweis kommt asynchron (eine Anfrage pro offenem PR), Bob tippt währenddessen schon.
- **Ablauf:** Bob ändert Tags, fügt ein Foto hinzu, klickt dann „In #5 weiterarbeiten“.
- **Heutiges Verhalten:** `direct.pickUp` setzt `state.w = loaded.w0` und ruft `direct.clearPhotos()` – **Bobs Eingaben und Fotos sind ohne Rückfrage weg**. Der Entwurf im localStorage wird beim nächsten Tastendruck mit dem PR-Stand überschrieben. **Datenverlust (eigene Arbeit).**
- **Gewünschtes Verhalten:** Bobs bisherige Änderungen auf den Stand von #5 übertragen (Dreiwege-Merge, Basis = bisherige Quelle), Fotos behalten:
  > ✏️ **Du arbeitest jetzt in #5 weiter.** Deine bisherigen Änderungen (Stichworte, 1 Foto) wurden übernommen.

  Bei Konflikten der Konfliktdialog wie in K05. Wenn Bob noch nichts geändert hat, wie heute.
- **Erkennung:** vor `pickUp`: `dateiInhalt() !== aktiv.edit.source` oder `aktiv.photos.length`.
- **Priorität:** Muss
- **Testaufbau:** pull #5 mit `POST_V1+TITLE_A`. Fake verzögert `GET /pulls/5/files` um 500 ms; Bob ändert sofort die Tags und fügt ein Foto hinzu (Dateiauswahl über `DataTransfer`), dann „In #5 weiterarbeiten“. **Heute:** Tags-Feld wieder `[ktg]`, Foto-Ablage leer. **Soll:** Titel = `TITLE_A`, Tags = `[ktg, 3d-drucker]`, Foto-Ablage hat 1 Foto; Senden → `file(#5-Branch)` == `POST_V1+TITLE_A+TAGS_A` + Foto-Blobs.

### K08 – A und B arbeiten im selben PR, A committet vorher

- **Ausgangslage:** PR #5 (alice) mit `POST_V1+TITLE_A`. Bob öffnet ✏️ und klickt „In #5 weiterarbeiten“ (Quelle = Branch-Stand).
- **Ablauf:** Alice committet (über ihr Formular oder GitHub) `P2_A` auf den Branch. Bob ändert die Tags und sendet.
- **Heutiges Verhalten:** `readFile(path, prBase.branch)` ≠ Quelle → Warnung „inzwischen auf GitHub geändert“. Zweiter Klick: `createPullRequest` holt den **aktuellen** Branchkopf (mit Alices Commit) als Parent und setzt Bobs ganze Datei darauf → `PATCH force:false` ist ein Fast-Forward und **gelingt** → Alices Absatz ist im PR wieder weg. `force: false` schützt hier nicht. **Datenverlust (fremde Änderung).**
- **Gewünschtes Verhalten:** wie K04 im PR-Modus:
  > ℹ️ **@alice hat in #5 inzwischen weitergearbeitet** (Absatz im Text). Deine Änderung betrifft andere Stellen und wurde übertragen. [**In #5 speichern**]

  bei Überschneidung Konfliktdialog wie K05.
- **Erkennung:** `readFile(path, branch)` ≠ Basis (besser: Commit-SHA des Branches beim Laden merken und mit `GET /git/ref/heads/<branch>` vergleichen – dann ohne Dateiinhalt). Den Commit dann mit Parent = *genau dem* Kopf erzeugen, gegen den gemergt wurde.
- **Priorität:** Muss
- **Testaufbau:** branch `web/alice-treffen-1` = `POST_V1+TITLE_A`, pull #5. Bob: ✏️ → „In #5 weiterarbeiten“. `act` als alice: commit(Branch, `POST_V1+TITLE_A+P2_A`). Bob ergänzt Tag, Senden. **Heute:** zwei Klicks → Branch == `POST_V1+TITLE_A+TAGS_A` (P2_A verloren). **Soll:** ein Klick → Branch == `POST_V1+TITLE_A+P2_A+TAGS_A`, Commit-Parent = Alices Commit.

### K09 – Gleichzeitiges Committen im selben PR (Wettlauf)

- **Ausgangslage:** wie K08, beide im PR-Modus von #5.
- **Ablauf:** Bob sendet; zwischen Bobs `GET /git/ref` und `PATCH` committet Alice.
- **Heutiges Verhalten:** `PATCH … { force: false }` → GitHub 422 „Update is not a fast forward“ → Anzeige „⚠️ Update is not a fast forward“. Blobs/Tree/Commit sind angelegt (harmlos, ohne Ref). Nichts verloren, aber unverständlich (offener Punkt 17).
- **Gewünschtes Verhalten:** automatisch neu holen, neu mergen, erneut versuchen (höchstens 3-mal); erst bei echtem Konflikt den Dialog. Gelingt es nicht:
  > ⚠️ **Jemand speichert gerade gleichzeitig in #5.** [**Nochmal versuchen**] · [Stand neu laden]
- **Erkennung:** `err.status === 422` und Meldung enthält „fast forward“ beim `PATCH`.
- **Priorität:** Soll
- **Testaufbau:** wie K08 ohne Alices Commit vorab; `fault`: hook vor `PATCH /git/refs/heads/web/alice-treffen-1` → als alice commit(`…+P2_A`) einfügen (einmalig). **Heute:** Text „Update is not a fast forward“. **Soll:** keine Fehlermeldung, Branch == `…+P2_A+TAGS_A`, genau zwei neue Commits auf dem Branch (Alices + Bobs).

### K10 – B arbeitet in #N weiter, A schließt #N ohne Merge

- **Ausgangslage:** wie K08, Bob im PR-Modus.
- **Ablauf:** Alice schließt #5 (Branch bleibt). Bob sendet.
- **Heutiges Verhalten:** `PATCH` auf den Branch gelingt, Meldung „✅ Pull Request #5 ist ergänzt – danke!“. Der PR ist aber zu – **niemand sieht Bobs Commit**, er wird nie gemergt. Faktisch Datenverlust.
- **Gewünschtes Verhalten:** vor dem Commit den PR-Zustand prüfen:
  > ⚠️ **#5 wurde inzwischen geschlossen** (nicht gemergt). Was soll mit deiner Änderung passieren?
  > [**Neuen Pull Request anlegen**] (nur deine Änderung, auf Basis von `main`) · [**#5 wieder öffnen und dort speichern**] · [Abbrechen]

  „Neuer PR“ mergt dreiwege: Basis = Stand von #5 beim Laden, Meins = Formular, Ihres = `main` → nur Bobs Änderungen landen im neuen PR, nicht Alices verworfene.
- **Erkennung:** `GET /repos/{r}/pulls/{n}` → `state === "closed" && !merged`.
- **Priorität:** Muss
- **Testaufbau:** wie K08; `act`: close(#5). Bob ergänzt Tag, Senden. **Heute:** „ist ergänzt“, `pull(5).state == closed`, Branch hat Bobs Commit. **Soll:** Dialog „wurde inzwischen geschlossen“; „Neuen Pull Request“ → neuer offener PR, Datei == `POST_V1+TAGS_A` (ohne `TITLE_A`).

### K11 – B arbeitet in #N weiter, #N wird gemergt (Branch bleibt)

- **Ausgangslage:** wie K10.
- **Ablauf:** #5 wird gemergt (`main` = `POST_V1+TITLE_A`), Branch nicht gelöscht (offener Punkt 2: automatisches Löschen ist noch aus). Bob sendet.
- **Heutiges Verhalten:** `PATCH` auf den gemergten Branch gelingt, „✅ … ergänzt“. Der Commit kommt **nie auf `main`**. **Datenverlust (stumm).**
- **Gewünschtes Verhalten:**
  > ℹ️ **#5 ist inzwischen gemergt.** Deine Änderung kommt in einen neuen Pull Request auf Basis des aktuellen Stands.
  > [**Neuen Pull Request anlegen**] · [Abbrechen]

  Dreiwege: Basis = Stand von #5 beim Laden, Ihres = `main` (enthält #5) → in der Regel konfliktfrei.
- **Erkennung:** `GET /pulls/{n}` → `merged === true` (bzw. `state === "closed"` und `merged_at`).
- **Priorität:** Muss
- **Testaufbau:** wie K10, `act`: merge(#5) ohne Branch zu löschen. **Soll:** neuer PR, Datei == `POST_V1+TITLE_A+TAGS_A`, auf `web/alice-treffen-1` kein neuer Commit.

### K12 – B arbeitet in #N weiter, der Branch wird gelöscht

- **Ausgangslage:** wie K10.
- **Ablauf:** #5 wird gemergt **und** der Branch gelöscht (bzw. geschlossen und gelöscht). Bob sendet.
- **Heutiges Verhalten:** `readFile(path, branch)` → 404 → `null` → keine Warnung; `GET /git/ref/heads/<branch>` → 404 → „⚠️ Not Found (fehlt dem Token die Berechtigung für …?)“ – **irreführend**, Bob sucht den Fehler beim Token.
- **Gewünschtes Verhalten:** wie K10/K11 je nach `merged`; Text „Der Branch von #5 gibt es nicht mehr“. Allgemein: 404 auf einen Branch nie als Rechteproblem melden.
- **Erkennung:** `GET /pulls/{n}` vor dem Senden; 404 auf `git/ref` im PR-Modus.
- **Priorität:** Soll
- **Testaufbau:** wie K11 plus deleteBranch(`web/alice-treffen-1`). **Heute:** Text enthält „fehlt dem Token die Berechtigung“. **Soll:** Text „ist inzwischen gemergt“, neuer PR wie K11.

## 2. Dieselbe Person

### K13 – Zwei Tabs auf derselben Seite

- **Ausgangslage:** `main`/`deployed` = `POST_V1`. Bob hat die Seite in Tab 1 und Tab 2 offen, beide ✏️.
- **Ablauf:** Tab 1: Titel ändern. Tab 2: Tags ändern. Tab 1 neu laden. Danach in beiden senden.
- **Heutiges Verhalten:** Beide schreiben bei jeder Eingabe `ifsmb-edit:<pfad>` (`speichereEntwurf`); der letzte gewinnt – nach dem Neuladen von Tab 1 ist der Titel weg und Tab 2s Stand da (**Datenverlust**, wenn auch klein). Senden in beiden Tabs → zwei PRs (der zweite ohne Warnung, `main` ist unverändert).
- **Gewünschtes Verhalten:** Tabs merken einander über das `storage`-Ereignis:
  > ⚠️ **Diese Seite ist in einem anderen Tab auch zum Bearbeiten offen.** Änderungen dort überschreiben deinen Entwurf.
  > [**Hier weitermachen**] (anderer Tab wird schreibgeschützt) · [Diesen Tab schließen]

  Nach dem Senden in einem Tab zeigt der andere „In einem anderen Tab als #6 gesendet – [Dort weiterarbeiten]“ (siehe K17).
- **Erkennung:** Entwurf bekommt `tab` (zufällige ID pro Tab) und `savedAt`; `window.addEventListener("storage", …)` für den eigenen Schlüssel – fremde `tab`-ID → Hinweis. Gesendete PRs stehen im Entwurf (`sent`).
- **Priorität:** Soll
- **Testaufbau:** zwei Seiten im selben Kontext. Tab 1 Titel, Tab 2 Tags. **Soll:** Tab 1 zeigt nach der Eingabe in Tab 2 den Hinweis „in einem anderen Tab“; nach Senden in Tab 1 zeigt Tab 2 „als #N gesendet“; Senden in Tab 2 → Rückfrage, `pulls(open).length == 1` bei „Dort weiterarbeiten“.

### K14 – Entwurf älter als die Datei (fremder Merge dazwischen)

- **Ausgangslage:** Bob hat gestern Tags geändert, nicht gesendet; Entwurf `ifsmb-edit:<pfad>` = `{ w, beruehrt, source: POST_V1 }`. Heute: `main` = `deployed` = `POST_V1+TITLE_A`.
- **Ablauf:** Bob öffnet ✏️.
- **Heutiges Verhalten:** `edit()`: `draftFits = draft.source === source` ist falsch → `loescheEntwurf()` – **Bobs Änderungen sind ohne Hinweis weg.** **Datenverlust (eigene Arbeit).**
- **Gewünschtes Verhalten:** Entwurf dreiwege mergen (Basis = `draft.source`, Meins = Entwurfstext, Ihres = neue Quelle):
  > ℹ️ **Dein Entwurf von gestern, 18:40 wurde auf den neuen Stand der Seite übertragen** (inzwischen geändert: Titel). [Unterschiede ansehen] · [Entwurf verwerfen]

  Bei Konflikten der Konfliktdialog; der Entwurf bleibt erhalten, bis entschieden ist.
- **Erkennung:** `draft.source !== source` (statt Löschen: Merge). Funktioniert ohne Token (Basis steckt im Entwurf). Mit `savedAt` für die Zeitangabe.
- **Priorität:** Muss
- **Testaufbau:** `main`/`deployed` = `POST_V1+TITLE_A`; localStorage `ifsmb-edit:_posts/2026-11-01-treffen.md` = `{ "w": <Werte von POST_V1 mit tags [ktg, 3d-drucker]>, "beruehrt": {…}, "source": POST_V1 }`. ✏️ öffnen. **Heute:** Tags-Feld `[ktg]`, Schlüssel gelöscht. **Soll:** Titel = `TITLE_A`, Tags = `[ktg, 3d-drucker]`, Hinweis „wurde auf den neuen Stand … übertragen“, Schlüssel noch vorhanden (mit neuer Basis). Gleicher Test **ohne Token** (Merge braucht kein GitHub).

### K15 – Entwurf aus „In #N weiterarbeiten“, Formular neu geöffnet

- **Ausgangslage:** PR #5 (alice) mit `POST_V1+TITLE_A`; `deployed` = `POST_V1`.
- **Ablauf:** Bob: ✏️ → „In #5 weiterarbeiten“ → Tags ändern → Tab schließen. Später ✏️ wieder öffnen.
- **Heutiges Verhalten:** Der Entwurf wurde mit `source` = Stand aus #5 gespeichert; `edit()` lädt `/source/` (= `POST_V1`) → passt nicht → **Entwurf gelöscht**. Dass Bob in #5 arbeitete (`prBase`), steht nirgends. **Datenverlust.**
- **Gewünschtes Verhalten:** Entwurf speichert `base: { source, ref: "web/alice-treffen-1", pr: 5, commit }`. Beim Öffnen:
  > ✏️ **Du hattest in #5 weitergearbeitet** (Entwurf von 18:40). [**In #5 weitermachen**] · [Auf Basis von `main` neu anfangen] · [Entwurf verwerfen]

  „Weitermachen“ prüft den PR-Zustand (K10/K11) und den Branchkopf (K08).
- **Erkennung:** `draft.base.pr` gesetzt.
- **Priorität:** Muss
- **Testaufbau:** wie oben; nach Tags-Änderung Seite neu laden, ✏️. **Heute:** Tags `[ktg]`, Titel alt. **Soll:** Hinweis „Du hattest in #5 weitergearbeitet“; „In #5 weitermachen“ → Titel `TITLE_A`, Tags `[ktg, 3d-drucker]`, Button „🚀 In #5 speichern“.

### K16 – Eigener offener PR, ✏️ wird nochmal geöffnet

- **Ausgangslage:** Bob hat gestern PR #6 angelegt (Branch `web/bob-…`), noch nicht gemergt. Entwurf gelöscht (Senden erfolgreich).
- **Ablauf:** Bob öffnet ✏️ auf der (noch alten) Seite.
- **Heutiges Verhalten:** Das Formular zeigt den alten Stand von `/source/` – **ohne Bobs eigene Änderung**. Der Hinweis „Diese Seite wird gerade schon geändert: #6 … von @bob“ behandelt Bob wie eine fremde Person. Ändert Bob weiter und sendet, entsteht ein dritter Stand (PR #7, ohne die Änderung aus #6).
- **Gewünschtes Verhalten:** eigener PR (`pr.user === me.login`) und nur einer → **automatisch** dort weitermachen:
  > ✏️ **Du hast diese Seite schon in #6 geändert** – das Formular zeigt deinen Stand von dort; Speichern ergänzt #6.
  > [Stattdessen neuen Pull Request auf Basis von `main`]

  Mehrere eigene PRs → Liste mit Auswahl, eigener oben.
- **Erkennung:** `openPullsForFile` → `user === (await whoAmI()).login`; danach wie `pickUp` (mit Merge der evtl. schon getippten Werte, K07).
- **Priorität:** Soll
- **Testaufbau:** branch `web/bob-treffen-1` = `POST_V1+TAGS_A`, pull #6 user=bob; Browser bob, ✏️. **Soll:** ohne Klick Tags = `[ktg, 3d-drucker]`, Button „🚀 In #6 speichern“; Titel ändern + Senden → `pulls(open).length == 1`, Branch == `POST_V1+TAGS_A+TITLE_B`.

### K17 – Nach erfolgreichem Senden (neuer PR) weiter ändern

- **Ausgangslage:** Bob hat gesendet → PR #6; Formular noch offen (`aktiv.sent` gesetzt, `aktiv.prBase` leer).
- **Ablauf:** Bob bemerkt einen Tippfehler, ändert ihn, klickt erneut.
- **Heutiges Verhalten:** `aktiv.sent.text !== newText` → kein „Schon gesendet“; `readFile(main)` = Quelle → keine Warnung → **zweiter PR #7** mit *allen* Änderungen (auch denen aus #6). Doppelt (offener Punkt 14). Liegt der zweite Versuch in derselben Minute, scheitert er an „Reference already exists“ (K41).
- **Gewünschtes Verhalten:** nach Erfolg: `aktiv.prBase = { number, url, branch }`, Basis = gesendeter Text, Basis-Commit = neuer Branchkopf; Button heißt „🚀 In #6 speichern“:
  > ✅ Pull Request #6 ist angelegt. Weitere Änderungen kommen als Commit dazu. [Neuen, getrennten Pull Request anlegen]
- **Erkennung:** Zustand nach Erfolg (kein API-Aufruf nötig).
- **Priorität:** Muss
- **Testaufbau:** `main` = `POST_V1`; Bob ändert Titel, sendet; ändert danach Tags, sendet. **Heute:** `pulls(open).length == 2`. **Soll:** 1 offener PR, zwei Commits auf dem Branch, Datei == `POST_V1+TITLE_B+TAGS_A`; keine Warnung „inzwischen geändert“.

### K18 – Nach erfolgreichem Senden im PR-Modus weiter ändern

- **Ausgangslage:** Bob im PR-Modus von #5, hat einmal gespeichert („ergänzt“).
- **Ablauf:** weitere Änderung, erneut senden.
- **Heutiges Verhalten:** `aktiv.edit.source` ist noch der Stand *vor* Bobs Commit → `readFile(branch)` ≠ Quelle → „⚠️ Die Datei wurde inzwischen auf GitHub geändert“ – über **Bobs eigene** Änderung. Zweiter Klick geht (Inhalt stimmt, weil der Text alles enthält), aber die Meldung ist falsch und `overwriteOk` bleibt gesetzt (verdeckt später echte Konflikte).
- **Gewünschtes Verhalten:** nach Erfolg Basis = gesendeter Text und Basis-Commit = neuer Kopf; keine Meldung. `overwriteOk` abschaffen (ersetzt durch Merge).
- **Erkennung:** wie K17.
- **Priorität:** Soll
- **Testaufbau:** pull #5; Bob „In #5 weiterarbeiten“, Tags, Senden; Titel, Senden. **Heute:** zweites Senden zeigt „inzwischen auf GitHub geändert“. **Soll:** keine Warnung, Branch == `…+TAGS_A+TITLE_B`.

### K19 – Neue Datei: nach dem Senden weiter ändern

- **Ausgangslage:** Bob legt mit ➕ einen Beitrag `_posts/2026-11-18-neu.md` an → PR #6. Formular offen.
- **Ablauf:** Bob ändert den Text und sendet erneut.
- **Heutiges Verhalten:** `readFile(path)` auf `main` = null → `openPullsForFile(path)` findet **Bobs eigenen** #6 → „⚠️ Pull Request #6 („Neu: …“) legt _posts/… schon an – bitte dort weitermachen oder den Dateinamen ändern.“ Einen Weg „dort weitermachen“ gibt es für neue Dateien nicht (`pickUp` nur bei `aktiv.edit`). Ändert Bob den Dateinamen, entsteht ein zweiter Beitrag. Sackgasse.
- **Gewünschtes Verhalten:** wie K17 – nach Erfolg ist das Formular im PR-Modus von #6; die nächste Änderung ist ein Commit auf #6 (Datei im Branch ersetzen). Wird dabei der Dateiname geändert: Datei im Branch umbenennen (alte Pfad-Zeile im Tree mit `sha: null` löschen) und Fotos mitziehen.
- **Erkennung:** Zustand nach Erfolg; bei Neuladen: Entwurf mit `sent`/`base.pr` (K15).
- **Priorität:** Muss
- **Testaufbau:** `main` ohne die Datei; ➕ Beitrag, Titel „Neu“, Senden; Text ändern, Senden. **Heute:** Fehlermeldung „legt … schon an“. **Soll:** 1 offener PR, 2 Commits, Datei im Branch mit neuem Text. Variante: Titel geändert → Datei im Branch umbenannt, alte Datei im Branch weg.

### K20 – Ohne Token: „Kopieren“ geklickt, Dialog geschlossen

- **Ausgangslage:** nicht verbunden, ✏️ offen, Änderungen gemacht.
- **Ablauf:** „📋 Auf GitHub speichern“ (kopiert, öffnet GitHub), Person schließt den Dialog, fügt auf GitHub aber nie ein (Tab zu, Zwischenablage überschrieben).
- **Heutiges Verhalten:** `anlegen()` setzt `aktiv.gesendet = true`; der `close`-Handler löscht dann den Entwurf (`if (aktiv && aktiv.gesendet) loescheEntwurf()`). Nichts ist gespeichert. **Datenverlust.**
- **Gewünschtes Verhalten:** im Kopier-Weg Entwurf behalten, bis `/source/` den neuen Stand zeigt (beim nächsten Öffnen: Quelle == gesendeter Text → Entwurf still löschen). Beim Schließen:
  > Entwurf bleibt gespeichert, bis die Änderung auf der Website ist. [Entwurf jetzt löschen]
- **Erkennung:** Entwurf mit `copiedText`; beim Öffnen `source === copiedText` → erledigt.
- **Priorität:** Soll
- **Testaufbau:** ohne Token; Titel ändern, „Auf GitHub speichern“ (Clipboard-Rechte im Test erlauben, `window.open` abfangen), Dialog schließen, ✏️ erneut. **Heute:** Titel alt. **Soll:** Titel = geänderter Wert; nach Umstellen von `deployed` auf den kopierten Text → beim Öffnen kein Entwurf mehr.

### K21 – „Änderungen verwerfen“ ohne Rückfrage

- **Ausgangslage:** ✏️ mit vielen Änderungen und Fotos.
- **Ablauf:** versehentlich „↩️ Änderungen verwerfen“.
- **Heutiges Verhalten:** Handler von `discardBtn` löscht sofort Entwurf und Fotos. Gewollt, aber ohne Rückfrage.
- **Gewünschtes Verhalten:** „Wirklich alle Änderungen (3 Felder, 2 Fotos) verwerfen? [Verwerfen] [Abbrechen]“ – oder Rückgängig-Hinweis für 10 s: „Änderungen verworfen. [Rückgängig]“.
- **Erkennung:** –
- **Priorität:** Kann
- **Testaufbau:** kein Fake-GitHub nötig; Titel ändern, verwerfen, „Rückgängig“ → Titel wieder geändert, Entwurf wieder da.

## 3. Neue Dateien und Fotonummern

### K22 – Neue Datei: Name gibt es schon auf `main`

- **Ausgangslage:** `main` enthält `_posts/2026-11-18-treffen.md`.
- **Ablauf:** ➕ Beitrag mit gleichem Datum und Titel „Treffen“, Senden.
- **Heutiges Verhalten:** `direct.submit` → `readFile(path)` ≠ null → „⚠️ Die Datei … gibt es schon – bitte den Dateinamen ändern.“ Kein Datenverlust; in Ordnung, aber ohne Vorschlag.
- **Gewünschtes Verhalten:**
  > ⚠️ **Einen Beitrag mit dieser Adresse gibt es schon:** [„Treffen“ ansehen ↗]
  > [**Dateinamen `…-treffen-2.md` verwenden**] · [Den bestehenden Beitrag bearbeiten] · [Selbst umbenennen]

  Besser schon beim Tippen (nach dem Laden von `todos/suchindex.json`, das alle Seiten kennt) – ohne GitHub-Anfrage.
- **Erkennung:** wie heute; zusätzlich Suchindex.
- **Priorität:** Kann
- **Testaufbau:** `main` mit `_posts/2026-11-18-treffen.md`; ➕ Beitrag, Datum 18.11.2026, Titel „Treffen“, Senden. **Soll:** Button „…-treffen-2.md verwenden“ → PR mit Datei `_posts/2026-11-18-treffen-2.md`, Bilderordner `assets/images/news/treffen-2/`.

### K23 – Neue Datei: offener PR legt sie schon an

- **Ausgangslage:** PR #5 (alice) legt `_posts/2026-11-18-treffen.md` an.
- **Ablauf:** Bob legt dieselbe Datei an, sendet.
- **Heutiges Verhalten:** Fehler „Pull Request #5 (…) legt … schon an – bitte dort weitermachen oder den Dateinamen ändern.“ – „dort weitermachen“ geht im ➕-Formular nicht.
- **Gewünschtes Verhalten:**
  > ⚠️ **@alice legt diesen Beitrag gerade in #5 an.**
  > [**In #5 weiterarbeiten**] (Alices Stand laden, Bobs Felder dreiwege übertragen – Basis = leere Vorlage) · [**Als eigenen Beitrag anlegen** (`…-treffen-2.md`)] · [#5 ansehen ↗]
- **Erkennung:** wie heute (`openPullsForFile(path)` auf den neuen Pfad).
- **Priorität:** Soll
- **Testaufbau:** branch `web/alice-…` mit neuer Datei, pull #5; Bob ➕ gleicher Name, Senden. **Soll:** „In #5 weiterarbeiten“ → Formular im PR-Modus mit Alices Werten + Bobs Text, Senden → Commit auf #5, kein zweiter PR.

### K24 – Zwei Personen legen gleichzeitig dieselbe Datei an

- **Ausgangslage:** `main` ohne die Datei, keine PRs.
- **Ablauf:** Alice und Bob senden fast gleichzeitig `_posts/2026-11-18-treffen.md`.
- **Heutiges Verhalten:** Beide Prüfungen (`readFile` = null, `openPullsForFile` = leer) laufen vor dem Anlegen → **zwei PRs**, der zweite Merge scheitert (add/add-Konflikt). Fotos landen beide als `assets/images/news/treffen/01.jpg` (K25).
- **Gewünschtes Verhalten:** nach dem Anlegen des eigenen PRs noch einmal `openPullsForFile(path)`: gibt es einen anderen, *älteren* PR mit derselben Datei →
  > ⚠️ **@alice hat fast gleichzeitig einen Beitrag mit derselben Adresse angelegt (#5).** [**Meinen Pull Request in #5 überführen**] · [**Meinen umbenennen** (`…-treffen-2.md`)] · [So lassen]

  „Überführen“ = Commit auf #5 (Merge wie K23), eigenen PR schließen, eigenen Branch löschen.
- **Erkennung:** Nachprüfung nach `POST /pulls`; Reihenfolge über `created_at`/Nummer.
- **Priorität:** Soll
- **Testaufbau:** `fault`: hook nach Bobs `GET /pulls?state=open` (Prüfung) → als alice Branch + pull #5 mit derselben neuen Datei anlegen. **Heute:** 2 offene PRs. **Soll:** Hinweis „fast gleichzeitig“; „Meinen umbenennen“ → Bobs PR enthält `…-treffen-2.md` und Fotos unter `treffen-2/`.

### K25 – Fotonummern NN kollidieren zwischen zwei PRs

- **Ausgangslage:** `main`: Beitrag mit `assets/images/news/treffen/01.jpg`, `02.jpg`. PR #5 (alice) fügt `03.jpg`/`03-600w.jpg` hinzu.
- **Ablauf:** Bob öffnet ✏️ (eigener PR, nicht #5), fügt ein Foto hinzu → `nextNumber` ergibt `03`. Sendet → PR #6 mit `03.jpg`.
- **Heutiges Verhalten:** `direct.nextNumber` liest nur `main` (bzw. den PR-Branch bei `prBase`) → beide PRs legen `03.jpg` an. Nach dem Merge von #5 hat #6 einen **Binärkonflikt** (add/add) – GitHubs Web-Konflikteditor kann keine Bilder, nur die Kommandozeile hilft. Wird #6 zuerst gemergt, dasselbe umgekehrt. Ähnlich: zwei Tabs/zwei Personen auf demselben PR-Branch, die gleichzeitig Fotos hinzufügen (beide `03`, der zweite Commit überschreibt das erste Bild, Text verweist zweimal auf `03.jpg` – **Datenverlust**).
- **Gewünschtes Verhalten:** Nummern beim **Senden** endgültig vergeben: belegte Nummern = Ordner auf `main` ∪ Ordner im Ziel-Branch ∪ Dateien aller offenen PRs in diesem Ordner. Kollidiert eine vorläufige Nummer, still umnummerieren (Pfade in Text und Feldern ersetzen, wie heute beim Umzug in `submit`) und melden:
  > ℹ️ Foto 03 heißt jetzt 04, weil #5 von @alice schon ein Foto 03 anlegt.
- **Erkennung:** `listFolder(folder, "main")`, `listFolder(folder, branch)` und `GET /pulls/{n}/files` (die `openPullsForFile` schon abruft – die Liste dort zusätzlich nach `folder`-Präfix filtern und mitgeben).
- **Priorität:** Muss
- **Testaufbau:** `main`: Beitrag + `01/02(.jpg, -600w.jpg)`; branch `web/alice-…` + `03.jpg`, `03-600w.jpg`, Text mit Galeriezeile 03, pull #5. Bob ✏️ → eigener PR (nicht weiterarbeiten), 1 Foto, Senden. **Heute:** PR #6 enthält `03.jpg`. **Soll:** PR #6 enthält `04.jpg`, `04-600w.jpg`, Text verweist auf `04.jpg`; Hinweis „heißt jetzt 04“.

### K26 – Dateiname ändert sich nach dem Hinzufügen von Fotos

- **Ausgangslage:** ➕ Beitrag, Titel „Treffen“ → Ordner `assets/images/news/treffen/`. `main` hat schon `assets/images/news/treffen-im-park/01.jpg` (anderer Beitrag).
- **Ablauf:** Bob fügt ein Foto hinzu (→ `treffen/01.jpg`), ändert danach den Titel zu „Treffen im Park“ → Ordner `treffen-im-park/`. Senden.
- **Heutiges Verhalten:** `direct.submit` zieht die Fotos in den neuen Ordner und **behält die Nummer** (`p.folder = folder`, Name bleibt `01.jpg`). Der Tree (mit `base_tree`) ersetzt dabei die vorhandene `treffen-im-park/01.jpg` des **anderen Beitrags**. **Datenverlust (fremdes Foto überschrieben, im PR-Diff nur als „Binärdatei geändert“ sichtbar).**
- **Gewünschtes Verhalten:** beim Umzug die Nummern im Zielordner neu vergeben (wie K25); zusätzlich warnen, dass der Ordner schon zu einer anderen Seite gehört:
  > ⚠️ Im Bilderordner `treffen-im-park/` liegen schon Fotos eines anderen Beitrags. Neue Fotos bekommen die Nummern ab 02. [Ok] · [Anderen Dateinamen wählen]
- **Erkennung:** in `submit`, wenn `p.folder !== folder`: `listFolder(folder)` (+ offene PRs, K25).
- **Priorität:** Muss
- **Testaufbau:** `main` mit `assets/images/news/treffen-im-park/01.jpg` (Bytes X). ➕ Beitrag, Titel „Treffen“, 1 Foto, Titel → „Treffen im Park“, Senden. **Heute:** Branch-Datei `treffen-im-park/01.jpg` ≠ X. **Soll:** Branch hat `treffen-im-park/02.jpg`, `01.jpg` unverändert = X, Text verweist auf `02.jpg`.

### K27 – Gleicher Slug, anderes Datum → derselbe Bilderordner

- **Ausgangslage:** `main`: `_posts/2025-05-01-treffen.md` mit `assets/images/news/treffen/01.jpg` (`direct.folder` lässt bei Beiträgen das Datum weg).
- **Ablauf:** ➕ Beitrag „Treffen“ am 18.11.2026, Foto, Senden.
- **Heutiges Verhalten:** `nextNumber` → `02.jpg` im Ordner des alten Beitrags. Nichts geht verloren, aber zwei Beiträge teilen sich einen Ordner (Aufräumen/Löschen wird gefährlich).
- **Gewünschtes Verhalten:** Ordner gehört einer anderen Seite (gefunden über `todos/suchindex.json` oder Bildpfade in anderen Seiten) → Ordner `treffen-2026-11-18/` vorschlagen:
  > ℹ️ Den Bilderordner `treffen/` nutzt schon „Treffen“ vom 1.5.2025 – Fotos kommen nach `treffen-2026-11-18/`.
- **Erkennung:** `listFolder(folder)` nicht leer bei einer *neuen* Datei.
- **Priorität:** Kann
- **Testaufbau:** wie oben. **Soll:** PR-Dateien unter `assets/images/news/treffen-2026-11-18/01.jpg`.

## 4. Veraltete Quellen

### K28 – `/source/` (ausgeliefert) ist älter als `main`

- **Ausgangslage:** `main` = `POST_V1+TITLE_A` (vor 2 Minuten gemergt), `deployed` = `POST_V1` (Pages-Workflow läuft noch, oder ist am Link-Check gescheitert – dann bleibt `/source/` stundenlang alt; außerdem cacht das CDN von GitHub Pages bis zu 10 Minuten trotz `cache: "no-cache"`).
- **Ablauf:** Bob öffnet ✏️, ändert die Tags, sendet.
- **Heutiges Verhalten:** Formular zeigt den alten Titel. Beim Senden „⚠️ Die Datei wurde inzwischen auf GitHub geändert …“ – für Bob unverständlich, er hat das Formular eben erst geöffnet. Zweiter Klick setzt Alices Titel zurück (wie K04). **Datenverlust.**
- **Gewünschtes Verhalten:** mit Token schon **beim Öffnen** gegen `main` prüfen und die neuere Fassung als Basis nehmen:
  > ℹ️ **Die Seite wurde gerade geändert und ist noch nicht neu gebaut** – das Formular zeigt schon den aktuellen Stand von GitHub.

  Ohne Token bleibt `/source/` die Basis; der Dreiwege-Merge beim Senden fängt es dann ab (K04). Ohne Token und ohne Senden über die API (Kopierweg) zusätzlich: „Stand der Seite: gebaut am …“ (Build-Zeit aus `site.time` in `formular-config.html`).
- **Erkennung:** `readFile(path, "main")` parallel zu `/source/`; Vergleich über den Inhalt oder günstiger über die **Blob-SHA**: `GET /contents/<pfad>?ref=main` liefert `sha`; die SHA von `/source/` rechnet der Browser selbst (`SHA-1("blob " + bytes + "\0" + inhalt)` mit `crypto.subtle`).
- **Priorität:** Muss
- **Testaufbau:** `main` = `POST_V1+TITLE_A`, `deployed` = `POST_V1`; Bob ✏️. **Heute:** Titelfeld alt; Senden → Warnung. **Soll:** Titelfeld = `TITLE_A` direkt nach dem Öffnen, Hinweis „noch nicht neu gebaut“; Tags + Senden → Datei == `POST_V1+TITLE_A+TAGS_A`, keine Warnung.

### K29 – `main` hat sich bei anderen Dateien bewegt

- **Ausgangslage:** `main` bekommt nach dem Öffnen einen Commit auf `_posts/andere.md`.
- **Ablauf:** Bob sendet seine Änderung an `treffen.md`.
- **Heutiges Verhalten:** `readFile(treffen.md)` = Quelle → keine Warnung; `createPullRequest` nimmt den aktuellen `main` als Parent → PR enthält nur Bobs Datei. **In Ordnung.**
- **Gewünschtes Verhalten:** so lassen (Regressionstest, dass kein Konfliktdialog erscheint).
- **Erkennung:** –
- **Priorität:** Kann
- **Testaufbau:** advanceMain(`{ "_posts/andere.md": X }`) nach dem Öffnen. Assert: kein Dialog, PR-Diff enthält genau eine Datei.

### K30 – `main` ändert dieselbe Datei zwischen Prüfung und Commit

- **Ausgangslage:** Basis = `main`-Stand.
- **Ablauf:** Bob sendet; zwischen `readFile` (Prüfung in `submit`) und `GET /git/ref/heads/main` (in `createPullRequest`) wird Alices PR gemergt.
- **Heutiges Verhalten:** Prüfung sieht keine Änderung; Commit setzt Bobs ganze Datei auf den neuen `main` → setzt Alice zurück (wie K04, aber ohne jede Warnung). Kleines Zeitfenster, Datenverlust.
- **Gewünschtes Verhalten:** Prüfung und Commit auf **denselben Commit** festnageln: erst `GET /git/ref/heads/main` → SHA, dann `readFile(path, SHA)`, mergen, Commit mit `parents: [SHA]`. Der neue Branch basiert dann auf einem Stand, den der Merge kannte; Alices spätere Änderung ist für Git ein normaler, sauber mergebarer Unterschied.
- **Erkennung:** `createPullRequest` bekommt `baseSha` von außen (statt selbst zu holen).
- **Priorität:** Kann
- **Testaufbau:** `fault`: hook nach Bobs `GET /contents/…?ref=main` → advanceMain(`POST_V1+TITLE_A`). **Heute:** Branch-Datei ohne `TITLE_A`, Parent = neuer `main`. **Soll:** Parent = alter `main`-SHA, Datei ohne `TITLE_A`, PR auf GitHub konfliktfrei mergebar und nach dem Merge hat `main` beide Änderungen.

### K31 – PR-Branch hinter `main`, `main` hat dieselbe Datei geändert

- **Ausgangslage:** PR #5 (alice) ändert Absatz zwei. Danach wurde auf `main` ein anderer PR gemergt, der Absatz zwei ebenfalls ändert. #5 ist jetzt „This branch has conflicts“.
- **Ablauf:** Bob (oder Alice) öffnet ✏️ → „In #5 weiterarbeiten“ → ändert etwas → speichert.
- **Heutiges Verhalten:** Commit landet auf #5, der Konflikt bleibt. Lösen geht nur im GitHub-Konflikteditor; niemand im Formular erfährt davon.
- **Gewünschtes Verhalten:** beim Weiterarbeiten den Abstand zu `main` prüfen:
  > ⚠️ **#5 ist nicht mehr auf dem aktuellen Stand** – auf `main` wurde dieselbe Seite inzwischen geändert.
  > [**#5 auf den aktuellen Stand bringen**] · [Später]

  Ohne Überschneidung: `PUT /pulls/5/update-branch` (GitHub mergt `main` in den Branch). Mit Überschneidung: Dreiwege-Merge im Browser (Basis = `merge_base_commit`, Meins = Branch, Ihres = `main`), Konfliktdialog, dann **Merge-Commit mit zwei Eltern** `[Branchkopf, main]` über die Git-Data-API – damit ist der Konflikt für GitHub gelöst, ohne neue Abhängigkeit.
- **Erkennung:** `GET /repos/{r}/compare/main...<branch>` → `behind_by > 0`, `merge_base_commit.sha`; Datei in `main` seit Merge-Basis geändert: `readFile(path, merge_base)` ≠ `readFile(path, main)`. Alternativ `GET /pulls/{n}` → `mergeable === false` (wird von GitHub asynchron berechnet, kann `null` sein).
- **Priorität:** Soll
- **Testaufbau:** main0 = `POST_V1`; branch `web/alice-…` ← main0 + `P2_A`, pull #5; advanceMain(`POST_V1+P2_B`). Fake muss `compare` und `mergeable` berechnen. Bob „In #5 weiterarbeiten“. **Soll:** Hinweis „nicht mehr auf dem aktuellen Stand“; Konfliktkarte Absatz zwei; „Beide“ → neuer Commit auf dem Branch mit zwei Eltern (Branchkopf, `main`-Kopf), `pull(5).mergeable == true`.

## 5. Lebenszyklus eines PRs während der Bearbeitung

*(K10–K12 – PR gemergt, geschlossen, Branch gelöscht – stehen bei Familie 1.)*

### K32 – Mehrere offene PRs ändern dieselbe Datei

- **Ausgangslage:** #5 (alice, Titel) und #6 (carol über GitHub-Web, Text) offen.
- **Ablauf:** Bob öffnet ✏️.
- **Heutiges Verhalten:** `checkOpenPulls` listet beide mit „In #N weiterarbeiten“. Welcher was ändert, sieht man nicht; arbeitet Bob in #5 weiter, kollidiert #6 später trotzdem.
- **Gewünschtes Verhalten:** pro PR die geänderten Felder anzeigen („Titel“, „Text: Absatz 2“) aus `patch` von `GET /pulls/{n}/files` bzw. Feldvergleich; Hinweis „#5 und #6 ändern dieselbe Seite – am besten nacheinander mergen“. Eigener PR zuerst (K16).
- **Erkennung:** `openPullsForFile` liefert schon alle; Felder per `readFile(path, branch)` + Feldvergleich mit `main`.
- **Priorität:** Kann
- **Testaufbau:** zwei Branches/PRs mit `TITLE_A` bzw. `P2_A`. **Soll:** Liste zeigt „#5 … – ändert: Titel“ und „#6 … – ändert: Text“.

### K33 – PR benennt die Datei um

- **Ausgangslage:** PR #5 benennt `_posts/2026-11-01-treffen.md` in `_posts/2026-11-02-treffen.md` um (`status: renamed`, `previous_filename`).
- **Ablauf:** Bob öffnet ✏️ auf der alten Seite → „In #5 weiterarbeiten“.
- **Heutiges Verhalten:** `openPullsForFile` findet #5 über `previous_filename` (gut); `pickUp` liest aber den **alten** Pfad im Branch → null → „⚠️ Die Datei gibt es im Branch von #5 nicht.“
- **Gewünschtes Verhalten:** `openPullsForFile` gibt `filename` mit; `pickUp` lädt den neuen Pfad, `aktiv.path` = neuer Pfad:
  > ✏️ In #5 heißt die Datei jetzt `_posts/2026-11-02-treffen.md` – du bearbeitest sie dort.
- **Erkennung:** `status === "renamed"`.
- **Priorität:** Kann
- **Testaufbau:** Branch mit umbenannter Datei (`renamed`, `previous_filename` im Fake), pull #5. **Soll:** nach „weiterarbeiten“ Commit ändert `…-02-treffen.md`, alte Datei kommt nicht zurück.

### K34 – PR löscht die Datei

- **Ausgangslage:** PR #5 löscht die Datei (`status: removed`).
- **Ablauf:** Bob öffnet ✏️.
- **Heutiges Verhalten:** Hinweis mit „In #5 weiterarbeiten“ → „Die Datei gibt es im Branch von #5 nicht.“ Sendet Bob einen eigenen PR, ist das in Ordnung (Konflikt bei beiden Merges sichtbar).
- **Gewünschtes Verhalten:** kein „weiterarbeiten“-Button, stattdessen:
  > ⚠️ **#5 von @alice löscht diese Seite.** Deine Änderung wäre dann umsonst. [#5 ansehen ↗] · [Trotzdem ändern]
- **Erkennung:** `status === "removed"`.
- **Priorität:** Kann
- **Testaufbau:** Branch ohne die Datei, pull #5. **Soll:** Text „löscht diese Seite“, kein Button „In #5 weiterarbeiten“.

### K35 – PR aus einem Fork

- **Ausgangslage:** PR #5 von einem Fork ändert die Datei.
- **Ablauf:** Bob öffnet ✏️.
- **Heutiges Verhalten:** Hinweis „(aus einem Fork – dort weiterarbeiten)“, kein Button (`sameRepo` falsch). Richtig – in fremde Forks schreiben geht nur mit `maintainer_can_modify` und eigenem Token-Zugriff.
- **Gewünschtes Verhalten:** so lassen; Text verständlicher: „#5 kommt aus einem Fork von @x – dort kann das Formular nicht speichern. [#5 ansehen ↗]“.
- **Erkennung:** `head.repo.full_name !== repo`.
- **Priorität:** Kann
- **Testaufbau:** pull #5 mit `head.repo.full_name = "x/ifsmb.de"`. Assert: kein Button, Text „aus einem Fork“.

### K36 – Datei auf `main` gelöscht oder umbenannt, während das Formular offen ist

- **Ausgangslage:** Bob hat ✏️ offen. Ein PR, der die Datei löscht/umbenennt (z. B. Weiterleitung), wird gemergt.
- **Ablauf:** Bob sendet.
- **Heutiges Verhalten:** `readFile(path)` → null → die Prüfung `cur != null && …` schlägt nicht an → Bobs PR **legt die alte Datei wieder an** (doppelter Beitrag bzw. Weiterleitung und Seite kollidieren am Permalink).
- **Gewünschtes Verhalten:**
  > ⚠️ **Diese Seite gibt es auf GitHub nicht mehr** (gelöscht oder umbenannt in #7 von @alice). [Neue Adresse öffnen] · [Trotzdem wiederherstellen] · [Abbrechen]
- **Erkennung:** `readFile` = null im Bearbeiten-Modus; Umbenennung finden über `GET /commits?path=<alter Pfad>&per_page=1` → `GET /commits/{sha}` (`files[].previous_filename`).
- **Priorität:** Soll
- **Testaufbau:** advanceMain mit gelöschter Datei. Bob ändert, Senden. **Heute:** PR legt Datei an. **Soll:** Text „gibt es auf GitHub nicht mehr“, ohne Bestätigung kein PR.

## 6. Teilweise Fehler und Token

Zum Verständnis die Schritte von `createPullRequest`: (1) `whoAmI` → (2) `GET git/ref` → (3) `GET git/commits` → (4) `POST git/blobs` ×n → (5) `POST git/trees` → (6) `POST git/commits` → (7a) `POST git/refs` (neuer Branch) bzw. (7b) `PATCH git/refs` (PR-Modus) → (8) `POST pulls`. Schritte 4–6 hinterlassen nur unsichtbare Objekte (harmlos). **Ab 7a gibt es einen sichtbaren Zustand**, der beim Wiederholen wiederverwendet werden muss.

### K37 – Token abgelaufen oder widerrufen mitten im Senden

- **Ausgangslage:** Token gültig beim Öffnen (`whoAmI` ist gecacht in `me`).
- **Ablauf:** Token läuft zwischen Schritt 7a und 8 ab (oder schon vorher). Bob sieht die Meldung, verbindet neu, sendet nochmal.
- **Heutiges Verhalten:** `call` übersetzt 401 in „Token ungültig oder abgelaufen.“ – gut. Entwurf bleibt (nur bei Erfolg gelöscht), Fotos im Speicher bleiben. Aber: kein Knopf „neu verbinden“ an der Meldung; nach Neuverbinden legt ein neuer Versuch einen **zweiten Branch** an (K41), der erste bleibt verwaist.
- **Gewünschtes Verhalten:**
  > ⚠️ **Die Verbindung zu GitHub ist abgelaufen.** Deine Änderungen sind noch da. [**Neu verbinden und senden**]

  `connectDialog(then)` mit `then = direct.submit`; Wiederaufnahme ab gespeichertem Schritt (K41).
- **Erkennung:** `err.status === 401`.
- **Priorität:** Soll
- **Testaufbau:** `fault`: revoke(tB) nach `POST /git/refs`. **Soll:** Text „Verbindung … abgelaufen“, Button „Neu verbinden und senden“; nach Token tB2 (gleicher Nutzer) → derselbe Branch bekommt den PR, `branches(prefix "web/bob").length == 1`.

### K38 – Keine Schreibrechte

- **Ausgangslage:** carol (Token ohne push).
- **Ablauf:** Carol ändert und sendet.
- **Heutiges Verhalten:** `createPullRequest` → „@carol darf in … keine Branches anlegen (Pull Requests aus Forks kommen später).“ Der Verbinden-Dialog sagt es schon vorher. Kein Datenverlust, aber Sackgasse im Formular.
- **Gewünschtes Verhalten:**
  > ℹ️ **Dein GitHub-Konto darf hier keine Pull Requests direkt anlegen.** [**Stattdessen kopieren und auf GitHub öffnen**] (alter Weg, GitHub legt dann einen Fork an) · [Anderes Token verbinden]

  Fotos gehen im Kopierweg nicht → Hinweis „Fotos bitte im PR auf GitHub hochladen“.
- **Erkennung:** `me.canPush === false` – schon beim Öffnen, dann gleich den Kopier-Button zeigen.
- **Priorität:** Soll
- **Testaufbau:** Token tC; ✏️, ändern, Senden. **Soll:** Button „Stattdessen kopieren …“ sichtbar, keine Git-Objekte beim Fake angelegt.

### K39 – Token ohne „Pull requests“-Recht

- **Ausgangslage:** Fine-grained Token nur mit *Contents: write*.
- **Ablauf:** Senden.
- **Heutiges Verhalten:** Schritte 1–7a gelingen (Branch existiert), `POST /pulls` → 403 → „Resource not accessible by personal access token (fehlt dem Token die Berechtigung für …?)“. **Verwaister Branch**; erneutes Senden erzeugt einen zweiten.
- **Gewünschtes Verhalten:**
  > ⚠️ **Dem Token fehlt das Recht „Pull requests: Read and write“.** Der Branch `web/bob-…` ist schon angelegt – nach dem Ergänzen des Rechts wird nur noch der Pull Request geöffnet. [Token auf GitHub bearbeiten ↗] · [Neu verbinden und fortsetzen]

  Besser vorbeugen: beim Verbinden prüfen (GitHub liefert bei 403 den Header `X-Accepted-GitHub-Permissions`; eine harmlose Probeanfrage gibt es für Schreibrechte nicht – daher erst beim ersten Fehler, dann aber mit Fortsetzen).
- **Erkennung:** 403 bei `POST /pulls`, Header `X-Accepted-GitHub-Permissions: pull_requests=write`.
- **Priorität:** Soll
- **Testaufbau:** Fake-Token mit Rechten `{contents: write}` (Fake prüft Rechte pro Endpunkt und setzt den Header). **Soll:** Text „fehlt das Recht ‚Pull requests‘“; nach Rechte-Upgrade „fortsetzen“ → 1 Branch, 1 PR.

### K40 – Rate-Limit

- **Ausgangslage:** viele offene PRs (`openPullsForFile` macht bis zu 31 Anfragen pro Öffnen und noch einmal pro Seitenaufruf in `edit-buttons.html`).
- **Ablauf:** primäres Limit erschöpft (403, `x-ratelimit-remaining: 0`) oder sekundäres Limit (403/429 mit `retry-after`) beim Senden.
- **Heutiges Verhalten:** „API rate limit exceeded … (fehlt dem Token die Berechtigung für …?)“ – **irreführend**.
- **Gewünschtes Verhalten:**
  > ⏳ **GitHub bremst gerade** (zu viele Anfragen). Nächster Versuch ab 14:32 – deine Änderungen bleiben gespeichert. [Automatisch erneut versuchen]

  Sekundäres Limit: nach `retry-after` selbst wiederholen.
- **Erkennung:** Status 403/429 plus `x-ratelimit-remaining === "0"` (Zeit aus `x-ratelimit-reset`) oder `retry-after`.
- **Priorität:** Soll
- **Testaufbau:** `fault`: rateLimit({ remaining: 0, reset: jetzt+60 s }) ab `POST /git/blobs`. **Soll:** Text „GitHub bremst gerade“, Uhrzeit; nach Ablauf und „erneut versuchen“ genau 1 PR.

### K41 – Netzwerkfehler nach dem Branch, vor dem PR

- **Ausgangslage:** Bob sendet eine Änderung (neuer PR).
- **Ablauf:** Schritt 7a gelingt, `POST /pulls` scheitert (Netzwerk weg, 502). Bob klickt erneut.
- **Heutiges Verhalten:** „⚠️ Failed to fetch“ (roh). Erneuter Klick: `createPullRequest` erzeugt einen **neuen Branchnamen** (andere Minute) → zweiter Branch, der erste bleibt verwaist; in derselben Minute derselbe Name → `POST /git/refs` 422 „Reference already exists“ (unverständlich, Senden scheitert dauerhaft bis zur nächsten Minute).
- **Gewünschtes Verhalten:** Vor Schritt 7a `pending = { branch, commit, step: "ref" }` im Entwurf speichern; erneuter Versuch prüft `GET /git/ref/heads/<branch>`: gibt es ihn mit unserem Commit → direkt `POST /pulls`; gibt es schon einen PR für den Branch (`GET /pulls?head=<owner>:<branch>&state=all`) → fertig.
  > ⚠️ **Verbindung unterbrochen.** Der Branch ist schon auf GitHub, der Pull Request fehlt noch. [**Pull Request jetzt öffnen**]

  Branchnamen zusätzlich eindeutig machen (Sekunden + 4 Zufallszeichen).
- **Erkennung:** `TypeError` von `fetch` (Netzwerk) bzw. 5xx; Zustand `pending` im Entwurf.
- **Priorität:** Muss
- **Testaufbau:** `fault`: next("POST /pulls", 502). Senden, dann erneut. **Heute:** 2 Branches `web/bob-treffen-*` (bzw. 422 bei gleicher Minute – Uhr im Test einfrieren). **Soll:** genau 1 Branch, 1 PR; Text „Pull Request jetzt öffnen“.

### K42 – PR angelegt, Antwort verloren

- **Ausgangslage:** wie K41.
- **Ablauf:** `POST /pulls` wird ausgeführt, die Antwort kommt nie an. Bob klickt erneut.
- **Heutiges Verhalten:** Fehlermeldung; erneuter Klick → neuer Branch + **zweiter PR** mit gleichem Inhalt.
- **Gewünschtes Verhalten:** wie K41: `GET /pulls?head=<owner>:<branch>&state=open` → PR gefunden → „✅ Pull Request #6 ist angelegt“ (ohne neuen Versuch).
- **Erkennung:** `pending.branch` + Suche nach PR mit diesem Head.
- **Priorität:** Muss
- **Testaufbau:** `fault`: next("POST /pulls", { apply: true, drop: true }). **Heute:** 2 offene PRs. **Soll:** 1 offener PR, Text „ist angelegt“.

### K43 – PATCH im PR-Modus ausgeführt, Antwort verloren

- **Ausgangslage:** Bob im PR-Modus von #5.
- **Ablauf:** `PATCH git/refs` wird ausgeführt, Antwort verloren. Bob klickt erneut.
- **Heutiges Verhalten:** `readFile(branch)` ≠ Quelle (jetzt mit Bobs eigenem Commit) → „inzwischen geändert“ (wie K18); zweiter Klick → zweiter Commit mit identischem Tree (leerer Commit im PR).
- **Gewünschtes Verhalten:** `pending = { branch, commit, step: "patch" }`; beim Wiederholen `GET git/ref` → zeigt auf unseren Commit → „✅ #5 ist ergänzt“. Allgemein: identischer Tree wie Parent → keinen Commit anlegen („Nichts Neues zu speichern“).
- **Erkennung:** Branchkopf == `pending.commit`; Tree-SHA == Parent-Tree-SHA.
- **Priorität:** Soll
- **Testaufbau:** `fault`: next("PATCH /git/refs/heads/web/alice-treffen-1", { apply: true, drop: true }). **Soll:** nach erneutem Klick genau ein neuer Commit auf dem Branch, Text „ist ergänzt“.

### K44 – Tab geschlossen oder neu geladen während des Sendens

- **Ausgangslage:** Senden läuft (Fotos werden hochgeladen – kann bei vielen Fotos eine Minute dauern).
- **Ablauf:** Bob lädt neu nach Schritt 7a (oder 8). Öffnet ✏️ wieder, sendet erneut.
- **Heutiges Verhalten:** Entwurf ist noch da (gelöscht wird erst nach Erfolg), Fotos nicht (K46). Erneutes Senden → zweiter Branch/zweiter PR, ohne Fotos.
- **Gewünschtes Verhalten:** `pending` im Entwurf (K41) erkennt den halben Vorgang beim Öffnen:
  > ⚠️ **Das letzte Senden wurde unterbrochen** (18:40). [**Nachsehen und fortsetzen**] · [Verwerfen]

  „Fortsetzen“ = PR suchen/öffnen wie K41/K42, danach PR-Modus (K17). Während des Sendens `beforeunload` mit Rückfrage.
- **Erkennung:** `draft.pending` beim Öffnen.
- **Priorität:** Soll
- **Testaufbau:** `fault`: next("POST /pulls", { apply: false, hang: true }); Seite neu laden; ✏️. **Soll:** Hinweis „letzte Senden wurde unterbrochen“; „fortsetzen“ → 1 Branch, 1 PR.

## 7. Fotos

### K45 – Foto aus dem Text gelöscht, aber noch in der Ablage

- **Ausgangslage:** ✏️, ein Foto als Galerie zugeordnet.
- **Ablauf:** Bob löscht die Bildzeile von Hand im Editor; das Foto bleibt in der Ablage. Senden.
- **Heutiges Verhalten:** `direct.used` prüft den Text → unbenutzt → nicht hochgeladen, Hinweis „1 Foto(s) werden nirgends verwendet und nicht hochgeladen.“, Karte „Noch nicht verwendet“. **In Ordnung.**
- **Gewünschtes Verhalten:** so lassen; Hinweis vor dem Senden mit [Foto doch in die Galerie] · [Ohne Foto senden].
- **Erkennung:** wie heute.
- **Priorität:** Kann
- **Testaufbau:** 1 Foto zuordnen, Zeile aus `text` entfernen, Senden. Assert: PR enthält keine Bilddatei, Hinweistext sichtbar.

### K46 – Neu geladen: Text verweist auf Fotos, die nur im Speicher waren

- **Ausgangslage:** Bob fügt 2 Fotos hinzu (Zeilen `![…](/assets/images/news/treffen/03.jpg)` stehen im Text und damit im Entwurf), dann wird der Tab neu geladen.
- **Ablauf:** ✏️ öffnen (Entwurf wiederhergestellt), weiter ändern, senden.
- **Heutiges Verhalten:** Text mit beiden Bildzeilen wird gesendet, die Fotos fehlen (`aktiv.photos` leer) → PR mit **toten Bildpfaden**; `check_site.rb` bzw. das Galerie-Plugin lassen „Prüfen“ scheitern. Der Hinweis beim Hinzufügen („nicht im Entwurf gespeichert“) ist längst vergessen.
- **Gewünschtes Verhalten:** Fotos im Entwurf (IndexedDB, offener Punkt 6). Bis dahin beim Öffnen und vor dem Senden:
  > ⚠️ **2 Fotos aus deinem Entwurf sind nicht mehr da** (nach dem Neuladen). [**Fotos erneut auswählen**] · [Bildzeilen entfernen]
- **Erkennung:** Bildpfade in Text und Bildfeldern unter `direct.folder()`, die weder in `aktiv.photos` noch in `listFolder(folder, ref)` vorkommen (bzw. ohne Token: nicht in der Quelle).
- **Priorität:** Muss
- **Testaufbau:** localStorage-Entwurf mit Text + `![x](/assets/images/news/treffen/03.jpg)\n{: .gallery}`, `main` ohne `03.jpg`. ✏️, Senden. **Heute:** PR-Text enthält den Pfad, keine Bilddatei. **Soll:** Hinweis „2 Fotos … nicht mehr da“, ohne Entscheidung kein PR; „Bildzeilen entfernen“ → Text ohne Zeile und ohne leeres `{: .gallery}`.

### K47 – A und B setzen beide `social_media_preview_image`

- **Ausgangslage:** Beitrag ohne Vorschaubild; PR #5 (alice) setzt `social_media_preview_image: /assets/images/news/treffen/03-social.jpg` mit `03.jpg`.
- **Ablauf:** Bob (eigener PR) wählt ebenfalls ein Foto als Social-Media-Vorschau (`03-social.jpg`, Nummernkonflikt K25) und sendet.
- **Heutiges Verhalten:** zwei PRs mit derselben Bilddatei (unterschiedlicher Inhalt) und demselben Feld → Konflikte beim zweiten Merge (Text und Binär).
- **Gewünschtes Verhalten:** Nummern wie K25 (→ `04-social.jpg`); Feldkonflikt wie K02, mit Bildvorschau beider Varianten:
  > ⚠️ **@alice hat in #5 auch ein Vorschaubild gewählt.** [Mein Bild] · [Ihr Bild]

  „Ihr Bild“ → Bobs Foto bleibt unbenutzt und wird nicht hochgeladen.
- **Erkennung:** wie K01/K25; Bildvorschau von Alices Datei über `GET /contents/<bild>?ref=<branch>` (`download_url` geht für öffentliche Repos ohne Token, ist aber eine externe Anfrage → nur mit Token über die API).
- **Priorität:** Soll
- **Testaufbau:** Alices Branch mit Feld + `03.jpg`, `03-600w.jpg`, `03-social.jpg`; Bob: 1 Foto → Social-Media-Vorschau, Senden (in #5 mitschicken). **Soll:** Konfliktkarte „Social-Media-Vorschau“; „Ihr Bild“ → Commit ohne neue Bilddateien; „Mein Bild“ → Commit mit `04-social.jpg`, Feld zeigt `04-social.jpg`.

### K48 – A entfernt ein Foto im PR, B verweist noch darauf

- **Ausgangslage:** `main` hat `02.jpg` in der Galerie. PR #5 (alice) löscht Zeile und Datei `02.jpg`.
- **Ablauf:** Bob (eigener PR) ändert den Alt-Text der Zeile mit `02.jpg`. Beide werden gemergt.
- **Heutiges Verhalten:** #6 hat einen Textkonflikt (gleiche Zeile) – oder, wenn Bob eine *andere* Zeile mit `02.jpg` neu anlegt (z. B. als Vorschaubild), gar keinen: nach beiden Merges toter Bildpfad, `check_site.rb` stoppt das Deployment.
- **Gewünschtes Verhalten:** Beim Dreiwege-Merge (K01) gelöschte Bilddateien in „Ihres“ erkennen:
  > ⚠️ **@alice entfernt in #5 das Foto 02.** Du verwendest es noch (Social-Media-Vorschau). [Verwendung entfernen] · [Trotzdem]
- **Erkennung:** `GET /pulls/{n}/files` → `status: removed` für Bilddateien im Ordner der Seite.
- **Priorität:** Kann
- **Testaufbau:** Alices Branch ohne `02.jpg`/`02-600w.jpg` und ohne Zeile; Bob setzt `social_media_preview_image` auf `/assets/images/news/treffen/02.jpg`, Senden. **Soll:** Hinweis „entfernt in #5 das Foto 02“.

---

## Lösungsansatz

### Grundidee: Dreiwege-Merge im Browser, Feld für Feld

Jede Bearbeitung kennt drei Stände:

```text
             Basis (base)  ── Stand, aus dem das Formular gefüllt wurde
            /            \
   Meins (mine)        Ihres (theirs)
   = Formular            = main bzw. Kopf des PR-Branches, JETZT
            \            /
             Ergebnis (merged) → Commit mit Parent = Commit von „Ihres“
```

Statt „Datei wurde geändert – nochmal klicken überschreibt“ rechnet das Formular **vor jedem Commit** das Ergebnis aus. Nicht überlappende Änderungen werden still zusammengeführt (Hinweis „wurde auf den neuen Stand übertragen“), überlappende landen im Konfliktdialog. Der Commit setzt immer auf genau den Stand, gegen den gemergt wurde; der Ref-Update (`PATCH force:false` bzw. neuer Branch von diesem Commit) schlägt fehl, wenn sich der Stand inzwischen bewegt hat → neu holen, neu mergen (Schleife, höchstens 3-mal).

### Front Matter: auf Ebene der Formularwerte mergen, mit „Ihres“ als Vorlage schreiben

Der vorhandene Code bringt fast alles mit:

1. `readSource(schema, text, path)` für Basis, Meins-Quelle und Ihres → je `w0` (Werte) und `rawFields`.
2. **Meine Änderungen** = Felder mit `!sameValue(aktiv.w[f], base.w0[f])` (genau das, was `editedText` heute schon nutzt).
3. **Ihre Änderungen** = Felder mit `!sameValue(theirs.w0[f], base.w0[f])`.
4. Ergebnis `wMerged` = Kopie von `theirs.w0`; für jedes meiner Felder:
   - nur ich geändert → mein Wert,
   - beide gleich geändert → egal,
   - beide verschieden → **Konflikt** (außer bei Listen/Chips: Mengen-Merge = Ihres + meine Hinzufügungen − meine Entfernungen; Reihenfolge von Ihres, Neues hinten. Nur wenn beide denselben Eintrag gegensätzlich behandeln, Konflikt).
5. Datei schreiben mit **`editedText(schema, readSource(theirs), wMerged)`** – dadurch bleiben alle Blöcke von „Ihres“ (Kommentare, unbekannte Felder, Formatierung, `rawFields` wie Galerien als Objektlisten) Byte für Byte erhalten, nur meine Felder werden neu geschrieben. Das ist exakt die heutige Eigenschaft „nur geänderte Felder neu schreiben“, nur relativ zu „Ihres“ statt zur alten Quelle.
6. Felder, die das Formular nicht kennt (`rawFields`), ändert das Formular nie → kommen immer von „Ihres“; kein Konflikt möglich.

Damit braucht es **keine** YAML-Bibliothek und keinen Block-Diff: `Formular.splitFile`/`yamlValue`/`joinFile` und `editedText` erledigen das Lesen und Schreiben. Ein Block-Merge auf Ebene von `splitFile`-Blöcken (Schlüssel → `raw`) ist die Rückfallebene für `_data/*.yml`-Dateien (Partner, Slogans), deren Felder das Formular nicht alle kennt: gleiche Regeln, Vergleich auf normalisiertem `raw` (Leerzeilen am Ende abgeschnitten), Reihenfolge von „Ihres“, neue Schlüssel von mir vor `uuid`.

### Text (Markdown-Rumpf): Absatz-Diff3

- Einheiten = **Absätze** (durch Leerzeilen getrennt); eine Galerie (Bildzeilen + `{: .gallery}`) ist ein Absatz und bleibt zusammen. Absätze statt Zeilen, weil Markdown-Absätze die Einheit sind, in der Menschen denken, und weil der Editor beim Umbrechen sonst viele Scheinkonflikte erzeugt.
- Algorithmus: klassisches diff3 auf zwei LCS-Abgleichen (Basis↔Meins, Basis↔Ihres). Die LCS-Funktion gibt es schon (`changedLines` in `neu.js`, für die markierten Zeilen der Vorschau) – sie wird auf Arrays von Absätzen verallgemeinert. Stabile Bereiche (in allen dreien gleich) trennen die Abschnitte; in jedem Abschnitt: nur einer geändert → dessen Fassung, beide gleich → egal, beide verschieden → Konflikt mit [Meine Version] · [Ihre Version] · [**Beide**] (meine zuerst, dann ihre) · [Selbst bearbeiten].
- Normalisierung vorher: `\r\n` → `\n`, Leerzeichen am Zeilenende, Leerzeilen am Anfang/Ende. Damit verschwindet auch das Problem aus K03, dass `editedText` den Rumpf neu formatiert.
- Hat nur eine Seite den Text geändert, bleibt `edit.file.rest` von „Ihres“ unberührt (wie heute).
- Grenzen: verschobene Absätze erkennt diff3 nicht als Verschiebung (Konflikt oder doppelt) – akzeptiert.

### Wie die Basis erhalten bleibt

Der Entwurf wird erweitert (Schlüssel bleiben `ifsmb-edit:<pfad>` / `ifsmb-neu:<typ>:<seitenpfad>`):

```js
{
  w, beruehrt,                       // wie heute
  source,                            // wie heute (= base.text, für alte Entwürfe)
  base: {
    text,                            // Datei, aus der das Formular gefüllt wurde
    sha,                             // Blob-SHA (contents API oder selbst gerechnet)
    commit,                          // Commit-SHA von ref beim Laden (nur mit Token)
    ref,                             // "main" | "web/alice-…"
    pr,                              // { number, url, branch } im PR-Modus (heute aktiv.prBase)
    from                             // "source" (ausgeliefert) | "github"
  },
  sent: { number, url, branch, text },// nach Erfolg (K17–K19)
  pending: { branch, commit, step },  // während des Sendens (K41–K44)
  tab, savedAt                        // K13, Zeitangaben
}
```

- **Öffnen ohne Token:** Basis = `/source/` (`from: "source"`, SHA im Browser gerechnet mit `crypto.subtle.digest("SHA-1", "blob <n>\0" + bytes)`).
- **Öffnen mit Token:** parallel `GET /git/ref/heads/main` (Commit-SHA) und `GET /contents/<pfad>?ref=<commit>` (Blob-SHA + Inhalt). Unterscheidet sich die Blob-SHA von der selbst gerechneten SHA von `/source/` → Basis = GitHub-Stand (K28). Kostet zwei Anfragen, die bisher erst beim Senden kamen.
- **Entwurf passt nicht mehr** (`base.text` ≠ aktuelle Basis): nie löschen, sondern mergen (K14/K15).
- **Nach Erfolg:** `base` = gesendeter Text + neuer Commit des Branches, `base.pr` = der PR (K17–K19).
- `readFile` bekommt eine Schwester `readFileMeta(path, ref)` → `{ text, sha }` (gleiche Anfrage, nur mehr zurückgeben); `createPullRequest` bekommt optional `parent` (Commit-SHA) statt selbst den Kopf zu holen, außerdem `removePaths` (umbenennen, K19) und `extraParents` (Merge-Commit, K31).

### Ablauf beim Senden (neu)

```text
submit()
  ├─ pending vorhanden? ─────────────► wiederaufnehmen (K41–K44)
  ├─ Ziel bestimmen: base.pr ? PR-Branch : main
  │    └─ base.pr: GET /pulls/{n} ──► gemergt/geschlossen/Branch weg → Dialog (K10–K12)
  ├─ GET /git/ref/heads/<ziel> → headSha
  ├─ headSha == base.commit ? ───────► kein Merge nötig
  │    sonst GET /contents?ref=headSha → theirs
  │         ├─ theirs == null → Dialog „gibt es nicht mehr“ (K36)
  │         └─ merge(base, mine, theirs) → Konflikte? → Konfliktdialog → zurück
  ├─ ohne base.pr: openPullsForFile → neue fremde PRs? → Rückfrage (K01/K02/K06)
  ├─ Fotonummern endgültig vergeben (K25/K26)
  ├─ pending speichern → Blobs → Tree → Commit(parent = headSha)
  ├─ PATCH force:false | POST refs ──► 422 „not a fast forward“ → neu holen, max. 3× (K09)
  ├─ POST /pulls (falls neu)
  └─ base := gesendeter Stand, base.pr := PR, pending löschen, Entwurf behalten bis Dialog zu
```

### Zustände der Bearbeitung

```text
                         ┌──────────────────────────────┐
                         │  GESCHLOSSEN                 │
                         └──────────────┬───────────────┘
                                ✏️ / ➕ │ (Entwurf? pending? eigener PR?)
                                        ▼
  Entwurf passt nicht ──► ┌──────────────────────────┐ ◄── „In #N weiterarbeiten“ /
  → MERGE (still)         │  BEARBEITEN              │     eigener PR automatisch (K16)
                          │  Basis = main@sha        │
                          │  oder    #N@sha          │──── fremder neuer PR ──► RÜCKFRAGE
                          └────────────┬─────────────┘      (mitschicken/eigener PR)
                                       │ Senden
                                       ▼
                          ┌──────────────────────────┐   Überschneidung
                          │  PRÜFEN & MERGEN         │ ─────────────────► ┌──────────────┐
                          │  (Ziel neu holen)        │ ◄───────────────── │  KONFLIKT    │
                          └────────────┬─────────────┘   alles entschieden│  pro Feld    │
                    PR zu/gemergt      │ sauber                           └──────────────┘
                   ┌───────────────────┤
                   ▼                   ▼
          ┌────────────────┐   ┌──────────────────┐  Netz/Token/Limit  ┌──────────────────┐
          │ ZIEL WEG       │   │  SENDEN (pending)│ ─────────────────► │  UNTERBROCHEN    │
          │ neuer PR?      │   └────────┬─────────┘ ◄───────────────── │  fortsetzen      │
          └────────────────┘            │ Erfolg       fortsetzen      └──────────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │  GESENDET = PR-Modus #N  │── weitere Änderung ──► BEARBEITEN
                          │  Basis = gesendeter Stand│   (Commit auf #N, K17)
                          └──────────────────────────┘
```

### Optionen und Texte (Übersicht)

| Lage | Text | Buttons |
|---|---|---|
| Stand neuer als Formular, keine Überschneidung | „ℹ️ Die Seite wurde inzwischen geändert (von @x). Deine Änderung wurde auf den neuen Stand übertragen.“ | Pull Request anlegen · Unterschiede ansehen |
| Überschneidung | „⚠️ Konflikt: @x hat ‚<Feld>‘ inzwischen auch geändert.“ | Meine Version · Ihre Version · Beide (nur Text/Listen) · Selbst bearbeiten |
| Submit gesperrt | Button: „Erst Konflikte lösen (2)“ | – |
| Fremder offener PR | „@x ändert diese Seite gerade auch (#N).“ | In #N mitschicken · Eigenen Pull Request anlegen |
| Eigener offener PR | „Du hast diese Seite schon in #N geändert.“ | (automatisch) · Stattdessen neuer Pull Request |
| PR gemergt | „#N ist inzwischen gemergt.“ | Neuen Pull Request anlegen |
| PR geschlossen | „#N wurde inzwischen geschlossen.“ | Neuen Pull Request anlegen · #N wieder öffnen und dort speichern |
| PR hinter `main` | „#N ist nicht mehr auf dem aktuellen Stand.“ | #N auf den aktuellen Stand bringen · Später |
| Entwurf übertragen | „Dein Entwurf von <Zeit> wurde auf den neuen Stand übertragen.“ | Unterschiede ansehen · Entwurf verwerfen |
| Anderer Tab | „Diese Seite ist in einem anderen Tab auch zum Bearbeiten offen.“ | Hier weitermachen |
| Unterbrochen | „Das letzte Senden wurde unterbrochen.“ | Nachsehen und fortsetzen · Verwerfen |
| Token | „Die Verbindung zu GitHub ist abgelaufen. Deine Änderungen sind noch da.“ | Neu verbinden und senden |
| Rate-Limit | „GitHub bremst gerade. Nächster Versuch ab <Zeit>.“ | Automatisch erneut versuchen |
| Keine Rechte | „Dein GitHub-Konto darf hier keine Pull Requests direkt anlegen.“ | Stattdessen kopieren und auf GitHub öffnen |

Fehlerübersetzung (offener Punkt 18) zentral in `GitHubApi.call`: `err.kind` = `auth` (401), `forbidden` (403 ohne Limit, mit `X-Accepted-GitHub-Permissions`), `rate` (403/429 + Limit-Header), `notFound` (404 – nicht pauschal „Berechtigung?“), `conflict` (422 „fast forward“ / „Reference already exists“), `network` (`TypeError` von `fetch`), `server` (5xx). Das Formular entscheidet anhand von `kind`, nicht anhand des Meldungstexts.

### Was bewusst nicht gebaut wird

- Kein Echtzeit-Mitschreiben (kein Server, keine Websockets). Konflikte werden beim Öffnen, beim Senden und über `storage`-Ereignisse zwischen Tabs erkannt.
- Kein Zeichen-genauer Merge innerhalb eines Absatzes oder Feldes – „Beide“ und „Selbst bearbeiten“ reichen.
- Keine neue Abhängigkeit: LCS/diff3 als eigener Code (≈ 100 Zeilen) in `formular.js` (dort, weil auch der Todo-Editor ihn brauchen wird), Node-tauglich wie `TodoFormat`, mit Tests in `_scripts/`.

## Umsetzungsreihenfolge

1. **Fehler klassifizieren** in `GitHubApi.call` (`err.kind`, Rate-Limit-Header, 404 ohne „Berechtigung?“) – klein, Grundlage für alles (K12, K37–K40).
2. **Entwurf mit Basis** (`base`, `savedAt`, `tab`) und **nie mehr stillschweigend löschen** – vorerst bei Nichtpassen „Entwurf ist älter als die Seite: [Entwurf behalten] [verwerfen]“ (K14, K15, K20). Ohne Merge schon ein großer Gewinn.
3. **diff3 + Feld-Merge** als reine Funktionen (`Formular.merge3(base, mine, theirs, schema)` → `{ text, conflicts }`), mit Node-Tests aus den Testdateien dieses Dokuments (`POST_V1` + Varianten) in `_scripts/edit_examples.js`/`test_formulare.rb`.
4. **Senden mit Merge statt „nochmal klicken“**: `overwriteOk` entfernen, Commit mit festem Parent, Retry bei „not a fast forward“ (K04, K05, K08, K09, K30).
5. **Konfliktdialog** pro Feld/Absatz (K02, K05).
6. **Nach Erfolg im PR-Modus bleiben** (K17, K18, K19) und **PR-Zustand vor dem Commit prüfen** (K10, K11, K12).
7. **`pickUp` mit Merge statt Zurücksetzen**, eigener PR automatisch (K07, K16), Rückfrage bei neuen fremden PRs beim Senden (K01, K06).
8. **Wiederaufnahme** über `pending` und eindeutige Branchnamen (K41–K44).
9. **Fotonummern beim Senden vergeben**, Umzug ohne Überschreiben, fehlende Fotos erkennen (K25, K26, K46); danach Fotos in IndexedDB (offener Punkt 6).
10. **Basis beim Öffnen von GitHub** statt `/source/`, wenn neuer (K28).
11. Rest: Tabs (K13), PR hinter `main` mit Merge-Commit (K31), neue Dateien (K22–K24), Lebenszyklus-Sonderfälle (K32–K36), Fotos (K47, K48), Verwerfen rückgängig (K21).

Jeder Schritt bekommt seine Szenarien als End-to-End-Tests gegen die Attrappe; die „Heute“-Asserts dienen als Nachweis, dass der Test den Fehler wirklich trifft, und werden mit dem Schritt auf „Soll“ umgestellt.

## Anforderungen an die GitHub-Attrappe

### REST-Endpunkte (wie GitHub, gleiche Felder, gleiche Fehlercodes)

| Endpunkt | gebraucht für | Besonderheiten |
|---|---|---|
| `GET /user` | `whoAmI` | Login je Token |
| `GET /repos/{o}/{r}` | `whoAmI` | `permissions.push` je Token |
| `GET /repos/{o}/{r}/contents/{pfad}?ref=` | `readFile`, `listFolder` | `ref` = Branch **oder Commit-SHA**; Datei: `content` (base64 mit Zeilenumbrüchen), `sha` (echte Git-Blob-SHA-1), `encoding`; Ordner: Liste; 404 |
| `GET /repos/{o}/{r}/git/ref/heads/{branch}` | `createPullRequest` | 404 für unbekannte/gelöschte Branches; Branchnamen mit `/` |
| `GET /repos/{o}/{r}/git/commits/{sha}` | `createPullRequest` | `tree.sha`, `parents` |
| `POST /repos/{o}/{r}/git/blobs` | Senden | `utf-8` und `base64`; liefert SHA |
| `POST /repos/{o}/{r}/git/trees` | Senden | `base_tree`, Einträge mit `sha: null` = löschen (K19) |
| `POST /repos/{o}/{r}/git/commits` | Senden | **mehrere `parents`** (Merge-Commit, K31) |
| `POST /repos/{o}/{r}/git/refs` | neuer Branch | 422 „Reference already exists“ |
| `PATCH /repos/{o}/{r}/git/refs/heads/{branch}` | PR-Modus | `force: false` → 422 „Update is not a fast forward“, wenn `sha` den aktuellen Kopf nicht als Vorfahren hat |
| `GET /repos/{o}/{r}/pulls?state=&head=&per_page=` | `openPullsForFile`, Wiederaufnahme | Filter `head=<owner>:<branch>`, `state=open/closed/all` |
| `GET /repos/{o}/{r}/pulls/{n}` | Lebenszyklus | `state`, `merged`, `merged_at`, `mergeable` (berechnet), `head.ref/sha/repo.full_name`, `user.login` |
| `GET /repos/{o}/{r}/pulls/{n}/files` | `openPullsForFile`, K25, K48 | `filename`, `status` (added/modified/removed/renamed), `previous_filename`, optional `patch`; Vergleich Merge-Basis ↔ Kopf |
| `POST /repos/{o}/{r}/pulls` | Senden | 422, wenn es für den Head schon einen offenen PR gibt |
| `PUT /repos/{o}/{r}/pulls/{n}/update-branch` | K31 | `expected_head_sha`; 422 bei Konflikt |
| `GET /repos/{o}/{r}/compare/{base}...{head}` | K31 | `ahead_by`, `behind_by`, `merge_base_commit.sha`, `files` |
| `GET /repos/{o}/{r}/commits?path=&sha=&per_page=` | „wer hat geändert“ (K04, K36) | Autor, Message |
| `GET /repos/{o}/{r}/commits/{sha}` | Umbenennung finden (K36) | `files[].previous_filename` |

Allgemein: CORS wie api.github.com (Preflight mit `Authorization`), Header `x-ratelimit-remaining`/`x-ratelimit-reset`/`retry-after` und `X-Accepted-GitHub-Permissions` auf Anfrage; jede Anfrage protokolliert (Methode, Pfad, Token, Body) für Asserts.

### Steuer-API (für Testaufbau und zweite Person)

- **Seed:** Nutzer + Tokens (Login, `push`, Rechte pro Bereich `contents`/`pull_requests`); `main` aus einer Map `{ pfad: text | bytes }`; Zurücksetzen auf leer.
- **Git als zweite Person:** `commit(branch, { pfad: text | bytes | null }, { author, message })` (null = löschen; auch Umbenennen), `createBranch(name, from)`, `deleteBranch(name)`, `advanceMain(...)` als Abkürzung.
- **PRs:** `openPull({ head, base, user, title, fork?: "x/ifsmb.de" })`, `mergePull(n, { deleteBranch })` (echter Merge-Commit auf `main`, Konflikt → Fehler), `closePull(n)`, `reopenPull(n)`.
- **Ausgelieferte Quelle:** `setDeployed(pfad, text)` – der Test fängt `GET /source/<pfad>` im Browser ab und antwortet damit (getrennt von `main`, für K28).
- **Fehler einspielen:** `failNext(methode, pfadmuster, { status, body, headers })`, `{ apply: true, drop: true }` (ausführen, Verbindung abbrechen), `{ hang: true }` (nie antworten), `{ delayMs }`; `hook(methode, pfadmuster, fn)` vor/nach einer Anfrage (für Wettläufe K09, K24, K30); `revokeToken(t)`, `rateLimit({ remaining, reset })`, `secondaryRateLimit({ retryAfter })`.
- **Auslesen für Asserts:** `branches(prefix)`, `file(ref, pfad)` (Text/Bytes), `log(branch)` (Commits mit Parents), `pulls({ state })`, `pull(n)`, `requests()` (Protokoll).
- **Uhr:** feste Zeit im Browser (`Date`) und in der Attrappe, damit Branchnamen und „gleiche Minute“ (K41) reproduzierbar sind.
