{%- comment -%}
  Template for a finished project (_projects/, status: abgeschlossen → /projects/archive/). Params: team, partners, verlinkt, persoenlich.
  The start date is an example in the past on purpose – today's date would be wrong for a finished project.
{%- endcomment -%}
---
title: "Name des Projekts (Zeitraum)"
summary: Ein bis zwei Sätze, worum es ging – erscheint auf der Projektkarte im Archiv.
status: abgeschlossen   # erscheint unter „Vergangene Projekte“ (/projects/archive/)
personal: {{ include.personal | default: false }}   # true = privates Projekt aus dem Team (Person unter team): nur im Teamprofil
start: 2025-09-01   # Beginn des Projekts – bitte anpassen, wird zum Sortieren genutzt
period: Schuljahr 2025/26   # Text, z. B. „Herbst 2025“, „April – Juli 2024“ oder „Schuljahr 2024/25“
location:   # z. B. „Kurt-Tucholsky-Grundschule, Moabit“ – keine Wohnadressen
event_tag:   # eigenes Stichwort (nie ein allgemeines wie 35services): Beiträge und Termine mit diesem Stichwort erscheinen hier
tags: []   # weitere Stichworte, z. B. [ktg]
part_of:   # leer lassen! Nur für Teilprojekte: [dateiname-des-elternprojekts] – erscheinen dann nicht im Archiv
related: []   # Dateinamen verwandter Projekte, z. B. das Folgejahr: [ktg-ag-jahr-2]
team: [{{ include.team }}]   # Team-Kürzel der Beteiligten
partners: [{{ include.partners }}]   # Namen aus _data/partners.yml, in Anführungszeichen
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/calendar/…/, /news/…/]
image:   # Titelbild für die Projektkarte, z. B. /assets/images/projekte/<name>/01.jpg – ohne Metadaten, Kindergesichter unkenntlich
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
updates:   # kurze Notizen aus der Projektzeit, neueste zuerst – längere Berichte lieber als Beitrag mit dem event_tag
#  - date: 2025-12-01
#    text: Was passiert ist, in Markdown.
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

**Worum ging es?**

Ein paar Sätze: Für wen war das Projekt, was war das Ziel?

**Was wir gemacht haben:**

- Erster Schritt
- Zweiter Schritt

**Was daraus geworden ist:**

Ergebnis, was wir gelernt haben, wie es weitergeht (z. B. ein Folgeprojekt).

![Was auf dem Foto zu sehen ist](/assets/images/projekte/name-des-projekts/01.jpg)
{: .gallery}

Dateiname oben anpassen: kurzer Name mit Bindestrichen. Fotos ohne Metadaten ablegen, Kindergesichter, Namen und Kennzeichen unkenntlich machen.
