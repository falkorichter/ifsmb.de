# IfsMB-Pin (2-Farb-Druck)

Das Logo-Badge „IfsMB“ als Anstecker, ca. 52 × 24 × 2,6 mm.

| Datei | Inhalt |
|---|---|
| `ifsmb-pin.scad` | OpenSCAD-Quelle (Maße, Schrift, Drehung und Nadel-Aussparung als Parameter oben in der Datei) |
| `ifsmb-pin-gelb.stl` | gelbe Fläche |
| `ifsmb-pin-schwarz.stl` | Rückplatte mit Schatten, Rand und Schrift |
| `ifsmb-pin-oben.png`, `-3d.png`, `-hinten.png` | Vorschau |

## Drucken

1. Beide STLs zusammen als **ein Objekt mit zwei Teilen** laden (gleicher Ursprung, nicht verschieben).
   In Orca/Bambu Studio: beide Dateien gleichzeitig öffnen → „Als ein Objekt mit mehreren Teilen laden“.
2. Teil „gelb“ → gelbes Filament, Teil „schwarz“ → schwarzes Filament.
3. Flach auf der Rückseite drucken, 0,2 mm Schichthöhe; Farbwechsel nur in den oberen 1,4 mm.
4. Auf der Rückseite ist eine Aussparung (26 × 4,2 × 0,6 mm) für eine Anstecknadel zum Einkleben.

## Neu exportieren

```bash
openscad -D 'part="gelb"'    -o ifsmb-pin-gelb.stl    ifsmb-pin.scad
openscad -D 'part="schwarz"' -o ifsmb-pin-schwarz.stl ifsmb-pin.scad
```

Die Schrift ist wie im Logo auf ifsmb.de die Monospace-Systemschrift von macOS (SF Mono Heavy). Sie wird beim Rendern direkt aus dem Terminal-Programm von macOS geladen und liegt nicht im Repo. Auf anderen Systemen `font` oben in der Datei auf eine andere fette Monospace-Schrift stellen.
