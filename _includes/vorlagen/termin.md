{%- comment -%}
  Template for a new event (_events/). Params: team, tags, projekte, partners, verlinkt, persoenlich.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Name des Termins"
start: JJJJ-MM-TT 16:00
end: JJJJ-MM-TT 18:00   # leer lassen = 2 Stunden
all_day: false   # true = ganztägig, Uhrzeiten werden ignoriert
date_label:   # Text statt Datum, wenn der Tag noch nicht feststeht, z. B. „Januar 2027 – genauer Termin folgt“
location: "Ort, Straße (keine Wohnadressen)"
location_url:   # Link zum Ort oder zur Veranstaltung
summary: Ein Satz für die Terminliste und den iCal-Kalender.
team: [{{ include.team }}]   # Team-Kürzel der Leute, die dabei sind – nur wer wirklich da war/ist
tags: [{{ include.tags }}]   # Stichworte; das event_tag eines Projekts zeigt den Termin auf der Projektseite
projekte: [{{ include.projekte }}]   # Projekt-Dateinamen, zusätzlich zu Projekten über die Stichworte
partners: [{{ include.partners }}]   # Namen aus _data/partners.yml, in Anführungszeichen
verlinkt: [{{ include.verlinkt }}]   # weitere Seiten, z. B. [/projekte/…/]
persoenlich: {{ include.persoenlich | default: false }}   # true = privater Termin aus dem Team (braucht team): nur im Teamprofil
nur_projekt: false   # true = interner Termin: vorher nur auf der Projektseite, danach normal unter „Vergangene Termine“
gallery:   # Fotos nach dem Termin, Liste aus image, thumb, alt – unter assets/images/kalender/<termin>/
#  - image: /assets/images/kalender/name-des-termins/01.jpg
#    thumb: /assets/images/kalender/name-des-termins/01-600w.jpg
#    alt: Was auf dem Foto zu sehen ist
---

Beschreibung in Markdown: Was passiert, wer kann kommen, was mitbringen. Dateiname oben anpassen: Datum und kurzer Name mit Bindestrichen.
