---
title: "KI-Server: Ein Raspberry Pi als Wecker"
date: 2026-11-12 21:12:00 +0100
author: falko-richter
persoenlich: true
tags: [ki-server]
projekte: [ki-server-anton]
team: [anton]
uuid: be8c2968-e528-4dee-988f-f5d8fd7c75d3
---
Neues vom [KI-Server]({{ '/projekte/ki-server-anton/' | relative_url }}): Anton bekommt von Falko einen **Raspberry Pi 4** mit einem **USB-3.0-Hub mit Gigabit-Netzwerk**.

![Raspberry Pi 4 in einem grauen 3D-gedruckten Gehäuse mit Wabenlüftung, darauf ein silberner USB-3.0-Hub mit Gigabit-Netzwerkanschluss](/assets/images/news/ki-server-pi4-proxy/01.jpg)
{: .gallery}

Damit wollen wir einen **Proxy** bauen: Der KI-Server braucht viel Strom, deshalb soll er schlafen, solange niemand ihn braucht. Der sparsame Pi nimmt die Anfragen an, **weckt den Server auf**, wenn ein Request kommt, und legt ihn danach wieder schlafen.
