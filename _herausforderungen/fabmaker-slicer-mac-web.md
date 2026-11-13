---
title: "Fabmaker-Slicer für Mac und Web 'craften'"
summary: Den Windows-Slicer der Fabmaker-Drucker mit Claude Code oder OpenCode untersuchen, damit die Drucker auch vom Mac oder aus dem Browser drucken.
art: aufgabe
status: offen
seit: 2026-11-13
team: [falko-richter, anton]
tags: [fabmaker]
verlinkt: [/ausstattung/fabmaker/]
---

Unsere zwei [Fabmaker]({{ '/ausstattung/fabmaker/' | relative_url }}) lassen sich nur mit dem **Fabmaker Slicer** für Windows ansteuern (`SetupFabmakerSlicer_1.1.1.9.exe`), und den Hersteller gibt es nicht mehr. Falko und Anton wollen das Programm mit **Claude Code** oder **OpenCode** per Reverse Engineering untersuchen, damit die Drucker auch **auf dem Mac oder im Browser** nutzbar werden.

- Installer und Wartungsprogramme aus [35services/fabmaker-rettung](https://github.com/35services/fabmaker-rettung) auseinandernehmen: Womit ist der Slicer gebaut, steckt ein bekannter Slicer darunter?
- Herausfinden, welches Dateiformat und welches Protokoll der Drucker erwartet (G-Code? eigenes Format? USB, Netzwerk, Speicherkarte?)
- Danach entscheiden: Reicht ein normaler Slicer mit passendem Profil (z. B. PrusaSlicer oder OrcaSlicer), oder braucht es ein kleines eigenes Werkzeug – vielleicht sogar als Web-App?
- Alles, was wir lernen, im Repository dokumentieren
