# 22je

A website to market 22 Jalan Elok ([22je.sg](https://22je.sg)): furnished ensuite rooms off Orchard Road, minimum stay 3 months.

This is a static template with no dependencies: plain HTML, CSS and a little vanilla JS. There is no build step, so it runs on GitHub Pages, Netlify, Cloudflare Pages or any static host.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, photo strip, about, highlights, room cards, "Renting a room near Orchard Road" (the plain facts: what the rent includes, rates, terms, getting around, how it compares with a condo master room or a serviced apartment, with links to the rooms, area and FAQ pages), banner |
| `rooms.html` | All four room types (9 rooms: 2 Elysia Suites, 1 Aurelia Suite, 3 Deluxe Queen, 3 Deluxe Twin) with galleries, specs, monthly price, WhatsApp + occupancy links. Each room has a shareable anchor (`rooms.html#elysia`, `#aurelia`, `#deluxe-queen`, `#deluxe-twin`). Its JSON-LD (breadcrumb + each room type's monthly rent, size and bed) repeats the prices, so keep it in step |
| `features.html` | Amenities (rooms / suites / services) and location |
| `area.html` | The neighbourhood ("Living near Orchard Road"), for search: Orchard MRT (NS22 · TE14), where the two lines go, District 9, and who the house suits (professionals, students, people relocating). Linked from the Location section of `features.html` and from the footer (`area` in `STRINGS`). Uses only facts already on the site plus public MRT facts the owner confirmed on 2026-10-20 |
| `faqs.html` | FAQ accordion: booking process, inclusions, documents, tenancy agreement, deposit |
| `calendar/index.html` | Room availability calendar at `/calendar/` (moved from stay.22je.sg). Tap check-in/check-out dates and send them on WhatsApp. Deep links per room: `calendar/#elysia` (Elysia 4, queen), `#elysia3` (Elysia 3, twin), `#aurelia`, `#dq1`, `#dq3`, `#dq4`, `#dt1`, `#dt3`, `#dt4` |
| `contact.html` | Contact details, an enquiry form that composes a WhatsApp message or email (no backend), and a map |
| `3d/index.html` | Explorable 3D view of a room at `/3d/?room=<id>&lang=<code>` (ids: `aurelia`, `elysia-4`, `elysia-3`, `deluxe-queen`, `deluxe-twin`, `deluxe-queen-1`, `deluxe-twin-1`, and the shared floors `floor-1`, `floor-2`, `floor-5`; codes: `en`, `zh`, `ja`, `es`, `fr`). Two modes: **Dollhouse** (turn and zoom the cut-away room; the walls nearest the camera are cut low as it turns; small labels name the spaces, from `labels` in `rooms3d.js`, worded in `viewer3d.js`, and give way to each other when crowded; rooms behind closed doors, such as Deluxe Queen 1 and the Aurelia Suite, are named over the room and, walking around, by their door) and **Walk around** (eye height under a ceiling: drag to look, tap the floor to walk there, arrow keys / WASD; the labels hang at door height, only for spaces in sight, fading with distance). Opened from the "Explore in 3D" button on each 3D picture (rooms.html and features.html). One page for all five languages (text in `assets/js/viewer3d.js`); `noindex` and not in the sitemap. The only page that loads three.js (jsDelivr CDN) |
| `zh/…` | **Simplified Chinese** copies of every page (`zh/`, `zh/rooms.html`, … `zh/calendar/`). The **language dropdown** in the header (English · 中文 · 日本語 · Español · Français; languages are listed in `LANGS` in `main.js`) switches between them and keeps the reader's place (`rooms.html#elysia` ↔ `zh/rooms.html#elysia`). The **house guide** has a Chinese twin at `zh/guide/` whose text is `zh/guide/guide.md` (keep it in step with `guide/guide.md`). The single `404.html` shows the right language for missing addresses under `/zh/`, `/ja/`, `/es/` or `/fr/`. Each page carries `hreflang` links to all its twins, and all 35 public pages are in `sitemap.xml` |
| `ja/…` | **Japanese** copies of every page, same layout as `zh/` (guide text in `ja/guide/guide.md`). Messages sent from Japanese pages are Japanese + English, so the manager can read them. Room names: Aurelia スイート, Elysia スイート, デラックスクイーン / ツイン; sizes also given in m² |
| `es/…` | **Spanish** copies of every page, same layout (guide text in `es/guide/guide.md`). Messages sent from Spanish pages are Spanish + English. Room names: Suite Aurelia, Suite Elysia, Habitación Deluxe Queen / Deluxe Twin; sizes also given in m² |
| `fr/…` | **French** copies of every page, same layout (guide text in `fr/guide/guide.md`). Messages sent from French pages are French + English. Room names: Suite Aurelia, Suite Elysia, Chambre Deluxe Queen / Deluxe Twin; sizes also given in m² |

## Editing

- **Colours and fonts:** the tokens at the top of `assets/css/style.css` (`--ivory`, `--espresso`, `--brass`, … and `--serif` / `--sans`).
- **Phone, WhatsApp, email, address:** the `SITE` object at the top of `assets/js/main.js`. The header, footer and floating WhatsApp button are rendered from it on every page.
- **Bookings:** edit the `ROOMS` list at the top of `assets/js/calendar.js` (moved out of `calendar/index.html` on 2026-10-13 so the English and Chinese calendars share one list). Add booked ranges as `{ start: "2026-11-01", end: "2027-01-31" }` (the end date shows as booked too). Push, and the calendar updates.
- **After editing `style.css`, `main.js` or `calendar.js`:** bump the `?v=` stamp on their links in every page (all pages use the same value), or browsers keep the old copy and new pages render with the old header. One command: `grep -rl '?v=' --include='*.html' . | xargs sed -i '' 's/?v=[0-9]*/?v=NEWDATE/g'`
- **Navigation, header and footer text:** `NAV` and `STRINGS` (English + Chinese) in `assets/js/main.js`.
- **Chinese pages:** any text change on an English page needs the same change in its `zh/` twin. Prefilled WhatsApp/email messages from the Chinese pages are in Chinese (Kevin reads Chinese — PK, 2026-10-13).
- **Search wording (2026-10-22):** the target search is "room rentals orchard singapore". On the home and rooms pages the `<h1>` is the small line above the slogan (`<h1 class="eyebrow">Room rentals near Orchard Road, Singapore</h1>`), saying what the page is in searchers' words; the slogan under it is `<p class="display">`, styled like an h1. Keep one `<h1>` per page.
- **Prices:** shown on `index.html` (room cards, the "Monthly rates" list and the JSON-LD), `rooms.html` (each room and its JSON-LD), `features.html` and `area.html` ("from S$…"), and the same pages in each language folder. Keep them all in step.
- **Photos:** `assets/img/<room>/`, as **WebP, max 1600 px** (converted 2026-10-10; the site was 25 MB of JPEGs, now ~9 MB). Galleries are plain `<figure><img></figure>` lists, so add, remove or reorder freely. Any element with class `placeholder` stands in for a photo that hasn't been taken yet.
- **Floor plans:** `assets/img/plans/` holds whole-floor plans with one area highlighted (rooms: one image per room and floor; Features: the shared spaces on floors 1, 2 and 5). They are drawn by `tools/floor_plans.py` from 300-dpi renders of the architect's PDF, which is kept **off** the repo (`~/Documents/`). The script relabels rooms with the site's names and holds each highlight's outline.
- **3D room views:** each room's gallery starts with a 3D cutaway picture (`assets/img/<room>/*-3d.webp`; one each for Aurelia, Elysia 4, Elysia 3, Deluxe Queen 3/4, Deluxe Twin 3/4, and Deluxe Queen 1 and Deluxe Twin 1 with their rear terraces), and the Features floor plans are each preceded by a 3D picture of the shared spaces (`assets/img/features/shared-*-3d.webp`: 1st-floor entrance and car porch; 2nd-floor kitchen and dining, and living room and balcony; 5th-floor laundry). Furniture and finishes follow the photos where they differ from the plan (the owner's rule): on the 2nd floor a round dining table, no stools at the island, the living room as photographed, an empty balcony, the wet kitchen's L of counters with hob, oven, microwave unit and fridge, a grey-marble powder room, glass stair balustrades; on the 1st floor the car porch three steps below the covered front terrace (timber-look tiles, a bar table and four bar chairs, Bedroom 1's glass sliding doors), a lawn with a fiddle-leaf fig, ceiling-height corridor doors; on the 5th floor a walnut foyer, wood-look tiles in the laundry, its north wall of grey cabinets set in tile (photographed 2026-10-24); bronze lift surrounds with glass doors; no rugs anywhere. Wardrobes nearest the camera are drawn cut open so they don't read as benches; in Walk around they are full height with an "Explore in 3D" button to `3d/`. The rooms are modelled once in `assets/js/rooms3d.js` from the architect's plan (walls, doors, windows and the plan's furniture layout, measured from the same 300-dpi renders) with finishes matched to the photos; both the pictures and `3d/` use it. After changing a room, re-render the pictures with `python3 tools/render_rooms_3d.py` (headless Chrome + Pillow; three.js loads from a CDN); `tools/rooms_3d.html?room=aurelia` on the local server shows one. Bathroom doors are pocket doors: the opening is where the plan draws a thin panel, the pocket where it draws three lines (the owner confirmed the queen rooms' doors on 2026-10-21). The wall behind a wardrobe is never cut, at the owner's choice. Captions say "illustrative": the furniture follows the plan, which may not match each room exactly.

## Photo correction

`tools/enhance_photo.py` applies the gentle correction used on the current photos: partial white balance (removes the orange cast from the warm LED strips), levels, shadow lift and light sharpening. It needs only Pillow.

```bash
sips -s format jpeg IMG_1234.HEIC --out /tmp/IMG_1234.jpg      # Pillow can't read HEIC
python3 tools/enhance_photo.py /tmp/IMG_1234.jpg assets/img/<room>/<name>.webp
```

Check every result by eye. It can blow out bright windows (it was skipped for `property-04` and `property-17` for that reason), and the originals are in git history if an edit needs undoing.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

Settings → Pages → Deploy from branch → `main` / root.

**Everything in this repository is public.** The repo is public on GitHub, and GitHub Pages serves every file on 22je.sg unless `_config.yml` excludes it. This README (2026-10-15) and `tools/` (2026-10-21) are excluded from the site but can still be read on GitHub; `tools/` still works on the local server. Keep private documents (floor plans, contracts, codes) out of the repo altogether. The architect's floor-plan PDF was taken out on 2026-10-15 and erased from the git history the same day (history rewritten and force-pushed; a backup made just before is in `~/Documents/22je-backup-2026-10-15/`). `LICENSE` is "All rights reserved" and replaced the template's CC0 on 2026-10-15.
