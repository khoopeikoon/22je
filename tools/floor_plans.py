"""Whole-floor plans with one area highlighted, for 22je.sg.

Input: floor-N.png, 300-dpi crops of the architect's PDF (pdftoppm -r 300; the PDF stays off the repo).
Labels are replaced with the site's room names; the highlighted area keeps full
contrast with a brass tint, everything else is faded.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageChops

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
TINT = (233, 214, 182)      # warm sand, multiplied into the highlight
EDGE = (138, 106, 59)       # --brass-dark
MAXW = 1600

# Word boxes from `pdftotext -bbox`, already shifted into each crop's pixels.
# Each relabel: list of boxes to erase, new text lines, centre (x, y), font px.
def box(x0, y0, x1, y1):
    return (x0 - 6, y0 - 4, x1 + 6, y1 + 4)

RELABEL = {
    1: [
        ([box(429, 236, 596, 268)], ["DELUXE QUEEN 1"], None),
        ([box(357, 478, 523, 510)], ["DELUXE TWIN 1"], None),
        ([box(834, 203, 931, 236)], ["ENSUITE"], None),
        ([box(769, 610, 866, 643)], ["ENSUITE"], None),
        ([box(1451, 250, 1547, 283), box(1441, 287, 1558, 319)], ["BATH"], None),
        ([box(1673, 306, 1839, 338), box(1698, 342, 1815, 375)], [], None),
        ([box(1382, 688, 1418, 720)], ["LUGGAGE", "STORE"], (1400, 704)),
    ],
    2: [
        ([box(1069, 478, 1180, 511), box(1081, 513, 1167, 546)], ["FOYER"], (1124, 512)),
    ],
    3: [
        ([box(313, 236, 479, 268)], ["DELUXE QUEEN 3"], None),
        ([box(255, 478, 421, 510)], ["DELUXE TWIN 3"], None),
        ([box(1466, 366, 1577, 399), box(1472, 401, 1572, 434)], ["ELYSIA", "SUITE 3"], (1522, 400)),
        ([box(741, 203, 838, 236)], ["ENSUITE"], None),
        ([box(676, 610, 772, 643)], ["ENSUITE"], None),
        ([box(1483, 607, 1594, 639), box(1451, 641, 1630, 674), box(1481, 678, 1598, 710)], ["ENSUITE", "(3.8sqm)"], (1540, 658)),
        ([box(1018, 473, 1127, 506), box(1029, 508, 1115, 541)], ["FOYER"], (1072, 507)),
    ],
    4: [
        ([box(313, 236, 479, 268)], ["DELUXE QUEEN 4"], None),
        ([box(255, 478, 421, 510)], ["DELUXE TWIN 4"], None),
        ([box(1525, 221, 1636, 254), box(1532, 256, 1631, 288)], ["ELYSIA", "SUITE 4"], (1580, 255)),
        ([box(741, 203, 837, 236)], ["ENSUITE"], None),
        ([box(676, 610, 772, 643)], ["ENSUITE"], None),
        ([box(1483, 610, 1594, 643), box(1451, 645, 1630, 677), box(1481, 681, 1598, 714)], ["ENSUITE", "(3.8sqm)"], (1540, 662)),
        ([box(1005, 473, 1141, 506), box(1029, 508, 1115, 541)], ["FOYER"], (1072, 507)),
    ],
    5: [
        ([box(621, 236, 787, 268)], ["AURELIA SUITE"], None),
        ([box(618, 611, 715, 643)], ["ENSUITE"], None),
        ([box(323, 394, 398, 427), box(296, 429, 422, 461)], ["PRIVATE", "BALCONY"], (359, 428)),
                        ([box(1034, 473, 1110, 506), box(1028, 508, 1114, 541)], ["FOYER"], (1070, 507)),
        ([box(1283, 575, 1381, 607)], ["LAUNDRY"], None),
    ],
}

# Highlight polygons (crop pixels). Rooms include their ensuite.
P = {
    "dq-ground":  (1, [(270, 70), (1080, 70), (1080, 290), (880, 290), (880, 424), (270, 424)]),
    "dt-ground":  (1, [(200, 450), (880, 450), (880, 590), (1000, 590), (1000, 790), (200, 790)]),
    "dq-upper":   (None, [(150, 70), (985, 70), (985, 292), (900, 292), (900, 425), (150, 425)]),
    "dt-upper":   (None, [(85, 455), (780, 455), (780, 600), (920, 600), (920, 800), (85, 800)]),
    "el-upper":   (None, [(1300, 70), (1740, 70), (1740, 800), (1440, 800), (1440, 600), (1300, 600)]),
    "aurelia":    (5, [(140, 70), (1000, 70), (1000, 540), (910, 540), (910, 790), (140, 790)]),
    "laundry":    (5, [(1180, 420), (1500, 420), (1500, 70), (1700, 70), (1700, 790), (1180, 790)]),
    "lift-1":     (1, [(1010, 590), (1220, 590), (1220, 805), (1010, 805)]),
    "lift-2":     (2, [(1000, 590), (1220, 590), (1220, 790), (1000, 790)]),
    "lift-5":     (5, [(920, 590), (1140, 590), (1140, 790), (920, 790)]),
    "luggage":    (1, [(1260, 600), (1550, 600), (1550, 790), (1260, 790)]),
    "front-terr": (1, [(1860, 50), (2430, 50), (2430, 410), (1860, 410)]),
    "kitchen":    (2, [(170, 70), (1040, 70), (1040, 450), (730, 450), (730, 790), (170, 790)]),
    "living":     (2, [(1380, 70), (1810, 70), (1810, 790), (1380, 790)]),
    "balcony":    (2, [(1810, 50), (2300, 50), (2300, 810), (1810, 810)]),
}

JOBS = {  # output name: (floor, [polygons])
    "plan-aurelia":        (5, ["aurelia"]),
    "plan-elysia-3":       (3, ["el-upper"]),
    "plan-elysia-4":       (4, ["el-upper"]),
    "plan-deluxe-queen-1": (1, ["dq-ground"]),
    "plan-deluxe-queen-3": (3, ["dq-upper"]),
    "plan-deluxe-queen-4": (4, ["dq-upper"]),
    "plan-deluxe-twin-1":  (1, ["dt-ground"]),
    "plan-deluxe-twin-3":  (3, ["dt-upper"]),
    "plan-deluxe-twin-4":  (4, ["dt-upper"]),
    "floor-1-shared":      (1, ["front-terr", "luggage", "lift-1"]),
    "floor-2-shared":      (2, []),  # the whole floor is shared: no highlight
    "floor-5-laundry":     (5, ["laundry", "lift-5"]),
}


def relabel(img, floor):
    d = ImageDraw.Draw(img)
    for boxes, lines, centre in RELABEL.get(floor, []):
        for b in boxes:
            d.rectangle(b, fill=255)
        if not lines:
            continue
        if centre is None:
            b = boxes[0]
            centre = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
        f = ImageFont.truetype(FONT, 34)
        lh = 37
        y = centre[1] - lh * len(lines) / 2
        for ln in lines:
            w = d.textlength(ln, font=f)
            # white backing so the new label stays legible over drawn furniture
            d.rectangle((centre[0] - w / 2 - 6, y + 2, centre[0] + w / 2 + 6, y + lh + 2), fill=255)
            d.text((centre[0] - w / 2, y), ln, font=f, fill=0)
            y += lh


def render(name, floor, polys):
    g = Image.open(f"floor-{floor}.png").convert("L")
    relabel(g, floor)
    base = g.convert("RGB")
    faded = Image.blend(base, Image.new("RGB", base.size, (255, 255, 255)), 0.62)
    tinted = ImageChops.multiply(base, Image.new("RGB", base.size, TINT))
    mask = Image.new("L", base.size, 0)
    md = ImageDraw.Draw(mask)
    for p in polys:
        md.polygon(P[p][1], fill=255)
    out = Image.composite(tinted, faded, mask) if polys else base
    od = ImageDraw.Draw(out)
    for p in polys:
        pts = P[p][1]
        od.line(pts + [pts[0]], fill=EDGE, width=7, joint="curve")
    if out.width > MAXW:
        out = out.resize((MAXW, round(out.height * MAXW / out.width)), Image.LANCZOS)
    out.quantize(colors=96, method=Image.Quantize.MEDIANCUT).save(f"{OUT}/{name}.png", optimize=True)


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    for name, (floor, polys) in JOBS.items():
        render(name, floor, polys)
        print(name, os.path.getsize(f"{OUT}/{name}.png") // 1024, "KB")
