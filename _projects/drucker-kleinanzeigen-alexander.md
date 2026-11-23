---
title: "IBM Proprinter von Kleinanzeigen wieder zum Laufen bringen"
summary: Ein 24-Nadel-Nadeldrucker aus den Neunzigern, komplett mit Handbuch und Centronics-Kabel – im Moment bewegt sich kein Motor, weil die 24-Volt-Leitung irgendwo unterbrochen ist.
status: aktuell
personal: true
start: 2026-11-15
period: seit November 2026
event_tag: proprinter
tags: [proprinter, nadeldrucker, retro, altrechner]
team:
  - alexander-riedel
related:
  - monocell
linked:
  - /projects/monocell/
image: /assets/images/projekte/drucker-kleinanzeigen-alexander/01.jpg
updates:
  - date: 2026-11-17
    text: |-
      **Der Plan steht:** Erst die Stromversorgung, dann der Anschluss. Der Drucker soll am Ende nicht nur an einem Rechner laufen, sondern im Netz hängen – siehe unten.
uuid: 7e2e4f16-4f66-42a2-96d5-3504be25357e
---

Ein **IBM Proprinter** ist kein Drucker, den man wegwirft. 24 Nadeln, ein robustes Stahlgestell, eine rauchgraue Abdeckung, die man hochklappen kann, um zu sehen, was im Inneren passiert – und ein Handbuch, das noch erklärt, wie man das Ding wartet.

Alexander hat das Gerät über Kleinanzeigen bekommen, samt Original-Handbuch und Centronics-Kabel. Aktuell bewegt sich allerdings kein Motor: Irgendwo scheint die **24-Volt-Leitung unterbrochen** zu sein. Als Nächstes geht es an die Fehlersuche in der Stromversorgung, damit die Schrittmotoren wieder Saft bekommen.

![Der IBM-Nadeldrucker mit Rauchglas-Abdeckung, Bedienfeld, Parallel- und Stromkabel sowie grauem IBM-Handbuch-Schuber](/assets/images/projekte/drucker-kleinanzeigen-alexander/01.jpg)
{: .gallery}

## Warum ein Nadeldrucker?

Weil er etwas kann, was kein Tinten- oder Laserdrucker kann: **Durchschläge**. Und weil das Geräusch dazugehört – ein Nadeldrucker klingt nach Arbeit.

Der eigentliche Grund ist aber ein anderer. In [Monocell]({{ '/projects/monocell/' | relative_url }}) gibt es einen Writer, der bereits auf genau diese Druckerfamilie vorbereitet ist: **PPDS**, also der Proprinter-Befehlssatz, 24-Nadel-Bitgrafik mit 180 dpi, Zeichensatz 2 für Umlaute, Seitenvorschübe. Der Textverarbeitung fehlt also nur noch der Drucker – und dem Drucker der Strom.

## Der zweite Schritt: ein Druckserver

Ein Nadeldrucker ist langsam. Deshalb soll er nicht an einem Rechner hängen, an dem man warten muss, sondern im Netz: Der Server nimmt Aufträge an und hält sie, bis der Drucker sie abarbeitet. Wege dorthin gibt es mehrere:

- **Parallelport an der UltraBase X6** des X61s – das Gerät ist nur eingedockt verfügbar, dafür ohne Adapter
- **USB-Parallel-Adapter** über `usblp`, der dann als `/dev/usb/lp0` auftaucht
- auf der Zielseite ein kleiner Empfänger, der **TCP 9100** annimmt und an das Gerät weiterreicht – ohne CUPS

Reizvoll wäre, gleich mitzudenken: Wenn der Server ohnehin läuft, kann er auch PDF und Text nach PPDS übersetzen, mit 80 Spalten und 180-dpi-Bändern. Dann druckt jedes Gerät im Haus auf dem Nadeldrucker – vom Telefon bis zum Laptop.
