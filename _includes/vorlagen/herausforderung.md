{%- comment -%}
  Template for a new challenge (_challenges/). Params: team, projekte, tags, verlinkt, persoenlich, wichtig, dringend ("true"/"false").
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Was ist die Herausforderung? (kurz, gern als Frage)"
summary: Ein Satz, worum es geht – erscheint auf der Karte.
kind: frage   # aufgabe, problem oder frage
status: offen   # offen, in-arbeit oder geloest
since: JJJJ-MM-TT   # seit wann die Herausforderung besteht
solved_on:   # Datum, wenn gelöst
important: {{ include.important | default: false }}   # Eisenhower-Matrix: true/false
urgent: {{ include.urgent | default: false }}   # true/false – wichtig+dringend = sofort, nur wichtig = einplanen, nur dringend = abgeben, keins = später
team: [{{ include.team }}]   # Team-Kürzel der Zuständigen – eine oder mehrere Personen
projects: [{{ include.projects }}]   # Dateinamen der Projekte, zu denen sie gehört (ein Projekt hat viele Herausforderungen)
tags: [{{ include.tags }}]   # Stichworte; das event_tag eines Projekts verbindet ebenfalls mit dem Projekt
linked: [{{ include.linked }}]   # weitere Seiten: Termine, Geräte, Beiträge, z. B. [/calendar/…/]
personal: {{ include.personal | default: false }}   # true = aus einem privaten Projekt im Team
solution:   # wenn gelöst: wie, in Markdown – erscheint unter „Lösung“
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Beschreibung in Markdown: Was ist das Problem, was wurde schon probiert, was wird gebraucht? Dateiname oben anpassen: kurzer Name mit Bindestrichen.
