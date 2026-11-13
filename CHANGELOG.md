# Changelog

Alle nennenswerten Änderungen an den **Funktionen** von ifsmb.de stehen in dieser Datei. Neue oder geänderte Inhalte (Beiträge, Termine, Projekte, Profile, Geräte, Partner, Pressemitteilungen, Textseiten) stehen hier nicht – was wann dazukam, zeigen das [Netzwerk](https://ifsmb.de/netzwerk/) und seine Zeitleiste.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/). Die Seite hat keine Versionsnummern: Jeder Abschnitt ist ein Tag, an dem Änderungen live gegangen sind (Datum im Format JJJJ-MM-TT).

## [Unreleased]

### Hinzugefügt

- Ausstattung: zwei **Fabmaker**-Drucker an der KTG (gehören Falko, einer ist ein Geschenk vom Rosalind-Franklin-Gymnasium) mit Foto und Link zum Rettungs-Repository.
- Herausforderung für Falko und Anton: den Windows-Slicer der Fabmaker mit Claude Code oder OpenCode zurückentwickeln, damit die Drucker auch vom Mac und aus dem Browser drucken.

## [2026-11-13]

### Hinzugefügt

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

- Bilder und Links in RSS-Beiträgen funktionieren jetzt auch in Feed-Readern, die relative Adressen nicht auflösen, und jeder Beitrag nennt seine Autor*innen.
- iCal: Termine, bei denen nur Monat oder Jahr feststeht (`date_label`), erscheinen im Kalender nicht mehr als Eintrag über den ganzen Monat (Google zeigte „Day 1/31“ … „Day 31/31“), sondern als ein ganztägiger Termin am Monatsersten mit „TBD: “ vor dem Titel; der Text aus `date_label` steht in der Beschreibung.
- Bearbeiten-Leiste kompakter: Der ✏️-Button zeigt jetzt den Pfad der Quelldatei statt „Diese Seite bearbeiten“, die ➕-Buttons stehen ohne „Neu anlegen:“ in derselben Zeile.
- Changelog enthält nur noch Funktionen der Website, keine Inhalte mehr – die zeigt das Netzwerk mit seiner Zeitleiste. Bisherige Inhalts-Einträge entfernt.

### Behoben

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
