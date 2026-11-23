{%- comment -%}
  Template for a new project (_projects/). Params: team, partners, teil_von, verlinkt, persoenlich.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Name des Projekts"
summary: Ein bis zwei Sätze, worum es geht – erscheint auf der Projektkarte.
status: aktuell   # idee, anfrage, aktuell oder abgeschlossen (→ Archiv)
personal: {{ include.personal | default: false }}   # true = privates Projekt aus dem Team (Person unter team): nur im Teamprofil
start: JJJJ-MM-TT   # muss ein Datum sein, wird zum Sortieren genutzt
period: seit JJJJ   # Text, z. B. „seit 2026“ oder „Herbst 2026“
location:   # z. B. „Kurt-Tucholsky-Grundschule, Moabit“ – keine Wohnadressen
event_tag:   # eigenes Stichwort (nie ein allgemeines wie 35services): Beiträge und Termine mit diesem Stichwort erscheinen hier
part_of:{% if include.part_of %} [{{ include.part_of }}]{% endif %}   # leer lassen! Nur für Teilprojekte: [dateiname-des-elternprojekts] – erscheinen dann nicht in den Übersichten
related: []   # Dateinamen verwandter Projekte, z. B. [3d-druck-ag-ktg]
team: [{{ include.team }}]   # Team-Kürzel der Beteiligten
partners: [{{ include.partners }}]   # Namen aus _data/partners.yml, in Anführungszeichen
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/equipment/…/]
image:   # Titelbild, z. B. /assets/images/projekte/<name>/01.jpg – ohne Metadaten
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
updates:   # kurze Notizen ohne eigenen Beitrag, neueste zuerst – längere Updates lieber als Beitrag mit dem event_tag
#  - date: JJJJ-MM-TT
#    text: Was passiert ist, in Markdown.
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Beschreibung des Projekts in Markdown: Ziel, Stand, was gebraucht wird. Dateiname oben anpassen: kurzer Name mit Bindestrichen.
