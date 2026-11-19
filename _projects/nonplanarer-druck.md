---
title: "Non-Planar 3D Druck"
summary: Falko, Alexander und Jan ergründen nonplanaren 3D-Druck. Alexander druckt schon zweifarbig nonplanar und hat mit Impasto ein Werkzeug gebaut, das auf fertig geslicten G-Code eine zusätzliche Dekorschicht legt – bis zu vier Farben.
status: aktuell
persoenlich: true
start: 2026-11-15
zeitraum: seit November 2026
event_tag: nonplanar
tags: [nonplanar, impasto, 3d-drucker, bambu-lab-a1-mini, 35services]
team:
  - falko-richter
  - alexander-riedel
  - jan
partners:
  - 35 services e. V.
verlinkt:
  - /todos/#falko-richter/non-planar-slicing
  - /ausstattung/35services-bambu-lab-a1-mini/
  - /presse/#badge
updates:
  - datum: 2026-11-17
    text: |-
      **Das Werkzeug hat jetzt einen Namen:** Aus dem Arbeitstitel „Non-Planar GCoder" ist **Impasto** geworden – der Malerbegriff für Farbe, die so dick aufgetragen ist, dass die Pinselspur aus der Fläche steht. Version 0.4.0 liegt offen auf GitHub: [3p1cball-code/impasto](https://github.com/3p1cball-code/impasto) (AGPL-3.0-or-later).

      Neben dem Namen ist einiges dazugekommen: eine Kollisionsprüfung gegen Kopfprofile, echte Prioritätsregeln bei überlappenden Elementen, ein Wipe beim Rückzug gegen Oozing, ein Schrägen-Ausgleich und ein Warp-Ausgleich, der die Düse über einem verzogenen Bauteil nicht schleifen lässt.
  - datum: 2026-11-15
    text: |-
      **Eigener Prozess für nachträglich angepassten G-Code:** Aus verschiedenen Quellen aus dem Netz, seinen eigenen Vorlieben und den Funktionen, die er braucht, hat [Alexander](/team/alexander-riedel/) einen eigenen Prozess entwickelt, um G-Code im Nachhinein anzupassen („Non-Planar GCoder“). Damit behält man die gewohnte Qualität und den normalen Druckprozess aus Bambu Studio – plus optional eine **nonplanare Deckschicht (Top Layer)** auf der gewölbten Oberfläche.

      ![3D-Vorschau auf dem Druckbett: schwarze Brillenfassung auf Baumstützen mit weißen, gewellten nonplanaren Bahnen auf der gewölbten Oberseite](/assets/images/projekte/nonplanarer-druck/01.jpg)
      ![Nahaufnahme der gedruckten schwarzen Brillenfassung: die weißen, geschwungenen Linien folgen als nonplanare Deckschicht der Wölbung des Rahmens](/assets/images/projekte/nonplanarer-druck/02.jpg)
      {: .gallery}

      ![Bildschirmaufnahme von Alexanders Tool „Non-Planar GCoder“: Auf der geladenen Brillenfassung aus Bambu Studio werden Wellenmuster, Konturen und Text als nonplanare Deckschicht angelegt und als G-Code erzeugt](/assets/video/projekte/nonplanarer-druck/02.mp4)
image: /assets/video/projekte/nonplanarer-druck/01.jpg
uuid: 8ec30934-7816-47da-ac7e-7e7407465672
---

Ein neues privates Projekt von [Alexander Riedel]({{ '/team/alexander-riedel/' | relative_url }}) – und [Falko]({{ '/team/falko-richter/' | relative_url }}) und [Jan]({{ '/team/jan/' | relative_url }}) sind auch total interessiert. Der [Bambu Lab A1 mini]({{ '/ausstattung/35services-bambu-lab-a1-mini/' | relative_url }}) von [35services e. V.]({{ '/partner/35services/' | relative_url }}) ist ideal für dieses Experiment. Wir wollen **nonplanaren 3D-Druck** ergründen. Normalerweise druckt ein 3D-Drucker in flachen Schichten übereinander. Beim nonplanaren Druck folgen die Schichten dagegen der Form des Bauteils – gewölbte Oberflächen werden glatt statt treppenförmig.

Alexander hat das schon ausprobiert: Er druckt **zweifarbig nonplanar** und experimentiert weiter. Im Video entsteht eine Brillenfassung – der schwarze Unterbau steht auf Baumstützen, die weiße Oberfläche wird nonplanar obendrauf gedruckt und folgt der Wölbung der Brille.

![Ein Bambu-Lab-Drucker druckt eine Brillenfassung: schwarzer Unterbau auf Baumstützen, darauf eine weiße, gewölbte nonplanare Oberfläche](/assets/video/projekte/nonplanarer-druck/01.mp4)

## Impasto – das Werkzeug dahinter
{: #impasto}

Wer eine gewölbte Fläche druckt, bekommt Treppen. Non-planarer Druck löst das, indem die Düse der Form folgt statt in flachen Schichten zu bleiben – die Oberfläche wird glatt, weil die Bahnen sich der Wölbung anschmiegen.

**Impasto** geht dabei einen anderen Weg als ein non-planarer Slicer: Es slict nicht neu, sondern nimmt den **fertig geslicten G-Code aus Bambu Studio** und hängt genau **eine zusätzliche Schicht** an – die Dekoration. Damit bleibt die gewohnte Druckqualität und der normale Arbeitsablauf erhalten, und obendrauf kommt Farbe.

![Der 2D-Entwurf in Impasto: über einer Brillenfront liegen wellenförmige Linien als non-planare Deckschicht](/assets/images/projekte/nonplanarer-druck/03.jpg)
{: .gallery}

### Warum nicht einfach ein anderer Slicer?

Der Ansatz entstand nach Versuchen mit PancakeSlicer, der auf der Orca-Engine aufsetzt. Das Ergebnis war nicht schlecht – aber nicht gut genug, um den gewohnten Bambu-Workflow dafür aufzugeben. Ein non-planarer Slicer plant den **ganzen** Druck neu; hier sollte nur der letzte Schritt dazukommen. Aus dieser Einschränkung kommt die eigentliche Idee: nicht mehr anfassen als nötig.

### Was es kann

- **Elemente:** Konturen, Muster, Kringel, Freihandlinien, Bilder, Text und SVG – jedes Element lässt sich verschieben, skalieren, drehen und einfärben.
- **Bis zu vier Farben** mit echten Filamentwechseln über Bambus eigenen Wechsel-G-Code, inklusive Purge-Berechnung über die Flush-Matrix.
- **Eine Höhenkarte von oben** statt einer Neukonstruktion: Aus den vorhandenen Bahnen wird die Oberfläche rekonstruiert, daraus die Neigung. Die Düse fährt auf der Düsenfläche plus Abstand.
- **Bergauf statt bergab:** Jeder Abschnitt wird vor dem Druck bewertet. Bergab schiebt die flache Düse Material mit, deshalb wird bevorzugt bergauf gedruckt; über Kuppen wird ein Strich geteilt und beide Hälften von unten nach oben gesetzt.
- **Fahrweg-Optimierung:** Die Reihenfolge aller Abschnitte wird global geplant (Nearest Neighbour, dann 2-opt und Or-opt, kleine Gruppen exakt). Der Regler „Bergauf-Gewicht" legt fest, wie viel Fahrweg ein Millimeter bergab wert ist.
- **Kollisionsprüfung** gegen Kopfprofile – optional, weil sie Rechenzeit kostet. Die Profile stammen aus PancakeSlicer.
- **AMS-Zuordnung und direktes Senden** an den Drucker über FTPS und MQTT.

![Die 3D-Vorschau zeigt die erzeugten Bahnen auf der gewölbten Fassung, darunter der G-Code als Playback](/assets/images/projekte/nonplanarer-druck/04.jpg)
{: .gallery}

### Was es nicht ist

Impasto ist **kein Slicer** und will keiner sein. Es kann keine Stützstrukturen planen, keine Schichthöhen optimieren und keine mehrseitigen non-planaren Bauteile bauen. Es ist ein Werkzeug zum **Gestalten und Beschriften von Oberflächen** – eine erhabene Linie, ein Muster, ein Bild, ein Wort auf einem Bauteil, das ohnehin schon gedruckt wird.

### Grenzen, ehrlich gesagt

- Die Stapelung liest die gedruckten Linien an ihrer Mitte. Überlappungen unter etwa einer halben Linienbreite heben nicht an.
- Der Warp-Ausgleich ist ein Modell, keine Messung: Er hebt ein Bauteil zu den Enden hin an, damit die Düse auf einem verzogenen Teil nicht schleift. Wie stark, muss man am eigenen Druck messen.
- Auf Schrägen sitzt eine flache Düse zwangsläufig höher. Der Spalt wird über den Volumenstrom ausgeglichen, nicht über die Geometrie.

## Das Badge als Testobjekt
{: #badge}

Ein Anstecker ist ein dankbares Testteil für die ganze Kette: zwei Farben, eine gewölbte Deckplatte, ein Schriftzug, der als Aussparung stehen bleiben muss – und eine Fläche, an der man Muster ausprobieren kann, ohne ein ganzes Bauteil zu drucken.

Die Bilder zeigen den gedruckten Stand mit „Alex" im Schriftband. Die schwarze Platte wölbt sich zur Mitte hin; auf der weißen Grundplatte laufen die Bahnen strahlenförmig nach außen, der Namenszug liegt als Aussparung darin und lässt die schwarze Schicht darunter durchscheinen.

![Das gedruckte Badge von oben: weiße Grundplatte mit strahlenförmig nach außen laufenden Bahnen, darüber die schwarze Platte mit erhabenem weißem Schriftzug „IfsMB“, unten der Namenszug „Alex“ als Aussparung](/assets/images/projekte/nonplanarer-druck/05.jpg)
{: .gallery}

![Nahaufnahme von der Seite: die schwarze Platte wölbt sich zur Mitte, die weißen Buchstaben stehen erhaben darauf; auf der weißen Fläche laufen die Bahnen strahlenförmig nach außen](/assets/images/projekte/nonplanarer-druck/06.jpg)
{: .gallery}

Das Badge gibt es zum Selbstdrucken: [Badges auf der Presseseite]({{ '/presse/#badge' | relative_url }}) — als 3MF mit zwei eingefärbten Objekten, als STL für den Farbwechsel per Pause und als drehbares Modell im Browser.

## Stand

Version 0.4.0, 140 Tests, offen auf GitHub: **[3p1cball-code/impasto](https://github.com/3p1cball-code/impasto)** (AGPL-3.0-or-later, weil Kopfprofile aus PancakeSlicer enthalten sind). Die ersten Drucke sind vielversprechend – die Brillenfront auf diesen Bildern war das Testbauteil, weil sie eine gleichmäßig gewölbte Fläche mit klaren Kanten hat.

Inspiriert durch [dieses YouTube-Video zum nonplanaren 3D-Druck](https://www.youtube.com/watch?v=cRSoVq_reGQ).
