{%- comment -%}
  Template for a new challenge (_herausforderungen/). Params: team, projekte, tags, verlinkt, persoenlich.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Was ist die Herausforderung? (kurz, gern als Frage)"
summary: Ein Satz, worum es geht – erscheint auf der Karte.
art: frage   # aufgabe, problem oder frage
status: offen   # offen, in-arbeit oder geloest
seit: JJJJ-MM-TT   # seit wann die Herausforderung besteht
geloest_am:   # Datum, wenn gelöst
team: [{{ include.team }}]   # Team-Kürzel der Zuständigen – eine oder mehrere Personen
projekte: [{{ include.projekte }}]   # Dateinamen der Projekte, zu denen sie gehört (ein Projekt hat viele Herausforderungen)
tags: [{{ include.tags }}]   # Stichworte; das event_tag eines Projekts verbindet ebenfalls mit dem Projekt
verlinkt: [{{ include.verlinkt }}]   # weitere Seiten: Termine, Geräte, Beiträge, z. B. [/kalender/…/]
persoenlich: {{ include.persoenlich | default: false }}   # true = aus einem privaten Projekt im Team
loesung:   # wenn gelöst: wie, in Markdown – erscheint unter „Lösung“
---

Beschreibung in Markdown: Was ist das Problem, was wurde schon probiert, was wird gebraucht? Dateiname oben anpassen: kurzer Name mit Bindestrichen.
