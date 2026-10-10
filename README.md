# 22je

A website to market 22 Jalan Elok ([22je.sg](https://22je.sg)): furnished ensuite rooms off Orchard Road, minimum stay 3 months.

This is a static template with no dependencies: plain HTML, CSS and a little vanilla JS. There is no build step, so it runs on GitHub Pages, Netlify, Cloudflare Pages or any static host.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, photo strip, about, highlights, room cards, banner |
| `rooms.html` | All four room types (9 rooms: 2 Elysia Suites, 1 Aurelia Suite, 3 Deluxe Queen, 3 Deluxe Twin) with galleries, specs, monthly price, WhatsApp + occupancy links. Each room has a shareable anchor (`rooms.html#elysia`, `#aurelia`, `#deluxe-queen`, `#deluxe-twin`) |
| `features.html` | Amenities (rooms / suites / services) and location |
| `faqs.html` | FAQ accordion: booking process, inclusions, documents, tenancy agreement, deposit |
| `calendar/index.html` | Room availability calendar at `/calendar/` (moved from stay.22je.sg). Tap check-in/check-out dates and send them on WhatsApp. Deep links per room: `calendar/#elysia` (Elysia 4, queen), `#elysia3` (Elysia 3, twin), `#aurelia`, `#dq1`, `#dq3`, `#dq4`, `#dt1`, `#dt3`, `#dt4` |
| `contact.html` | Contact details, an enquiry form that composes a WhatsApp message or email (no backend), and a map |

## Editing

- **Colours and fonts:** the tokens at the top of `assets/css/style.css` (`--ivory`, `--espresso`, `--brass`, … and `--serif` / `--sans`).
- **Phone, WhatsApp, email, address:** the `SITE` object at the top of `assets/js/main.js`. The header, footer and floating WhatsApp button are rendered from it on every page.
- **Bookings:** edit the `ROOMS` list at the top of the script in `calendar/index.html`. Add booked ranges as `{ start: "2026-11-01", end: "2027-01-31" }` (the end date shows as booked too). Push, and the calendar updates.
- **Navigation:** the `NAV` list in `assets/js/main.js`.
- **Prices:** shown on `index.html` (room cards), `rooms.html` (each room) and `features.html` ("from S$…"). Keep all three in step.
- **Photos:** `assets/img/<room>/`, as **WebP, max 1600 px** (converted 2026-10-10; the site was 25 MB of JPEGs, now ~9 MB). Galleries are plain `<figure><img></figure>` lists, so add, remove or reorder freely. Any element with class `placeholder` stands in for a photo that hasn't been taken yet.

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
