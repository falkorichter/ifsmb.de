{%- comment -%}
  Template for a new press release (_press/). Params: tags, verlinkt.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Überschrift der Pressemitteilung"
subtitle:   # optionale Unterzeile
date: JJJJ-MM-TT
tags: [{{ include.tags }}]   # Stichworte, z. B. [ktg]
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/projects/…/]
contact_name:   # leer = Pressekontakt aus _data/press.yml
contact_email_b64:   # E-Mail base64-kodiert: printf 'name@example.org' | base64
contact_email_display:   # E-Mail in lesbarer, verschleierter Form: name [at] example.org
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

**Berlin, JJJJ-MM-TT** – Erster Absatz mit dem Wichtigsten: wer, was, wann, wo, warum.

Weitere Absätze in Markdown. Dateiname oben anpassen: Datum und kurzer Titel mit Bindestrichen.
