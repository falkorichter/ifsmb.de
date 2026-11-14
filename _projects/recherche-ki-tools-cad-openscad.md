---
title: "Recherche: KI-Tools für CAD mit OpenSCAD"
summary: Falko testet, wie gut KI-Agenten wie Claude Code 3D-Modelle konstruieren – erst mit OpenSCAD, dann im direkten Vergleich mit SolidCraft und Onshape FeatureScript über MCP.
status: aktuell
start: 2026-11-01
zeitraum: seit November 2026
event_tag: ki-cad
tags: [ki-cad, onshape]
team:
  - falko-richter
partners:
  - 35 services e. V.
persoenlich: true
updates:
  - datum: 2026-11-11
    text: |-
      **Ein Bauteil, drei CAD-Wege (`3d-cad-llm-comparison`):** Im neuen Repository **[3d-cad-llm-comparison](https://github.com/falkorichter/3d-cad-llm-comparison)** hat Falko denselben parametrischen, 3D-druckbaren **Halter für Gastronorm-Behälter (GN 1/1)** – geteilt für ein `256×256-mm`-Druckbett – parallel von KI-Agenten in drei verschiedenen Werkzeugen konstruieren lassen ([Protokoll](https://github.com/falkorichter/3d-cad-llm-comparison/blob/main/challenges/01-gn-holder/LOG.md) & [Gegenüberstellung](https://github.com/falkorichter/3d-cad-llm-comparison/blob/main/docs/featurescript-openscad-solidcraft.md)):

      - **[OpenSCAD](https://github.com/falkorichter/3d-cad-llm-comparison/tree/main/challenges/01-gn-holder/openscad) (Referenz):** ~15 Minuten, `.scad`-Code mit Schwalbenschwanz-Steckverbindungen ohne Schrauben (14 Druckteile, nur STL, kein STEP).
      - **[SolidCraft](https://github.com/tangency-labs/solidcraft) über MCP ([`solidcraft/`](https://github.com/falkorichter/3d-cad-llm-comparison/tree/main/challenges/01-gn-holder/solidcraft)):** ~15 Minuten, der Agent steuert das lokale B-Rep-CAD per `solidcraft-cli mcp` und baut einen Feature-Baum aus 58 Features mit Parametern (18 Teile mit M4-Verbindungslaschen und Schmelzeinsätzen, Export als STEP + STL, Prüfung direkt über `measure`).
      - **[Onshape FeatureScript MCP](https://github.com/falkorichter/3d-cad-llm-comparison/tree/main/challenges/01-gn-holder/onshape):** ~20 Minuten über den Remote-MCP-Server von Onshape Labs (`https://fs-mcp.labs.onshape.app/mcp` per HTTP + OAuth). Der Agent schreibt ein eigenes Onshape-Feature **„GN Holder“** in FeatureScript mit echtem Parameter-Dialog im Part Studio (18 Teile, STEP + STL).

      Alle drei Wege lieferten in rund 15 bis 20 Minuten denselben Rahmen – die Mittelschiene stimmt zwischen SolidCraft (`78.679,3 mm³`) und Onshape (`78.679,0 mm³`) auf den Kubikmillimeter überein. ([CADCraft](https://github.com/storytold/cadcraft) wurde ebenfalls per MCP angebunden, ist aber rein für 2D-Zeichnungen gedacht.)

      ![Der GN-1/1-Halter in OpenSCAD: 14 farbig unterschiedene Druckteile mit Schwalbenschwanz-Verbindungen](/assets/images/projekte/recherche-ki-tools-cad-openscad/01.jpg)
      ![Derselbe GN-Halter in SolidCraft, vom Agenten über MCP als B-Rep-Modell mit M4-Verbindungslaschen aufgebaut](/assets/images/projekte/recherche-ki-tools-cad-openscad/02.jpg)
      ![Das vom Agenten geschriebene Feature „GN Holder“ in Onshape mit geöffnetem Parameter-Dialog und den 18 erzeugten Bauteilen](/assets/images/projekte/recherche-ki-tools-cad-openscad/03.jpg)
      {: .gallery}
uuid: f5664da6-2f25-45a9-b3e0-317d9a96cd93
---

Falko experimentiert mit [Claude Code](https://claude.com/claude-code) und schaut, wie gut ein KI-Agent 3D-Modelle konstruieren kann – angefangen mit [OpenSCAD](https://openscad.org/) und inzwischen auch mit parametrischen B-Rep-Werkzeugen über MCP ([SolidCraft](https://github.com/tangency-labs/solidcraft) und [Onshape FeatureScript](https://www.onshape.com/)). Unter diesen Links könnt ihr sehen, was schon alles funktioniert:

- [3d-cad-llm-comparison](https://github.com/falkorichter/3d-cad-llm-comparison) – Vergleich zwischen OpenSCAD, SolidCraft (MCP) und Onshape FeatureScript (MCP) am selben Bauteil
- [linear-actuator-crane](https://github.com/falkorichter/linear-actuator-crane)
- [open-mog](https://github.com/falkorichter/open-mog) (noch privat)

Zusammen mit Anton aus der Werkstatt wurde auch ausprobiert, ob ein KI-Heimserver ([opencode-config](https://github.com/falkorichter/opencode-config)) mit [opencode](https://opencode.ai/) und einem Open-Weight-Modell ebenfalls in der Lage ist, mit OpenSCAD zu konstruieren. Es hat ein bisschen geklappt.

Das ist erst einmal Falkos persönliches Projekt – sobald weitere Leute einsteigen, machen wir ein Projekt des Instituts daraus. Lust mitzumachen? [Meldet euch!]({{ '/angebot/' | relative_url }})
