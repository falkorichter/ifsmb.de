{%- comment -%}
  Template for new equipment (_equipment/). Params: owner_team, owner_partner, tags, verlinkt.
{%- endcomment -%}
---
title: "Hersteller Modell"
kategorie: 3D-Drucker   # gruppiert /ausstattung/: enthält „3D-Drucker“, „3D-Scanner“ oder etwas anderes
summary: Ein bis zwei Sätze, was das Gerät kann und wofür wir es nutzen.
owner_team: {{ include.owner_team }}   # Team-Kürzel der Besitzer*in (Liste möglich) – das Institut besitzt selbst nichts
owner_partner: {{ include.owner_partner }}   # Name aus _data/partners.yml (Liste möglich)
owner_name:   # andere Besitzer*innen als freier Text
standort:   # wo das Gerät steht, z. B. „KTG, Raum 101“
standort_partner:   # Partnername, wenn das Gerät bei einem Partner steht
status:   # leer, in-aussicht, in-reparatur oder im-test
image:   # eigenes Foto (ohne Metadaten) – keine Hersteller- oder Shopfotos
thumb:   # kleines Vorschaubild, z. B. …-600w.jpg
image_alt:   # Beschreibung des Fotos
image_caption:   # optionale Bildunterschrift
image_is_illustration: false   # true = eigene SVG-Illustration statt Foto
tags: [{{ include.tags }}]   # Gerät, Gerätetyp, Besitzer*in, z. B. [bambu-lab-a1-mini, 3d-drucker]
verlinkt: [{{ include.verlinkt }}]   # weitere Seiten, z. B. [/projekte/…/]
gallery:   # weitere Fotos, Liste aus image, thumb, alt
#  - image: /assets/images/ausstattung/name/02.jpg
#    thumb: /assets/images/ausstattung/name/02-600w.jpg
#    alt: Was auf dem Foto zu sehen ist
videos:   # Videos, Liste aus src, poster, caption (720p-MP4 in assets/video/)
#  - src: /assets/video/ausstattung/name/01.mp4
#    poster: /assets/video/ausstattung/name/01.jpg
#    caption: Was im Video passiert
---

Beschreibung in Markdown: Was das Gerät kann, Erfahrungen, Tipps. Dateiname oben anpassen: Modell mit Bindestrichen.
