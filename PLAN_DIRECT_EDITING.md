# Plan: Direkt bearbeiten – Pull Requests mit Fotos aus dem Browser

Stand: 18.11.2026 · erste Version gemergt mit PR #110 (zum Testen auf ifsmb.de) · Fortsetzung: Abschnitt [Offene Punkte](#offene-punkte)

**Aufgabenliste:** offene Punkte werden in Issue #129 verfolgt und dort abgehakt – dieses Dokument bleibt die ausführliche Beschreibung.

## Ziel

So bequem wie [Pages CMS](https://app.pagescms.org), aber mit unseren eigenen Formularen (➕/✏️, OverType-Editor, Autovervollständigung, Social-Media-Vorschau):

1. Mit GitHub verbinden – einmal pro Gerät/Sitzung.
2. Beitrag, Termin, Gerät, Partner … anlegen oder ändern **und Fotos hinzufügen**.
3. Fotos im Browser vorbereiten: drehen, zuschneiden, **Gesichter/Kennzeichen/Namen unkenntlich machen**, verkleinern, Metadaten entfernen, Alt-Text – und je Seite einer **Verwendung** zuordnen (Galerie, Titelbild, Logo, Social-Media-Vorschau …).
4. Ein Klick → **Pull Request** (ein Commit mit Datei + Fotos auf neuem Branch) oder ein Commit auf einen schon offenen PR zur selben Seite. Gemergt wird weiter erst nach Durchsicht.

Nichts geht direkt auf `main`. Ohne Verbindung bleibt alles wie bisher (Kopieren → GitHub-Editor).

## Was schon geht

| Teil | Wo | Stand |
|---|---|---|
| Token verbinden/abmelden, Rechte prüfen (`🔑 GitHub verbinden` im Formular) | `assets/js/github-api.js`, `direct.connectDialog` in `neu.js` | ✅ echt getestet (PR #112) |
| Ein Commit mit mehreren Dateien über die Git-Data-API (Blobs → Tree → Commit → Ref), Branch `web/<login>-<datei>-<zeit>`, PR mit Prüfliste | `GitHubApi.createPullRequest` | ✅ echt getestet |
| Neue Datei: gibt es sie schon auf `main` oder legt ein offener PR sie schon an? → Abbruch mit Hinweis | `direct.submit` | ✅ |
| Bearbeiten: Warnung, wenn die Datei auf GitHub inzwischen geändert wurde (zweiter Klick legt trotzdem an) | `direct.submit` | ✅ |
| Kein zweiter PR, wenn nach dem Senden ohne Änderung nochmal geklickt wird | `aktiv.sent` | ✅ |
| Foto-Editor: drehen (90°), zuschneiden, Bereiche grob verpixeln, Alt-Text Pflicht, Export `NN.jpg` (max. 1600 px) + `NN-600w.jpg`, ohne Metadaten | `assets/js/photo-editor.js` | ✅ (kein EXIF im Ergebnis geprüft) |
| Fester Ausschnitt für die Social-Media-Vorschau: genau 1200 × 630 → `NN-social.jpg` | `PhotoEditor.open(file, { size })` | ✅ |
| Automatische Vorschläge: QR-/Barcodes (`BarcodeDetector`), Gesichter (`FaceDetector`) | `photo-editor.js` `detect()` | ⚠️ nur wo der Browser es kann |
| **Foto-Ablage mit Verwendungen**: antippen oder ziehen → Galerie im Text, Titelbild/Foto des Geräts (+ `image_alt`), Profilfoto, Logo/Partnerkarte, Social-Media-Vorschau; die Verwendungen kommen aus den Feldern des Typs; nur Verwendetes wird hochgeladen | `direct.slots/assign/unassign/showPhotos` in `neu.js` | ✅ (Partner, Termin gegen simulierte API) |
| Fotos ziehen mit um, wenn sich der Dateiname danach ändert (alle Varianten, in allen Feldern) | `direct.submit` | ✅ |
| Bilder je Typ unter `assets/images/<bereich>/<name>/` (`IMAGE_FOLDERS`: news, kalender, projekte, ausstattung, team, partner, presse, herausforderungen); Nummer `NN` = nächste freie im Ordner auf GitHub | `direct.folder`, `direct.nextNumber` | ✅ |
| `#bearbeiten` in der Adresse, solange ✏️ offen ist; `<seite>#bearbeiten` / `#edit` öffnet das Formular | `neu.js` (`EDIT_HASH`), `_includes/edit-buttons.html` | ✅ |
| Übersicht „Offen“: offene PRs nach Check-/Merge-Status, offene Issues (übernehmbar / in Arbeit), „Übernehmen“ – nur für Verbundene (#146; Mergen von dort ist ein offener Punkt) | `assets/js/open-work.js`, `/mitmachen/offen/`, `GitHubApi.commitChecks/pullMergeState/openIssues/assignIssue` | ✅ gegen simulierte API |
| Offene PRs zur selben Markdown-Datei: Warnung im Formular mit „In #N weiterarbeiten“ (lädt den Stand aus dem PR-Branch, Speichern = Commit auf diesen Branch, `force: false`) und – nur für Verbundene – oben auf der Seite | `GitHubApi.openPullsForFile`, `direct.checkOpenPulls/pickUp`, `edit-buttons.html` | ✅ gegen simulierte API |

Neue Abhängigkeiten: **keine** – nur Browser-APIs (Canvas, Fetch, FileReader, DataTransfer). Externe Anfragen gehen nur an `api.github.com` und nur nach aktivem Verbinden (Impressum, Abschnitt Datenschutz).

## Wie es funktioniert (zum Weitermachen)

- **`assets/js/github-api.js`** (`GitHubApi`): Token in `sessionStorage`/`localStorage` (Schlüssel `ifsmb-github-token`), `whoAmI()` (Login + Schreibrechte), `readFile(path, ref)`, `listFolder(folder, ref)`, `openPullsForFile(path)`, `createPullRequest({ title, body, files, branchHint, onStep, pr })` – mit `pr` geht der Commit auf den Branch eines offenen PRs.
- **`assets/js/photo-editor.js`** (`PhotoEditor.open(file, opts)`): eigener Dialog `#photo-editor`; Zustand `state` (Drehung, Ausschnitt, Rechtecke in Bildkoordinaten des gedrehten Bildes); `result()` = drehen → verpixeln → zuschneiden; Export über Canvas (`toBlob`, JPEG 0,82).
- **`assets/js/neu.js`**, Objekt `direct` (nach „direct pull requests“ suchen): Verbindung, Foto-Ablage (`aktiv.photos` = `{ folder, name, full, thumb, alt, preview, social }`), Verwendungen (`slots()`), Senden (`submit()`), offene PRs (`checkOpenPulls`, `pickUp`). Ohne Token greift der alte Weg in `anlegen()`.
- **`_includes/edit-buttons.html`**: öffnet bei `#bearbeiten` das Formular und zeigt verbundenen Personen offene PRs zur Seite an (nach `DOMContentLoaded`, weil `ladeSkripte` erst weiter unten im Layout definiert wird).
- **CSS**: am Ende von `assets/css/style.css` (`.photo-*`, `.media-*`, `.form-photos`, `.form-pr-notice`, `.edit-pr-warning`, `.github-*`).
- **Namen**: neuer Code englisch (Regel „Sprache“ in `CLAUDE.md`); ältere deutsche Namen (`ladeSkripte`, `neu.js`, `baueFelder`, `.neu-*`, `Formular.dialog({ klasse, titel })`) bleiben bis zu einem eigenen Aufräum-PR.

## Testen ohne echtes GitHub

**Automatisch:** `_scripts/test_e2e.sh` – Headless-Chrome gegen ein Fake-GitHub mit Steuer-API für Szenarien (andere Person committet/öffnet/mergt PRs, Token läuft ab, Fehler beim n-ten Request …); Anleitung und neue Szenarien in [`_tests/e2e/README.md`](_tests/e2e/README.md). Von Hand geht weiterhin:

Im Browser (lokaler Server) `window.fetch` für `https://api.github.com` durch eine kleine Attrappe ersetzen und `sessionStorage.setItem("ifsmb-github-token", "fake")` setzen. Die Attrappe muss beantworten: `GET /user`, `GET /repos/<repo>` (`permissions.push`), `GET …/pulls?state=open`, `GET …/pulls/<n>/files`, `GET …/contents/…` (404 = gibt es nicht), `GET …/git/ref/heads/<branch>`, `GET …/git/commits/<sha>`, `POST …/git/blobs|trees|commits|refs`, `PATCH …/git/refs/heads/<branch>`, `POST …/pulls`. Den Dateiauswahl-Dialog umgeht man, indem man `HTMLInputElement.prototype.click` für `type=file` so ersetzt, dass es `files` per `DataTransfer` setzt und `change` auslöst. Danach Token und Entwürfe (`ifsmb-neu:*`, `ifsmb-edit:*`) wieder löschen.

## Erfahrungen aus dem ersten echten Test (PR #112)

- Token verbinden und PR anlegen klappte auf Anhieb (Partner „Zazza Moabit / Pajas Kaffee“).
- Das Foto landete aber unter `assets/images/news/…` und war **nirgends eingetragen** (Partner haben kein Textfeld) → Anlass für die Foto-Ablage mit Verwendungen; ist behoben.
- `page:` wurde mit der externen Website gefüllt – das Feld ist für eine eigene Partnerseite `/partners/<name>/`. → Hilfetext im Partner-Formular schärfen (siehe offene Punkte).
- Ein „Foto als Logo“ (wie `bietenholz.jpg`) liegt bisher flach als `assets/images/partner/<name>.jpg`; die Ablage legt neue in `assets/images/partner/<name>/NN.jpg` ab – beides funktioniert, Konvention noch festlegen.

## Anmeldung – Optionen

| | Wie | Server nötig? | Rechte | Bewertung |
|---|---|---|---|---|
| **A. Fine-grained Token** (jetzt) | Token auf GitHub erstellen, einfügen | nein | nur dieses Repo, *Contents* + *Pull requests* schreiben, Laufzeit frei wählbar | für Falko & Team ok; für Gelegenheits-Mitmachende zu umständlich |
| **B. GitHub App + Token-Tausch** (Empfehlung) | „Mit GitHub anmelden“ → zurück auf ifsmb.de, ein kleiner Dienst tauscht den Code gegen ein Token | ja, winzig (ca. 40 Zeilen, z. B. Cloudflare Worker unter `auth.ifsmb.de`) | nur dieses Repo; Nutzer-Tokens laufen nach 8 h ab | bequem wie Pages CMS; der Dienst kennt nur das `client_secret`, speichert nichts |
| C. OAuth App + Token-Tausch | wie B | ja | Scope `public_repo` = **alle** öffentlichen Repos der Person | zu viele Rechte – nicht empfohlen |
| D. Pages CMS weiter nutzen | – | deren Server | GitHub App von Pages CMS | bleibt parallel möglich |

**Warum nicht ganz ohne Server?** GitHub unterstützt seit Juli 2025 PKCE ([Changelog](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/)), aber der Token-Tausch (`github.com/login/oauth/access_token`) verlangt weiter das `client_secret` und erlaubt keine Anfragen aus dem Browser (kein CORS, [Diskussion](https://github.com/orgs/community/discussions/15752)); der Device-Flow geht aus dem Browser ebenfalls nicht. Sobald GitHub CORS für PKCE freischaltet, fällt der Dienst aus B weg – vorher prüfen.

Für B gilt `CLAUDE.md`: der Dienst ist eine Abhängigkeit → vorher in `DEPENDENCIES.md`, im Impressum beschreiben (er sieht die IP-Adresse beim Anmelden).

## Vergleich: Was wir bisher lokal machen vs. im Browser

| Aufgabe | Bisher (Claude, Pillow, ffmpeg, Skripte) | Im Browser | Lücke / Idee |
|---|---|---|---|
| GPS/EXIF/XMP entfernen | Pillow neu speichern | ✅ Canvas-Export enthält keine Metadaten | – (`check_geodaten.rb` prüft im PR weiter) |
| Ausrichtung (Hochkant-Handyfotos) | `exif_transpose` | ✅ Browser richtet beim Laden aus | – |
| Verkleinern auf 1600 px + `-600w` | Pillow | ✅ | – |
| Zuschneiden, drehen | von Hand im Skript | ✅ mit Maus/Finger | – |
| **Kindergesichter unkenntlich** | macOS-Vision + Kontrolle in voller Größe + von Hand | ✋ Rechtecke von Hand verpixeln; 🤖 `FaceDetector` nur in Chrome mit Flag | Modell (z. B. MediaPipe Face Detection, ~ 200 KB–1 MB, Apache-2.0) als lokale Kopie nach `DEPENDENCIES.md`-Regeln, erst beim Klick laden |
| **Autokennzeichen** | von Hand gesucht und verpixelt | ✋ von Hand | eigenes Modell nötig – vorerst von Hand + Prüfliste |
| QR-Codes, Zugangscodes | von Hand | 🤖 `BarcodeDetector` (Chrome auf macOS/Android/ChromeOS), sonst ✋ | Handschrift/Namen: weiter von Hand |
| Straßenschilder, Wohnadressen | von Hand | ✋ von Hand + Prüfliste | – |
| Alt-Texte | Claude beschreibt das Bild | ✍️ Pflichtfeld, Mensch schreibt | KI-Vorschlag nur mit externem Dienst → Datenschutz, vorerst nicht |
| **Videos** (720p, ohne Ton, Vorschaubild) | ffmpeg | ❌ | im Browser zu schwer (ffmpeg.wasm ~30 MB) → **Rohvideo hochladen, später verarbeiten**, siehe [Nächste Stufe: Videos](#nächste-stufe-videos-hochladen-und-später-verarbeiten) |
| HEIC (iPhone) | Pillow (mit Plugin) | ✅ Safari, ❌ Chrome | Hinweis im Editor ist da |
| „Makespace“ statt „Makerspace“, Inhalt prüfen | Claude/Durchsicht | Prüfliste im PR | Check in `pruefen.yml` |
| Screenshots für den PR (`pr_vorschau.py`) | lokal | ❌ | Workflow, der Vorschaubilder an `web/*`-PRs hängt |
| Verbindungen pflegen (`partners`, Stichworte, `linked` auf anderen Seiten) | Claude sucht über Pagefind alle Erwähnungen und trägt sie beidseitig ein | ❌ nur in der eigenen Datei | siehe offene Punkte |

✋ = von Hand · 🤖 = automatischer Vorschlag (immer selbst prüfen) · Verpixelt wird grob (ca. 10 Blöcke über den Bereich) – nicht zurückrechenbar, anders als ein leichter Weichzeichner.

## Sicherheit

- Das Token liegt im Browser: standardmäßig `sessionStorage`, nur auf Wunsch `localStorage`. Gefahr ist Cross-Site-Scripting – deshalb **keine fremden Skripte** (OverType liegt als geprüfte Kopie im Repo).
- Fine-grained Token mit **nur diesem Repo** und kurzer Laufzeit; GitHub-App-Tokens (Option B) laufen nach 8 h ab.
- Alle Prüfungen laufen auf jedem PR weiter (`pruefen.yml`: Galerien, Geodaten, Formulare, uuids).

## Nächste Stufe: Videos hochladen und später verarbeiten

Idee (Falko, 18.11.2026): Im Formular darf man **Rohvideos hochladen**. Verarbeitet werden sie später – lokal mit Claude Code bzw. einem kleinen **Verarbeiter, der im Hintergrund läuft** – so wie bisher von Hand: 720p, ohne Ton, ohne Metadaten, Vorschaubild, Sichtprüfung.

### Das Problem: das Repository ist öffentlich

Ein Rohvideo darf **nie** im öffentlichen Repository landen – auch nicht kurz auf einem Branch, denn die Git-Historie bleibt sichtbar:

- Handyvideos enthalten oft **Standortdaten** (MP4-Metadaten), **Stimmen** und **Gesichter von Kindern** – genau das, was wir bei Fotos vorher entfernen.
- Sie sind groß (4K, 50–500 MB). Git-Dateien über 100 MB lehnt GitHub ab, und jedes Video bliebe für immer in der Historie.

Die Rohvideos brauchen also einen **privaten Eingang (Inbox)**; ins öffentliche Repository kommt nur das fertige, geprüfte Ergebnis.

### Optionen für die Inbox

| | Wie | Grenzen | Bewertung |
|---|---|---|---|
| **A. Privates Repository** `ifsmb-inbox` | Formular lädt das Rohvideo als Blob auf einen Branch `inbox/<id>` dort (gleiche Git-Data-API wie heute); das Token bekommt Zugriff auf beide Repos | max. 100 MB pro Datei; Rohdaten stecken in der Historie des privaten Repos → nach dem Verarbeiten Branch löschen | geht sofort mit dem vorhandenen Code |
| **B. Release-Assets im privaten Repository** | pro Video ein Asset an einem Release `inbox` (bis 2 GB, ohne Git-Historie, einzeln löschbar) | Upload geht an `uploads.github.com` – ob das aus dem Browser (CORS) klappt, **prüfen** | sauberer, falls der Browser-Upload geht |
| **C. Eigener Speicher** (z. B. Objektspeicher) | der Dienst aus „Anmeldung B“ gibt eine einmalige Upload-Adresse aus | neue Abhängigkeit, Kosten, Impressum | erst zusammen mit Anmeldung B sinnvoll |

Empfehlung: **B prüfen**, sonst **A** (für Videos bis 100 MB, längere vorher am Handy kürzen).

### Ablauf

1. Formular: **🎬 Video hinzufügen** → Rohvideo geht in die Inbox, zusammen mit einer kleinen Beschreibung (JSON): Ziel-PR/Branch, Zielpfad `assets/video/<bereich>/<name>/NN.mp4`, Beschreibung, wer es hochgeladen hat.
2. Im Beitrag steht sofort `![Beschreibung](/assets/video/<bereich>/<name>/NN.mp4)` als eigener Absatz. Solange das Video fehlt, meldet `check_site.rb` den Pfad als tot → **der PR bleibt rot**, bis das Video verarbeitet ist. Das ist gewollt: so wird nichts halb gemergt.
3. **Verarbeiter** `_scripts/process_videos.py` (lokal auf Falkos Rechner – von Hand, per Claude Code oder regelmäßig über `launchd`/cron):
   - offene Einträge in der Inbox holen, Rohvideo herunterladen
   - `ffmpeg … -vf scale=-2:720 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart -map_metadata -1` (Hochkant: 720 × 1280), Vorschaubild `NN.jpg`
   - **Kontaktbogen** (z. B. 1 Bild pro Sekunde) erzeugen – Claude oder ein Mensch schaut ihn auf Kindergesichter, Kennzeichen, Namen durch; im Zweifel zuschneiden, kürzen oder ablehnen
   - Ergebnis per Commit auf den PR-Branch, Kommentar im PR („Video verarbeitet: 720p, 1,5 MB, ohne Ton“), Rohvideo in der Inbox löschen
4. Danach ist der PR grün und kann wie gewohnt durchgesehen und gemergt werden.

**Warum lokal und nicht als GitHub Action?** ffmpeg gäbe es auch auf den Action-Runnern (im privaten Inbox-Repo), aber die Sichtprüfung auf Kinder braucht einen Menschen oder Claude – und die Rohdaten blieben in Logs/Artefakten von GitHub. Eine Action könnte höchstens vorverarbeiten (verkleinern, Ton weg, Kontaktbogen) und den Rest lokal lassen.

### Offen

- Gesichter in Videos verpixeln ist viel schwerer als bei Fotos (jedes Bild, Bewegung). Vorerst gilt: Videos mit erkennbaren Kindern nur gekürzt/zugeschnitten so, dass niemand erkennbar ist – sonst nicht veröffentlichen.
- Ton immer entfernen (Stimmen); falls einmal Ton gewünscht ist, nur nach ausdrücklicher Prüfung.
- Impressum (Datenschutz) und `DEPENDENCIES.md` (ffmpeg-Version für den Verarbeiter) ergänzen, bevor es losgeht.
- Größen-/Längenlimit im Formular anzeigen (z. B. „max. 100 MB, am besten unter 1 Minute“).

## Offene Punkte

Sortiert nach Wichtigkeit. ⭐ = als Nächstes sinnvoll.

### Sicherheit & Betrieb

1. ⭐ **Branch-Schutz für `main`** (PR + grüne Checks Pflicht) – dann kann auch ein geleaktes Token nichts direkt live schalten.
2. ⭐ **`web/*`-Branches automatisch löschen** nach dem Merge (Repo-Einstellung „Automatically delete head branches“) – sonst sammeln sie sich (z. B. `web/falkorichter-zazza-…` von #112 liegt noch auf GitHub).
3. Content-Security-Policy per `<meta>` (`connect-src 'self' https://api.github.com`, keine fremden Skripte) – vorher prüfen, dass Karte (OpenStreetMap nach Klick) und Pagefind weiter gehen.
4. **Anmeldung B** (GitHub App + Token-Tausch-Dienst) entscheiden und bauen; `DEPENDENCIES.md`, Impressum.
5. ~~Pull Requests aus **Forks** für Leute ohne Schreibrechte~~ – umgesetzt (#186): ohne Schreibrechte legt das Formular einen eigenen Fork an (oder nimmt den vorhandenen und gleicht ihn per `merge-upstream` ab), baut den Commit auf dem aktuellen Stand des Repositories und öffnet den PR aus `login:branch`. Mit einem fine-grained Token verweigert GitHub diesen PR per API – dann bekommt man den Link auf GitHubs Vergleichsseite („Create pull request“). Collaborators ohne Owner-Rechte brauchen einen klassischen Token (`public_repo`), fine-grained Tokens gibt es für fremde persönliche Repositories nicht. Offen: „In #N mitschicken“ für Fork-PRs (Push in fremde Fork-Branches).

### Fotos

6. ⭐ **Fotos im Entwurf** (IndexedDB) – nach Neuladen sind sie bisher weg, nur die Zeilen im Text bleiben.
7. **Bestehende Bilder neu zuordnen** (z. B. ein Galeriefoto als Social-Media-Vorschau) – die Ablage kennt nur neue Fotos. Idee: Bilder aus Text und Feldern der Seite als Karten ohne Blob in die Ablage aufnehmen.
8. **`gallery:`-Listen im Front Matter** (Geräte, Termine) befüllen – bisher gehen Galerien als Markdown in den Text. Dazu müsste `editedText` Listen aus Objekten schreiben können (heute „bitte auf GitHub bearbeiten“).
9. **PNG/Transparenz für Logos** – der Editor speichert immer JPEG. Für echte Logos: PNG behalten (ohne Metadaten neu speichern), kein Verpixeln nötig.
10. **Konvention für Partnerbilder** festlegen: flach `partner/<name>.jpg` (bisher) oder Ordner `partner/<name>/NN.jpg` (Ablage). Eventuell eigenes Feld für ein Foto statt Logo, damit `logo` wirklich das Logo bleibt.
11. Galerie-Position: neue Fotos kommen ans Textende (bzw. in die letzte Galerie) – Einfügen an der Cursor-Position wäre schöner.
12. Automatische **Gesichtserkennung** als optionales lokales Modell (Größe, Lizenz, Treffer bei Kindern im Profil/Hinterkopf); Kennzeichen weiter von Hand.
13. **Videos hochladen und im Hintergrund verarbeiten** – eigener Abschnitt [Nächste Stufe: Videos](#nächste-stufe-videos-hochladen-und-später-verarbeiten).

### Offene PRs & Zusammenarbeit

Alle Konfliktfälle mit Soll-Verhalten und Stand der Umsetzung: [`EDITING_CONFLICTS.md`](EDITING_CONFLICTS.md); Tests: `_tests/e2e/conflicts.test.js`.


14. ✅ (PR #118) Nach dem Senden **weitere Änderungen in denselben PR** schreiben (heute: ohne Änderung → „Schon gesendet“, mit Änderung → neuer PR). Idee: nach Erfolg `aktiv.prBase` auf den neuen PR setzen.
15. `openPullsForFile` fragt bis zu 30 offene PRs einzeln ab – bei vielen offenen PRs auf GraphQL umstellen (eine Anfrage).
16. Hinweis „Diese Seite wird gerade bearbeitet“ für **alle** Besucher*innen (nicht nur Verbundene) – ginge ohne Anfragen aus dem Browser nur über eine Action, die bei PR-Ereignissen eine kleine JSON-Datei veröffentlicht. Abwägen (Lärm im Repo vs. Nutzen).
17. ✅ (PR #118: neu holen, zusammenführen, max. 3×) Wenn der PR-Branch inzwischen weiter ist, scheitert „In #N weiterarbeiten“ mit einer GitHub-Meldung – freundlicher erklären und neu laden anbieten.
18. ✅ (PR #118) Fehlermeldungen von GitHub (Rate-Limit, abgelaufenes Token) in verständliches Deutsch übersetzen.

### Formulare & Inhalte

19. ✅ (PR #118) Hilfetext im Partner-Formular: `page` = eigene Partnerseite `/partners/<name>/`, nicht die Website (Fehler aus #112).
20. **Verbindungen auf anderen Seiten** mitpflegen (z. B. beim neuen Partner die Termine/Projekte mit `partners:` ergänzen, Stichwort anlegen) – heute macht das Claude nach Suche über Pagefind. Idee: nach dem Anlegen Vorschläge aus der Suche anzeigen („Diese Seiten erwähnen Zazza – verbinden?“) und die Änderungen mit in den Commit nehmen.
21. Neue Stichworte bekommen keinen Anzeigenamen in `_data/tags.yml` – im Formular mit anbieten.
22. Todo-Editor (`todos.js`) nutzt noch Kopieren → GitHub – auf `GitHubApi.createPullRequest` umstellen.
23. Check „Makespace statt Makerspace“ und fremde E-Mail-Adressen in `pruefen.yml`.
24. Vorschaubilder (`pr_vorschau.py`) automatisch an `web/*`-PRs hängen (Workflow).

### Aufräumen

25. Ältere deutsche Bezeichner (`ladeSkripte`, `neu.js`, `formular.js`, `baueFelder`, `.neu-*`, `Formular.dialog({ klasse, titel })` …) in einem eigenen PR auf Englisch umstellen (Regel „Sprache“ in `CLAUDE.md`).
26. `CHANGELOG.md`: `[Unreleased]` sammelt seit dem 13.11. – beim nächsten Push nach `main` in einen Tagesabschnitt umwandeln (Regel in `CLAUDE.md`).
