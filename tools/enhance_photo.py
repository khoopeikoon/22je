"""Gentle real-estate photo correction using Pillow only: partial white
balance, levels, shadow lift, mild contrast, sharpening. Never overwrites originals."""
import sys
from PIL import Image, ImageFilter, ImageStat

def _percentile(hist, frac):
    total = sum(hist); acc = 0
    for i, n in enumerate(hist):
        acc += n
        if acc >= total * frac:
            return i
    return 255

def enhance(path, wb_strength=0.55, shadow_gamma=0.82, contrast=0.08):
    im = Image.open(path).convert("RGB")
    small = im.copy(); small.thumbnail((400, 400))
    means = ImageStat.Stat(small).mean
    grey = sum(means) / 3
    gains = [1 + (grey / m - 1) * wb_strength for m in means]       # partial grey-world WB
    lhist = small.convert("L").histogram()
    lo, hi = _percentile(lhist, 0.005), _percentile(lhist, 0.997)   # levels
    span = max(hi - lo, 1)
    luts = []
    for g in gains:
        lut = []
        for v in range(256):
            x = min(max((v * g - lo) / span, 0.0), 1.0)
            x = x ** shadow_gamma                                  # shadow lift
            x = x + contrast * x * (1 - x) * (2 * x - 1)               # gentle S-curve
            lut.append(int(round(min(max(x, 0.0), 1.0) * 255)))
        luts += lut
    out = im.point(luts)
    return out.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=3))

if __name__ == "__main__":
    enhance(sys.argv[1]).save(sys.argv[2], quality=84, optimize=True, progressive=True)
