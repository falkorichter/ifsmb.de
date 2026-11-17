# Changelog

Alle nennenswerten Änderungen an den **Funktionen** von ifsmb.de stehen in dieser Datei. Neue oder geänderte Inhalte (Beiträge, Termine, Projekte, Profile, Geräte, Partner, Pressemitteilungen, Textseiten) stehen hier nicht – was wann dazukam, zeigen das [Netzwerk](https://ifsmb.de/netzwerk/) und seine Zeitleiste.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/). Die Seite hat keine Versionsnummern: Jeder Abschnitt ist ein Tag, an dem Änderungen live gegangen sind (Datum im Format JJJJ-MM-TT).

## [Unreleased]

### Hinzugefügt

- **Dokumentation im Footer verlinkt:** „Zum Mitmachen: Changelog · Datenstrukturen · Abhängigkeiten“ führt auf jeder Seite zu `CHANGELOG.md`, `DATA_STRUCTURES.md` und `DEPENDENCIES.md` auf GitHub (die Dateien selbst werden nicht als Seiten veröffentlicht).
- **`DEPENDENCIES.md` – Liste aller Abhängigkeiten:** Bibliotheken im Browser (OverType 2.9.0, Pagefind 1.5.2), Build (Ruby, Jekyll, GitHub Actions), Tests (Node) und lokale Werkzeuge (Python/Pillow, Chrome, OpenSCAD) – jeweils mit genauer Version, Herkunft, Lizenz, Prüfungen, Aktualisieren und Entfernen, dazu offene Punkte (`Gemfile.lock` nicht eingecheckt, Actions nur mit Major-Tag, Node-Version nicht festgelegt). Neuer Abschnitt „Abhängigkeiten“ in `CLAUDE.md`: Was dort nicht steht, wird nicht benutzt.
- **Slogans als Datendatei:** Die wechselnden Slogans der Startseite stehen jetzt in `_data/slogans.yml` (ein Textblock pro Slogan: jede Zeile eine Zeile, `**fett**` wird gelb hervorgehoben – an beliebiger Stelle) und lassen sich auch in Pages CMS bearbeiten – ein neuer Slogan ist ein neuer Eintrag, kein Basteln mehr am HTML-Attribut.
- **Ein Pull Request pro Sitzung:** `CLAUDE.md` legt fest, dass jede Arbeitssitzung in einem eigenen Worktree auf einem neuen Branch beginnt und ihre Änderungen sofort als (Draft-)Pull Request sichert – damit nichts verloren geht, wenn Worktrees oder Sitzungen liegen bleiben.
- **Herausforderungen in der Eisenhower-Matrix:** Auf [/herausforderungen/](https://ifsmb.de/herausforderungen/) stehen die offenen Herausforderungen jetzt in einer Eisenhower-Matrix (🔥 Sofort erledigen, 📌 Einplanen, 🤝 Abgeben, 💤 Später) statt als Kartenliste – eingeordnet über die neuen Felder `wichtig` und `dringend` (fehlt eins, zählt es als „nein“). Jedes Feld hat einen kleinen ➕-Knopf, der das Formular mit passend gesetzten Haken öffnet. Die Felder gibt es auch im ➕-/✏️-Formular, in Pages CMS (`.pages.yml`) und in der Vorlage; jede offene Herausforderung zeigt ihr Feld zusätzlich als Abzeichen. Die Todos und ihre eigene Matrix bleiben unverändert.
- **Markdown-Editor in den Formularen:** Die Textfelder („Text (Markdown)“, „Lösung“) der ➕- und ✏️-Formulare sind jetzt ein Editor mit Hervorhebung (Überschriften, Links, Code, Fett …) und Werkzeugleiste auf Deutsch (Fett, Kursiv, Durchgestrichen, Unterstrichen, Code, Link, Überschriften, Listen, Zitat, Vorschau) – mit den gewohnten Tastenkürzeln, u. a. ⌘B/Strg+B fett, ⌘I kursiv, ⇧⌘X durchgestrichen (`~~ ~~`), ⌘U unterstrichen (`<u>…</u>`, Markdown kennt kein Unterstreichen), ⌘K Link; die Kürzel stehen im Tooltip der Knöpfe. Die Leiste bricht um, statt seitlich zu scrollen. Tastenkürzel lassen sich in Beiträgen mit `<kbd>` als Tasten darstellen. Die Werkzeugleiste lässt sich mit „🛠️ Werkzeugleiste“ ausblenden – auf dem Handy ist sie anfangs aus; die Wahl merkt sich der Browser. Der Editor ist [OverType](https://github.com/panphora/overtype) **Version 2.9.0** (npm `overtype@2.9.0` vom 14.11.2026, Datei `dist/overtype.min.js`, MIT-Lizenz), als unveränderte Kopie in `assets/js/third-party/overtype/` (SHA-256 und Anleitung zum Aktualisieren in der `README.md` dort) – er lädt nichts von außen und erst, wenn ein Formular aufgeht; ohne ihn bleibt das normale Textfeld.
- **IfsMB-Badge zum 3D-Drucken:** Das Logo-Badge als OpenSCAD-Modell (`_logo/badge/`) – gelbe Grundplatte, Rand, Schriftzug und Schatten schwarz erhaben, also nur **ein Farbwechsel** (bei 1,4 mm); optional mit Namen, der im verlängerten Schatten gelb ausgespart ist. Downloads als 3MF (zwei eingefärbte Objekte für AMS/MMU), STL (Farbwechsel per Pause) und OBJ in `assets/badge/`, Liste in `_data/badges.yml`. Auf `/presse/#badge` mit Druckanleitung und allen Badges, im Teamprofil das eigene – jeweils als **drehbares 3D-Modell** (`assets/js/badge3d.js`, WebGL ohne Bibliothek und ohne externe Ressourcen; ziehen zum Drehen, steht bei „Bewegung reduzieren“ still, ohne JS bleibt ein Vorschaubild).
- **✏️ Bearbeiten im Formular:** Auf Beiträgen, Terminen, Projekten, Geräten, Herausforderungen, Teamprofilen und Pressemitteilungen öffnet der ✏️-Button jetzt dasselbe Fenster wie die ➕-Buttons – gefüllt mit den Werten der Seite. Geschrieben werden nur die geänderten Zeilen (in der Vorschau gelb markiert); alles andere in der Datei – Galerien, Links, Kommentare, Formatierung – bleibt genau so, wie es war. „📋 Auf GitHub speichern“ kopiert die geänderte Datei und öffnet sie im GitHub-Editor (dort einfügen → Pull Request). Daneben führt ein kleines GitHub-Logo mit dem Dateipfad direkt zur Datei auf GitHub. Die Quelltexte liegen dafür unter `/source/` auf der eigenen Domain; Tests prüfen, dass jede bestehende Seite beim Öffnen und Speichern ohne Änderung unverändert bleibt.
- **Personen mit eigener Seite ohne Eintrag auf `/team/` (`nicht_im_team: true`):** Profile in `_team/` mit `nicht_im_team: true` haben eine eigene Seite unter `/team/<name>/` und lassen sich überall wie gewohnt verlinken (`team`, `author`, `owner_team`, `verlinkt`, Netzwerk, Autovervollständigung), werden aber nicht in der Team-Übersicht auf `/team/` aufgelistet. Auch in Pages CMS (`.pages.yml`), der Vorlage und dem „➕ Teamprofil“-Formular.
- **Social-Media-Vorschau (Open Graph & Twitter/X Cards) auf allen Seiten und im CMS:** Jede Seite bindet jetzt `og:image` (1200 × 630 px) und `twitter:card` (`summary_large_image`) ein – automatisch mit dem ersten Foto der Seite (Titelbild, Profilfoto, Galerie oder erstes Foto im Text) oder dem neuen Standardbild `/assets/images/og-preview.jpg`. Über das Feld `social_media_preview_image` lässt sich in Pages CMS (`.pages.yml`), in den Vorlagen und in den ➕-Formularen auf der Website für jede Seite ein eigenes Vorschaubild setzen; die ➕-Formulare zeigen rechts außerdem live eine Social-Media-Vorschaukarte (wie bei WhatsApp, Signal, Mastodon oder LinkedIn), und `_logo/social-preview.html` zeigt die Karten im Vergleich.
- **Geokoordinaten-Prüfung für Fotos:** `_scripts/check_geodaten.rb` (auch eingebunden in `check_site.rb`, `pruefen.yml` und `pages.yml`) prüft alle Bilder unter `assets/` auf eingebettete EXIF-GPS- und XMP-Geodaten und bricht Pull Requests und das Deployment ab, falls Fotos noch Standortkoordinaten enthalten.
- **Gelesen-Markierung:** Wer eine Seite geöffnet hat, sieht Links dorthin danach mit einem kleinen ✓ – in Listen, auf Projektkarten, bei „Verbindungen“ und im Text. Neuigkeiten und Projekte zeigen oben, wie viele schon gelesen sind („3 von 28 gelesen“). Gespeichert wird nur im eigenen Browser (localStorage, kein Cookie, nichts wird übertragen); im Impressum unter Datenschutz beschrieben, dort lassen sich die Markierungen auch löschen.
- Jede Inhaltsseite hat dafür eine feste Kennung `uuid` im Front Matter, die auch beim Umbenennen der Datei gleich bleibt. Formulare und Vorlagen der ➕-Buttons erzeugen sie automatisch; `_scripts/uuids_ergaenzen.rb` ergänzt fehlende (z. B. bei Seiten aus Pages CMS) und meldet doppelte – doppelte stoppen Pull Requests und Deployment.

### Geändert

- **uuid ist Pflicht für jeden Pull Request:** `_scripts/uuids_ergaenzen.rb --pruefen` lässt den Workflow „Prüfen“ jetzt auch bei *fehlenden* uuids scheitern und schlägt für jede eine fertige `uuid:`-Zeile vor (das Deployment warnt nur). Alle Wege, eine Seite anzulegen, erzeugen eine zufällige uuid: Pages CMS über das Feld `type: uuid`, die Vorlagen-Links auch ohne `crypto.randomUUID` und bei jedem Klick neu (vorher konnte „UUID-NEU“ stehen bleiben oder zweimal dieselbe uuid entstehen), und das ✏️-Formular ergänzt beim Speichern eine fehlende. Tests in `_scripts/test_formulare.rb` sichern das ab; die zwei Beiträge ohne uuid haben eine bekommen.
- **Englische Namen im Code von Badge und ✏️-Formular** (nach der neuen Regel): die Quelltexte für das ✏️-Formular liegen jetzt unter `/source/` statt `/quelltext/` (`_plugins/source_files.rb`), `_includes/edit-buttons.html`, `_scripts/edit_examples.js`, im Badge-Ordner `export_colored.py`, `wordmark_from_svg.py`, `ifsmb-wordmark.scad` (Parameter `width`, `part = "all"/"yellow"/"black"`); Bezeichner und Kommentare in `badge3d.js`, den Badge-Skripten und dem ✏️-Teil von `neu.js`/`formular.js` englisch. Für Besucher*innen ändert sich nichts; die erzeugten Badge-Dateien sind byte-gleich.
- `DATENSTRUKTUR.md` heißt jetzt **`DATA_STRUCTURES.md`** (Dateinamen sind englisch, der Inhalt bleibt vorerst deutsch).
- **Regel in `CLAUDE.md`:** Quellcode ist Englisch – auch Ordner- und Dateinamen und Bezeichner, nicht nur Kommentare; deutsch (oder in anderen Sprachen) heißen nur Inhalte. Neuer Code nach dieser Regel, ältere deutsche Namen werden separat aufgeräumt.


## [2026-11-13]

### Hinzugefügt

- **Formulare für alle ➕-Buttons:** Beitrag, Termin, Projekt, vergangenes Projekt, Gerät, Herausforderung, Teamprofil, Pressemitteilung, Partner und „Wir in der Presse“ öffnen jetzt ein Fenster direkt auf der Seite – wie der Todo-Editor, mit Auswahllisten, runden Personenbildern und Autovervollständigung für Personen, Projekte, Stichworte, Partner und Seiten. Rechts steht live die fertige Datei; Dateiname, Stichwort des Projekts und Terminende füllen sich von selbst. Der Entwurf bleibt im Browser, bis er abgeschickt ist. „📋 Auf GitHub anlegen“ kopiert die Datei und öffnet GitHub mit fertigem Inhalt (→ Pull Request). Die Vorlage mit allen Feldern gibt es weiter über den Link oben im Fenster oder mit Strg/⌘-Klick.
- Automatische Tests (`_scripts/test_formulare.rb`, laufen bei jedem Pull Request und vor dem Deployment): Jede Datei, die ein Formular schreiben kann, muss als YAML lesbar sein, nur Felder der Vorlage nutzen und zu Pages CMS passen; Todo-Dateien müssen beim Lesen und Schreiben unverändert bleiben.

- **Netzwerk:** Todos erscheinen als kleine grüne Punkte 📋 – verbunden mit der hauptzuständigen Person („gehört“), den helfenden Händen, ihren Projekten und verknüpften Seiten; ein Klick führt direkt zur Karte in der Eisenhower-Matrix. Herausforderungen sind jetzt ebenfalls kleine Punkte.
- „📋 Todos zum Projekt“ auf jeder Projektseite und „📋 Todos von …“ in jedem Teamprofil: öffnet die Eisenhower-Matrix mit Editor direkt auf der Seite, ohne zu `/todos/` zu wechseln. Auf Projektseiten erscheinen nur die Todos dieses Projekts – von allen Personen –, und ein neues Todo gehört gleich zum Projekt. Das Programm wird erst beim Klick geladen. Sind mehrere Tabs offen, übernehmen sie die Änderungen der anderen, statt sie zu überschreiben – auch Speicherleiste und Diff-Fenster: Wird in einem Tab gespeichert oder verworfen, verschwindet der Hinweis im anderen spätestens nach einer Sekunde.
- Ausstattung: zwei **Fabmaker**-Drucker an der KTG (gehören Falko, einer ist ein Geschenk vom Rosalind-Franklin-Gymnasium) mit Foto und Link zum Rettungs-Repository.
- Todo für Falko (mit Anton): den Windows-Slicer der Fabmaker mit Claude Code oder OpenCode zurückentwickeln, damit die Drucker auch vom Mac und aus dem Browser drucken.
- **Todos** (`/todos/`, Experiment neben den Herausforderungen, von `/herausforderungen/` verlinkt): Herausforderungen pro Person in einer eigenen Markdown-Datei `todos/todo-<person>.md`, angezeigt als Eisenhower-Matrix (🔥 Sofort erledigen, 📌 Einplanen, 🤝 Abgeben, 💤 Später, ✅ Erledigt). Die kleinen Karten lassen sich innerhalb eines Feldes und zwischen den Feldern verschieben – mit der Maus, am Griff ⠿ mit dem Finger oder mit den Pfeiltasten. Ein Klick öffnet ein Fenster mit der Matrix links und dem Editor rechts: Titel, Art, Status, Fälligkeit, hauptzuständige Person (Übergeben verschiebt die Karte in deren Datei), 🙌 helfende Hände als runde Bilder, Projekte, Stichworte und verknüpfte Seiten mit Autovervollständigung aus dem Suchindex. Jede Änderung wird sofort im Browser gespeichert; „🔀 Ansehen & Pull Request“ zeigt die Änderungen als Diff, kopiert die neue Datei und öffnet den GitHub-Editor.
- **Herausforderungen** (`/herausforderungen/`, unter „Wir“): Aufgaben, Probleme und offene Fragen, die kleiner sind als ein Projekt. Jede gehört zu einem oder mehreren Projekten (`projekte` oder über das `event_tag`), hat eine oder mehrere Zuständige (`team`), einen Status (offen, in Arbeit, gelöst – mit Feld für die Lösung) und lässt sich mit `verlinkt` mit Terminen, Geräten, Beiträgen oder Partnerseiten verbinden. Projektseiten zeigen ihre Herausforderungen als Karten, Projektkarten zählen die offenen (🧗), Teamprofile listen die eigenen, alle anderen Seiten zeigen sie unten bei „Verbindungen“. Auch im Netzwerk, in der Suche, bei den Stichworten und in Pages CMS.
- „➕ Herausforderung“ auf Projekt-, Termin-, Geräte- und Partnerseiten, auf Teamprofilen und auf `/herausforderungen/` – mit Projekt, Zuständigen bzw. Verbindung schon eingetragen.
- RSS-Feeds zum Folgen im Feed-Reader: Neben den Neuigkeiten des Instituts gibt es jetzt eigene Feeds für jedes Projekt (Beiträge und kurze Updates aus „Stand / Updates“), für jede Person aus dem Team (alle ihre Beiträge) und für die persönlichen Blogs. Der Button „📡 RSS-Feed“ auf `/news/`, neben „Stand / Updates“ auf Projektseiten und im Teamprofil öffnet – wie beim Kalender – ein Fenster mit der Feed-Adresse zum Kopieren und Buttons für den Feed-Reader auf dem Gerät, Feedly und Inoreader. Browser und Feed-Reader finden die Feeds auf Projekt- und Teamseiten auch automatisch.
- Jeder Termin hat oben neben Datum und Uhrzeit einen Link „📅 iCal“, der nur diesen einen Termin als `.ics` herunterlädt – zum Übernehmen in den eigenen Kalender, ohne den ganzen Kalender zu abonnieren.
- Kalender-Fenster mit Google-Button überall, wo es Termine gibt: „📅 Abonnieren“ neben „Kommende Termine“ (`/kalender/`) und neben den Termin-Überschriften von Projekten, Teamprofilen und Partnerseiten, „📅 In den Kalender“ oben auf jeder Terminseite. Das Fenster bietet „Apple Kalender & Outlook“ (öffnet das Abo bzw. den Termin direkt im Kalender-Programm), „Google Kalender“ (fragt bei Google, ob der Kalender hinzugefügt werden soll, bzw. öffnet einen ausgefüllten neuen Termin) und den Download der iCal-Datei, mit kurzer Anleitung. `<seite>#abonnieren` öffnet das Fenster direkt.
- Eigene iCal-Feeds für Projekte, Teamprofile und Partnerseiten: Der Button „📅 iCal“ neben der Überschrift „Termine“ bzw. „Termine & Berichte“ enthält genau die Termine dieser Seite, auch die vergangenen. So kann man ein Projekt verfolgen oder nur Falkos Termine abonnieren, ohne den ganzen Kalender des Instituts.
- „➕ Partner“ auf `/partner/` und „➕ Wir in der Presse“ auf `/presse/`: Partner und Presseberichte können jetzt auch als eigene Datei angelegt werden (`_data/partner/<name>.yml`, `_data/pressebericht/<name>.yml`) – ein kleines Plugin hängt sie an die Listen an, Presseberichte nach Datum einsortiert. So gibt es auch dafür Vorlagen mit allen Feldern.
- „➕ Vergangenes Projekt“ im Archiv (`/projekte/archiv/`): Vorlage für ein abgeschlossenes Projekt mit `status: abgeschlossen`, Beispiel-Startdatum in der Vergangenheit und Gliederung „Worum ging es?“, „Was wir gemacht haben“, „Was daraus geworden ist“.
- „Neu anlegen“-Buttons neben „Diese Seite bearbeiten“: öffnen auf GitHub eine neue Datei mit einer Vorlage, in der alle möglichen Felder mit Erklärung stehen und die Verbindung zur aktuellen Seite schon eingetragen ist – z. B. auf einem Teamprofil Beitrag, Projekt, Termin und Gerät dieser Person, auf einer Projektseite Beitrag, Termin, Teilprojekt und Gerät, auf einer Partnerseite Projekt, Termin und Gerät des Partners, auf /team/ ein neues Teamprofil. Das heutige Datum wird beim Klick eingesetzt.
- Karte `/karte/` (unter „Wir“ und vom Netzwerk aus verlinkt): unsere Orte auf OpenStreetMap mit allen Projekten, Terminen (kommende markiert), Beiträgen und Geräten dort. Die Kartenbilder kommen erst nach Klick auf „Karte laden“; die Liste der Orte funktioniert auch ohne. Orte stehen in `_data/orte.yml`, Seiten finden ihren Ort automatisch oder über `orte: [...]`. Impressum (Datenschutz) ergänzt.
- Beiträge mit `nur_projekt: true` erscheinen nicht unter Neuigkeiten, auf der Startseite und im RSS-Feed, sondern nur auf der Projektseite – für kleine Projekt-Updates.
- Weiterleitungen für gelöschte Seiten (`layout: weiterleitung`), damit alte Links weiter funktionieren.
- Verbindungen auch zu normalen Seiten (`verlinkt`), unten als Gruppe „Seiten“.
- Teamprofile: Bildnachweis für Profilfotos (`photo_credit`), erscheint unter dem Namen.

### Geändert

- Todo-Editor und die neuen Formulare teilen sich dieselben Bausteine (`assets/js/formular.js`); ein Klick neben das Fenster schließt es nur noch, wenn er dort auch angefangen hat (Text markieren schließt nicht mehr aus Versehen).
- Herausforderungen und Todos sind jetzt zwei getrennte Dinge: Unter Herausforderungen sammeln und dokumentieren wir, was es zu lösen gibt (Bestandsaufnahme); Todos sind das, was jemand konkret anpackt. Texte auf beiden Seiten angepasst.
- Die bisherigen Herausforderungen sind jetzt Todos in der Eisenhower-Matrix auf `/todos/`. Die alten Adressen `/herausforderungen/<name>/` leiten direkt auf die geöffnete Karte weiter (`/todos/#<person>/<id>`). Der Link-Check behandelt `#…` auf `/todos/` als Route der App, nicht als Anker.
- Bilder und Links in RSS-Beiträgen funktionieren jetzt auch in Feed-Readern, die relative Adressen nicht auflösen, und jeder Beitrag nennt seine Autor*innen.
- iCal: Termine, bei denen nur Monat oder Jahr feststeht (`date_label`), erscheinen im Kalender nicht mehr als Eintrag über den ganzen Monat (Google zeigte „Day 1/31“ … „Day 31/31“), sondern als ein ganztägiger Termin am Monatsersten mit „TBD: “ vor dem Titel; der Text aus `date_label` steht in der Beschreibung.
- Bearbeiten-Leiste kompakter: Der ✏️-Button zeigt jetzt den Pfad der Quelldatei statt „Diese Seite bearbeiten“, die ➕-Buttons stehen ohne „Neu anlegen:“ in derselben Zeile.
- Changelog enthält nur noch Funktionen der Website, keine Inhalte mehr – die zeigt das Netzwerk mit seiner Zeitleiste. Bisherige Inhalts-Einträge entfernt.

### Behoben

- Pages CMS: Geräte können jetzt auch den Status „im-test“ und „in-reparatur“ bekommen, und „Foto ist eine eigene Illustration“ lässt sich dort setzen (beides fehlte in `.pages.yml` – gefunden von den neuen Tests).
- Projekte aus der „➕ Projekt“-Vorlage verschwanden aus den Übersichten (`/projekte/`, Startseite, Archiv), weil `teil_von: []` gesetzt war – die Vorlagen lassen `teil_von` jetzt leer.
- PR-Vorschaubilder mit `--unten` funktionieren jetzt auch bei langen Seiten (Teamprofile, Projekte): vorher fehlte der Footer im Bild und der Ausschnitt zeigte den Seitenkopf.

## [2026-11-11]

### Hinzugefügt

- Zeitleiste unter dem Netzwerk (`/netzwerk/`): gestapelte Balken pro Monat für Projektstarts, Beiträge, Termine und Presse – mit „heute“-Markierung, blass gezeichneten geplanten Monaten und einer Tabellenansicht. Die Filter oben gelten auch für die Zeitleiste; ein Klick auf einen Monat hebt seine Einträge im Netzwerk hervor und listet sie rechts auf (Link mit `#zeit:JJJJ-MM`), ein ausgewählter Punkt im Netzwerk hebt umgekehrt seine Verbindungen in der Zeitleiste hervor.

## [2026-11-10]

### Hinzugefügt

- Neue Seite „Netzwerk“ (`/netzwerk/`, im Menü unter „Wir“): alle Projekte, Termine, Beiträge, Personen, Partner, Geräte und Pressemitteilungen als Netz zum Ziehen, Zoomen und Durchklicken – mit Filtern, Suche und direkten Links auf einzelne Punkte. Läuft ohne externe Bibliothek.
- Verbindungen für alle Seiten: Projekte, Termine, Beiträge, Personen, Ausstattung, Presse und Partnerseiten lassen sich mit `verlinkt` beliebig miteinander verbinden. Unten auf jeder Seite stehen alle Verbindungen in beide Richtungen als gleich gestylte Buttons (Teil von, Projekte, Termine, Beiträge, Beteiligt, Partner, Ausstattung); persönliche Inhalte sind gekennzeichnet. Partnerseiten zeigen ihre Projekte, Termine und Geräte.
- Dokumentation der Datenstruktur als ASCII-Art (`DATENSTRUKTUR.md`).
- Teilprojekte: Projekte mit `teil_von` erscheinen nicht in den Übersichten, sondern auf der Seite der übergeordneten Projekte – ein Teilprojekt kann zu mehreren Projekten gehören. Teilprojekte nennen ihre Eltern oben und unten als gut sichtbare Buttons („Dieses Projekt ist ein Teil von“).
- Verwandte Projekte (`verwandt`): Projekte verlinken sich gegenseitig, unten als Buttons „Verwandte Projekte“.
- Projektkarten (Projekte, Archiv, persönliche Projekte, Startseite) zeigen, wie aktiv ein Projekt ist: Symbole mit hochgestellten Zahlen für Teilprojekte 🧩, Termine 📅 (gelb, wenn welche anstehen), Updates 📰, Geräte 🛠️ und Beteiligte 👤 – jedes führt direkt zum passenden Abschnitt der Projektseite.
- Ausstattung: Ein Gerät kann mehrere Besitzer*innen haben (`owner_partner`, `owner_team`, `owner_name` als Listen, kombinierbar). Besitz und Standort sind besondere Verbindungen: eigene Gruppen „Gehört“ und „Standort“ unten auf der Geräteseite, Etiketten „Besitz“/„Standort“ auf Partnerseiten und eigene Linien im Netzwerk (rot = gehört, blau gestrichelt = steht bei); Standorte ohne Partner werden im Netzwerk eigene Orte. Standort jetzt auch im CMS.
- Beiträge können mehrere Autor*innen haben (`author` als Liste).
- Persönliche Termine (`persoenlich: true`): erscheinen nicht im Kalender des Instituts, nur im Teamprofil. Die Terminseite nennt die Person oben und zeigt unten ihre Karte.
- Termine können zu mehreren Projekten (`projekte`), Partnern (`partners`) und Personen gehören; die Terminseite zeigt alle unten als Buttons wie auf den Projektseiten. Projektseiten und die Partnerübersicht listen die Termine automatisch.
- Aufgabenlisten (`- [ ]` / `- [x]`) werden ohne Aufzählungspunkte angezeigt – so kann ein Projekt als Aufgaben-Tracker dienen, abhakbar über GitHub.
- Prüfung `_scripts/check_galerien.rb`: Galerien müssen Markdown sein. Neuer Workflow „Prüfen“ für Pull Requests (Galerien, Build, Link-Check); auch das Deployment stoppt bei HTML-Galerien.

### Geändert

- Bildergalerien werden jetzt in Markdown geschrieben: Bilder untereinander und darunter `{: .gallery}` – ein kleines Jekyll-Plugin macht daraus die Galerie mit Vorschaubildern und Lightbox (ein Bild wird automatisch groß, Alt-Texte sind Pflicht). Videos gehen genauso mit `![Beschreibung](video.mp4)`. Alle bestehenden Galerien sind umgestellt; die Seiten sehen aus wie vorher.
- „Netzwerk“ steht ganz oben im Menü „Wir“.

## [2026-11-09]

### Hinzugefügt

- Link-Check `_scripts/check_site.rb`: findet tote interne Links, fehlende Anker und verwaiste Seiten; läuft im Pages-Workflow und stoppt das Deployment bei Fehlern (`--extern` prüft zusätzlich externe Links).
- Dauerhaft tote externe Links werden mit 🪦 markiert und unten auf der Seite erklärt.
- Termine mit Personen verknüpfen (`team:`): Teamprofile zeigen kommende und vergangene Termine, die Terminseite zeigt „Dabei aus dem Team“.
- Kalender: Jeder Termin zeigt oben rechts die Gesichter der Beteiligten aus dem Team als kleine runde Fotos (Mini-Fotos `photo_icon`, 48 px; ohne Foto die Initialen).
- Kalender: Termine mit `nur_projekt: true` erscheinen erst nach dem Termin im öffentlichen Kalender – vorher nur auf der Projektseite. So bleibt der Kalender übersichtlich, und Beteiligte sehen interne Termine wie Ausflüge trotzdem.
- Presse: Abschnitt „Wir in der Presse“ mit Berichten anderer über uns (`_data/presseberichte.yml`).

### Geändert

- Projektseiten: „Termine & Berichte“ trennt jetzt wie der Kalender kommende und vergangene Termine; vergangene sind blasser.
- Suche lokal: Pagefind-Index bleibt beim Neubauen erhalten, `/suche/` funktioniert auch mit `jekyll serve`.

## [2026-11-08]

### Hinzugefügt

- Bearbeiten-Button: Jede Seite verlinkt ihre Quelldatei im GitHub-Editor.
- Regel für Pull Requests: zu jedem gepushten Branch ein PR mit Vorschaubildern.

### Geändert

- Navigation: „Projekt-Ideen“ im Menü „Wir“.
- Projektseite: Autor*in nur anzeigen, wenn der Beitrag `author` hat.
- Bearbeiten-Button bündig mit dem Seiteninhalt.
- Workflow: Code-Kommentare auf Englisch.

### Behoben

- Suche: Workflow prüft die Pages-Quelle, README erklärt die Ursache von #13.

## [2026-11-07]

### Hinzugefügt

- Ausstattung: Übersicht nach Gerätetyp mit Status und Standort.
- Transparenzhinweis (keine Hochschule, Behörde oder Forschungsinstitut) im Footer, auf der Angebot-Seite und im Impressum.
- Persönliche Projekte und persönliche Blogs fürs Team.
- Volltextsuche `/suche/` mit Pagefind.
- Stichworte verknüpfen Projekte, Beiträge, Termine und Geräte („Verknüpft“-Box).
- Verschleierte Telefonnummern (`.obf-tel`); Logo als SVG.
- Startseite: Slogan mit Scramble-Effekt.

### Geändert

- Navigation aufgeräumt: „Wir“ mit Projekte, Angebot, Ausstattung, Team.
- Projekt-Updates als Zeitleiste und als eigene Beiträge.
- Spenden-Button: alle sechs Emoji der Spendenseite kreisen.

### Behoben

- Build: Worktree-Ordner nicht mehr als Submodule im Repo.
- Pages-Workflow: Ruby 3.1 statt 3.1.2 (auf ubuntu-26.04 nicht verfügbar).

## [2026-11-06]

### Hinzugefügt

- Jekyll-Seite für das Institut für spontane Makespace Buildung.
- Kalender mit iCal-Feed, Presseseite und Pages CMS.

[Unreleased]: https://github.com/falkorichter/ifsmb.de/commits/main
[2026-11-13]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-13&until=2026-11-13
[2026-11-11]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-11&until=2026-11-11
[2026-11-10]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-10&until=2026-11-10
[2026-11-09]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-09&until=2026-11-09
[2026-11-08]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-08&until=2026-11-08
[2026-11-07]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-07&until=2026-11-07
[2026-11-06]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-06&until=2026-11-06
