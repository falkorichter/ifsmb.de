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
projects: [{{ include.projects }}]   # Projekt-Dateinamen, zusätzlich zu Projekten über die Stichworte
partners: [{{ include.partners }}]   # Namen aus _data/partners.yml, in Anführungszeichen
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/projects/…/]
personal: {{ include.personal | default: false }}   # true = privater Termin aus dem Team (braucht team): nur im Teamprofil
project_only: false   # true = interner Termin: vorher nur auf der Projektseite, danach normal unter „Vergangene Termine“
gallery:   # Fotos nach dem Termin, Liste aus image, thumb, alt – unter assets/images/kalender/<termin>/
#  - image: /assets/images/kalender/name-des-termins/01.jpg
#    thumb: /assets/images/kalender/name-des-termins/01-600w.jpg
#    alt: Was auf dem Foto zu sehen ist
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Beschreibung in Markdown: Was passiert, wer kann kommen, was mitbringen. Dateiname oben anpassen: Datum und kurzer Name mit Bindestrichen.
