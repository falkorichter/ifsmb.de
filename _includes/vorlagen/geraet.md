{%- comment -%}
  Template for new equipment (_equipment/). Params: owner_team, owner_partner, tags, verlinkt.
{%- endcomment -%}
---
title: "Hersteller Modell"
category: 3D-Drucker   # gruppiert /equipment/: enthält „3D-Drucker“, „3D-Scanner“ oder etwas anderes
summary: Ein bis zwei Sätze, was das Gerät kann und wofür wir es nutzen.
owner_team: {{ include.owner_team }}   # Team-Kürzel der Besitzer*in (Liste möglich) – das Institut besitzt selbst nichts
owner_partner: {{ include.owner_partner }}   # Name aus _data/partners.yml (Liste möglich)
owner_name:   # andere Besitzer*innen als freier Text
location:   # wo das Gerät steht, z. B. „KTG, Raum 101“
location_partner:   # Partnername, wenn das Gerät bei einem Partner steht
status:   # leer, in-aussicht, in-reparatur oder im-test
image:   # eigenes Foto (ohne Metadaten) – keine Hersteller- oder Shopfotos
thumb:   # kleines Vorschaubild, z. B. …-600w.jpg
image_alt:   # Beschreibung des Fotos
image_caption:   # optionale Bildunterschrift
image_is_illustration: false   # true = eigene SVG-Illustration statt Foto
tags: [{{ include.tags }}]   # Gerät, Gerätetyp, Besitzer*in, z. B. [bambu-lab-a1-mini, 3d-drucker]
linked: [{{ include.linked }}]   # weitere Seiten, z. B. [/projects/…/]
same_as: []   # optional: dasselbe Gerät auf einer anderen Instanz, z. B. [https://35services.ifsmb.de/equipment/…/] – nur https, für Links in beide Richtungen
links:   # externe Links: Liste aus title, url und category (equipment, person, partner, event, post, project, challenge, press, link = beliebiger Link wie ein Instagram-Beitrag) – erscheinen unten bei „Verbindungen“ in der passenden Gruppe
gallery:   # weitere Fotos, Liste aus image, thumb, alt
#  - image: /assets/images/ausstattung/name/02.jpg
#    thumb: /assets/images/ausstattung/name/02-600w.jpg
#    alt: Was auf dem Foto zu sehen ist
videos:   # Videos, Liste aus src, poster, caption (720p-MP4 in assets/video/)
#  - src: /assets/video/ausstattung/name/01.mp4
#    poster: /assets/video/ausstattung/name/01.jpg
#    caption: Was im Video passiert
updates:   # Stand / Updates: kurze Notizen mit Datum, neueste zuerst (Text in Markdown, auch mit Fotos als {: .gallery})
#  - date: JJJJ-MM-TT
#    text: Was sich am Gerät getan hat.
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
encrypted: false   # true = Inhalt der Seite im Browser mit Passwort verschlüsseln
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Beschreibung in Markdown: Was das Gerät kann, Erfahrungen, Tipps. Dateiname oben anpassen: Modell mit Bindestrichen.
