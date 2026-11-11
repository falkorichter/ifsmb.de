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
| Jan | von Falko bereitgestellt (bewusst verwischtes Schwarzweiß-Porträt, ohne Metadaten) | Quadratisch auf das Gesicht zugeschnitten, 480/960 px |

Werkzeug: Python/Pillow (`ImageOps.exif_transpose`, Zuschnitt, Neuspeichern ohne EXIF) in 480 px und 960 px.

## Institutslogo

| Datei | Herkunft |
|---|---|
| `institut/ifsmb-logo-badge.png` | Badge aus dem Website-Header, mit Headless Chrome in 3× Auflösung gerendert (transparenter Hintergrund) |
| `institut/ifsmb-logo-wortmarke.png` | wie oben, mit Schriftzug „Institut für spontane Makespace Buildung“ |
| `institut/ifsmb-logo-badge.svg` | Vektorversion des Badges, nach den Maßen des PNG nachgebaut |
| `institut/ifsmb-logo-wortmarke.svg` | Vektorversion mit Schriftzug |

Die Schrift ist die System-Monospace bzw. System-UI-Schrift von macOS (SF Mono, wght 800; SF Pro, wght 700, opsz 28). In den SVGs ist der Text mit fontTools in Pfade umgewandelt, sie brauchen also keine installierte Schrift. Farben: `#ffcc00` (Gelb), `#16161d` (Schwarz), Badge um −3° gedreht.

## Übernommene Blogbeiträge

Bilder und Videos aus den Beiträgen von 35services.de (Autor: Falko Richter) liegen in `assets/images/news/<slug>/` und `assets/video/news/<slug>/`.
Bilder: auf max. 1600 px verkleinert plus 600-px-Vorschau, ohne Metadaten neu gespeichert. Videos: mit ffmpeg auf 720p (H.264, CRF 28) verkleinert, Metadaten entfernt (zusammen 220 MB → 6 MB).

## Fotos in eigenen Beiträgen

| Beitrag | Originale (nicht committet) | Bearbeitung |
|---|---|---|
| 3D-Druck in der Kita (20.10.2023) | `_logo/news/PXL_20231020_*.jpg` (4 Fotos, enthielten GPS-Daten) | Foto 1: alle sechs Köpfe mit starkem Weichzeichner unkenntlich gemacht (Vision-Gesichtserkennung fand nur ein Gesicht, die übrigen Köpfe wurden von Hand markiert); alle Fotos ohne Metadaten neu gespeichert, 1600 px + 600 px |
| Kita-Beitrag, Fotos 5–8 | `_logo/news/PXL_2023102*.jpg` | Namen der Kinder auf den Zahnbürstenetuis (Fotos 6 und 8) unkenntlich gemacht |
| 3D-Drucker im Fröbel-Kindergarten (12.01.2024) | `_logo/news/froebel/` und die ZIP-Datei | 10 Fotos ohne Metadaten; 3 Videos auf 720p ohne Tonspur (Kinderstimmen), Gesichtsprüfung aller Videosekunden ohne Treffer |
| Termin: Ausflug zu Max (29.04.2024) | `_logo/kalender/max/` | Kindergesichter unkenntlich gemacht: 12 in Foto 1, 3 in Foto 2, 2 in Foto 4; Max (Erwachsener) nicht verpixelt |
| Unboxing des ersten 35services-Druckers (12.06.2024) | `_logo/news/unboxing/` und die ZIP-Datei | 15 Fotos ohne Metadaten, Kennzeichen zweier Autos (Foto 2) unkenntlich gemacht; 5 Videos auf 720p ohne Tonspur (ein Kind war dabei); Gesichtsprüfung: nur ein Erwachsener in Video 3 (Sek. 31–35), nicht verpixelt |
| Termin: Ausflug zu Philippe Bietenholz (15.12.2025) | `_logo/kalender/bietenholz/DSC03919.JPG` (Sony-Kamera, ohne GPS) | Gesichter von 6 Kindern und 2 Personen im Hintergrund unkenntlich gemacht; der vortragende Erwachsene nicht verpixelt |
| Ausstattung (3 Fotos) | `_logo/ausstattung/` | Foto A1 mini: handschriftlicher Kindername auf dem AG-Anmeldezettel und Google-Classroom-Beitrittscode unkenntlich gemacht; alle ohne Metadaten (enthielten GPS) |

## Nachtschicht 07.11.2026 – Ausstattung und Archiv

| Was | Original (nicht committet) | Bearbeitung |
|---|---|---|
| Ausstattungsfotos (A1 mini Platanus, Core-XY Anton, LulzBot Mini ×2, Snapmaker U1) | `_logo/ausstattung/` (lagen vorher roh in `_equipment/`, mit GPS) | ohne Metadaten neu gespeichert; im Congress-Foto des LulzBot Mini (02) den Hintergrund mit Teilnehmenden unkenntlich gemacht |
| AxiDraw-Video | `_logo/ausstattung/axidraw v3.mp4` (100 MB, 4K, mit Ortsangabe) | 720p, ohne Ton und Metadaten (452 KB) |
| MK3S-Zeitraffer (Infinite Cube, Servo-Halterung, Achsgehäuse) | `~/Downloads/*MK3S*.mp4` (OctoPrint-Kamera) | 720p bzw. 480p, ohne Ton/Metadaten (≈ 7 MB zusammen) |
| Bilder aus „DIY – eine 3D Druck und Elektronik AG“ (2024) | 35services.de | 9 Bilder, ohne Metadaten; keine Personen |
| Instagram-QR-Code im Rosalind-Franklin-Beitrag | 35services.de | übernommen |
| German RepRap X400 (5 Fotos, per Signal von Ralf) | `_logo/ausstattung/german-reprap-x400/` | ohne Metadaten neu gespeichert, 1600 px + 600 px; keine Personen |
| iPad-Stifte (KTG, 10.11.2026) | nicht im Repo (Chat-Upload) | ohne Metadaten neu gespeichert, unten abgeschnitten (Füße einer Person im Bild), 1600 px + 600 px |
| Foto-Import 10.11.2026 (Mikroskop, Dracheneier, Filamentspende, Herbstbasteln, Moldlay, PC-Blend, Mogster, Rosalind-Franklin-Gymnasium, Platanus, ReUseMe) | `_logo/news/2026-11-10-import/` (Ordner = Dateiname des Uploads, Zips daneben) | alle ohne Metadaten (enthielten GPS), 1600 px + 600 px; ReUseMe: Kamerabild der Klasse auf Tafel und Laptop sowie ein Hinterkopf unkenntlich, die Fotos mit vielen Kindern und Zugangsdaten an der Tafel (132529429, 132618970) nicht verwendet; Videos 720p ohne Ton, keine Personen |
| Platanus Mehrfarbdruck (04.11.2026) | `_logo/news/2026-11-10-platanus-mehrfarbdruck/` (mit Zip) | ohne Metadaten (enthielten GPS); auf Foto 2 die Schrift auf dem Anhänger (wohl ein Name) unkenntlich gemacht |
| Infinite Cube Referenz (03.11.2026) | `_logo/news/2026-11-10-infinite-cube-referenz/` (mit Zip) | 4 Fotos ohne Metadaten (enthielten GPS); keine Personen |
| iPad-Stifte laden (02.11.2026) | `_logo/news/2026-11-10-ipad-stifte-laden/` (mit Zip) | 4 Fotos ohne Metadaten; geprägte Beschriftung zweier gedruckter Haken (wohl Namen) unkenntlich, Foto 1 unten abgeschnitten (Schuh) |
| Notebook der KTG (02.11.2026) | `_logo/news/2026-11-10-notebook-ktg/` | ohne Metadaten |
| Tag der offenen Tür RFG (Druckauftrag) | `_logo/kalender/2026-11-28-tag-der-offenen-tuer-rosalind-franklin-gymnasium/` | Screenshot als JPG; Zeitraffer der Druckerkamera 720p ohne Ton, keine Personen |
| itslearning-Kurs RFG (Screenshot) | `_logo/news/2026-11-10-itslearning/` | Namen und Foto der Kursleitung außer Falko Richter unkenntlich gemacht |
| Profilfoto Frieder | `_logo/team/frieder-euteneuer-original.png` | quadratisch zugeschnitten (480 px + 48 px); © Sergej Glanze / FUNKE Foto Services – Nachweis im Profil (`photo_credit`) |
| Lastenanhänger vom Theater (11.11.2026) | `_logo/news/2026-11-11-lastenanhaenger-vom-theater/` | ohne Metadaten neu gespeichert; keine Personen |
| Illustrationen | eigene SVGs | `assets/images/ausstattung/illustration-drucker.svg` (kartesischer Drucker), `3d-scanner/illustration.svg`, `flsun-v400/illustration.svg` |
