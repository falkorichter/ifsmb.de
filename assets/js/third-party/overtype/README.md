# OverType (fremde Bibliothek, unverändert kopiert)

Ausführlicher Eintrag mit Herkunft, Prüfungen, Aktualisieren und Entfernen: `DEPENDENCIES.md` im Hauptordner.

Markdown-Editor für die Textfelder der Formulare (➕ neu, ✏️ bearbeiten) – `assets/js/neu.js` lädt ihn erst,
wenn ein Formular mit Markdown-Feld aufgeht. Ohne ihn bleibt das normale Textfeld.

| | |
|---|---|
| Projekt | OverType – https://github.com/panphora/overtype |
| Version | 2.9.0 (npm `overtype@2.9.0`, Datei `dist/overtype.min.js`) |
| Lizenz | MIT, siehe `LICENSE` in diesem Ordner |
| SHA-256 | `4fb8cd12aea96708cb0078018e84861fb5976e16038ba5682180edf7d992498a` |

Geprüft: lädt nichts von außen (keine Schriften, kein CDN, kein `fetch`); Datei-Upload per Einfügen/Ziehen ist nur
mit `fileUpload`-Option aktiv – wir setzen sie nicht.

Aktualisieren: `npm pack overtype@<version>` in einen leeren Ordner, `dist/overtype.min.js` und `LICENSE` hierher
kopieren, Version oben eintragen, Formulare im Browser testen.
