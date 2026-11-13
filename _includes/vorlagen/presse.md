{%- comment -%}
  Template for a new press release (_press/). Params: tags, verlinkt.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Überschrift der Pressemitteilung"
subtitle:   # optionale Unterzeile
date: JJJJ-MM-TT
tags: [{{ include.tags }}]   # Stichworte, z. B. [ktg]
verlinkt: [{{ include.verlinkt }}]   # weitere Seiten, z. B. [/projekte/…/]
contact_name:   # leer = Pressekontakt aus _data/presse.yml
contact_email_b64:   # E-Mail base64-kodiert: printf 'name@example.org' | base64
contact_email_anzeige:   # E-Mail in lesbarer, verschleierter Form: name [at] example.org
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

**Berlin, JJJJ-MM-TT** – Erster Absatz mit dem Wichtigsten: wer, was, wann, wo, warum.

Weitere Absätze in Markdown. Dateiname oben anpassen: Datum und kurzer Titel mit Bindestrichen.
