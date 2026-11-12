{%- comment -%}
  Template for a new project (_projects/). Params: team, partners, teil_von, verlinkt, persoenlich.
  JJJJ-MM-TT is replaced with today's date by JS when the button is clicked.
{%- endcomment -%}
---
title: "Name des Projekts"
summary: Ein bis zwei Sätze, worum es geht – erscheint auf der Projektkarte.
status: aktuell   # idee, anfrage, aktuell oder abgeschlossen (→ Archiv)
persoenlich: {{ include.persoenlich | default: false }}   # true = privates Projekt aus dem Team (Person unter team): nur im Teamprofil
start: JJJJ-MM-TT   # muss ein Datum sein, wird zum Sortieren genutzt
zeitraum: seit JJJJ   # Text, z. B. „seit 2026“ oder „Herbst 2026“
ort:   # z. B. „Kurt-Tucholsky-Grundschule, Moabit“ – keine Wohnadressen
event_tag:   # eigenes Stichwort (nie ein allgemeines wie 35services): Beiträge und Termine mit diesem Stichwort erscheinen hier
teil_von:{% if include.teil_von %} [{{ include.teil_von }}]{% endif %}   # leer lassen! Nur für Teilprojekte: [dateiname-des-elternprojekts] – erscheinen dann nicht in den Übersichten
verwandt: []   # Dateinamen verwandter Projekte, z. B. [3d-druck-ag-ktg]
team: [{{ include.team }}]   # Team-Kürzel der Beteiligten
partners: [{{ include.partners }}]   # Namen aus _data/partners.yml, in Anführungszeichen
verlinkt: [{{ include.verlinkt }}]   # weitere Seiten, z. B. [/ausstattung/…/]
image:   # Titelbild, z. B. /assets/images/projekte/<name>/01.jpg – ohne Metadaten
updates:   # kurze Notizen ohne eigenen Beitrag, neueste zuerst – längere Updates lieber als Beitrag mit dem event_tag
#  - datum: JJJJ-MM-TT
#    text: Was passiert ist, in Markdown.
---

Beschreibung des Projekts in Markdown: Ziel, Stand, was gebraucht wird. Dateiname oben anpassen: kurzer Name mit Bindestrichen.
