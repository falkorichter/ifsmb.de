---
title: "Software für die KTG AG"
summary: Wir bekommen keinen Snapmaker Orca installiert
kind: problem   # aufgabe, problem oder frage
status: offen   # offen, in-arbeit oder geloest
since: 2026-09-01   # seit wann die Herausforderung besteht
solved_on:   # Datum, wenn gelöst
important: true   # Eisenhower-Matrix: true/false
urgent: true   # true/false – wichtig+dringend = sofort, nur wichtig = einplanen, nur dringend = abgeben, keins = später
team: [falko-richter, mr-e, gregor-dill]   # Team-Kürzel der Zuständigen – eine oder mehrere Personen
projects: [3d-druck-ag-ktg]   # Dateinamen der Projekte, zu denen sie gehört (ein Projekt hat viele Herausforderungen)
tags: []   # Stichworte; das event_tag eines Projekts verbindet ebenfalls mit dem Projekt
linked: []   # weitere Seiten: Termine, Geräte, Beiträge, z. B. [/calendar/…/]
personal: false   # true = aus einem privaten Projekt im Team
solution:   # wenn gelöst: wie, in Markdown – erscheint unter „Lösung“
uuid: 597d1b15-f640-4adc-999d-5de1569dcc2c
---

Wir brauchen die offene Software `https://github.com/Snapmaker/OrcaSlicer/releases` auf den Rechnern um arbeiten zu können. Zusätzlich schaut Falko nach Hardware außerhalb des Schul-IT-Ökosystem.

Konkret geht es um Version [v2.4.1](https://github.com/Snapmaker/OrcaSlicer/releases/tag/v2.4.1) und sehr wahrscheinlich (weil windows) um diesen Installer `https://github.com/Snapmaker/OrcaSlicer/releases/download/v2.4.1/Snapmaker_Orca_Windows_Installer_V2.4.1.exe`
Die Software ist quelloffen und frei verfügbar.

| Es gab Zurückhaltung warum auf der Download Seite so viele chinesische Schriftzeichen geschrieben sind. Die Erklärung ist sehr einfach, Snapmaker ist eine Firma aus China (wie die meiste Hardware in diesem Segment mit Ausname von Prusa aus Tchechien). Snapmaker verfolgt einen sehr offenen Ansatz und der Drucker und slicer basieren auf `open-source` Software und sind so nicht an chinesische Cloud Anbieter gebunden. Dies stellt kein Sicherheitsrisiko da, die Software wird von der Gemeinschaft überwacht und Snapmaker würde sich ihr Geschäft mit der Hardware komplett zerstören, wenn diese Software nicht sicher wäre. _Bei Interesse kann das Institut eine tiefere Analyse der Software zur Verfügung stellen, unsere langjährige Erfahrung im Bereich der Softwarendwicklung steht ihnen auf Anfrage gerne zur Verfügung_

Des weiteren würden wir auch OrcaSlicer von [v2.5.1](https://github.com/OrcaSlicer/OrcaSlicer/releases/tag/v2.5.1) installiert bekommen. OrcaSlicer ist auch quelloffen und frei verfügbar und gerade der Slicer der am wenigsten Bindung an einen einzelnen Drucker Hersteller hat.
`https://github.com/OrcaSlicer/OrcaSlicer/releases/tag/v2.5.1`

Das Rosalind Franklin Gymnasium und die Platanus Schule haben diese Software oder die Basis (Orcaslicer ohne snapmaker Plugin) bereits erfolgreich installiert.
