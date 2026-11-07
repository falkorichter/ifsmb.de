# Night shift report – 7 November 2026

Branch `worktree-nachtschicht` (worktree `.claude/worktrees/nachtschicht`), based on `main` @ `841d2c0`.
`main` has not moved since, so the branch **fast-forwards cleanly**. Nothing was pushed, and the main folder was not touched.

**Merge:** `git merge --ff-only worktree-nachtschicht` (in the main folder), then push.

**Checks at the end:** build clean · 63 content files without YAML errors · 2,654 internal links, 0 broken · no plain-text email, no iframes or external scripts · `assets/` 59 MB.

## todo.md – all 18 sections done

| # | Section | Result |
|---|---|---|
| 1 | Prusa MK4 with MMU | `/ausstattung/prusa-mk4-mmu/` – owned by 35services (costs refunded to Falko), location 35services, photos from the Kita post (the same MK4) |
| 2 | Lynx | `/ausstattung/3dmakerpro-lynx/` – **full comparison translated into German** (tables, user reports, pros/cons, buying tips, sources) |
| 3 | Ferret SE | `/ausstattung/creality-ferret-se/` – status "Im Test", links to the comparison |
| 4 | OpenScan | project idea `/projekte/openscan-bauen/` (new status **`idee`** with its own "Ideen" section) |
| 5 | LulzBot TAZ 6 | `/ausstattung/lulzbot-taz-6/` – SD slot + OctoPrint Pi, illustration (no photo) |
| 6 | LulzBot Mini | `/ausstattung/lulzbot-mini/` – both photos + the three Congress videos |
| 7 | Core-XY from Anton | `/ausstattung/core-xy-anton/` + project idea `/projekte/core-xy-drucker-aufbauen/` |
| 8 | A1 mini Platanus | `/ausstattung/bambu-lab-a1-mini-platanus/` – owned by the Platanus Schule, shows up on the Platanus project page |
| 9 | AxiDraw V3 | `/ausstattung/axidraw-v3/` – own video (100 MB → 452 KB) + Congress videos |
| 10 | Snapmaker U1 | `/ausstattung/snapmaker-u1/` – 35services, location KTG (partner link), linked to the KTG project, press release, Werkstatt post and donations |
| 11 | MK3S (xHain) | `/ausstattung/prusa-mk3s-xhain/` – hardened nozzle, enclosure, **three timelapse videos** from `~/Downloads` |
| 12 | MK3S (HeartLabs) | `/ausstattung/prusa-mk3s-heartlabs/` (status "In Reparatur") + project `/projekte/prusa-mk3s-heartlabs-flott-machen/` |
| 13 | TikTok | post `/news/2026/10/19/falko-ist-auf-tiktok/` – links only, date taken from the video IDs (18./19.10.2026) |
| 14 | Archive | `/projekte/ktg-ag-jahr-1/`, `/projekte/ktg-ag-jahr-2/`, `/projekte/programmierwerkstatt-lessing-gymnasium/` with written summaries; Lessing post copied |
| 15 | Spenden: hide email | contact via the obfuscation pattern (`falko [at] 35services.de`) |
| 16 | Angebot + "Warum ein Institut?" | `/angebot/` rebuilt; **disclaimer** (no university, authority or research institute; private person; no legal form) on `/angebot/`, **in the footer of every page** and in the Impressum; your name next to the institute name in the Impressum |
| 17 | Treffpunkt Modellbau | event 13.–14.02.2027, 10–17 Uhr, MAFZ Paaren im Glien |
| 18 | Projekt-Ideen | `/projekte/ideen/` – all links grouped, **tracking parameters removed**, ✅ for things already built |

## Extras I did on top

- **Equipment page:** new fields for location (`standort`/`standort_partner`), photo galleries, videos and the statuses "In Reparatur" / "Im Test". The overview is **grouped by device type**.
- **Raw photos from `_equipment/` processed:** they had GPS data and were committed to `main` as they were. Originals moved to `_logo/ausstattung/` (not in Git).
- **More 35services posts copied:** the AG start ("DIY – eine 3D Druck und Elektronik AG", 2024, incl. 4 images the importer missed at first) and "Rosalind-Franklin Gymnasium + 35services e.V." (relative links made absolute, QR code).
- **Connections found:**
  - The **"Ausflug zu Max"** (29.04.2024) was the AG's outing to **3dBoutiqueBerlin** in year 1. The event now says so.
  - The **unboxing** (June 2024) also belongs to year 1.
- **CCCamp 2023:** post + event about Falko's talk "3D-Druck für Kinder" (media.ccc.de). Both Kita posts now link the `chaos-macht-kita` repo, which is public.
- **AG 2026 from the 35services AG page:**
  - event "Ausflug zu happybite" (29.06.2026)
  - event "augenrahmen.de zu Besuch" (05.10.2026)
  - post "Linux-Laptops für die 3D-Druck AG" (13.10.2026)
  - wired mice + USB sticks added to the material donation wishlist
- **News post** introducing the new pages (07.11.2026).
- **Tags extended** (`prusa-mk4`, `snapmaker-u1`, `kita`, `ktg-ag-jahr-1` …). Projects now also match by their `tags`, and project pages show the "Verknüpft" box.
- **CLAUDE.md:** new fields, ideas/Angebot pages, transparency rule, privacy rules. `_logo/README.md` documents where each new media file came from.

## Privacy – what I removed or blurred

- **A1 mini photo:** already processed earlier (child's name + classroom join code).
- **LulzBot Mini photo from the Congress:** background with participants blurred (35services has no photo permission for participants).
- **AxiDraw video:** sound and **GPS location** removed.
- **Shop reviews in the scanner comparison:** names of individual reviewers left out.
- **Not published:** the street where Alexander (augenrahmen) lives, and the organizer's email address for the Modellbau fair.

## Please check / decide

1. **TAZ 6 vs. Mini text:** both todo sections had almost the same text ("Falko hat einen lulzbot taz 6 geschenkt bekommen … Congress"). The Congress post only shows the **Mini**. I kept the Congress sentence on the TAZ 6 as you wrote it – please check.
2. ~~AxiDraw owner~~ – **confirmed by Falko:** owner Falko, location „Unterwegs mit Falko“.
3. ~~Snapmaker U1 = "4-Kopf-4-Farb-4-Material-Drucker"~~ – **confirmed by Falko.** Everything about it now carries the tag **`u1`** (device, unboxing event 16.02.2026, Schulstadtrat event + press release, Werkstatt post, laptop post), see `/stichworte/#u1`.
4. **Anton photo:** an adult is clearly visible (presumably Anton) – OK to publish?
5. **"seit 2023" / AG years:**
   - Year 1 = from 08.04.2024 (school year 2023/24).
   - Year 2 = 2024/25 (Gregor joined in the second half).
   - Unclear details are red placeholders.
6. **Impressum:**
   - name and email are filled in; the **address is still a placeholder**.
   - The email is falko@35services.de (obfuscated). Use a different address if you prefer.
7. **Things only you can do (from the Irreführungsverbot note):**
   - check whether you need a trade registration (Gewerbeanmeldung)
   - decide on a legal form (Einzelunternehmen / e.V. / UG …)
   - put the name on invoices
8. **Dead links in the ideas list:** anybot3d filament box and properprinting desk lamp (marked on the page).
9. **"Maker Themen"** in the copied RFG post stays word for word (the rule only replaces "Makerspace").
10. **Raw files in `main`'s history:**
    - the AxiDraw video (100 MB, with location data) and the five equipment photos (with GPS) are committed in `main` (not pushed yet).
    - My branch deletes them, but they stay in the history. If you'd rather never push them, `main` would need to be rewritten before the first push (e.g. squash/rebase) – I didn't do that.

11. **Fixed: `todo.md` would have been published.** Jekyll copies files without front matter as they are – `ifsmb.de/todo.md` would have shown your notes, including the organizer's email address (not live yet, `main` isn't pushed). `todo.md` and this report are now excluded in `_config.yml`.

## Preview

My preview server runs on **http://localhost:4002** (builds into a temp folder).
Another server on port 4001 (`--host 0.0.0.0`) also serves this worktree. I didn't start it, so I left it running.
