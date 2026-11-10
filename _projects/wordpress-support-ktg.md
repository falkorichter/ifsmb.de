---
title: "WordPress-Support an der KTG"
summary: Falko unterstützt die Kurt-Tucholsky-Grundschule bei ihrer WordPress-Website – und hat dafür ein Plugin geschrieben, das CSV-Dateien in Tabellen verwandelt.
status: aktuell
persoenlich: true
start: 2026-09-01
zeitraum: seit 2026
ort: Kurt-Tucholsky-Grundschule, Moabit
event_tag: wordpress-ktg
tags: [wordpress, ktg]
team:
  - falko-richter
partners:
  - Kurt-Tucholsky-Grundschule
---

Die Website der [Kurt-Tucholsky-Grundschule](https://kurt-tucholsky-grundschule.de/) läuft mit **WordPress**. Falko hilft der Schule ehrenamtlich dabei, die Seite zu pflegen und Inhalte einfacher einzustellen.

Themen:
* [ ] Elementor los werden
* [ ] Webeseite umziehen zu in-berlin.de
* [ ] Lehrkräfte schulen
* [ ] Schulleitung beraten
* [ ] Wordpress Pflege (Plugins aktualisieren, Wordpress aktualisieren, Dokumentation)
* [ ] Feuer löschen (wenn mal wieder  [PHP kaputt ist](https://www.tagesschau.de/wirtschaft/technologie/it-sicherheit-php-luecke-100.html))

## Das Plugin: CSV Import to Table

Viele Informationen liegen in der Schule als Tabelle vor – zum Beispiel aus Excel oder einer anderen Tabellenkalkulation. Damit sie ohne Abtippen auf der Website landen, hat Falko das WordPress-Plugin **[CSV Import to Table](https://github.com/falkorichter/csv-import-to-table-improved)** entwickelt.

So funktioniert es:

1. Im WordPress-Editor den Block „CSV Import to Table“ einfügen.
2. Eine CSV-Datei aus der Mediathek auswählen.
3. Das Plugin wandelt die Datei in eine **ganz normale WordPress-Tabelle** um – danach bleibt kein spezieller Block zurück, und die Tabelle lässt sich wie jede andere bearbeiten und gestalten.

Was das Plugin besonders macht:

- Es erkennt **automatisch**, ob die Datei mit Komma oder Semikolon getrennt ist – wichtig, weil deutsche Excel-Versionen gerne Semikolons verwenden.
- Es **prüft die Datei vor dem Import**; Zeilen mit fehlenden Spalten werden einfach mit leeren Zellen aufgefüllt.
- Auch **große Dateien** werden in Häppchen eingelesen, mit Fortschrittsbalken.

Das Plugin ist **Open Source** (GPLv2) – andere Schulen und Vereine können es genauso nutzen.

<span class="todo">[Für welche Tabellen nutzt die KTG das Plugin? – Details folgen.]</span>
