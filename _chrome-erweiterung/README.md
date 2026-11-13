# Chrome-Erweiterung: Todo aus Auswahl

Text auf einer beliebigen Seite markieren → Rechtsklick → **„Neues Todo aus …“**. Es öffnet sich die [Todo-Seite](https://ifsmb.de/todos/) mit einem neuen Todo:

- **Titel:** die erste Zeile der Auswahl (höchstens 80 Zeichen) – im Editor änderbar
- **Beschreibung:** die ganze Auswahl als Zitat, darunter „Quelle: [Seitentitel](Adresse)“
- **Quelle:** die Adresse der Seite im neuen Feld `quelle` (im Editor als Link, auf der Karte als 🌐)

Das Todo ist sofort im Browser gespeichert (wie jede Änderung auf `/todos/`) und kommt wie immer über „🔀 Ansehen & Pull Request“ in die Datei `todos/todo-<person>.md`.

Die Daten stehen nur im Teil der Adresse nach `#`. Den schickt der Browser nicht an den Server; die Auswahl landet also nirgends außer im eigenen Browser, bis ein Pull Request gemacht wird.

## Installieren

1. In Chrome `chrome://extensions` öffnen.
2. Oben rechts den **Entwicklermodus** einschalten.
3. **„Entpackte Erweiterung laden“** → diesen Ordner `_chrome-erweiterung/` auswählen.
4. Die Einstellungen öffnen sich: **Website** (`https://ifsmb.de/` oder zum Testen `http://localhost:4000/`), **Person** (Team-Kürzel wie `falko-richter`) und das Feld der Eisenhower-Matrix für neue Todos.

Nach Änderungen an den Dateien auf `chrome://extensions` beim Eintrag auf ↻ klicken.

Ein Klick auf das Symbol in der Leiste öffnet die Einstellungen als Popup – mit dem Knopf „📋 Todos öffnen“ für die Todos der eingestellten Person.

## Dateien

- `manifest.json` – Manifest V3; Rechte: `contextMenus`, `storage` (Einstellungen), `activeTab` + `scripting` (Auswahl mit Zeilenumbrüchen lesen, nur im Tab, in dem man rechtsklickt)
- `hintergrund.js` – Kontextmenü
- `todo-link.js` – baut die Adresse `…/todos/#neu?titel=…&text=…&quelle=…`; die Todo-Seite (`neuAusHash` in `assets/js/todos.js`) legt daraus das Todo an
- `optionen.html`, `optionen.js` – Einstellungen, zugleich das Popup des Symbols
- `icons/` – Symbole (mit Pillow erzeugt)

Der Ordner beginnt mit `_`, damit Jekyll ihn nicht auf die Website kopiert.
