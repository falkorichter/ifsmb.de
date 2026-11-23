---
title: "HTTP-Zugang zum Drucker in der KTG"
summary: Wir wollen auf HTTP-Basis auf den Snapmaker U1 zugreifen – auch ohne Snapmaker Orca
kind: aufgabe   # aufgabe, problem oder frage
status: offen   # offen, in-arbeit oder geloest
since: 2026-11-18   # seit wann die Herausforderung besteht
solved_on:   # Datum, wenn gelöst
important: true   # Eisenhower-Matrix: true/false
urgent: false   # true/false – wichtig+dringend = sofort, nur wichtig = einplanen, nur dringend = abgeben, keins = später
team: [falko-richter, mr-e, gregor-dill]   # Team-Kürzel der Zuständigen – eine oder mehrere Personen
projects: [3d-druck-ag-ktg]   # Dateinamen der Projekte, zu denen sie gehört (ein Projekt hat viele Herausforderungen)
tags: []   # Stichworte; das event_tag eines Projekts verbindet ebenfalls mit dem Projekt
linked: [/challenges/ktg-orca-slicer-hardware/, /news/2026/11/12/ki-server-pi4-proxy/]   # weitere Seiten: Termine, Geräte, Beiträge, z. B. [/calendar/…/]
personal: false   # true = aus einem privaten Projekt im Team
solution:   # wenn gelöst: wie, in Markdown – erscheint unter „Lösung“
uuid: 24440234-1909-4c57-a10c-83caa3dc8238
---

Wir wollen in der KTG **auf HTTP-Basis auf den Drucker zugreifen**. Der Snapmaker U1 hat eine Weboberfläche (Fluidd) und eine offene Schnittstelle (Moonraker) – damit können die Kinder den Drucker auch **ohne [Snapmaker Orca](https://github.com/Snapmaker/OrcaSlicer/releases)** benutzen: Druckaufträge hochladen, den Druck verfolgen und das Kamerabild ansehen. Vielleicht installieren wir dann auch **andere Slicer**.

Das hängt eng mit der Herausforderung [Software für die KTG AG](/challenges/ktg-orca-slicer-hardware/) zusammen: Wir bekommen [Snapmaker Orca v2.4.1](https://github.com/Snapmaker/OrcaSlicer/releases/tag/v2.4.1) nicht auf die Schulrechner. Mit HTTP-Zugang reicht ein Browser.

## Was wir dafür brauchen

- [ ] **Genehmigung der Schulleitung**
- [ ] **Rücksprache mit dem IT-Dienstleister**
- [ ] **Drucker und Computer im gleichen VLAN**
- [ ] **Netzwerk am Drucker**: ein USB-LAN-Adapter am Drucker – oder der USB-3.0-Hub mit Gigabit-LAN, den wir gerade im [KI-Server-Projekt](/projects/ki-server-anton/) verbaut haben ([Beitrag: Ein Raspberry Pi als Wecker](/news/2026/11/12/ki-server-pi4-proxy/))

## Was wir schon wissen

Am eigenen U1 haben wir ausprobiert, was über HTTP geht – dokumentiert im Repo [snapmaker-ui](https://github.com/falkorichter/snapmaker-ui) – dort stehen alle Details zum Nachlesen und Weitermachen:

- Die Weboberfläche läuft direkt auf dem Drucker: `http://<drucker-ip>/`
- Das **Kamerabild** gibt es mit etwa 2 Bildern pro Sekunde, wenn man es über die Schnittstelle einschaltet.
- **Wichtig für das Gespräch mit der IT:** Der Drucker hat **kein Passwort**. Jedes Gerät im gleichen Netz darf alles – auch den Not-Aus drücken oder Dateien löschen. Darum gehört der Drucker in ein eigenes VLAN, in dem nur die Schulrechner der AG sind.

Habt ihr Ideen, Kontakte oder passende Teile? Meldet euch!
