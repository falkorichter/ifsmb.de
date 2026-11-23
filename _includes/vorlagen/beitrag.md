{%- comment -%}
  Template for a new post (_posts/). Rendered URL-encoded into the "➕ Beitrag" buttons (_includes/neu-buttons.html).
  Params: author, persoenlich, tags, verlinkt (inline YAML list content, e.g. "ktg, u1").
  JJJJ-MM-TT and TZTZ are replaced with today's date / UTC offset by JS when the button is clicked.
{%- endcomment -%}
---
title: "Titel des Beitrags"
date: JJJJ-MM-TT 12:00:00 TZTZ
author: {{ include.author | default: "falko-richter" }}   # Team-Kürzel (Dateiname in _team/), mehrere als Liste: [falko-richter, jan]
personal: {{ include.personal | default: false }}   # true = persönliches Update: nicht unter Neuigkeiten, sondern im Teamprofil („Persönlicher Blog“)
tags: [{{ include.tags }}]   # Stichworte, z. B. [ktg, 3d-drucker] – das event_tag eines Projekts zeigt den Beitrag auf der Projektseite
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/projects/3d-druck-ag-ktg/, /calendar/…/] – erscheinen unten bei „Verbindungen“
original_url:    # nur bei übernommenen Beiträgen: Adresse des Originals, sonst löschen
original_site:   # z. B. 35services.de, sonst löschen
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Text in Markdown. Dateiname oben anpassen: Datum und kurzer Titel mit Bindestrichen.

Fotos (ohne Metadaten, Kindergesichter unkenntlich) unter `assets/images/news/<dateiname>/01.jpg` ablegen und als Galerie einbinden:

![Was auf dem Foto zu sehen ist](/assets/images/news/name-des-beitrags/01.jpg)
{: .gallery}
