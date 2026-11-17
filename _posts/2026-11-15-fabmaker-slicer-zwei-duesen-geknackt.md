---
title: "Fabmaker-Slicer geknackt: So schaltet der Drucker seine zwei Düsen"
date: 2026-11-15 15:00:00 +0100
author: falko-richter
tags: [fabmaker]
verlinkt: [/ausstattung/fabmaker/]
uuid: 90c80ac2-0d84-47ac-a0a3-95dc8ea4be6c
---

Große Neuigkeit für die [zwei Fabmaker]({{ '/ausstattung/fabmaker/' | relative_url }}): Falko hat den alten Windows-Slicer mit [Claude Code](https://claude.com/claude-code) auseinandergenommen – und damit das [Todo „Fabmaker-Slicer für Mac und Web“]({{ '/todos/#falko-richter/fabmaker-slicer-mac-web' | relative_url }}) einen großen Schritt vorangebracht. Die wichtigste Erkenntnis: **Der Drucker braucht kein geheimes Dateiformat.** Er versteht ganz normales G-Code über die serielle Schnittstelle (115200 Baud). Damit ist der Weg zu Mac und Browser offen.

### Drei Funde

- **Der „Fabmaker Slicer“ ist ein umbenanntes [Repetier-Host](https://www.repetier.com/).** Im Programm steckt noch die verräterische Spur `…\Repetier-Host\src\RepetierHost\…`. Als Slicer arbeiten darin CuraEngine und Slic3r – beides frei verfügbar.
- **Die Firmware ist eine Repetier-Firmware.** Sie spricht also den offenen RepRap-/Marlin-Dialekt, den auch unsere anderen Drucker sprechen.
- **Die zwei Düsen hängen an einem einzigen Schlitten** und werden **mechanisch** umgeschaltet: Der Schlitten fährt über den Rand des Druckbetts hinaus gegen einen Anschlag (rechte Düse bei `X336.5`, linke bei `X-35.7`), danach setzt der Drucker sein Koordinatensystem neu. Genau diese Fahrten waren die gesuchten „Spezial-G-Codes“ – sie sind jetzt vollständig rekonstruiert.

### Wie es weitergeht

Weil es reines serielles G-Code ist, gibt es gleich mehrere Wege: das **echte Repetier-Host** gibt es auch für den Mac, dazu passen unsere wiedergefundenen Makros direkt hinein. Alternativ geht ein eigenes Maschinenprofil in OrcaSlicer oder PrusaSlicer – oder, ganz ohne Installation, ein kleiner Sender im Browser über die Web-Serial-Schnittstelle. Ein Firmware-Update ist dafür nicht nötig; die Firmware im Drucker läuft ja.

Die komplette technische Doku mit allen rekonstruierten G-Codes liegt offen im Rettungs-Repository: [35services/fabmaker-rettung](https://github.com/35services/fabmaker-rettung/blob/main/research/2026-11-15_reverse-engineering-slicer.md).

Als Nächstes probieren wir die Umschalt-Positionen vorsichtig und ohne Filament am echten Gerät aus – nicht dass sich unser Exemplar die Anschläge anders gemerkt hat.
