# Changelog

Alle nennenswerten Änderungen an ifsmb.de stehen in dieser Datei.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/). Die Seite hat keine Versionsnummern: Jeder Abschnitt ist ein Tag, an dem Änderungen live gegangen sind (Datum im Format JJJJ-MM-TT).

## [Unreleased]

### Hinzugefügt

- „Neu anlegen“-Buttons unter „Diese Seite bearbeiten“: öffnen auf GitHub eine neue Datei mit einer Vorlage, in der alle möglichen Felder mit Erklärung stehen und die Verbindung zur aktuellen Seite schon eingetragen ist – z. B. auf einem Teamprofil Beitrag, Projekt, Termin und Gerät dieser Person, auf einer Projektseite Beitrag, Termin, Teilprojekt und Gerät, auf einer Partnerseite Projekt, Termin und Gerät des Partners, auf /team/ ein neues Teamprofil. Das heutige Datum wird beim Klick eingesetzt.
- Beitrag aus der KTG-AG: Der Snapmaker U1 ist nach den Herbstferien per Lastenrad zurück – mit einer Druckplatte voller Hamster, Zeitraffer und den vermurksten Exemplaren zum Analysieren.
- Persönlicher Beitrag zum KI-Server: Ein Raspberry Pi 4 soll als Proxy den stromhungrigen Server schlafen legen und bei Anfragen aufwecken.
- Projektidee „Mural – einen Wandplotter bauen“ (Falko und Anton bei 35services): Open-Source-Wandplotter, mit dem wir Schrittmotoren verwerten können; Bilder aus dem GitHub-Repo mit Quellen und Lizenz.
- Persönlicher Beitrag „Besuch bei Jugend hackt in der OKF“: Beamer abgeholt, über Finanzierung und lokale KI gesprochen.
- Karte `/karte/` (unter „Wir“ und vom Netzwerk aus verlinkt): unsere Orte auf OpenStreetMap – Schulen, Werkstatt, Veranstaltungsorte – mit allen Projekten, Terminen (kommende markiert), Beiträgen und Geräten dort. Die Kartenbilder kommen erst nach Klick auf „Karte laden“; die Liste der Orte funktioniert auch ohne. Orte stehen in `_data/orte.yml`, Seiten finden ihren Ort automatisch oder über `orte: [...]`. Impressum (Datenschutz) ergänzt.
- Beitrag „Post von der Keramik AG und ein erster Schlüsselanhänger“ aus der 3D-Druck AG an der Platanus Schule: Stempelideen der Keramik AG und der erste (viel zu rote) mehrfarbige Schlüsselanhänger, mit Video vom Druck. Er erscheint nur auf der Projektseite.
- Beiträge mit `nur_projekt: true` erscheinen nicht unter Neuigkeiten, auf der Startseite und im RSS-Feed, sondern nur auf der Projektseite – für kleine Projekt-Updates.
- KI-Server von Anton: Abschnitt „So ist diese Seite entstanden“ – agentisch über Claude per Pull Request eingetragen, mit zwei Screenshots.
- Persönliches Projekt „KI-Server von Anton“ (mit Falko): lokaler KI-Server, per Tailscale erreichbar, zum agentischen Programmieren mit OpenCode; mit Foto der Grafikkarte.
- Zwei neue Projekte zu den offenen Werkstatt-Repositories von 35services e. V.: „3D-Druck in der Werkstatt: 35services/3d“ (mit 5 Bildern) und „2D-Projekte mit dem Stiftplotter: 35services/2d“ (mit 4 Bildern); verlinkt auf der Partnerseite von 35services und im Teamprofil von Jan (`35services-jan` auf GitHub).
- Beitrag aus dem ersten Jahr der KTG-AG (19. April 2024): „Wette eingelöst: Der AxiDraw malt die Mona Lisa in einer Linie“ – nachdem ein AG-Kind gewettet hatte, dass der AxiDraw keine Mona Lisa malen kann.
- Beitrag „40 Monitore von der Bundesdruckerei“ (statt eines Projekts): Beispiel für gebrauchte Hardware über „Das macht Schule“, verbunden mit „Geld für Makespaces“ und dem PC-Spende-Beitrag; die alte Projektadresse leitet dorthin weiter.
- Weiterleitungen für gelöschte Seiten (`layout: weiterleitung`), damit alte Links weiter funktionieren.
- Verbindungen auch zu normalen Seiten wie „Geld für Makespaces“ (`verlinkt`), unten als Gruppe „Seiten“. „Geld für Makespaces“ ist mit allen dort erwähnten Projekten, Terminen, Beiträgen, Geräten, Partnern und Seiten verbunden.
- Kalender: Tag der offenen Tür am Gymnasium Tiergarten (4. Dezember 2026, 16–19 Uhr) mit Hinweis auf den Makespace und Falkos Besuch im letzten Jahr.
- Kalender: Nachmittag der offenen Tür am Rosalind-Franklin-Gymnasium (21. Januar 2027, 16–19 Uhr), verlinkt mit dem Tag der offenen Tür im November.

### Geändert

- Teamprofil Frieder nach seinen Wünschen: Untertitel „Makespace Aktivist am Tiergarten Gymnasium“, Lehrer aktuell am Gymnasium Tiergarten, eigene Liste persönlicher Projekte (Schulgartenaktionen, Kreative Pause im Makespace). Profilfoto mit Bildnachweis (neues Feld `photo_credit`). „40 Monitore von der Bundesdruckerei“ steht nicht mehr in seinem Profil.

### Behoben

- PR-Vorschaubilder mit `--unten` funktionieren jetzt auch bei langen Seiten (Teamprofile, Projekte): vorher fehlte der Footer im Bild und der Ausschnitt zeigte den Seitenkopf.

## [2026-11-11]

### Hinzugefügt

- Zeitleiste unter dem Netzwerk (`/netzwerk/`): gestapelte Balken pro Monat für Projektstarts, Beiträge, Termine und Presse – mit „heute“-Markierung, blass gezeichneten geplanten Monaten und einer Tabellenansicht. Die Filter oben gelten auch für die Zeitleiste; ein Klick auf einen Monat hebt seine Einträge im Netzwerk hervor und listet sie rechts auf (Link mit `#zeit:JJJJ-MM`), ein ausgewählter Punkt im Netzwerk hebt umgekehrt seine Verbindungen in der Zeitleiste hervor.
- Persönliches Projekt „Lastenanhänger vom Theater“ von Falko (Anfrage über 35services e. V., Ausbau mit dem Berliner Lastenrad-Netzwerk) mit Foto.
- Persönlicher Beitrag: Standanmeldung für den Treffpunkt Modellbau 2027 als PDF zum Herunterladen, verknüpft mit dem Termin in Paaren im Glien.
- Neues Teamprofil „Mr E“ (ohne Foto und persönliche Angaben): hilft seit 2026 in der KTG-AG, beteiligt an den iPad-Stiften und am Notebook der KTG.

## [2026-11-10]

### Hinzugefügt

- Persönlicher Beitrag: Falko bei der Onshape-Umfrage für Lehrkräfte.
- Persönliches Projekt „ifsmb.de“ von Falko mit Aufgaben als Checkboxen (über GitHub abhakbar); Aufgabenlisten werden ohne Aufzählungspunkte angezeigt.
- Prüfung `_scripts/check_galerien.rb`: Galerien müssen Markdown sein. Neuer Workflow „Prüfen“ für Pull Requests (Galerien, Build, Link-Check); auch das Deployment stoppt bei HTML-Galerien.
- Neues Teilprojekt der AG am Rosalind-Franklin-Gymnasium: „Die AG organisiert sich über itslearning“ mit Screenshot des Kurses (Namen außer Falko unkenntlich gemacht).
- Kalender: Tag der offenen Tür am Rosalind-Franklin-Gymnasium (28. November 2026, 10–13 Uhr) – die Kinder drucken Merchandise für die Schule und stellen den Makespace vor.
- Beitrag: Alle iPad-Stifte der KTG hängen am Ladekabel (Beschriftungen gedruckter Haken unkenntlich gemacht).
- Neues Teilprojekt der KTG-AG: „Ein Notebook der KTG wiederbeleben“ (Displayscharnier mit Macke, stationär nutzbar), verwandt mit den iPad-Stiften.
- Persönlicher Beitrag von Falko: „Ein Infinite Cube als Referenz“ (Fehldruck in Orange, gelungener Würfel in Blau auf dem P2S am Rosalind-Franklin-Gymnasium), verlinkt mit den Infinite-Cube-Beiträgen beider Schulen.
- Beitrag: Mehrfarbdruck mit dem A1 mini an der Platanus Schule – Filament wird per Hand gewechselt (Schrift auf dem Anhänger unkenntlich gemacht).
- Ausstattung: eine Seite für alle sechs Drucker am Rosalind-Franklin-Gymnasium (4 × Bambu Lab A1 mini, 2 × Bambu Lab P2S mit AMS), die der Schule gehören.
- Projektkarten (Projekte, Archiv, persönliche Projekte, Startseite) zeigen, wie aktiv ein Projekt ist: Symbole mit hochgestellten Zahlen für Teilprojekte 🧩, Termine 📅 (gelb, wenn welche anstehen), Updates 📰, Geräte 🛠️ und Beteiligte 👤 – jedes führt direkt zum passenden Abschnitt der Projektseite.
- Beiträge können mehrere Autor*innen haben (`author` als Liste); der Beitrag zum Tag der offenen Tür im Makespace Tiergarten ist jetzt von Falko und Frieder.
- Persönliches Projekt „Makespace Tiergarten“ von Frieder (Raum 226: 3D-Drucker, Ton- und Videostudio, Werkzeug) mit persönlichem Beitrag zum Tag der offenen Tür 2025 und 8 Fotos von Falko; Gesichter von Besucher*innen und handschriftliche Namen unkenntlich gemacht. Verlinkt vom Teamprofil von Frieder; neues Stichwort `makespace-tiergarten`.
- Beitrag „Unser Netzwerk: Alles hängt zusammen“ stellt die Netzwerk-Seite, die Verbindungen, Teilprojekte und den neuen Besitz/Standort von Geräten vor.
- Verbindungen für alle Seiten: Projekte, Termine, Beiträge, Personen, Ausstattung, Presse und Partnerseiten lassen sich mit `verlinkt` beliebig miteinander verbinden. Unten auf jeder Seite stehen alle Verbindungen in beide Richtungen als gleich gestylte Buttons (Teil von, Projekte, Termine, Beiträge, Beteiligt, Partner, Ausstattung); persönliche Inhalte sind gekennzeichnet. Partnerseiten zeigen ihre Projekte, Termine und Geräte.
- Dokumentation der Datenstruktur als ASCII-Art (`DATENSTRUKTUR.md`).
- Neue Seite „Netzwerk“ (`/netzwerk/`, im Menü unter „Wir“): alle Projekte, Termine, Beiträge, Personen, Partner, Geräte und Pressemitteilungen als Netz zum Ziehen, Zoomen und Durchklicken – mit Filtern, Suche und direkten Links auf einzelne Punkte. Läuft ohne externe Bibliothek.
- Ausstattung: Ein Gerät kann mehrere Besitzer*innen haben (`owner_partner`, `owner_team`, `owner_name` als Listen, kombinierbar). Besitz und Standort sind besondere Verbindungen: eigene Gruppen „Gehört“ und „Standort“ unten auf der Geräteseite, Etiketten „Besitz“/„Standort“ auf Partnerseiten und eigene Linien im Netzwerk (rot = gehört, blau gestrichelt = steht bei); Standorte ohne Partner werden im Netzwerk eigene Orte. Standort jetzt auch im CMS. Antons Core-XY-Drucker ist mit seinem Standort-Partner 35 services e. V. verknüpft.
- Fotos aus dem September und Oktober 2026 eingepflegt:
  - Beiträge zur KTG-AG: Dracheneier aus dem 3D-Drucker (mit Video) und Videocall mit ReUseMe zur Taschen-Tausch-Station (Kinder unkenntlich gemacht).
  - Rosalind-Franklin-Gymnasium: Besuch im neuen Makespace (mit Video) und ein Würfel mit Baumstützen aus der AG.
  - Platanus Schule: Würfel auf der Ecke aus der AG.
  - Persönlich: Mogster-Teile aus dem Drucker, neues Teilprojekt „Mogster: PC-Blend drucken“ und neues Projekt „Moldlay drucken“ von Falko und Philipp, jeweils mit Fotos.
  - Projekt-Ideen: Fotos von Falkos gedrucktem Mikroskop.
  - Herbstfest beim Zazza: Foto der gedruckten Hüte und Stiefel.
  - Neue Partnerseite für 35 services e. V. mit Foto der Filamentspende.
- Teilprojekte: Projekte mit `teil_von` erscheinen nicht in den Übersichten, sondern auf der Seite der übergeordneten Projekte – ein Teilprojekt kann zu mehreren Projekten gehören. Teilprojekte nennen ihre Eltern oben und unten als gut sichtbare Buttons („Dieses Projekt ist ein Teil von“).
- Zwei Teilprojekte der 3D-Druck AG an der KTG: „Open Press bauen“ (ein Exemplar ist fertig) und „Blockface-Stempel als Klassensatz“, beide mit Unterstützung von Frau S.; Fotos folgen.
- „junior1stein für die KTG“ ist jetzt ein Teilprojekt der 3D-Druck AG an der KTG.
- Teilprojekt der KTG-AG „iPad-Stifte wiederbeleben“ (einfache kompatible Stifte, keine Apple Pencils): alle Stifte der Schule aufladen, testen und die mit totem Akku aussortieren; mit Foto.
- Teilprojekt des Rosalind-Franklin-Gymnasiums „iPad-Stifte testen“: 20 Stifte aus der KTG sind als Leihgabe zum Testen dort; mit Foto.
- Verwandte Projekte (`verwandt`): Projekte verlinken sich gegenseitig, unten als Buttons „Verwandte Projekte“ – zuerst für die beiden iPad-Stifte-Projekte.
- Ausstattung: Lasercutter für die KTG (im Test, Illustration statt Foto).
- Persönliche Termine (`persoenlich: true`): erscheinen nicht im Kalender des Instituts, nur im Teamprofil. Die Terminseite nennt die Person oben und zeigt unten ihre Karte. Erster Termin: Falkos Besuch an der Gustav-Falke-Grundschule am 11. November 2026 (Making im Stundenplan seit 2020, offener Makespace, Schulfirma-AG; mit Links zur Tüftelzeit und zur Schülerfirma).
- Termine können zu mehreren Projekten (`projekte`), Partnern (`partners`) und Personen gehören; die Terminseite zeigt alle unten als Buttons wie auf den Projektseiten. Projektseiten und die Partnerübersicht listen die Termine automatisch.

### Geändert

- Bildergalerien werden jetzt in Markdown geschrieben: Bilder untereinander und darunter `{: .gallery}` – ein kleines Jekyll-Plugin macht daraus die Galerie mit Vorschaubildern und Lightbox (ein Bild wird automatisch groß, Alt-Texte sind Pflicht). Videos gehen genauso mit `![Beschreibung](video.mp4)`. Alle 40 bestehenden Galerien sind umgestellt; die Seiten sehen aus wie vorher.
- Tag der offenen Tür am Rosalind-Franklin-Gymnasium: Schlüsselanhänger mit Schullogo, gebaut mit MakeMySign von MakerWorld – mit Screenshot des Druckauftrags und Zeitraffer.
- „Prusa MK3S (HeartLabs) flott machen“ ist ein persönliches Projekt von Falko; „Netzwerk“ steht ganz oben im Menü „Wir“.
- Die Würfel-Beiträge der Platanus Schule und des Rosalind-Franklin-Gymnasiums heißen jetzt „Infinite Cube“, verlinken das Modell auf MakerWorld und sich gegenseitig – an beiden Schulen lernen wir gerade, wie man Stützstrukturen baut.
- Dracheneier: kein eigener Beitrag mehr, sondern ein Update im Projekt der KTG-AG (mit Fotos und Video).
- Mogster und PC-Blend: Erfahrungen mit dem schwierigen Filament (Trocknen, aufgeheizter Druckraum, als Nächstes ein Satin-Druckbett); Beiträge mit den benutzten Druckern verlinkt.
- Moldlay: Stand der Versuche (sehr brüchig, Föhn hat kaum geholfen, als Nächstes anderer Drucker oder 2,85-mm-Filament).
- Open Press bauen läuft seit 2026; iPad-Stifte: präzise Eingaben für Tinkercad und CAD.
- Projekt „Prusa MK3S (HeartLabs) flott machen“: Anton ist mit beteiligt.
- Termin all about automation 2027: Stand der Anfrage für einen Besuch mit Schüler*innen (August und November 2026).

## [2026-11-09]

### Hinzugefügt

- Projekt „junior1stein für die KTG“: Falkos Anfrage bei der Berliner MINT-Initiative junior1stein, welche Möglichkeiten es für die KTG gibt (wie im Cluster Mitte). Verlinkt von der KTG-AG und von „Geld für Makespaces“; neues Stichwort `junior1stein`.
- „Geld für Makespaces“: Die Platanus Schule als zweites Beispiel für den IfsMB-Weg (eigener Drucker, AG, erste Lehrkräfte mit Ideen wie einem Stempel für den Töpferunterricht); Stand auch im Projekt der Platanus Schule.
- Rosalind-Franklin-Gymnasium (Projekt, Eröffnungstermin, „Geld für Makespaces“): Die 6 Drucker kommen aus der Förderung über junior1stein.
- Neuigkeit: 3D-Druck auch in der Computer AG der KTG – Falko zu Gast bei Henning.
- Kalender: zweiter Besuch der AG bei Max in der Stephanstraße (3. März 2025, mit Foto) und geplanter Besuch mit den Kindern aus dem Schuljahr 2026/27 im Januar 2027; alle drei Termine sind gegenseitig verlinkt.
- Ausstattung: German RepRap X400 (in Aussicht, angeboten über Ralf von 35services) – vielleicht als Fräsmaschine umzubauen; mit 5 Fotos.
- Kalender: Termine mit `nur_projekt: true` erscheinen erst nach dem Termin im öffentlichen Kalender – vorher nur auf der Projektseite. So bleibt der Kalender übersichtlich, und Eltern und Kinder der KTG-AG sehen die Ausflüge trotzdem. Genutzt für den Besuch bei Max (Januar 2027) und bei der Firma von Nima (März 2027).

### Geändert

- Projektseiten: „Termine & Berichte“ trennt jetzt wie der Kalender kommende und vergangene Termine; vergangene sind blasser.
- German RepRap X400: Hinweis, dass der Hersteller (zuletzt innovatiQ) seinen Geschäftsbetrieb zum 30. Juni 2026 eingestellt hat; Daten der X400-Generationen und Übernahme durch die Arburg-Eigentümerfamilien (2020) mit Quellen; Einschätzung, ob der Drucker noch nutzbar ist (Slicer, Firmware, Plan B, Fragen vor der Zusage).
- Projekt-Ideen: YouTube, Printables, Thingiverse und Instructables gleich in der Einleitung verlinkt.
- Suche lokal: Pagefind-Index bleibt beim Neubauen erhalten, `/suche/` funktioniert auch mit `jekyll serve`.
- Tote externe Links in FLSUN V400, im AG-Beitrag von 2024 und beim Lastenlaufrad-Projekt markiert.

- Team: Falkos Profilfoto wieder ohne verpixelte Gesichter im Hintergrund (Ausschnitt aus dem Foto im Beitrag zum Jugend Hackt Congress 2026).

### Behoben

- Rosalind-Franklin-Gymnasium: Der Makespace eröffnet nicht erst im Januar 2027 – die Drucker sind seit Beginn des Schuljahres 2026/27 im Einsatz und die AG läuft; im Januar gibt es nur eine kleine feierliche Eröffnung (Projekt, Termin, Teamprofil Frieder, „Geld für Makespaces“, junior1stein für die KTG). Der Termin heißt jetzt „Kleine feierliche Eröffnung des Makespace am Rosalind-Franklin-Gymnasium“ und ist mit dem Besuch von Schulstadtrat Benjamin Fritz an der KTG gegenseitig verlinkt.
- Link-Check `_scripts/check_site.rb`: findet tote interne Links, fehlende Anker und verwaiste Seiten; läuft im Pages-Workflow und stoppt das Deployment bei Fehlern (`--extern` prüft zusätzlich externe Links).
- Dauerhaft tote externe Links werden mit 🪦 markiert und unten auf der Seite erklärt.
- Termine mit Personen verknüpfen (`team:`): Teamprofile zeigen kommende und vergangene Termine, die Terminseite zeigt „Dabei aus dem Team“. Alle bisherigen Termine sind eingetragen (Falko war nicht beim Ausflug zu happybite).
- Kalender: Jeder Termin zeigt oben rechts die Gesichter der Beteiligten aus dem Team als kleine runde Fotos (Mini-Fotos `photo_icon`, 48 px; ohne Foto die Initialen).
- Projektidee „Tarmo5 bauen?“: ein 3D-gedrucktes RC-Auto mit Links zu Printables, YouTube und Reddit, auch in der Ideen-Linksammlung.
- Termin und Beitrag „Chaos macht Kita – 3D Druck für Kinder 1.0“: Falkos 3D-Druck-Livestream für Kita-Kinder vom 21.05.2020 (Terminseite mit Vorschaubild der Aufzeichnung), Beitrag übernommen aus seinem Blog volkersfreunde.
- Kalender: „Chaos macht Kita (3D-Druck)“ – Falkos 3D-Druck-Einführung in der INA Habersaathstraße am 20.10.2023, verlinkt mit dem Beitrag „3D-Druck in der Kita“.
- Besuch von Schulstadtrat Benjamin Fritz (Termin und Pressemitteilung): Links zu den Beiträgen des Bezirksamts Mitte auf Bluesky und X sowie zum Facebook-Beitrag.
- Presse: neuer Abschnitt „Wir in der Presse“ mit Berichten anderer über uns (`_data/presseberichte.yml`).

- Neue Seite „Geld für Makespaces“ (`/geld-fuer-makespaces/`, im Menü unter „Wir“, noch im Aufbau): wie Schulen einen Makespace finanzieren können – Bootstrapping wie an der KTG, das Programm „Maker Spaces“ von #wirfürschule (bis zu 10.000 €), die Berliner MINT-Initiative junior1stein und gebrauchte Hardware über „Das macht Schule“. Dazu Infos aus dem Maker-Space-Newsletter von #wirfürschule: Newsletter und Social-Media-Kanäle, InnovatorsMap, Podcast, Ideen und Termine. Hinweis, dass das Rosalind-Franklin-Gymnasium junior1stein wohl genutzt hat (auch auf der Projektseite). Verlinkt von Angebot und Spenden.

### Geändert

- Angebot, „Warum ein Institut?“: Falkos eigentlicher Grund – alles dokumentieren und auf ein unabhängiges Fundament stellen; „Jeder kann ein Institut gründen“.
- Suche lokal: Pagefind-Index bleibt beim Neubauen erhalten, `/suche/` funktioniert auch mit `jekyll serve`.
- Tote externe Links in FLSUN V400, im AG-Beitrag von 2024 und beim Lastenlaufrad-Projekt markiert.

- Team: Falkos Profilfoto wieder ohne verpixelte Gesichter im Hintergrund (Ausschnitt aus dem Foto im Beitrag zum Jugend Hackt Congress 2026).

## [2026-11-08]

### Hinzugefügt

- Bearbeiten-Button: Jede Seite verlinkt ihre Quelldatei im GitHub-Editor.
- Kalender: Besuch der KTG-AG bei der Firma von Nima am Südkreuz (März 2027, Tag noch offen).
- Kalender: Chaos Communication Camp 2027 (August, Termin und Ort noch offen).
- Kalender: Jugend hackt Congress 2026 – Falko zum ersten Mal als Mentor.
- Kalender: Winterfest in der Kulturfabrik mit 3D-Druck.
- Kalender: all about automation 2027 mit Stichwort `rosalind-franklin-gym`.
- Projekt-Ideen: VW-Bus T3 auf Cults.
- Treffpunkt Modellbau: Stand der Anmeldung und Links zu Falkos Mogster-Beiträgen, Stichwort `mogster`.
- Regel für Pull Requests: zu jedem gepushten Branch ein PR mit Vorschaubildern.

### Geändert

- Navigation: „Projekt-Ideen“ im Menü „Wir“.
- Projektseite: Autor*in nur anzeigen, wenn der Beitrag `author` hat.
- Bearbeiten-Button bündig mit dem Seiteninhalt.
- Workflow: Code-Kommentare auf Englisch.
- Kleine Textkorrekturen in einzelnen Beiträgen.

### Behoben

- Suche: Workflow prüft die Pages-Quelle, README erklärt die Ursache von #13.

## [2026-11-07]

### Hinzugefügt

- Projekte, Pressemitteilung, neue Beiträge, Partner und Termine.
- Projekt: 3D-Druck AG an der Platanus Schule (seit September 2026); Archiv mit KTG-AG Jahr 1 und 2 und der Programmierwerkstatt am Lessing-Gymnasium.
- Ausstattung: Prusa MK4 mit MMU, zwei Prusa MK3S, 3D-Scanner Lynx und Ferret SE mit Vergleich, LulzBot TAZ 6, LulzBot Mini, AxiDraw V3, Snapmaker U1, A1 mini der Platanus Schule, Core-XY von Anton; Übersicht nach Gerätetyp mit Status und Standort.
- Projekt-Ideen-Seite mit der Linksammlung; Projektidee „Einen OpenScan bauen?“.
- Angebot-Seite mit „Warum ein Institut?“ und Transparenzhinweis; Name im Impressum.
- Persönliche Projekte und persönliche Blogs fürs Team.
- Team: Jan, Frieder Euteneuer, Anton (mit Profilfotos und Projekten).
- Mogster-Projekt mit mehreren persönlichen Beiträgen.
- Volltextsuche `/suche/` mit Pagefind.
- Stichworte verknüpfen Projekte, Beiträge, Termine und Geräte („Verknüpft“-Box).
- Spenden: Kontakt für Materialspenden, Abschnitt „Wir sammeln Geld für folgende Projekte“.
- Pressekontakt mit verschleierter Telefonnummer (`.obf-tel`); Logo als SVG.
- Startseite: Slogan „Kompetent improvisieren seit gestern.“ mit Scramble-Effekt.
- Termine: Treffpunkt Modellbau in Paaren im Glien, Chaos Communication Camp 2023, Ausflug zu happybite, Besuch von augenrahmen.de u. a.

### Geändert

- Navigation aufgeräumt: „Wir“ mit Projekte, Angebot, Ausstattung, Team.
- Projekt-Updates als Zeitleiste und als eigene Beiträge.
- Spenden-Button: alle sechs Emoji der Spendenseite kreisen.
- Ausstattung: Rohfotos durch bereinigte Web-Versionen ersetzt.

### Entfernt

- Nachtschicht-Bericht aus dem Repo.

### Behoben

- Build: Worktree-Ordner nicht mehr als Submodule im Repo.
- Pages-Workflow: Ruby 3.1 statt 3.1.2 (auf ubuntu-26.04 nicht verfügbar).

## [2026-11-06]

### Hinzugefügt

- Jekyll-Seite für das Institut für spontane Makespace Buildung.
- Kalender mit iCal-Feed, Presseseite, Pages CMS, Teamfotos und erste Beiträge.
- Partner PC-Spende (Das macht Schule) mit Logo.
- Termine: Herbstfest beim Zazza, Winterfest in der Kulturfabrik.

### Entfernt

- Beispieltermin „Offener Bastelnachmittag“.

[Unreleased]: https://github.com/falkorichter/ifsmb.de/commits/main
[2026-11-11]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-11&until=2026-11-11
[2026-11-10]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-10&until=2026-11-10
[2026-11-09]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-09&until=2026-11-09
[2026-11-08]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-08&until=2026-11-08
[2026-11-07]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-07&until=2026-11-07
[2026-11-06]: https://github.com/falkorichter/ifsmb.de/commits/main/?since=2026-11-06&until=2026-11-06
