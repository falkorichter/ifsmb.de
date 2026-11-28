{%- comment -%}
  Template for a new team profile (_team/). No params.
{%- endcomment -%}
---
title: Vorname Nachname   # Anzeigename – der Dateiname (vorname-nachname) ist das Team-Kürzel für team/author/owner_team
role: Rolle im Makespace   # erscheint unter dem Namen, z. B. „hilft in der KTG-AG“
order: 50   # Reihenfolge auf /team/, kleiner = weiter vorne
not_in_team: false   # true = eigene Seite unter /team/<kürzel>/ und überall verlinkbar (team, author, owner_team, verlinkt), aber nicht auf /team/ gelistet
photo:   # /assets/images/team/<kürzel>-480w.jpg – nur mit Erlaubnis, ohne Metadaten; leer = kein Foto
photo_2x:   # optional: doppelt so großes Foto für scharfe Bildschirme
photo_icon:   # optional: rundes Mini-Foto (48 px) für die Kalenderseite
photo_credit:   # Bildnachweis – Pflicht bei Fremdfotos (Presse, Agentur)
links:   # Links zur Person (GitHub, Website …): Liste aus title, url und optional category (equipment, person, partner, event, post, project, challenge, press, link)
#  - title: GitHub
#    url: https://github.com/…
linked: []   # weitere Seiten, z. B. [/projects/3d-druck-ag-ktg/]
same_as: []   # optional: dieselbe Person auf einer anderen Instanz, z. B. [https://35services.ifsmb.de/team/…/] – nur https, für Links in beide Richtungen
theme:   # Aussehen der Seite, leer = wie die ganze Website; ifsmb, offene-werkstaetten, rfflabs oder slop (Liste: _data/themes.yml) – Besucher*innen können unten auf der Seite selbst wählen
social_media_preview_image:   # Vorschaubild beim Teilen (1200×630 px, ohne Metadaten), z. B. /assets/images/og-….jpg
encrypted: false   # true = Inhalt der Seite im Browser mit Passwort verschlüsseln
uuid: UUID-NEU   # zufällige Kennung für die Gelesen-Markierung – wird beim Klick erzeugt, nicht ändern
---

Kurzer Text über die Person in Markdown: was sie macht und womit sie im Makespace hilft. Keine Wohnadresse, keine privaten E-Mail-Adressen. Dateiname oben anpassen: vorname-nachname.
