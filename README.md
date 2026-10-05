# 22je

A website to market 22 Jalan Elok ([22je.sg](https://22je.sg)): furnished ensuite rooms off Orchard Road, minimum stay 3 months.

This is a static template with no dependencies: plain HTML, CSS and a little vanilla JS. There is no build step, so it runs on GitHub Pages, Netlify, Cloudflare Pages or any static host.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, photo strip, about, highlights, room cards, banner |
| `rooms.html` | All four rooms with galleries, specs, monthly price, WhatsApp + occupancy links. Each room has a shareable anchor (`rooms.html#elysia`, `#aurelia`, `#deluxe-queen`, `#deluxe-twin`) |
| `features.html` | Amenities (rooms / suites / services) and location |
| `faqs.html` | FAQ accordion: booking process, inclusions, documents, tenancy agreement, deposit |
| `contact.html` | Contact details, an enquiry form that composes a WhatsApp message or email (no backend), and a map |

## Editing

- **Colours and fonts:** the tokens at the top of `assets/css/style.css` (`--ivory`, `--espresso`, `--brass`, … and `--serif` / `--sans`).
- **Phone, WhatsApp, email, address:** the `SITE` object at the top of `assets/js/main.js`. The header, footer and floating WhatsApp button are rendered from it on every page.
- **Navigation:** the `NAV` list in `assets/js/main.js`.
- **Prices:** shown on `index.html` (room cards), `rooms.html` (each room) and `features.html` ("from S$…"). Keep all three in step.
- **Photos:** `assets/img/<room>/`. Galleries are plain `<figure><img></figure>` lists, so add, remove or reorder freely. Any element with class `placeholder` stands in for a photo that hasn't been taken yet.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

Settings → Pages → Deploy from branch → `main` / root.
