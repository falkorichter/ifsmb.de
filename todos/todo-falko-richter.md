<!--
Todos von Falko Richter – wird auf /todos/ bearbeitet (Eisenhower-Matrix).
Aufbau: ## = Feld der Matrix, ### = eine Herausforderung (Reihenfolge = Priorität),
darunter ein yaml-Block mit den Feldern und danach freier Text in Markdown.
Die Person dieser Datei ist hauptzuständig; helfer = helfende Hände (Team-Kürzel).
-->

## 🔥 Sofort erledigen

### Ausflug organisieren {#ausflug-organisieren}

```yaml
summary: Eine(r) muss es tun
kind: aufgabe
status: offen
since: 2026-11-13
helpers: [gregor-dill]
projects: [ktg-ag]
tags: [ktg]
linked: [/calendar/2027-01-04-besuch-bei-max-2027/]
```

Termin kommunizieren und organisieren für Januar
* handout bauen und ausdrucken

### Betreff: gebrauchte Hardware für iServ {#betreff-gebrauchte-hardware-fur-iserv}

```yaml
kind: aufgabe
status: offen
since: 2026-11-13
due: 2026-11-17
projects: [3d-druck-ag-ktg]
tags: [ktg]
```

Es gibt evtl ca. 80  Dell OptiPlex 7440 bzw. 7450  AIO

### Würth, Pfefferwerk, {#wurth-pfefferwerk}

```yaml
summary: Bernd Krebs
kind: aufgabe
status: offen
since: 2026-11-13
```

### Social media cards für ifsmb {#social-media-cards-fur-ifsmb}

```yaml
kind: aufgabe
status: offen
since: 2026-11-14
projects: [ifsmb-de]
tags: [software]
linked: [/projects/ifsmb-de/]
```

Vielleicht auch nochmal vergleichen was wir beim Lastenlaufradrennen gebaut haben

### Alt makers besuchen  {#alt-makers-besuchen}

```yaml
kind: aufgabe
status: offen
since: 2026-11-15
helpers: [jan]
```

https://www.alt-makers.de/das-team

## 📌 Einplanen

### Passen unsere Schrittmotoren für Mural? {#mural-schrittmotoren}

```yaml
summary: Mural braucht zwei NEMA-17-Motoren – im Original flache „Pancake“-Motoren. Welche haben wir da, und reichen sie?
kind: frage
status: offen
since: 2026-11-12
helpers: [anton]
projects: [mural-wandplotter]
tags: [mural]
```

- Welche Schrittmotoren haben wir da?
- Passen sie in das Gehäuse, das für flache „Pancake“-Motoren gedacht ist – oder müssen wir die Halter anpassen?
- Reicht ihre Kraft, um den Roboter an zwei Riemen über die Wand zu ziehen?
- Müssen wir einen ESP32-Controller mit FluidNC bestellen?

### Repair-Café in der NochMall anschauen {#repair-cafe-nochmall}

```yaml
summary: Falko und Ralf schauen sich das Repair-Café in der NochMall der BSR in Reinickendorf an und suchen Kontakt zur BSR.
kind: aufgabe
status: offen
since: 2026-11-12
helpers: [ralf]
tags: [repair-cafe]
```

- Kontakt zur BSR finden
- NochMall anschauen: Wie läuft das Repair-Café, was können wir lernen?

### Mit dem QM Moabit über die Stadtteilkasse sprechen {#stadtteilkasse-moabit}

```yaml
summary: Bis zu 500 € aus der Stadtteilkasse für offene Aktionen in der Nachbarschaft – zum Beispiel eine Makespace-Aktion im Kiez.
kind: aufgabe
status: offen
since: 2026-11-12
linked: [/geld-fuer-makespaces/]
```

Mit dem Quartiersmanagement Moabit über die Stadtteilkasse sprechen.

### Platanus? Tag der offenen Tür – Sekundarstufe I/II für die Jahrgangsstufen 7 bis 13? {#platanus-tag-der-offenen-tur-sekundarstufe-i-ii-fur-die-jahr}

```yaml
summary: sollen wir da mitmachen als AG?
kind: frage
status: offen
since: 2026-11-13
due: 2027-01-27
projects: [3d-druck-ag-platanus-schule]
tags: [platanus]
linked: [/projects/3d-druck-ag-platanus-schule/, /news/2026/11/11/post-von-der-keramik-ag-und-ein-erster-schluesselanhaenger/]
```

https://www.platanus-schule.de/tag-der-offenen-tuer/

### Deckel wie bei Gustav Falke - wollen wir so etwas drucken? {#deckel-wie-bei-gustav-falke-wollen-wir-so-etwas-drucken}

```yaml
kind: frage
status: offen
since: 2026-11-14
projects: [3d-druck-ag-rosalind-franklin-gymnasium]
tags: [rosalind-franklin-gym]
linked: [/calendar/2026-11-11-besuch-gustav-falke-grundschule/]
```

[Deckel Video](https://youtu.be/MLQvEFuRu9Y?is=vqGTS-Xs0ATl15Da)

### Ohne Titel {#neues-todo}

```yaml
summary: Recherche zur hotRC
kind: aufgabe
status: offen
since: 2026-11-15
projects: [rc-tractor-professorboots]
tags: [rc-tractor-professorboots]
```

https://youtu.be/Oes2u12HYyE?is=-JExxT82gyQGuLhL

## 🤝 Abgeben

## 💤 Später

### Fabmaker-Slicer für Mac und Web 'craften' {#fabmaker-slicer-mac-web}

```yaml
summary: Den Windows-Slicer der Fabmaker-Drucker mit Claude Code oder OpenCode untersuchen, damit die Drucker auch vom Mac oder aus dem Browser drucken.
kind: aufgabe
status: in-arbeit
since: 2026-11-13
helpers: [anton]
tags: [fabmaker]
linked: [/equipment/fabmaker/]
```

Unsere zwei [Fabmaker](/equipment/fabmaker/) lassen sich nur mit dem **Fabmaker Slicer** für Windows ansteuern (`SetupFabmakerSlicer_1.1.1.9.exe`), und den Hersteller gibt es nicht mehr. Falko und Anton wollen das Programm mit **Claude Code** oder **OpenCode** per Reverse Engineering untersuchen, damit die Drucker auch **auf dem Mac/linux oder im Browser** nutzbar werden.

- Installer und Wartungsprogramme aus [35services/fabmaker-rettung](https://github.com/35services/fabmaker-rettung) auseinandernehmen: Womit ist der Slicer gebaut, steckt ein bekannter Slicer darunter?
- Herausfinden, welches Dateiformat und welches Protokoll der Drucker erwartet (G-Code? eigenes Format? USB, Netzwerk, Speicherkarte?)
- Danach entscheiden: Reicht ein normaler Slicer mit passendem Profil (z. B. PrusaSlicer oder OrcaSlicer), oder braucht es ein kleines eigenes Werkzeug – vielleicht sogar als Web-App?
- Alles, was wir lernen, im Repository dokumentieren

**Stand: geknackt (15.11.2026)** – siehe [Beitrag](/news/2026/11/15/fabmaker-slicer-zwei-duesen-geknackt/) und die [technische Doku im Repository](https://github.com/35services/fabmaker-rettung/blob/main/research/2026-11-15_reverse-engineering-slicer.md):

- **Kein geheimes Format** – der Drucker frisst normales serielles G-Code (115200 Baud, RepRap/Repetier-Dialekt).
- Der „Fabmaker Slicer“ ist ein **umbenanntes Repetier-Host**, die Firmware eine **Repetier-Firmware**.
- Die **zwei Düsen** werden mechanisch über einen X-Anschlag umgeschaltet (rechte Düse `X336.5`, linke `X-35.7`, danach `G92 X0`). Diese Makros sind vollständig rekonstruiert.
- Erste **OrcaSlicer/PrusaSlicer-Profile** liegen im Repository ([`slicer-profiles/`](https://github.com/35services/fabmaker-rettung/tree/main/slicer-profiles)).

Noch offen: die Umschalt-Positionen vorsichtig am echten Gerät prüfen (erst ohne Filament) und einen ersten Testdruck fahren.

### Welcher OpenScan soll es werden? {#openscan-variante}

```yaml
summary: Mini oder Classic, welche Kamera – und wer macht mit?
kind: frage
status: offen
since: 2026-05-23
projects: [openscan-bauen]
tags: [openscan]
```

- **Variante:** OpenScan Mini oder Classic?
- **Kamera:** Welche Kamera nehmen wir?
- **Mitmachen:** Wer baut mit?

### Non planar slicing {#non-planar-slicing}

```yaml
summary: "Angucken "
kind: frage
status: offen
since: 2026-11-13
helpers: [anton]
projects: [35services-3d]
tags: [35services-3d]
linked: [/partners/35services/, /equipment/35services-bambu-lab-a1-mini/, /equipment/prusa-mk3s-xhain/, /projects/prusa-mk3s-heartlabs-flott-machen/]
```

https://youtu.be/cRSoVq_reGQ?is=4-7OQB8jc_aDTww_

## ✅ Erledigt
