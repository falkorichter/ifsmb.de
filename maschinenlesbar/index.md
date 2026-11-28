---
layout: page
title: Maschinenlesbar
lead: Wie sich die Seiten dieser Website für Programme und andere Websites beschreiben – und wofür das gut ist.
linked: [/impressum/]
uuid: 9c3adb08-d1cf-4578-bb8b-56239a0429c1
---
<div class="prose" markdown="1">

Jede Seite über ein Gerät, eine Person, ein Projekt, einen Termin, einen Beitrag, eine Herausforderung, eine Pressemitteilung oder einen Partner sagt nicht nur Menschen, worum es geht, sondern auch Programmen: **was** sie beschreibt, **wie** es heißt und **unter welcher Kennung** es zu finden ist. Das steht unsichtbar im HTML der Seite – unten auf jeder dieser Seiten lässt es sich unter „🤖 Maschinenlesbar“ aufklappen.

## Microdata und schema.org {#microdata}

Wir nutzen dafür [Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Microdata), einen Teil des HTML-Standards: Ein Element bekommt `itemscope` und mit `itemtype` eine Art, darin beschreiben Elemente mit `itemprop` die Eigenschaften. Die Arten und Eigenschaften kommen aus dem gemeinsamen Wortschatz von [schema.org](https://schema.org/), den auch Suchmaschinen verstehen.

| Seite | Art (schema.org) | Eigenschaften |
|---|---|---|
| Gerät / Ausstattung | [`Product`](https://schema.org/Product) | Name, Beschreibung, Bild, Kategorie |
| Person | [`Person`](https://schema.org/Person) | Name, Beschreibung, Bild, Rolle (`jobTitle`) |
| Beitrag | [`BlogPosting`](https://schema.org/BlogPosting) | Name, Überschrift, Datum |
| Termin | [`Event`](https://schema.org/Event) | Name, Beginn, Ende, Ort |
| Projekt | [`Project`](https://schema.org/Project) | Name, Beschreibung, Start |
| Herausforderung | [`CreativeWork`](https://schema.org/CreativeWork) | Name, Beschreibung |
| Pressemitteilung | [`NewsArticle`](https://schema.org/NewsArticle) | Name, Überschrift, Datum |
| Partner | [`Organization`](https://schema.org/Organization) | Name, Beschreibung |

## Adresse und Kennung {#kennung}

- **`itemid`** ist die volle Adresse der Seite – sie sagt, *wo* etwas zu finden ist, und ist überall eindeutig.
- **`identifier`** ist die **uuid** der Seite – sie sagt, *was* es ist, und bleibt gleich, auch wenn die Seite umzieht. Ist dieselbe Person, dasselbe Gerät oder derselbe Beitrag auf mehreren Websites dieser Art vertreten, trägt es überall dieselbe uuid.
- **`sameAs`** (nur bei Partnern, Geräten und Personen, wenn eingetragen) nennt die Adresse *derselben Sache* auf einer anderen Website – z. B. die Seite eines Partners auf dessen eigener Website dieser Art. Das geht auch ohne gemeinsame uuid und ist die Grundlage dafür, dass eine Website später sieht, wer anderswo auf sie verweist.

## So sieht das aus {#beispiel}

{% assign md_example_page = site.equipment | where_exp: "e", "e.image" | first | default: site.equipment.first -%}
{%- if md_example_page -%}
{%- capture md_example -%}{% include microdata.html page=md_example_page %}{%- endcapture -%}
Die Seite [{{ md_example_page.title }}]({{ md_example_page.url | relative_url }}) enthält diesen Block:

<pre><code>{{ md_example | strip | escape }}</code></pre>
{%- endif %}

## Wofür wir das nutzen {#wofuer}

Diese Website ist Teil eines kleinen **Verbunds**: Mehrere Websites aus demselben Code (z. B. [ifsmb.de](https://ifsmb.de/) und [35services.ifsmb.de](https://35services.ifsmb.de/)) verlinken sich gegenseitig, statt Inhalte zu kopieren – jedes Ding hat *eine* Heimat.

- **Links verstehen sich selbst:** Verlinkt ein Text eine Seite einer verbundenen Website, liest diese Website beim Bauen deren Microdata. Der Link bekommt dann das passende Symbol (z. B. 🛠️ für ein Gerät) und den aktuellen Namen, unten bei „Verbindungen“ steht er in der richtigen Gruppe – und gibt es die Seite nicht mehr, steht „(nicht mehr vorhanden)“ daneben.
- **Ein gemeinsames Netzwerk:** Im [Netzwerk]({{ '/network/' | relative_url }}) lassen sich mit „🌐 Verbundene Instanzen einbeziehen“ die Graphen mehrerer Websites zusammenführen – Seiten mit derselben uuid werden ein Punkt.
- **Die Adresse allein entscheidet nichts:** Was eine Seite ist, sagen nur ihre Microdata, und nur bekannte schema.org-Arten werden übernommen.

## Weitere maschinenlesbare Dateien {#dateien}

- [`/meta_graph.json`]({{ '/meta_graph.json' | relative_url }}) – Einstieg für andere Websites: verweist auf alle folgenden Dateien und die verbundenen Websites.
- [`/network/graph.json`]({{ '/network/graph.json' | relative_url }}) – alle Seiten mit ihren Verbindungen (Adressen und uuids).
- [`/search/index.json`]({{ '/search/index.json' | relative_url }}) – Personen, Projekte, Stichworte, Partner und Seiten.
- [`/feed.xml`]({{ '/feed.xml' | relative_url }}) – Neuigkeiten als Atom-Feed, [`/calendar.ics`]({{ '/calendar.ics' | relative_url }}) – Termine für Kalender-Apps.

All das enthält nur, was ohnehin öffentlich auf diesen Seiten steht – keine Daten über Besucher*innen (siehe [Impressum & Datenschutz]({{ '/impressum/' | relative_url }})).

</div>
