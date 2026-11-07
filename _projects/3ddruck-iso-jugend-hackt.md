---
title: "3D-Druck-Stick: Linux zum Mitnehmen"
summary: Falko baut auf Basis des Jugend-hackt-Images ein Linux für USB-Sticks, das ganz auf CAD, 3D-Druck und Plotten ausgerichtet ist – damit alte Laptops wieder Werkzeuge werden.
status: aktuell
persoenlich: true
start: 2026-10-12
zeitraum: seit Oktober 2026
event_tag: 3ddruck-iso
tags: [3ddruck-iso, jugend-hackt, heartlabs, laptops, ktg]
team:
  - falko-richter
partners:
  - Jugend hackt
  - HeartLabs
  - Kurt-Tucholsky-Grundschule
  - 35 services e. V.
updates:
  - datum: 2026-10-12
    text: >-
      Start: eigener Zweig des Jugend-hackt-Images auf GitHub –
      [35services/3ddruck-jugend-hackt-iso](https://github.com/35services/3ddruck-jugend-hackt-iso).
  - datum: 2026-10-13
    text: >-
      Die ersten Laptops der 3D-Druck AG an der KTG starten vom Stick – das klappt hervorragend.
  - datum: 2026-10-14
    text: >-
      Experiment mit **MX Linux** auf einem alten 12″-MacBook: läuft spürbar besser auf
      alter Hardware. Vielleicht wird eine spätere Version des Sticks darauf aufbauen.
---

Falko baut ein **Linux-System für USB-Sticks**, das ganz auf **CAD, 3D-Druck und Plotten** ausgerichtet ist. Stick rein, Laptop starten – und schon ist alles da, was ein Kind in der AG braucht. Die Grundlage ist das Live-System von [Jugend hackt]({{ '/partner/jugend-hackt/' | relative_url }}), mit dem auch auf ihren Veranstaltungen gearbeitet wird.

Der Quelltext liegt offen auf GitHub: **[35services/3ddruck-jugend-hackt-iso](https://github.com/35services/3ddruck-jugend-hackt-iso)**.

## Was auf dem Stick ist

- **CAD:** [OpenSCAD](https://openscad.org/) und [FreeCAD](https://www.freecad.org/)
- **Slicer:** PrusaSlicer, UltiMaker Cura und Snapmaker Orca – passend zu unserem [Snapmaker U1]({{ '/ausstattung/snapmaker-u1/' | relative_url }})
- **Plotten:** Inkscape mit der Erweiterung für den [AxiDraw]({{ '/ausstattung/axidraw-v3/' | relative_url }})
- Ein **Willkommenstext** auf dem Schreibtisch, damit die Kinder sofort loslegen können
- **Persistenz:** Was die Kinder speichern, bleibt auf dem Stick – auch nach dem Neustart
- Dazu Helfer, um Laptops mit fester Installation gleich einzurichten, und der „Geteilte Ordner“, über den die AG-Leitung Dateien zwischen den Laptops verteilt

Programme, die die AG nicht braucht (Entwicklungsumgebungen, Spiele-Engines …), hat Falko herausgenommen – so bleibt der Stick schlank und auch auf alter Hardware flott.

## Die Laptops

Die Laptops hätten sonst niemand mehr gebraucht: Ein Teil kommt von **Falkos Vater**, ein Teil hätte die [Kurt-Tucholsky-Grundschule]({{ '/partner/' | relative_url }}#kurt-tucholsky-grundschule) sonst **entsorgt**. Viele kamen ohne Festplatte – mit dem Stick ist das egal. Mehr dazu im Beitrag [„Linux-Laptops für die 3D-Druck AG“]({{ '/news/2026/10/13/linux-laptops-fuer-die-3d-druck-ag/' | relative_url }}) und auf der Seite [Laptops & Druck-Sticks]({{ '/ausstattung/laptops-druck-sticks/' | relative_url }}).

**Danke an [HeartLabs]({{ '/partner/' | relative_url }}#heartlabs)** für den Laptop, auf dem Falko die Images baut und die Sticks beschreibt!

## Warum das typisch Institut ist

- **Nichts wegwerfen:** Aus Laptops, die im Müll gelandet wären, werden Werkzeuge für Kinder.
- **Auf den Schultern von anderen:** Wir erfinden nichts neu, sondern bauen auf der Arbeit von Jugend hackt auf – und geben unsere Änderungen offen zurück.
- **Viele Hände:** Jugend hackt liefert die Grundlage, HeartLabs den Bau-Laptop, Falkos Vater und die KTG die Geräte, 35services die AG. Das Institut bringt alles zusammen.
- **Spontan:** Kein Antrag, keine Ausschreibung – Falko hat einfach angefangen und die USB-Sticks erstmal selbst bezahlt.
- **Zum Nachmachen:** Andere Schulen und Makespaces können den Stick genauso bauen.

Die USB-Sticks hat Falko privat vorgestreckt. Wer helfen möchte: [zur Spendenseite]({{ '/spenden/' | relative_url }}).
