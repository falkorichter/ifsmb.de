---
title: "KI-Server: Der Wecker wird schlauer"
date: 2026-11-16 18:00:00 +0100
author: anton
persoenlich: true
tags: [ki-server]
projekte: [ki-server-anton]
team: [falko-richter]
uuid: 47496529-e9c1-4d05-8a11-ee59f5ae8108
---
Die V100 kann viel – nur isst sie auch. Selbst ohne Arbeit zieht der Server ordentlich Strom, zu viel für ein Gerät, das nur gelegentlich gebraucht wird. Deshalb soll er die meiste Zeit einfach aus sein und erst anlaufen, wenn jemand ihn braucht.

Dafür ist der Raspberry Pi 4 da. Der läuft durch und ist gleichzeitig Wecker und Türsteher: Er hängt zwischen unseren Geräten und dem Server, weckt diesen per Wake-on-LAN, wenn ein Request kommt, und schaltet ihn nach einer Leerlaufzeit – bei uns zwanzig Minuten – wieder per SSH ab. Kein Request, keine Wattzahl.

**Der Proxy ist fertig**

Die Software dazu – ein kleines Python-Projekt namens llama-proxy – ist jetzt vollständig gecodet und getestet. Der Pi selbst zieht dabei nur wenige Watt, der Wecker ist also fast gratis im Betrieb:

- OpenAI-kompatible API (Chat, Streaming, Modelle), damit bestehende Tools einfach weiterlaufen
- Scheduler: erkennt an der Anzahl neuer Prompt-Tokens, wie groß ein Job ist – große Requests bekommen die GPU exklusiv, kleine dürfen parallel laufen
- mehrere Benutzer-Keys mit Prioritäten, Limits pro Stunde und Tag und Nutzungsstatistiken
- Monitoring: kleines Dashboard, Prometheus-Metriken, Job-Queue
- Power-Management: Wake-on-LAN, Gesundheitschecks, Leerlauf-Abschaltung – plus ein Sicherheitsnetz auf dem Server selbst, das ihn abschaltet, wenn zwei Stunden lang nichts passiert, auch wenn der Pi ausfällt
- über 90 automatisierte Tests, alle grün

Und das Schöne: Der Proxy wurde selbst mit dem lokalen LLM-Server geschrieben – also genau dem, den er einschlafen lässt. Die KI codet, wir testen.

**Das Setup in der Grobansicht**

- GPU: NVIDIA Tesla V100, 32 GB (SXM2)
- Mainboard: ASRock B450 Pro4
- CPU: AMD Ryzen 5 3400G
- Arbeitsspeicher: 64 GB
- Betriebssystem: Proxmox VE; das LLM läuft in einem LXC-Container (llama.cpp mit Qwen3-27B)
- Raspberry Pi 4: Wecker und Proxy, per USB-Gigabit direkt mit dem Server verkabelt
- erreichbar über Tailscale – gedacht für agentisches Programmieren mit OpenCode

Noch offen: ein Netzwerkkabel und eine Stromversorgung für den Pi. Dann folgt der Aufbau – inklusive erster echter Wake-on-LAN-Runde in der Realwelt.
