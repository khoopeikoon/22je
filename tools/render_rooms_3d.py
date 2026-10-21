"""Render the 3D room views on rooms.html (assets/img/<room>/*-3d.webp) from rooms_3d.js.

Needs Google Chrome and Pillow. Serves the repo on a local port, renders each room in headless
Chrome at 2x and scales it down for clean edges. three.js loads from the jsDelivr CDN.

    python3 tools/render_rooms_3d.py              # every room
    python3 tools/render_rooms_3d.py aurelia      # one room (ids are the keys of OUT)

The plan coordinates in rooms_3d.js are pixels in the architect's PDF rendered at 300 dpi
(pdftoppm -r 300 -gray), each floor cropped to its drawing with a 20 px margin.
"""
import functools
import http.server
import os
import subprocess
import sys
import tempfile
import threading

from PIL import Image

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, SCALE = 1600, 1067, 2

OUT = {
    "aurelia": "assets/img/aurelia/aurelia-3d.webp",
    "elysia-4": "assets/img/elysia/elysia-4-3d.webp",
    "elysia-3": "assets/img/elysia/elysia-3-3d.webp",
    "deluxe-queen": "assets/img/deluxe-queen/deluxe-queen-3d.webp",
    "deluxe-twin": "assets/img/deluxe-twin/deluxe-twin-3d.webp",
    "deluxe-queen-1": "assets/img/deluxe-queen/deluxe-queen-1-3d.webp",
    "deluxe-twin-1": "assets/img/deluxe-twin/deluxe-twin-1-3d.webp",
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main(rooms):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    with tempfile.TemporaryDirectory() as tmp:
        for room in rooms:
            png = os.path.join(tmp, room + ".png")
            # The canvas size is passed in: headless Chrome's viewport is shorter than its window.
            subprocess.run([
                CHROME, "--headless=new", f"--user-data-dir={tmp}/profile",
                "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars",
                f"--window-size={W},{H + 200}", f"--force-device-scale-factor={SCALE}",
                "--virtual-time-budget=60000", f"--screenshot={png}",
                f"http://127.0.0.1:{port}/tools/rooms_3d.html?room={room}&w={W}&h={H}",
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)   # not pipes: Chrome's crash reporter can hold them open
            out = os.path.join(ROOT, OUT[room])
            img = Image.open(png).convert("RGB").crop((0, 0, W * SCALE, H * SCALE))
            img.resize((W, H), Image.LANCZOS).save(out, "WEBP", quality=86, method=6)
            print(OUT[room], os.path.getsize(out) // 1024, "KB")
    server.shutdown()


if __name__ == "__main__":
    main(sys.argv[1:] or list(OUT))
