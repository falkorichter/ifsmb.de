---
title: "3D-Druck für unsere offene Werkstatt"
date: 2026-09-24 08:57:11 +0200
author: falko-richter
original_url: https://35services.de/2026/3d-druck-fuer-unsere-offene-werkstatt/
original_site: 35services.de
tags: [35services, bambu-lab-a1-mini, prusa-mk4, snapmaker-u1]
---

Wir haben seit einigen Jahren einen Prusa Mk4 Drucker und auch einen Bambulab A1 Mini. Neben der [AG an der KTG](https://35services.de/2024/diy-eine-3d-druck-und-elektronik-ag-an-der-ktg/) bieten auch unter *3ddruck [at] 35services [punkt] de* Beratung für eure 3D-Druck Projekte an. Bei Bedarf drucken wir auch mit dem SnapMaker U1 in der KTG, der Drucker hat 4 Druckköpfe und ist extrem gut im Mehrfarbdruck.

Die Infrastruktur um den Prusa Drucker gemeinsam zu nutzen ist schon sehr gut von Prusa gelöst, der Drucker ist in einem Team und Mitglieder können so Fernzugriff auf den Drucker bekommen. Mit der MMU (Multi-Material-Unit) können wir 5 Filamente bereit halten und so verschiedene Druckaufträge mit Materialen der Mitglieder oder mit Material aus dem Verein flexibel verwalten und die Warteschlage füllen. Wir wollen aber mehr.

<div class="gallery gallery-single">
  <a href="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/01.png" class="lightbox"><img src="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/01-600w.png" alt="Screenshot: Druckwarteschlange des Prusa MK4 in Prusa Connect" loading="lazy"></a>
</div>

**1. Ein einfaches tool um die Filamente zu verwalten, unabhähngig vom Drucker:**

Das gibt es open source: [https://github.com/35services/3d-printing-simple-filament-tool](https://github.com/35services/3d-printing-simple-filament-tool) und funktioniert ganz gut. Die Filamente kann man direkt pflegen und nach dem Einkauf hinzufügen. Einige Prusa Filamente mit Vorschaubild sind schon hinterlegt.

<div class="gallery">
  <a href="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/02.png" class="lightbox"><img src="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/02-600w.png" alt="Screenshot: Filament-Verwaltung mit dem eingelegten Filament pro Drucker" loading="lazy"></a>
  <a href="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/03.png" class="lightbox"><img src="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/03-600w.png" alt="Screenshot: Konfiguration der Filamentfarben im Filament-Tool" loading="lazy"></a>
</div>

**2. Live Stream und Flexibilität** – octoprint

Mit einem Raspberry Pi haben wir 2 Drucker und 2 webcams (es gehen auch mehr, USB-Hub) im Lokalen Netzwerk erreichbar gemacht. Das Setup ist unter [github.com/35services/3d-printing-octoprint](https://github.com/35services/3d-printing-octoprint) dokumentiert. *falko [at] 35services [punkt] de* hilft euch gerne, wenn ihr auch so etwas bauen wollt.

<div class="gallery gallery-single">
  <a href="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/04.png" class="lightbox"><img src="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/04-600w.png" alt="Screenshot: OctoPrint mit Live-Bild der Drucker-Webcam" loading="lazy"></a>
</div>

**3. Erreichbarkeit und Dashboard**

Unter [https://github.com/35services/3d-printing-proxy](https://github.com/35services/3d-printing-proxy) sehr ihr unser Setup für ein einfaches Dashboard und damit das System was alles zusammenbringt. Bisher lief alles lokal in der Werkstatt und war nur im lokalen WLAN einzeln erreichbar.

Mit [Tailscale](https://tailscale.com/) als kostenloses, open source basiertes, peer-to-peer VPN kann man jetzt alle Dienste auch außerhalb der Werkstatt erreichen.

Als Bonus haben wir unsere [Tasmota Nous](https://nous.technology/product/a1t/de.html) Steckdosen auch sichtbar gemacht und können so sehen, was die Drucker und Filament Trockner so an Strom verbrauchen. Das soll zum Spenden motivieren.

<div class="gallery gallery-single">
  <a href="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/05.png" class="lightbox"><img src="/assets/images/news/3d-druck-fuer-unsere-offene-werkstatt/05-600w.png" alt="Screenshot: Dashboard „Drucken bei 35services“ mit Webcams und Stromverbrauch" loading="lazy"></a>
</div>

Falko hat versucht das ganze so aufzusetzen, dass man es modular ist auch in anderen Werkstätten aufsetzen kann. Meldet euch gerne bei *falko [at] 35services [punkt] de* oder via Matrix: [https://offene-werkstaetten.org/users/profile/5532](https://offene-werkstaetten.org/users/profile/5532) bei Falko.
