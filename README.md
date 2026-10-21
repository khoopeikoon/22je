# 22je

A website to market 22 Jalan Elok ([22je.sg](https://22je.sg)): furnished ensuite rooms off Orchard Road, minimum stay 3 months.

This is a static template with no dependencies: plain HTML, CSS and a little vanilla JS. There is no build step, so it runs on GitHub Pages, Netlify, Cloudflare Pages or any static host.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, photo strip, about, highlights, room cards, banner |
| `rooms.html` | All four room types (9 rooms: 2 Elysia Suites, 1 Aurelia Suite, 3 Deluxe Queen, 3 Deluxe Twin) with galleries, specs, monthly price, WhatsApp + occupancy links. Each room has a shareable anchor (`rooms.html#elysia`, `#aurelia`, `#deluxe-queen`, `#deluxe-twin`) |
| `features.html` | Amenities (rooms / suites / services) and location |
| `area.html` | The neighbourhood ("Living near Orchard Road"), for search: Orchard MRT (NS22 · TE14), where the two lines go, District 9, and who the house suits (professionals, students, people relocating). Linked from the Location section of `features.html` and from the footer (`area` in `STRINGS`). Uses only facts already on the site plus public MRT facts the owner confirmed on 2026-10-20 |
| `faqs.html` | FAQ accordion: booking process, inclusions, documents, tenancy agreement, deposit |
| `calendar/index.html` | Room availability calendar at `/calendar/` (moved from stay.22je.sg). Tap check-in/check-out dates and send them on WhatsApp. Deep links per room: `calendar/#elysia` (Elysia 4, queen), `#elysia3` (Elysia 3, twin), `#aurelia`, `#dq1`, `#dq3`, `#dq4`, `#dt1`, `#dt3`, `#dt4` |
| `contact.html` | Contact details, an enquiry form that composes a WhatsApp message or email (no backend), and a map |
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
- **Prices:** shown on `index.html` (room cards), `rooms.html` (each room), `features.html` and `area.html` ("from S$…"), and the same pages in each language folder. Keep them all in step.
- **Photos:** `assets/img/<room>/`, as **WebP, max 1600 px** (converted 2026-10-10; the site was 25 MB of JPEGs, now ~9 MB). Galleries are plain `<figure><img></figure>` lists, so add, remove or reorder freely. Any element with class `placeholder` stands in for a photo that hasn't been taken yet.
- **Floor plans:** `assets/img/plans/` holds whole-floor plans with one area highlighted (rooms: one image per room and floor; Features: the shared spaces on floors 1, 2 and 5). They are drawn by `tools/floor_plans.py` from 300-dpi renders of the architect's PDF, which is kept **off** the repo (`~/Documents/`). The script relabels rooms with the site's names and holds each highlight's outline.
- **3D room views:** each room's gallery has a 3D cutaway view after its floor plan (`assets/img/<room>/*-3d.webp`; one each for Aurelia, Elysia 4, Elysia 3, Deluxe Queen 3/4 and Deluxe Twin 3/4). `tools/rooms_3d.js` rebuilds each room from the architect's plan (walls, doors, windows and the plan's furniture layout, measured from the same 300-dpi renders) with finishes matched to the photos; `python3 tools/render_rooms_3d.py` renders them in headless Chrome (needs Chrome and Pillow; three.js loads from a CDN). To look at one in a browser, run the local server and open `/tools/rooms_3d.html?room=aurelia`. Captions say "illustrative": the furniture follows the plan, which may not match each room exactly.

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
