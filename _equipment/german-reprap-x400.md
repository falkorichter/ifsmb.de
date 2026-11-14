---
title: German RepRap X400
kategorie: Großformat-3D-Drucker (FDM)
status: in-aussicht
summary: Ein großer 3D-Drucker mit Alu-Rahmen, der sich vielleicht zur Fräsmaschine umbauen lässt – den bekommen wir vielleicht.
owner_name: einem Bekannten von Ralf (35services)
image: /assets/images/ausstattung/german-reprap-x400/01.jpg
thumb: /assets/images/ausstattung/german-reprap-x400/01-600w.jpg
image_alt: "Der German RepRap X400: ein großer Rahmen aus Aluprofilen auf einem blauen Acrylsockel, oben der Druckkopf mit Energieketten, darunter die Druckplatte"
gallery:
  - image: /assets/images/ausstattung/german-reprap-x400/02.jpg
    thumb: /assets/images/ausstattung/german-reprap-x400/02-600w.jpg
    alt: "Der X400 von vorn: vier Gewindespindeln tragen die Druckplatte, unten der blaue Sockel mit Display und Drehknopf"
  - image: /assets/images/ausstattung/german-reprap-x400/03.jpg
    thumb: /assets/images/ausstattung/german-reprap-x400/03-600w.jpg
    alt: "Blick von oben in den Rahmen: Führungsstangen, Zahnriemen, Energiekette und der Druckkopf"
  - image: /assets/images/ausstattung/german-reprap-x400/04.jpg
    thumb: /assets/images/ausstattung/german-reprap-x400/04-600w.jpg
    alt: "Nahaufnahme des Sockels mit dem Schriftzug X400 und dem Drehknopf"
  - image: /assets/images/ausstattung/german-reprap-x400/05.jpg
    thumb: /assets/images/ausstattung/german-reprap-x400/05-600w.jpg
    alt: "Logo der German RepRap GmbH auf dem blauen Acrylsockel"
tags: [german-reprap-x400, 3d-drucker, 35services]
uuid: 1ccf68cc-fc2e-4c40-a2e6-83c6ab52fb7d
---

**Wir bekommen vielleicht einen German RepRap X400.** Ralf von 35services hat gefragt, ob wir ihn annehmen würden.

Der X400 ist ein großer kartesischer FDM-Drucker der German RepRap GmbH: ein stabiler Rahmen aus Aluprofilen, die Druckplatte fährt auf vier Gewindespindeln nach unten, der Druckkopf bewegt sich oben über Führungsstangen und Zahnriemen. Je nach Generation hat er einen Bauraum von etwa 40 × 40 × 32 cm.

Vom X400 gab es mehrere Generationen:

- **3. Generation:** Bauraum 400 × 390 × 320 mm (T × B × H) ([industrial-production.de](https://www.industrial-production.de/additive-fertigung/3d-drucker---mehr-stabilitaet-und-bessere-druckergebnisse.htm))
- **4. Generation (X400 v4),** vorgestellt im September 2017, ab 2018 im Handel für rund 10.000 €: Bauraum 35 × 40 × 31 cm, beheiztes Druckbett mit automatischer Nivellierung, Dual-Extruder DD3 mit Vollmetall-Hotend, Filament-Überwachung, Industrie-PC mit Touchdisplay, USB und Ethernet; Gerät 73,5 × 73 × 77,7 cm, 50 kg ([Meldung](https://www.3dmake.de/3d-drucker-news/german-reprap-praesentiert-die-4-generation-des-x400/) und [Datenblatt](https://www.3dmake.de/3d-drucker/german-reprap-x400-v4/) bei 3dmake.de)

Unser Kandidat hat ein kleines Display mit Drehknopf statt eines Touchdisplays – vermutlich also eine ältere Generation als die v4.

**Den Hersteller gibt es nicht mehr:** Im Februar 2020 übernahmen die Eigentümerfamilien von Arburg die German RepRap GmbH aus Feldkirchen bei München ([Digital Engineering Magazin](https://www.digital-engineering-magazin.de/3d-druck-was-wird-aus-german-reprap-nach-der-uebernahme-a-a53b318447414884f04ff7f7575a469f/)); später hieß die Firma innovatiQ GmbH + Co. KG. Laut ihrer Website ([germanreprap.com](http://www.germanreprap.com/), leitet weiter auf innovatiq.com) hat innovatiQ den Geschäftsbetrieb zum 30. Juni 2026 eingestellt. Ersatzteile und Support vom Hersteller gibt es also nicht mehr – ein Grund mehr, den Drucker selbst umzubauen.

## Ist er noch nutzbar?

Unsere Einschätzung: **sehr wahrscheinlich ja.** Der X400 ist ein offenes RepRap-Design aus Standardteilen – dass es den Hersteller nicht mehr gibt, ist deshalb weniger schlimm, als es klingt.

- **Slicer:** Spezielle X400-Software braucht es nicht. German RepRap hat früher Repetier-Host und Slic3r mitgeliefert und ist später [auf Simplify3D umgestiegen](https://3dprintingindustry.com/news/european-3d-printer-race-german-repraps-new-software-29625/). Der Drucker braucht nur G-Code – den erzeugt jeder aktuelle Slicer (OrcaSlicer, PrusaSlicer, Cura). Wir müssten nur ein eigenes Druckerprofil anlegen (Bauraum, Düse, Temperaturen).
- **Firmware:** Welche Platine und Firmware genau in diesem Gerät stecken, wissen wir noch nicht. Es spricht einiges für eine Firmware auf Basis von Repetier – im [Handbuch der v4](https://manualedistruzioni.it/german-reprap/3d-printer/x400v4/user-manual/1ly7f) wird zum Beispiel über Repetier-Server gedruckt. Handbücher älterer Generationen gibt es noch [bei manualshive.com](https://manualshive.com/en/model/german-reprap/x400-pro-v3). [Repetier-Firmware](https://reprap.org/wiki/Repetier-Firmware) ist Open Source (GPL) und bleibt verfügbar.
- **Plan B:** Macht die alte Elektronik Ärger, tauschen wir die Platine gegen eine aktuelle mit Klipper oder Marlin (grob 30–60 €, geschätzt). Motoren, Spindeln, Rahmen und Heizbett bleiben – und das wäre ohnehin der erste Schritt zum Umbau als Fräse.
- **Risiken:** Den DD3-Extruder und das Hotend gibt es nur vom Hersteller, Ersatzteile also nicht mehr – notfalls ein Standard-Hotend einbauen. Wir wissen nicht, ob er zuletzt funktioniert hat. Und er ist groß und schwer (die v4 wiegt 50 kg).

**Vor der Zusage klären:**

1. Hat er zuletzt gedruckt – und warum wurde er abgestellt?
2. Sind Netzteil, Ersatzteile oder Filament dabei?
3. Ein Foto der Platine im blauen Sockel, mit Beschriftung – dann wissen wir, welche Firmware drauf ist.
4. Haben wir am geplanten Standort Platz dafür?

## Idee: Fräse

Ralfs Bekannter meinte, solche Drucker würden sich – geeignet umgebaut – als **Fräsmaschine** eignen. Der stabile Rahmen und der große Arbeitsbereich sprechen dafür. Ob wir ihn als Drucker weiterbetreiben oder zur Fräse umbauen, entscheiden wir, wenn er da ist.
