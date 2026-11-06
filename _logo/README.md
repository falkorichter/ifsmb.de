# Original-Logos

Originale, unbearbeitete Logo-Dateien. Ausgeliefert werden nur die Kopien in `assets/images/partner/`.

| Datei | Herkunft |
|---|---|
| `partner/kurt-tucholsky-grundschule.png` | kurt-tucholsky-grundschule.de (Header-Logo, abgerufen 06.11.2026) |
| `partner/35services.png` | 35services.de (Header-Logo, invertiert/transparent → braucht dunklen Hintergrund) |
| `partner/rosalind-franklin-gymnasium.png` | rosalind-franklin-gymnasium.de (Logo-RFG-Schwarz-4x, für die Website auf 600 px Breite verkleinert) |
| `partner/jugendhackt.svg` | jugendhackt.org (JH_Logo_RGB.svg) |
| `partner/pc-spende.svg` | pc-spende.das-macht-schule.net (Header-Logo pcspende_logo.svg, abgerufen 06.11.2026) |
| `partner/taschenstation.svg` | taschenstation.de (inline-SVG-Symbol `#cf-icon--logo` aus dem Seitenkopf extrahiert, Schriftzug „ReUseMe“, abgerufen 06.11.2026) |
| `partner/bietenholz.jpeg` | bietenholz.design (Site-Icon logo_bietenholz2.jpeg, 512 × 512; für die Website auf 400 px verkleinert, abgerufen 06.11.2026) |
| HeartLabs | **fehlt** – Printables blockiert automatische Abrufe, Instagram braucht Login; Text-Platzhalter wird angezeigt |
| Förderverein der Kurt-Tucholsky-Grundschule | **fehlt** – Website hat kein Logo, Text-Platzhalter wird angezeigt |

## Team-Fotos

Die Originale in `_logo/team/` werden **nicht** ins Repo committet (`.gitignore`), weil Handyfotos oft GPS-Koordinaten und andere Metadaten enthalten. Ausgeliefert werden nur die zugeschnittenen Versionen in `assets/images/team/`; sie werden ohne jegliche Metadaten neu gespeichert.

| Person | Quelle | Bearbeitung |
|---|---|---|
| Falko Richter | eigenes Foto (Pixel 10 Pro, enthielt GPS-Daten) | Quadratisch auf das Gesicht zugeschnitten, Namensschild mit QR-Codes/WLAN-Passwort weggeschnitten |
| Philipp Schalldach | von Falko bereitgestellt | Quadratisch auf das Gesicht zugeschnitten |
| Gregor Dill | XING-Profilbild (xing.com/profile/Gregor_Dill) | Nur verkleinert |

Werkzeug: Python/Pillow (`ImageOps.exif_transpose`, Zuschnitt, Neuspeichern ohne EXIF) in 480 px und 960 px.

## Institutslogo

| Datei | Herkunft |
|---|---|
| `institut/ifsmb-logo-badge.png` | Badge aus dem Website-Header, mit Headless Chrome in 3× Auflösung gerendert (transparenter Hintergrund) |
| `institut/ifsmb-logo-wortmarke.png` | wie oben, mit Schriftzug „Institut für spontane Makespace Buildung“ |

Die Schrift ist die System-Monospace bzw. System-UI-Schrift von macOS – es gibt (noch) keine Vektorversion.

## Übernommene Blogbeiträge

Bilder und Videos aus den Beiträgen von 35services.de (Autor: Falko Richter) liegen in `assets/images/news/<slug>/` und `assets/video/news/<slug>/`.
Bilder: auf max. 1600 px verkleinert plus 600-px-Vorschau, ohne Metadaten neu gespeichert. Videos: mit ffmpeg auf 720p (H.264, CRF 28) verkleinert, Metadaten entfernt (zusammen 220 MB → 6 MB).
