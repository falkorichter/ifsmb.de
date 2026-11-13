---
title: "Mural – einen Wandplotter bauen"
summary: Ein Open-Source-Roboter, der an zwei Riemen an der Wand hängt und mit Filzstiften große Bilder malt – endlich eine Verwendung für unsere Schrittmotoren.
status: idee
start: 2026-11-12
zeitraum: Idee aus dem November 2026
ort: 35services e.V.
event_tag: mural
tags: [plotter]
team:
  - falko-richter
  - anton
partners:
  - 35 services e. V.
verlinkt: [/ausstattung/axidraw-v3/]
uuid: ead407ea-bc9f-4466-a59c-2b55eaa22b54
---

[Mural](https://getmural.me/) ist ein **Wandplotter zum Selberbauen**: Der Roboter hängt an **zwei Zahnriemen**, die oben mit Reißzwecken an der Wand befestigt sind. Zwei **Schrittmotoren** ziehen ihn über die Wand, ein kleiner Servo setzt den Stift auf und hebt ihn wieder ab – so entstehen **wandgroße Zeichnungen** mit (abwaschbaren) Filzstiften. Gesteuert wird alles über den Browser. Gerade ist **Mural V2** erschienen.

![Die 3D-Druckteile von Mural V2 in Schwarz und Weiß: Gehäuseober- und -unterteil, Motorhalter, Stifthalter, Zahnrad und Kleinteile (gerendert aus den 3MF-Dateien des Projekts)](/assets/images/projekte/mural-wandplotter/01.jpg)
![Handskizze aus der Projektdokumentation: Der Roboter hängt an zwei Riemen, eingezeichnet sind die Kräfte F_L, F_R und F_G und die Winkel](/assets/images/projekte/mural-wandplotter/02.jpg)
{: .gallery}

**Warum für uns?** Wir können **endlich mal Schrittmotoren verwerten**. Mural braucht zwei NEMA-17-Motoren (im Original flache „Pancake“-Motoren), dazu einen ESP32-Controller mit FluidNC, Riemen, Pulleys und ein paar Schrauben. Das Gehäuse wird **3D-gedruckt**. Wie beim [AxiDraw]({{ '/ausstattung/axidraw-v3/' | relative_url }}) sieht man beim Plotten genau, wie ein Gerät mit Motoren und Koordinaten zeichnet – nur eben an der Wand und richtig groß.

Die Idee kommt von Falko und Anton und soll bei 35services gebaut werden.

<span class="todo">[Welche Schrittmotoren haben wir da, passen sie? Controller bestellen? – Details folgen.]</span>

### Quellen

- Video: [Mural V2 – Open source low cost wall plotter](https://www.youtube.com/watch?v=Hjp9P1Shx5E) (YouTube)
- Projektseite mit Bauanleitung: [getmural.me](https://getmural.me/)
- Code, Druckdateien und Doku: [nikivanov/mural auf GitHub](https://github.com/nikivanov/mural) – Teileliste in [BOM.md](https://github.com/nikivanov/mural/blob/main/BOM.md), Skizze aus [KinematicModel.md](https://github.com/nikivanov/mural/blob/main/KinematicModel.md)
- Bericht: [Mural: The Plotter That Draws On Walls](https://hackaday.com/2025/03/24/mural-the-plotter-that-draws-on-walls) (Hackaday)

**Bilder:** Mural von Nik Ivanov und Mitwirkenden, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.de). Das erste Bild haben wir aus den 3MF-Druckdateien des Repos gerendert, die Skizze stammt unverändert aus der Dokumentation.
