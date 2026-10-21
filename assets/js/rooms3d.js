/* The rooms of 22 Jalan Elok in 3D, shared by the explorable view (3d/index.html, viewer3d.js)
   and the still images on rooms.html (tools/rooms_3d.html, rendered by tools/render_rooms_3d.py).

   Each room is rebuilt from the architect's plan: walls, doors and windows where the plan
   has them, the plan's furniture layout, and finishes matched to the photos (walnut floor and
   panelling, white walls, grey marble ensuites, black-framed glazing). Seen from above, the walls
   nearest the camera are cut low so the room can be seen into (Builder.setCut).

   Plan coordinates are pixels in a 300-dpi render of the plan, cropped to the drawing with a
   20 px margin (see tools/render_rooms_3d.py): x runs along the house (rear on the left), y across
   it. At 1:100, 1 px = 8.47 mm. Needs an import map for "three" and "three/addons/".
*/
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const M = 0.0254 / 300 * 100;   // metres per plan pixel
export const LOW = 0.75;               // walls on the camera side are cut at this height
export const SLAB = 0.16;
export const DOOR = 2.1;
const SILL = 0.6, HEAD = 2.3;
export const deg = Math.PI / 180;

/* ---------- procedural textures (UVs are in metres) ---------- */

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise that repeats every px by py lattice cells, so textures tile without seams:
// sample at u * F with an integer F and pass F as the period.
function noise2(seed) {
  const r = rng(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const wrap = (v, n) => ((v % n) + n) % n;
  const h = (x, y, px, py) => p[p[wrap(x, px) & 255] + (wrap(y, py) & 255)] / 255;
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y, px = 256, py = 256) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), v = s(y - yi);
    const a = h(xi, yi, px, py), b = h(xi + 1, yi, px, py), c = h(xi, yi + 1, px, py), d = h(xi + 1, yi + 1, px, py);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(n, x, y, oct, px, py) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * n(x * f, y * f, px * f, py * f); a *= 0.5; f *= 2; }
  return v / (1 - Math.pow(0.5, oct));
}

const mix = (a, b, t) => a + (b - a) * t;
const hex = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function texture(size, metres, fn) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d"), img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b] = fn(x / size, y / size), i = (y * size + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / metres, 1 / metres);
  return t;
}

// Planks along u: `rows` planks across the tile, `cols` plank lengths along it, rows staggered.
function planks({ seed, dark, light, rows, cols = 2, seam = 0.55 }) {
  const n = noise2(seed), r = rng(seed + 1), px = 1 / 1024;
  const off = [...Array(rows)].map(() => r()), tone = [...Array(rows * cols)].map(() => r());
  const D = hex(dark), L = hex(light);
  return (u, v) => {
    const row = Math.min(rows - 1, Math.floor(v * rows)), fv = v * rows - row;
    const uu = u + off[row], col = Math.floor(uu * cols), fu = uu * cols - col;
    const t0 = tone[row * cols + (col % cols)];
    const g = fbm(n, uu * 8 + row * 37, v * 192, 3, 8, 192);
    const streak = Math.pow(Math.abs(Math.sin((fv * 7 + n(uu * 4, row * 5, 4, 256) * 3) * Math.PI)), 5);
    const t = Math.max(0, Math.min(1, 0.22 + 0.55 * t0 + (g - 0.5) * 0.9 - streak * 0.16));
    const edge = Math.min(fv, 1 - fv) / rows < px * 1.2 || Math.min(fu, 1 - fu) / cols < px;
    const k = edge ? seam : 1;
    return [mix(D[0], L[0], t) * k, mix(D[1], L[1], t) * k, mix(D[2], L[2], t) * k];
  };
}

function veneer({ seed, dark, light }) {
  const n = noise2(seed), D = hex(dark), L = hex(light);
  return (u, v) => {
    const g = fbm(n, u * 96, v * 4, 4, 96, 4);
    const ring = Math.pow(Math.abs(Math.sin((u * 40 + fbm(n, u * 3, v * 2, 3, 3, 2) * 8) * Math.PI)), 8);
    const t = Math.max(0, Math.min(1, 0.45 + (g - 0.5) * 1.1 - ring * 0.2));
    return [mix(D[0], L[0], t), mix(D[1], L[1], t), mix(D[2], L[2], t)];
  };
}

function marble({ seed, base, vein }) {
  const n = noise2(seed), n2 = noise2(seed + 7), B = hex(base), V = hex(vein);
  return (u, v) => {
    const wx = u * 3 + fbm(n2, u * 3, v * 3, 4, 3, 3) * 2.2, wy = v * 3 + fbm(n2, u * 3 + 5, v * 3 + 2, 4, 3, 3) * 2.2;
    const ridge = 1 - Math.abs(fbm(n, wx, wy, 5, 3, 3) * 2 - 1);
    const ridge2 = 1 - Math.abs(fbm(n2, wx * 2 + 9, wy * 2, 4, 6, 6) * 2 - 1);
    const veinT = Math.pow(ridge, 34) * 0.6 + Math.pow(ridge2, 60) * 0.35;
    const cloud = (fbm(n, u * 5 + 3, v * 5, 4, 5, 5) - 0.5) * 22;
    return [0, 1, 2].map((i) => Math.min(255, mix(B[i] + cloud, V[i], Math.min(1, veinT))));
  };
}

// Large-format stone tiles: a calm marble with grout lines, cols x rows tiles per texture tile.
function tiles({ seed, base, vein, cols, rows }) {
  const m = marble({ seed, base, vein }), g = 0.7 / 1024;
  return (u, v) => {
    const fu = (u * cols) % 1, fv = (v * rows) % 1;
    const edge = Math.min(fu, 1 - fu) / cols < g || Math.min(fv, 1 - fv) / rows < g;
    return m(u, v).map((c) => (edge ? c * 0.82 : c));
  };
}

function speckle({ seed, base, amount }) {
  const n = noise2(seed), r = rng(seed), B = hex(base);
  return (u, v) => {
    const s = r();
    const k = s > 1 - amount ? 70 * r() : s < amount ? -18 : 0;
    const c = (fbm(n, u * 30, v * 30, 3, 30, 30) - 0.5) * 14 + k;
    return [B[0] + c, B[1] + c, B[2] + c];
  };
}

function cloth({ seed, base, amp = 10, scale = 200 }) {
  const n = noise2(seed), B = hex(base);
  return (u, v) => {
    const c = (n(u * scale, v * scale, scale, scale) - 0.5) * amp + (fbm(n, u * 8, v * 8, 3, 8, 8) - 0.5) * amp;
    return [B[0] + c, B[1] + c, B[2] + c];
  };
}

/* ---------- materials ---------- */

export function materials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const tex = {
    floor: texture(1024, 2.4, planks({ seed: 3, dark: 0x3e2517, light: 0x7a4b2f, rows: 13 })),   // 18 cm boards
    deck: texture(1024, 2.4, planks({ seed: 9, dark: 0x8a7766, light: 0xb7a48f, rows: 12, seam: 0.7 })),
    deckWarm: texture(1024, 2.4, planks({ seed: 41, dark: 0x5e4535, light: 0x8f6f58, rows: 12, seam: 0.7 })),
    walnut: texture(1024, 1.2, veneer({ seed: 5, dark: 0x3a2619, light: 0x6e4a32 })),
    marble: texture(1024, 1.2, marble({ seed: 11, base: 0x9a948d, vein: 0xd9d4cc })),
    granite: texture(512, 0.6, speckle({ seed: 13, base: 0x2d2c2b, amount: 0.04 })),
    limestone: texture(1024, 2.4, tiles({ seed: 23, base: 0xe4ddd1, vein: 0xf1ece4, cols: 2, rows: 4 })),
    darkStone: texture(1024, 1.2, marble({ seed: 29, base: 0x3a3836, vein: 0xbdb8b0 })),
    tile: texture(1024, 2.4, tiles({ seed: 31, base: 0x8d8a85, vein: 0x9b9893, cols: 2, rows: 4 })),
    paving: texture(512, 0.6, speckle({ seed: 37, base: 0x8c8882, amount: 0.05 })),
    linen: texture(512, 0.6, cloth({ seed: 19, base: 0xf1eee8, amp: 4, scale: 300 })),
  };
  return {
    wall: std({ color: 0xece7df, roughness: 0.92 }),
    poche: std({ color: 0x3b3129, roughness: 1 }),
    floor: std({ map: tex.floor, roughness: 0.5 }),
    deck: std({ map: tex.deck, roughness: 0.85 }),
    deckWarm: std({ map: tex.deckWarm, roughness: 0.85 }),
    stone: std({ map: tex.granite, roughness: 0.45 }),
    limestone: std({ map: tex.limestone, roughness: 0.35 }),
    darkStone: std({ map: tex.darkStone, roughness: 0.3 }),
    sofa: std({ color: 0xcfc6b8, roughness: 1 }),
    leather: std({ color: 0x1f1c1a, roughness: 0.55 }),
    chairFabric: std({ color: 0x4a403a, roughness: 0.95 }),
    brass: std({ color: 0xb48f58, roughness: 0.3, metalness: 1 }),
    steel: std({ color: 0xa9abad, roughness: 0.35, metalness: 1 }),
    walnut: std({ map: tex.walnut, roughness: 0.55 }),
    walnutDark: std({ map: tex.walnut, color: 0x8a7a70, roughness: 0.55 }),
    marble: std({ map: tex.marble, roughness: 0.22 }),
    graniteTop: std({ color: 0x1d1c1b, roughness: 0.3 }),
    porcelain: std({ color: 0xf6f6f3, roughness: 0.12 }),
    linen: std({ map: tex.linen, roughness: 0.95 }),
    pillow: std({ color: 0xf7f5f0, roughness: 0.95 }),
    throw: std({ color: 0x8c8781, roughness: 1 }),
    upholstery: std({ color: 0x55504b, roughness: 0.95 }),
    seat: std({ color: 0x8f8a83, roughness: 0.95 }),
    oak: std({ color: 0xc8a57a, roughness: 0.6 }),
    curtain: std({ color: 0x9b948b, roughness: 1 }),
    black: std({ color: 0x1c1c1c, roughness: 0.35, metalness: 0.3 }),
    chrome: std({ color: 0xd8d8d8, roughness: 0.15, metalness: 1 }),
    tv: std({ color: 0x101010, roughness: 0.15, metalness: 0.2 }),
    mirror: std({ color: 0xc9d1d3, roughness: 0.08, metalness: 0.55 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xe2edf1, roughness: 0.05, transparent: true, opacity: 0.38, depthWrite: false }),
    concrete: std({ color: 0xa9a49c, roughness: 0.95 }),
    tile: std({ map: tex.tile, roughness: 0.5 }),
    paving: std({ map: tex.paving, roughness: 0.8 }),
    carPaint: std({ color: 0x3b4044, roughness: 0.25, metalness: 0.6 }),
    interior: std({ color: 0x8f8b86, roughness: 0.8 }),
    ceiling: std({ color: 0xf2efea, roughness: 0.95, emissive: 0xf2efea, emissiveIntensity: 0.35 }),
    pot: std({ color: 0x4f4b47, roughness: 0.8 }),
    leaf: std({ color: 0x4a6636, roughness: 0.8, flatShading: true }),
    leaf2: std({ color: 0x6f8f4e, roughness: 0.8, flatShading: true }),
  };
}

/* ---------- builder ---------- */

export const px = (v) => v * M;

// Box UVs in metres, so textures keep their real-world scale on any size of box.
function metricUV(geo, w, h, d) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
  }
}

// H: wall height (the top is the cut, or the ceiling when walking around inside).
export class Builder {
  constructor(mats, { H = 2.45 } = {}) {
    this.m = mats;
    this.H = H;
    this.group = new THREE.Group();
    this.walls = [];      // wall pieces: built once, cut or not by setCut
    this.floors = [];     // plan polygons
    this.roofed = [];     // ...of them, the indoor ones
    this.solids = [];     // plan rectangles you can't walk through
    this.thresholds = []; // ...and door openings you can (they have no floor of their own)
    this.r = rng(42);
  }

  add(mesh, shadow = true) {
    mesh.castShadow = mesh.receiveShadow = shadow;
    this.group.add(mesh);
    return mesh;
  }

  solid(x0, y0, x1, y1) { this.solids.push([x0, y0, x1, y1]); }

  box(x0, y0, x1, y1, h0, h1, mat, { round = 0 } = {}) {
    const w = px(x1 - x0), d = px(y1 - y0), h = h1 - h0;
    let geo;
    if (round) geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(round, w / 2, h / 2, d / 2));
    else { geo = new THREE.BoxGeometry(w, h, d); metricUV(geo, w, h, d); }
    const mesh = new THREE.Mesh(geo, typeof mat === "string" ? this.m[mat] : mat);
    mesh.position.set(px(x0 + x1) / 2, (h0 + h1) / 2, px(y0 + y1) / 2);
    return this.add(mesh, mat !== "glass");
  }

  floor(poly, mat = "floor", lift = 0) {
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(px(x), px(y))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, [this.m[mat], this.m.poche]);
    mesh.position.y = lift;
    this.floors.push(poly);
    if (!mat.startsWith("deck")) this.roofed.push(poly);   // outdoor decks have no ceiling
    return this.add(mesh);
  }

  /* Wall-like pieces (walls, headers, sills, glazing, things fixed to walls) are cut with the wall.
     faces: material per side, e.g. { n: "marble" } for the side facing north (up the plan).
     follow: another wall piece whose cut this one shares (a wardrobe's door lines).
     keep: never cut. walkable: not in the way when walking around (a glass door's frame). */
  wall(x0, y0, x1, y1, { h0 = 0, h1 = this.H, mat = "wall", faces = {}, keep, furniture = false, follow, walkable = false } = {}) {
    const w = { x0, y0, x1, y1, h0, h1, mat, faces, keep, furniture, follow };
    this.walls.push(w);
    if (h0 < 0.1 && mat !== "glass" && !walkable) this.solid(x0, y0, x1, y1);
    return w;
  }

  // A wall that isn't square to the house (the plot's rear boundary), t px thick along the line a-b.
  wallLine(xa, ya, xb, yb, t, opt = {}) {
    const w = this.wall(Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb), { ...opt, walkable: true });
    w.line = [xa, ya, xb, yb, t];
    const n = Math.ceil(Math.hypot(xb - xa, yb - ya) / 8);
    for (let i = 0; i <= n; i++) {
      const x = xa + (xb - xa) * i / n, y = ya + (yb - ya) * i / n;
      this.solid(x - t / 2, y - t / 2, x + t / 2, y + t / 2);
    }
    return w;
  }

  door(x0, y0, x1, y1, opt = {}) {
    this.wall(x0, y0, x1, y1, { ...opt, h0: DOOR });
    this.thresholds.push([x0, y0, x1, y1]);
  }

  // A window in a wall rectangle. sill 0 makes it a full-height glass door. All its pieces are cut
  // (or not) together with the header.
  window(x0, y0, x1, y1, { sill = SILL, head = HEAD, mullions = [], faces = {}, keep } = {}) {
    const alongY = y1 - y0 > x1 - x0;
    const header = this.wall(x0, y0, x1, y1, { h0: head, faces, keep });
    if (sill === 0) this.thresholds.push([x0, y0, x1, y1]);
    if (sill > 0) this.wall(x0, y0, x1, y1, { h1: sill, faces, follow: header });
    const f = 6;   // frame profile, px (5 cm)
    const mid = alongY ? (x0 + x1) / 2 : (y0 + y1) / 2;
    const span = (a, b, h0, h1, mat) => alongY
      ? this.wall(mid - (mat === "glass" ? 1 : f / 2), a, mid + (mat === "glass" ? 1 : f / 2), b, { h0, h1, mat, follow: header, walkable: sill === 0 })
      : this.wall(a, mid - (mat === "glass" ? 1 : f / 2), b, mid + (mat === "glass" ? 1 : f / 2), { h0, h1, mat, follow: header, walkable: sill === 0 });
    const [a, b] = alongY ? [y0, y1] : [x0, x1];
    span(a, b, sill + 0.05, head - 0.05, "glass");
    span(a, b, sill, sill + 0.05, "black");
    span(a, b, head - 0.05, head, "black");
    for (const p of [a, ...mullions.map((m) => m - f / 2), b - f]) span(p, p + f, sill, head, "black");
  }

  glass(x0, y0, x1, y1, h0, h1) { this.box(x0, y0, x1, y1, h0, h1, "glass"); }

  /* Frameless shower screen along a line of constant x (x0..x1 is the glass thickness), from y0 to y1.
     door: [a, b] is the hinged glass door within it, hinge "n" (at a) or "s" (at b); it is drawn a
     little open, swinging east into the shower. The rest is fixed glass. */
  shower(x0, x1, y0, y1, { door, hinge = "n", open = 28 } = {}) {
    const HT = 2.0, gap = 1.2;   // 1 cm between panels
    const fixed = !door ? [[y0, y1]] : [[y0, door[0] - gap], [door[1] + gap, y1]].filter(([a, b]) => b - a > 2);
    for (const [a, b] of fixed) { this.glass(x0, a, x1, b, 0, HT); this.solid(x0, a, x1, b); }
    if (!door) return;
    const len = px(door[1] - door[0]), t = px(x1 - x0), sgn = hinge === "n" ? 1 : -1;
    const pivot = new THREE.Group();
    pivot.position.set(px(x0 + x1) / 2, 0, px(hinge === "n" ? door[0] : door[1]));
    pivot.rotation.y = sgn * open * deg;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(t, HT - 0.02, len), this.m.glass);
    pane.position.set(0, (HT - 0.02) / 2 + 0.01, sgn * len / 2);
    pivot.add(pane);
    for (const h of [0.3, HT - 0.3]) {   // hinges
      const hg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), this.m.chrome);
      hg.position.set(0, h, sgn * 0.025);
      pivot.add(hg);
    }
    for (const side of [-1, 1]) {        // towel-bar handle on both faces, at the free edge
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.45, 12), this.m.chrome);
      bar.position.set(side * 0.045, 1.05, sgn * (len - 0.06));
      pivot.add(bar);
    }
    pivot.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = o.material !== this.m.glass; });
    this.group.add(pivot);
  }

  balustrade(x0, y0, x1, y1) {
    this.glass(x0, y0, x1, y1, 0.06, 1.1);
    this.box(x0 - 1, y0 - 1, x1 + 1, y1 + 1, 0, 0.06, "black");
  }

  /* ---------- furniture ---------- */

  // Sub-rectangle in bed-local coordinates: u across (0..1), v from the head (0) to the foot (1).
  local([x0, y0, x1, y1], head) {
    return (u0, v0, u1, v1) => {
      const W = x1 - x0, L = y1 - y0;
      switch (head) {
        case "n": return [x0 + u0 * W, y0 + v0 * L, x0 + u1 * W, y0 + v1 * L];
        case "s": return [x0 + u0 * W, y1 - v1 * L, x0 + u1 * W, y1 - v0 * L];
        case "w": return [x0 + v0 * W, y0 + u0 * L, x0 + v1 * W, y0 + u1 * L];
        case "e": return [x1 - v1 * W, y0 + u0 * L, x1 - v0 * W, y0 + u1 * L];
      }
    };
  }

  bed(rect, head, { pillows = 2, headboard = "walnutDark" } = {}) {
    const s = this.local(rect, head);
    this.solid(...s(0, -0.045, 1, 1));
    this.box(...s(0, 0, 1, 1), 0, 0.3, "walnutDark");
    this.box(...s(0.015, 0.01, 0.985, 0.99), 0.3, 0.52, "linen", { round: 0.05 });
    this.box(...s(-0.012, 0.3, 1.012, 1.008), 0.47, 0.565, "linen", { round: 0.04 });
    this.box(...s(-0.018, 0.74, 1.018, 0.9), 0.5, 0.58, "throw", { round: 0.02 });
    const pw = pillows === 2 ? [[0.05, 0.485], [0.515, 0.95]] : [[0.1, 0.9]];
    for (const [u0, u1] of pw) this.box(...s(u0, 0.035, u1, 0.2), 0.52, 0.67, "pillow", { round: 0.065 });
    if (headboard) this.box(...s(0, -0.045, 1, 0), 0, 1.05, headboard, { round: 0.015 });
  }

  nightstand(x0, y0, x1, y1, h = 0.5) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0.12, h, "walnut");
    this.box(x0 + 3, y0 + 3, x1 - 3, y1 - 3, 0, 0.12, "black");
  }

  desk(x0, y0, x1, y1, drawers, h = 0.75) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, h - 0.035, h, "walnut");
    const p = 47;  // 40 cm drawer pedestal
    const ped = { n: [x0, y0, x1, y0 + p], s: [x0, y1 - p, x1, y1], w: [x0, y0, x0 + p, y1], e: [x1 - p, y0, x1, y1] }[drawers];
    const end = { n: [x0, y1 - 4, x1, y1], s: [x0, y0, x1, y0 + 4], w: [x1 - 4, y0, x1, y1], e: [x0, y0, x0 + 4, y1] }[drawers];
    this.box(...ped, 0, h - 0.035, "walnut");
    this.box(...end, 0, h - 0.035, "walnut");
  }

  // A wall-hung desk: a top over a shallow drawer, nothing to the floor.
  hungDesk(x0, y0, x1, y1, h = 0.75) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, h - 0.035, h, "walnut");
    this.box(x0 + 2, y0, x1 - 2, y1 - 4, h - 0.16, h - 0.035, "walnutDark");
  }

  stool(cx, cy) {
    const r = 24;   // 40 cm seat
    this.box(cx - r, cy - r, cx + r, cy + r, 0.42, 0.49, "seat", { round: 0.03 });
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      this.box(cx + dx * (r - 4) - 2, cy + dy * (r - 4) - 2, cx + dx * (r - 4) + 2, cy + dy * (r - 4) + 2, 0, 0.42, "oak");
  }

  bench(x0, y0, x1, y1) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0.14, 0.45, "upholstery", { round: 0.04 });
    this.box(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 0, 0.14, "black");
  }

  // Full height, so it is cut with the walls when it stands on the camera side; cut, it shows as a
  // wardrobe sliced open (openCarcass) rather than a low solid box, which would read as a bench.
  wardrobe(x0, y0, x1, y1, front, h = this.H - 0.05) {
    const body = this.wall(x0, y0, x1, y1, { h1: h, mat: "walnutDark", furniture: true });
    const alongY = front === "e" || front === "w";
    const [a, b] = alongY ? [y0, y1] : [x0, x1];
    const doors = Math.max(2, Math.round(px(b - a) / 0.5));
    body.cutAs = () => this.openCarcass(x0, y0, x1, y1, alongY, doors);
    for (let i = 1; i < doors; i++) {
      const p = a + (b - a) * i / doors;
      const g = { n: [p - 0.6, y0 - 0.6, p + 0.6, y0 + 1], s: [p - 0.6, y1 - 1, p + 0.6, y1 + 0.6],
        w: [x0 - 0.6, p - 0.6, x0 + 1, p + 0.6], e: [x1 - 1, p - 0.6, x1 + 0.6, p + 0.6] }[front];
      this.wall(...g, { h0: 0.02, h1: h - 0.02, mat: "black", furniture: true, follow: body });
    }
  }

  // A wardrobe cut at LOW: panels and doors in section (dark tops, like the cut walls), its grey
  // interior with a shelf, and a partition between every second pair of doors.
  openCarcass(x0, y0, x1, y1, alongY, doors) {
    const group = new THREE.Group(), t = 2.5;   // 2 cm panels
    const cut = [this.m.walnutDark, this.m.walnutDark, this.m.poche, this.m.walnutDark, this.m.walnutDark, this.m.walnutDark];
    const panel = (a, b, c, d, h0, h1, mat) => {
      const w = px(c - a), dd = px(d - b), geo = new THREE.BoxGeometry(w, h1 - h0, dd);
      metricUV(geo, w, h1 - h0, dd);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px(a + c) / 2, (h0 + h1) / 2, px(b + d) / 2);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    };
    panel(x0, y0, x1, y0 + t, 0, LOW, cut);
    panel(x0, y1 - t, x1, y1, 0, LOW, cut);
    panel(x0, y0, x0 + t, y1, 0, LOW, cut);
    panel(x1 - t, y0, x1, y1, 0, LOW, cut);
    panel(x0 + t, y0 + t, x1 - t, y1 - t, 0, 0.1, this.m.interior);
    panel(x0 + t, y0 + t, x1 - t, y1 - t, 0.44, 0.46, this.m.interior);
    for (let i = 2; i < doors; i += 2) {
      const p = (alongY ? y0 + (y1 - y0) * i / doors : x0 + (x1 - x0) * i / doors);
      if (alongY) panel(x0 + t, p - t / 2, x1 - t, p + t / 2, 0, LOW, cut);
      else panel(p - t / 2, y0 + t, p + t / 2, y1 - t, 0, LOW, cut);
    }
    this.group.add(group);
    return group;
  }

  // Curtain gathered at the side of a window: a row of vertical folds.
  curtain(x0, y0, x1, y1) {
    const alongY = y1 - y0 > x1 - x0;
    const r = (alongY ? x1 - x0 : y1 - y0) / 2, [a, b] = alongY ? [y0, y1] : [x0, x1];
    const n = Math.max(2, Math.round((b - a) / (r * 1.4)));
    for (let i = 0; i < n; i++) {
      const c = a + r + (b - a - 2 * r) * i / (n - 1);
      const geo = new THREE.CylinderGeometry(px(r), px(r), this.H - 0.08, 10);
      const mesh = new THREE.Mesh(geo, this.m.curtain);
      mesh.position.set(alongY ? px((x0 + x1) / 2) : px(c), (this.H - 0.08) / 2 + 0.03, alongY ? px(c) : px((y0 + y1) / 2));
      this.add(mesh);
    }
  }

  vanity(x0, y0, x1, y1, basin, h = 0.85) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0.32, h - 0.03, "walnutDark");
    this.box(x0, y0, x1, y1, h - 0.03, h, "graniteTop");
    this.box(...basin, h - 0.1, h + 0.002, "porcelain");
  }

  toilet(x0, y0, x1, y1) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0, 0.4, "porcelain", { round: 0.14 });
    this.box(x0 + 3, y0 + 3, x1 - 3, y1 - 3, 0.36, 0.43, "porcelain", { round: 0.12 });
  }

  // A run of base cabinets with a stone top.
  counter(x0, y0, x1, y1, h = 0.9) {
    this.solid(x0, y0, x1, y1);
    this.box(x0 + 3, y0 + 3, x1 - 3, y1 - 3, 0, 0.1, "black");
    this.box(x0, y0, x1, y1, 0.1, h - 0.03, "walnut");
    this.box(x0, y0, x1, y1, h - 0.03, h, "graniteTop");
  }

  // A small mesh group at a plan point, turned to face `deg` (0 = up the plan, 90 = right).
  piece(cx, cy, deg) {
    const g = new THREE.Group();
    g.position.set(px(cx), 0, px(cy));
    g.rotation.y = -deg * Math.PI / 180;
    this.group.add(g);
    const part = (geo, mat, x, y, z) => {
      const mesh = new THREE.Mesh(geo, this.m[mat]);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    return part;
  }

  // Dining chair facing `deg`, upholstered seat and back on slim black legs.
  chair(cx, cy, deg) {
    this.solid(cx - 25, cy - 25, cx + 25, cy + 25);
    const part = this.piece(cx, cy, deg);
    part(new RoundedBoxGeometry(0.48, 0.1, 0.48, 3, 0.04), "chairFabric", 0, 0.47, 0);
    part(new RoundedBoxGeometry(0.46, 0.46, 0.08, 3, 0.035), "chairFabric", 0, 0.73, 0.22);
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]])
      part(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), "black", x, 0.21, z);
  }

  roundTable(cx, cy, r, h = 0.75) {
    this.solid(cx - r, cy - r, cx + r, cy + r);
    const part = this.piece(cx, cy, 0), R = px(r);
    part(new THREE.CylinderGeometry(R, R, 0.03, 64), "darkStone", 0, h - 0.015, 0);
    part(new THREE.CylinderGeometry(0.09, 0.12, h - 0.03, 24), "black", 0, (h - 0.03) / 2, 0);
    part(new THREE.CylinderGeometry(R * 0.45, R * 0.45, 0.03, 48), "black", 0, 0.015, 0);
  }

  // Round, in tiers: a black glass top on a polished drum, over a wider black glass disc.
  coffeeTable(cx, cy, r) {
    this.solid(cx - r, cy - r, cx + r, cy + r);
    const part = this.piece(cx, cy, 0), R = px(r);
    part(new THREE.CylinderGeometry(R, R, 0.03, 64), "tv", 0, 0.1, 0);
    part(new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.26, 64), "chrome", 0, 0.24, 0);
    part(new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.03, 64), "tv", 0, 0.385, 0);
  }

  // A tall slim floor speaker: wooden slatted body on a polished stem.
  speaker(cx, cy) {
    this.solid(cx - 8, cy - 8, cx + 8, cy + 8);
    const part = this.piece(cx, cy, 0);
    part(new THREE.CylinderGeometry(0.015, 0.06, 0.9, 16), "chrome", 0, 0.45, 0);
    part(new RoundedBoxGeometry(0.13, 1.05, 0.09, 3, 0.03), "oak", 0, 1.43, 0);
  }

  ottoman(cx, cy, s = 25) {
    this.solid(cx - s, cy - s, cx + s, cy + s);
    this.box(cx - s, cy - s, cx + s, cy + s, 0, 0.42, "leather", { round: 0.05 });
  }

  // Sofa facing `facing` (the side the seats look towards).
  sofa(rect, facing) {
    const back = { n: "s", s: "n", e: "w", w: "e" }[facing], s = this.local(rect, back);
    this.solid(...rect);
    this.box(...s(0, 0, 1, 1), 0.08, 0.42, "sofa", { round: 0.03 });
    this.box(...s(0, 0, 1, 0.24), 0.4, 0.84, "sofa", { round: 0.06 });
    this.box(...s(0, 0, 0.07, 1), 0.4, 0.64, "sofa", { round: 0.05 });
    this.box(...s(0.93, 0, 1, 1), 0.4, 0.64, "sofa", { round: 0.05 });
    for (let i = 0; i < 3; i++) this.box(...s(0.07 + i * 0.86 / 3 + 0.005, 0.24, 0.07 + (i + 1) * 0.86 / 3 - 0.005, 0.98), 0.4, 0.55, "sofa", { round: 0.06 });
  }

  // A car parked along x (the plan draws one in the car porch), for scale.
  car(x0, y0, x1, y1) {
    this.solid(x0, y0, x1, y1);
    const L = x1 - x0, W = y1 - y0;
    this.box(x0, y0 + W * 0.04, x1, y1 - W * 0.04, 0.22, 0.78, "carPaint", { round: 0.12 });
    this.box(x0 + L * 0.3, y0 + W * 0.1, x1 - L * 0.22, y1 - W * 0.1, 0.7, 1.38, "tv", { round: 0.14 });
    for (const x of [x0 + L * 0.17, x1 - L * 0.17]) for (const y of [y0 + W * 0.04, y1 - W * 0.04]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), this.m.black);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(px(x), 0.33, px(y));
      this.add(wheel);
    }
  }

  // A flight of n treads in the rectangle, climbing towards `dir` by `rise` each (negative: down)
  // from height `from`.
  stairs(x0, y0, x1, y1, dir, n, rise, from = 0) {
    this.solid(x0, y0, x1, y1);
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n, top = from + rise * (i + 1);
      const r = { n: [x0, y1 - (y1 - y0) * b, x1, y1 - (y1 - y0) * a], s: [x0, y0 + (y1 - y0) * a, x1, y0 + (y1 - y0) * b],
        w: [x1 - (x1 - x0) * b, y0, x1 - (x1 - x0) * a, y1], e: [x0 + (x1 - x0) * a, y0, x0 + (x1 - x0) * b, y1] }[dir];
      this.box(...r, rise > 0 ? from : top - 0.05, top, "walnut");
    }
  }

  /* Black vertical bars along a rectangle's long side, with a top rail: a slatted privacy screen,
     or (bar 2, pitch 0.11 m) a railing. Cut with the walls when it stands on the camera side. */
  slats(x0, y0, x1, y1, h = 1.2, { bar = 4, pitch = 0.1 } = {}) {
    const w = this.wall(x0, y0, x1, y1, { h1: h, mat: "black", furniture: true });
    const build = (top) => {
      const group = new THREE.Group(), alongY = y1 - y0 > x1 - x0, [a, b] = alongY ? [y0, y1] : [x0, x1];
      const n = Math.round(px(b - a) / pitch), piece = (r, h0, h1) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(px(r[2] - r[0]), h1 - h0, px(r[3] - r[1])), this.m.black);
        mesh.position.set(px(r[0] + r[2]) / 2, (h0 + h1) / 2, px(r[1] + r[3]) / 2);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      };
      for (let i = 0; i < n; i++) {
        const p = a + (b - a) * (i + 0.5) / n;
        piece(alongY ? [x0, p - bar / 2, x1, p + bar / 2] : [p - bar / 2, y0, p + bar / 2, y1], 0, top);
      }
      piece([x0, y0, x1, y1], top, top + 0.04);
      this.group.add(group);
      return group;
    };
    w.fullAs = () => build(h);
    w.cutAs = () => build(LOW - 0.04);
  }

  ledge(x0, y0, x1, y1, h = 1.0) { this.solid(x0, y0, x1, y1); this.box(x0, y0, x1, y1, 0, h, "marble"); }

  // Foliage: many small faceted leaf clusters scattered through an ellipsoid.
  foliage(x, y, z, rx, ry, rz, n, size) {
    for (let i = 0; i < n; i++) {
      let a, b, c;
      do { a = this.r() * 2 - 1; b = this.r() * 2 - 1; c = this.r() * 2 - 1; } while (a * a + b * b + c * c > 1);
      const geo = new THREE.IcosahedronGeometry(size * (0.6 + this.r() * 0.6), 0);
      const leaf = new THREE.Mesh(geo, this.r() > 0.45 ? this.m.leaf : this.m.leaf2);
      leaf.position.set(x + a * rx, y + b * ry, z + c * rz);
      leaf.rotation.set(this.r() * 3, this.r() * 3, this.r() * 3);
      leaf.scale.set(1, 0.55, 1);
      this.add(leaf);
    }
  }

  plant(cx, cy, r) {
    this.solid(cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6);
    const R = px(r), x = px(cx), z = px(cy);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.5, 0.48, 32), this.m.pot);
    pot.position.set(x, 0.24, z);
    this.add(pot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.7, 8), this.m.oak);
    stem.position.set(x, 0.75, z);
    this.add(stem);
    this.foliage(x, 1.25, z, R * 0.95, 0.42, R * 0.95, 90, 0.07);
  }

  planter(x0, y0, x1, y1) {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0, 0.45, "concrete");
    const x = px((x0 + x1) / 2), z = px((y0 + y1) / 2);
    this.foliage(x, 0.6, z, px(x1 - x0) * 0.45, 0.16, px(y1 - y0) * 0.48, 140, 0.06);
  }

  /* ---------- walls, cut for the camera ---------- */

  // Each wall piece gets a full-height mesh and, where it would differ, one cut at LOW.
  buildWalls() {
    const xs = this.floors.flat().map((p) => p[0]), ys = this.floors.flat().map((p) => p[1]);
    this.centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    for (const w of this.walls) {
      w.full = w.fullAs ? w.fullAs() : this.wallMesh(w, w.h0, w.h1, w.h1 >= this.H - 1e-6);
      w.low = w.h0 >= LOW ? null : w.h1 > LOW ? (w.cutAs ? w.cutAs() : this.wallMesh(w, w.h0, LOW, true)) : w.full;
    }
    this.setCut(null);
  }

  wallMesh(w, h0, h1, cutTop) {
    if (h0 === 0 && w.mat === "wall") h0 = -SLAB;
    const side = (k) => this.m[w.faces[k] || w.mat];
    const top = cutTop && !w.furniture && w.mat !== "glass" && w.mat !== "black" ? this.m.poche : side("top");
    const [xa, ya, xb, yb, t] = w.line || [];
    const len = w.line ? px(Math.hypot(xb - xa, yb - ya)) : px(w.x1 - w.x0), d = w.line ? px(t) : px(w.y1 - w.y0);
    const geo = new THREE.BoxGeometry(len, h1 - h0, d);
    metricUV(geo, len, h1 - h0, d);
    const mesh = new THREE.Mesh(geo, [side("e"), side("w"), top, side("w"), side("s"), side("n")]);
    mesh.position.set(px(w.x0 + w.x1) / 2, (h0 + h1) / 2, px(w.y0 + w.y1) / 2);
    if (w.line) mesh.rotation.y = -Math.atan2(yb - ya, xb - xa);
    return this.add(mesh, w.mat !== "glass");
  }

  /* Cut the pieces on the camera's side of the room (az: direction from the room to the camera,
     in degrees, 0 = from the south, 90 = from the east), or none (null). Returns whether anything changed. */
  setCut(az) {
    const [cx, cy] = this.centre, dx = Math.sin((az ?? 0) * deg), dy = Math.cos((az ?? 0) * deg);
    let changed = false;
    for (const w of this.walls) {
      const front = w.follow ? w.follow.front
        : az != null && !w.keep && ((w.x0 + w.x1) / 2 - cx) * dx + ((w.y0 + w.y1) / 2 - cy) * dy > 0;
      changed ||= front !== w.front;
      w.front = front;
      if (w.low === w.full) continue;
      w.full.visible = !front;
      if (w.low) w.low.visible = front;
    }
    return changed;
  }

  // A ceiling over the indoor floors, for walking around inside.
  ceiling() {
    const group = new THREE.Group();
    for (const poly of this.roofed) {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(px(x), px(y)))));
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, this.m.ceiling);
      mesh.position.y = this.H;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.group.add(group);
    return group;
  }

  // Can you stand here (metres)? On a floor, and clear of walls and furniture by r.
  free(x, z, r = 0.2) {
    const p = [x / M, z / M], rp = r / M;
    const inside = (poly) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const within = ([x0, y0, x1, y1]) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    return (this.floors.some(inside) || this.thresholds.some(within)) &&
      !this.solids.some(([x0, y0, x1, y1]) => p[0] > x0 - rp && p[0] < x1 + rp && p[1] > y0 - rp && p[1] < y1 + rp);
  }
}

/* ---------- the rooms (coordinates: see the header) ---------- */

export const ROOMS = {
  // view: the still image's camera (az: from which side, 0 = south, 90 = east; el: elevation).
  // walk: where walking around starts (plan px) and the way it faces (0 = up the plan, 90 = right).
  // Deluxe Queen 4 (4th floor; 3 is identical; 1 is below). Bed against the north wall, window at the rear.
  "deluxe-queen": {
    view: { az: 32, el: 56 },
    walk: { at: [830, 345], face: 285 },
    build(b) {
      b.floor([[150, 45], [655, 45], [655, 280], [877, 280], [877, 405], [128, 405], [128, 160], [150, 160]]);
      b.floor([[680, 45], [963, 45], [963, 262], [680, 262]], "stone", 0.004);
      b.wall(128, 20, 680, 45);
      b.wall(680, 20, 985, 45, { faces: { s: "marble" } });
      b.wall(150, 45, 180, 160);
      b.wall(128, 160, 180, 195);
      b.window(128, 195, 160, 405, { mullions: [300] });
      b.wall(128, 405, 768, 432);
      b.door(768, 405, 862, 432);
      b.wall(862, 405, 898, 432);
      b.wall(877, 280, 898, 405);
      b.wall(655, 45, 680, 280, { faces: { e: "marble" }, keep: true });   // behind the wardrobe: never cut
      b.door(680, 262, 785, 280, { faces: { n: "marble" } });          // pocket door: opening at the west end,
      b.wall(785, 262, 985, 280, { faces: { n: "marble" } });          // the door slides east into this wall
      b.wall(963, 45, 985, 262, { faces: { w: "marble" } });
      b.wall(180, 45, 585, 58, { h1: 1.2, mat: "walnut" });          // headboard panelling
      b.wall(180, 398, 583, 405, { mat: "walnut" });                   // TV wall panelling
      b.wall(290, 385, 463, 392, { h0: 1.0, h1: 1.8, mat: "tv" });
      b.wall(684, 45, 770, 47, { h0: 1.15, h1: 2.1, mat: "mirror" });
      b.ledge(680, 47, 857, 90);
      b.vanity(682, 92, 772, 152, [696, 106, 756, 142]);
      b.toilet(792, 95, 836, 175);
      b.shower(857, 862, 90, 262, { door: [186, 262], hinge: "s" });
      b.wardrobe(585, 47, 655, 280, "w");
      b.bed([287, 62, 470, 295], "n");
      b.nightstand(472, 62, 527, 110);
      b.desk(180, 62, 282, 130, "w");
      b.stool(236, 150);
      b.curtain(161, 197, 177, 237);
      b.curtain(161, 364, 177, 404);
    },
  },

  // Deluxe Twin 4 (4th floor; 3 is identical). Beds against the south wall, window at the rear.
  "deluxe-twin": {
    view: { az: 148, el: 56 },
    walk: { at: [680, 500], face: 255 },
    build(b) {
      b.floor([[118, 432], [723, 432], [723, 563], [597, 563], [597, 770], [90, 770], [90, 530], [118, 530]]);
      b.floor([[615, 582], [898, 582], [898, 770], [615, 770]], "stone", 0.004);
      b.wall(88, 405, 763, 432);
      b.wall(723, 432, 740, 452);
      b.door(723, 452, 740, 545);
      b.wall(723, 545, 740, 563);
      b.wall(88, 432, 118, 530);
      b.wall(65, 530, 118, 565);
      b.window(65, 565, 90, 770, { mullions: [665] });
      b.wall(20, 770, 598, 800);
      b.wall(598, 770, 928, 800, { faces: { n: "marble" } });
      b.wall(597, 563, 617, 770, { faces: { e: "marble" }, keep: true });   // behind the wardrobe: never cut
      b.wall(617, 563, 622, 582);
      b.door(622, 563, 717, 582, { faces: { s: "marble" } });
      b.wall(717, 563, 900, 582, { faces: { s: "marble" } });
      b.wall(898, 563, 928, 800, { faces: { w: "marble" } });
      b.wall(863, 752, 898, 770, { faces: { n: "marble", w: "marble" } });
      b.wall(90, 758, 527, 770, { h1: 1.2, mat: "walnut" });          // headboard panelling
      b.wall(180, 432, 520, 440, { mat: "walnut" });
      b.wall(233, 440, 405, 447, { h0: 1.0, h1: 1.8, mat: "tv" });
      b.wall(619, 768, 703, 770, { h0: 1.15, h1: 2.1, mat: "mirror" });
      b.ledge(617, 752, 863, 770);
      b.vanity(617, 687, 705, 752, [632, 697, 690, 733]);
      b.toilet(727, 672, 772, 752);
      b.shower(793, 799, 582, 752, { door: [582, 657], hinge: "n" });
      b.wardrobe(527, 563, 597, 770, "w");
      b.bed([175, 540, 290, 758], "s", { pillows: 1, headboard: "upholstery" });
      b.bed([348, 540, 462, 758], "s", { pillows: 1, headboard: "upholstery" });
      b.nightstand(112, 712, 170, 758);                               // by the window
      b.nightstand(292, 712, 346, 758);                               // between the beds
      b.desk(118, 445, 215, 482, "w");
      b.stool(168, 500);
      b.curtain(91, 567, 107, 607);
      b.curtain(91, 728, 107, 768);
    },
  },

  // Deluxe Queen 1 (1st floor): the same room as 3 and 4, with glass doors onto its own rear terrace.
  "deluxe-queen-1": {
    view: { az: 32, el: 56 },
    walk: { at: [925, 345], face: 285 },
    build(b) {
      b.floor([[273, 44], [750, 44], [750, 280], [962, 280], [962, 409], [261, 409], [261, 97], [273, 97]]);
      b.floor([[774, 74], [1057, 74], [1057, 261], [774, 261]], "stone", 0.004);
      b.floor([[160, 33], [243, 33], [243, 404], [98, 404]], "deck", -0.03);          // rear terrace
      b.wall(150, 21, 243, 33, { h1: 1.8 });                           // terrace: plot boundary walls
      b.wallLine(155, 27, 93, 410, 12, { h1: 1.8 });
      b.wall(243, 21, 1087, 44);
      b.wall(243, 44, 273, 97);
      b.window(243, 97, 261, 404, { sill: 0, mullions: [203, 298] });
      b.wall(180, 404, 857, 434);
      b.door(857, 409, 957, 434);
      b.wall(957, 409, 992, 434);
      b.wall(962, 280, 992, 409);
      b.wall(750, 44, 803, 74);
      b.wall(803, 44, 1057, 74, { faces: { s: "marble" } });
      b.wall(750, 74, 774, 280, { faces: { e: "marble" }, keep: true });   // behind the wardrobe: never cut
      b.door(774, 261, 880, 280, { faces: { n: "marble" } });          // pocket door: opening at the west end
      b.wall(880, 261, 1087, 280, { faces: { n: "marble" } });
      b.wall(1057, 44, 1087, 261, { faces: { w: "marble" } });
      b.wall(1022, 74, 1057, 91, { faces: { s: "marble", w: "marble" } });
      b.wall(273, 44, 677, 58, { h1: 1.2, mat: "walnut" });           // headboard panelling
      b.wall(291, 397, 675, 409, { mat: "walnut" });                   // TV wall panelling
      b.wall(407, 386, 579, 392, { h0: 1.0, h1: 1.8, mat: "tv" });
      b.wall(776, 74, 860, 76, { h0: 1.15, h1: 2.1, mat: "mirror" });
      b.ledge(774, 76, 1022, 91);
      b.vanity(774, 91, 862, 156, [789, 111, 847, 147]);
      b.toilet(884, 93, 930, 173);
      b.shower(951, 957, 91, 261, { door: [185, 261], hinge: "s" });
      b.wardrobe(677, 52, 750, 279, "w");
      b.bed([400, 64, 585, 295], "n");
      b.nightstand(588, 64, 630, 111);
      b.desk(291, 64, 397, 135, "w");
      b.stool(344, 152);
      b.curtain(262, 99, 278, 139);
      b.curtain(262, 362, 278, 402);
      b.plant(190, 105, 45);
    },
  },

  // Deluxe Twin 1 (1st floor): the same room as 3 and 4, with glass doors onto its own rear terrace.
  "deluxe-twin-1": {
    view: { az: 148, el: 56 },
    walk: { at: [785, 500], face: 255 },
    build(b) {
      b.floor([[197, 434], [815, 434], [815, 563], [691, 563], [691, 782], [197, 782]]);
      b.floor([[710, 581], [992, 581], [992, 770], [710, 770]], "stone", 0.004);
      b.floor([[98, 404], [180, 404], [180, 770], [114, 770], [114, 799], [36, 799]], "deck", -0.03);   // rear terrace
      b.wallLine(93, 400, 30, 806, 12, { h1: 1.8 });                   // terrace: plot boundary walls
      b.wall(22, 799, 247, 812, { h1: 1.8 });
      b.wall(180, 404, 857, 434);
      b.wall(815, 434, 832, 454);
      b.door(815, 454, 832, 546);
      b.wall(815, 546, 832, 563);
      b.window(180, 434, 197, 770, { sill: 0, mullions: [548, 653] });
      b.wall(114, 770, 209, 799);
      b.wall(209, 782, 691, 812);
      b.wall(691, 770, 1022, 812, { faces: { n: "marble" } });
      b.wall(691, 563, 710, 770, { faces: { e: "marble" }, keep: true });   // behind the wardrobe: never cut
      b.door(710, 563, 810, 581, { faces: { s: "marble" } });          // pocket door: opening at the west end
      b.wall(810, 563, 992, 581, { faces: { s: "marble" } });
      b.wall(992, 563, 1022, 799, { faces: { w: "marble" } });
      b.wall(957, 752, 992, 770, { faces: { n: "marble", w: "marble" } });
      b.wall(197, 770, 619, 782, { h1: 1.2, mat: "walnut" });          // headboard panelling
      b.wall(227, 434, 620, 440, { mat: "walnut" });
      b.wall(334, 440, 506, 447, { h0: 1.0, h1: 1.8, mat: "tv" });
      b.wall(712, 768, 795, 770, { h0: 1.15, h1: 2.1, mat: "mirror" });
      b.ledge(710, 752, 957, 770);
      b.vanity(710, 687, 797, 752, [724, 696, 782, 732]);
      b.toilet(819, 670, 865, 752);
      b.shower(885, 892, 581, 752, { door: [581, 657], hinge: "n" });
      b.wardrobe(619, 563, 691, 770, "w");
      b.bed([280, 540, 394, 770], "s", { pillows: 1, headboard: "upholstery" });
      b.bed([446, 540, 560, 770], "s", { pillows: 1, headboard: "upholstery" });
      b.nightstand(227, 722, 278, 770);                               // by the window
      b.nightstand(396, 722, 444, 770);                               // between the beds
      b.desk(227, 440, 327, 482, "w");
      b.stool(277, 500);
      b.curtain(198, 436, 214, 476);
      b.curtain(198, 728, 214, 768);
      b.plant(105, 725, 50);
    },
  },

  // The 2nd floor, all shared: kitchen (dry and wet), dining, powder room, living room, open balcony.
  // Two pictures, framed on part of the floor (views.fit, plan px) with walls cut around views.cutAt;
  // the 3D page shows it all.
  "floor-2": {
    view: { az: 32, el: 56 },
    views: {
      kitchen: { az: 32, el: 56, fit: [130, 20, 1060, 820], cutAt: [480, 420] },
      living: { az: -32, el: 56, fit: [1300, 20, 2400, 820], cutAt: [1570, 420] },
    },
    walk: { at: [1230, 480], face: 270 },
    build: floor2,
  },

  // The 1st floor's shared part: the entrance foyer, luggage room and lift; the covered car porch,
  // front terrace and front garden outside.
  "floor-1": {
    view: { az: 32, el: 58 },
    walk: { at: [1760, 470], face: 270 },
    build: floor1,
  },

  // The 5th floor's shared part: the open-air laundry (utility area and terrace) and the foyer.
  "floor-5": {
    view: { az: -35, el: 56 },
    walk: { at: [1060, 480], face: 90 },
    build: floor5,
  },

  // Elysia Suite 4 (4th floor, queen). Full-height glass door to a Juliet balcony at the front.
  "elysia-4": { view: { az: -32, el: 56 }, walk: { at: [1350, 520], face: 25 }, build: (b) => elysia(b, "queen") },
  // Elysia Suite 3 (3rd floor, twin): the same plan.
  "elysia-3": { view: { az: -32, el: 56 }, walk: { at: [1350, 520], face: 25 }, build: (b) => elysia(b, "twin") },

  // Aurelia Suite (5th floor). Glass sliding doors onto the private balcony at the rear.
  aurelia: {
    view: { az: 30, el: 56 },
    walk: { at: [840, 470], face: 290 },
    build(b) {
      b.floor([[500, 45], [963, 45], [963, 255], [880, 255], [880, 545], [500, 545]]);
      b.floor([[500, 565], [900, 565], [900, 770], [500, 770]], "stone", 0.004);
      b.floor([[215, 45], [485, 45], [485, 780], [140, 780], [140, 408], [215, 408]], "deck", -0.03);
      b.wall(180, 20, 500, 45);
      b.wall(500, 20, 985, 45);
      b.wall(120, 780, 485, 812);
      b.wall(485, 770, 925, 800, { faces: { n: "marble" } });
      b.wall(485, 45, 515, 75);
      b.window(485, 75, 500, 400, { sill: 0, mullions: [185, 290] });
      b.wall(485, 400, 515, 430);
      b.wall(485, 430, 500, 565);
      b.wall(485, 565, 500, 575, { faces: { e: "marble" } });
      b.window(485, 575, 500, 690, { sill: 1.6, head: 2.25, faces: { e: "marble" } });
      b.wall(485, 690, 500, 770, { faces: { e: "marble" } });
      b.wall(960, 45, 985, 255);
      b.wall(880, 255, 985, 385);
      b.wall(880, 385, 900, 430);
      b.door(880, 430, 900, 525);
      b.wall(880, 525, 900, 545);
      b.door(500, 545, 607, 565, { faces: { s: "marble" } });          // pocket door: opening at the west end,
      b.wall(607, 545, 925, 565, { faces: { s: "marble" } });          // the door slides east into this wall
      b.wall(900, 565, 925, 770, { faces: { w: "marble" } });
      b.balustrade(205, 45, 213, 408);
      b.balustrade(140, 400, 213, 408);
      b.balustrade(140, 408, 148, 780);
      b.wall(500, 45, 890, 57, { h1: 1.2, mat: "walnut" });          // headboard panelling
      b.wall(628, 538, 742, 545, { h0: 1.0, h1: 1.7, mat: "tv" });
      b.wall(504, 768, 684, 770, { h0: 1.15, h1: 2.1, mat: "mirror" });
      b.bed([595, 65, 775, 295], "n");
      b.nightstand(535, 65, 593, 115);
      b.nightstand(777, 65, 835, 115);
      b.wardrobe(890, 47, 960, 253, "w");
      b.curtain(501, 77, 515, 117);
      b.curtain(501, 358, 515, 398);
      b.ledge(500, 752, 795, 770);
      b.vanity(500, 687, 686, 752, [540, 698, 605, 735]);
      b.toilet(715, 667, 762, 752);
      b.shower(795, 800, 640, 752);                                   // walk-in: fixed glass, open at the north end
      b.plant(290, 140, 55);
      b.plant(228, 700, 55);
    },
  },
};

// The 2nd floor (2nd-floor plan). The furniture follows the photos where they differ from the
// plan (owner, 2026-10-21): a round marble dining table for eight, no stools at the island, the
// living room as photographed, and an empty balcony with its hedge only along the front.
function floor2(b) {
  b.floor([[227, 48], [1046, 48], [1046, 387], [1323, 387], [1323, 48], [1787, 48], [1787, 786], [163, 786], [163, 409], [227, 409]], "limestone");
  b.floor([[739, 585], [951, 585], [951, 775], [739, 775]], "stone", 0.004);     // powder room
  b.floor([[981, 585], [1171, 585], [1171, 777], [981, 777]], "deck", 0.004);    // lift car
  b.floor([[1796, 37], [2289, 37], [2289, 805], [1796, 805]], "deckWarm", -0.03); // open balcony

  // outside walls (in lengths, so each is cut on its own); glazing at the rear and onto the balcony
  b.wall(202, 26, 739, 48);
  b.wall(739, 26, 1046, 48);
  b.wall(1046, 26, 1353, 48);
  b.wall(1353, 26, 1796, 48);
  b.wall(169, 786, 709, 818);
  b.wall(709, 775, 951, 805, { faces: { n: "marble" } });
  b.wall(951, 777, 1200, 805, { faces: { n: "black" } });
  b.wall(1200, 775, 1767, 805);
  b.wall(202, 48, 232, 102);
  b.window(202, 102, 227, 409, { sill: 0, mullions: [205, 305] });
  b.wall(138, 408, 232, 439);
  b.window(139, 439, 163, 775, { sill: 0, mullions: [555, 659] });
  b.wall(72, 775, 169, 805);
  b.wall(1767, 48, 1796, 95);
  b.window(1785, 95, 1797, 757, { sill: 0, mullions: [211, 316, 426, 536, 641] });
  b.wall(1767, 757, 1796, 805);

  // dry kitchen | wet kitchen: a glass sliding door
  b.wall(709, 48, 739, 140);
  b.window(709, 140, 739, 337, { sill: 0 });
  b.wall(709, 337, 739, 439);
  b.wall(1016, 48, 1046, 357);
  b.wall(933, 267, 1046, 437);                                     // service shaft
  b.wall(739, 420, 933, 437);

  // powder room (pocket door) and lift
  b.wall(709, 568, 739, 775, { faces: { e: "marble" } });
  b.wall(739, 568, 845, 585, { faces: { s: "marble" } });
  b.door(845, 568, 947, 585, { faces: { s: "marble" } });
  b.wall(947, 568, 951, 585);
  b.wall(951, 568, 981, 777, { faces: { w: "marble", e: "black" } });
  b.wall(1171, 568, 1200, 777, { faces: { w: "black" } });
  b.wall(981, 568, 1040, 585, { faces: { s: "black" } });
  b.wall(1040, 575, 1152, 579, { h1: 2.15, mat: "steel" });          // lift doors, closed
  b.wall(1040, 568, 1152, 585, { h0: 2.15 });
  b.wall(1152, 568, 1171, 585, { faces: { s: "black" } });

  // stairs: up to the 3rd floor on the left, down to the 1st on the right
  b.wall(1323, 48, 1353, 438);
  b.stairs(1046, 181, 1165, 387, "n", 7, 0.175);
  b.box(1046, 57, 1165, 181, 0, 1.225, "walnut");
  b.stairs(1205, 181, 1323, 387, "n", 7, -0.175);
  b.box(1205, 57, 1323, 181, -1.275, -1.225, "walnut");
  b.wall(1165, 175, 1205, 392, { h1: 1.1 });

  // dry kitchen
  b.counter(232, 57, 709, 140);
  b.wardrobe(258, 57, 329, 140, "s", 2.3);
  b.wardrobe(612, 57, 683, 140, "s", 2.3);
  b.wall(329, 57, 612, 59, { h0: 0.9, h1: 1.5, mat: "darkStone" });   // stone backsplash
  b.wall(329, 57, 612, 92, { h0: 1.5, h1: 2.3, mat: "walnut" });      // wall cabinets
  b.box(386, 66, 422, 128, 0.9, 0.906, "tv");                        // induction hob
  b.box(504, 64, 571, 113, 0.86, 0.902, "steel");                    // sink
  b.solid(346, 257, 595, 364);
  b.box(352, 257, 589, 340, 0, 0.88, "walnut");                      // island
  b.box(346, 257, 595, 364, 0.88, 0.93, "darkStone");

  // wet kitchen
  b.counter(739, 57, 1016, 140);
  b.box(762, 81, 840, 134, 0.86, 0.902, "steel");
  b.wardrobe(742, 330, 933, 420, "n", 2.3);

  // dining: round table for eight, the chairs pushed in, each facing the table
  b.roundTable(450, 606, 95);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    b.chair(450 + Math.cos(a) * 102, 606 + Math.sin(a) * 102, i * 45 - 90);
  }

  // powder room
  b.ledge(739, 757, 951, 775);
  b.toilet(769, 675, 815, 757);
  b.vanity(845, 692, 951, 757, [868, 702, 928, 740]);

  // living room, as in the photos (not the plan): walnut panelling across the TV wall, a floating
  // console, two tall speakers; a three-seat sofa facing the TV, round coffee table, two ottomans
  b.wall(1353, 57, 1730, 64, { h1: 2.4, mat: "walnut" });           // TV wall
  b.wall(1420, 64, 1650, 70, { h0: 0.95, h1: 2.05, mat: "tv" });
  b.solid(1380, 64, 1700, 118);
  b.box(1380, 64, 1700, 118, 0.15, 0.48, "walnut");                  // console
  for (const x of [1487, 1593]) b.box(x - 0.5, 117.5, x + 0.5, 118.6, 0.17, 0.46, "black");
  b.speaker(1398, 82);
  b.speaker(1672, 82);
  b.coffeeTable(1500, 242, 53);
  b.ottoman(1606, 214, 29);
  b.ottoman(1670, 214, 29);
  b.sofa([1378, 352, 1683, 470], "n");
  b.curtain(1770, 97, 1784, 147);
  b.curtain(1770, 705, 1784, 755);

  // open balcony, as in the photos (not the plan): empty, tall slatted screens at the sides, a black
  // railing along the front with the hedge planted behind it
  b.slats(1796, 26, 2395, 37, 1.6);
  b.slats(1796, 805, 2395, 817, 1.6);
  b.slats(2283, 37, 2289, 805, 1.1, { bar: 2, pitch: 0.11 });
  b.planter(2289, 45, 2390, 797);
}

// The 1st floor's shared part (1st-floor plan). Bedroom 1, its bathroom and the store are private
// and left out: their doors are drawn closed.
function floor1(b) {
  b.floor([[990, 442], [1090, 442], [1090, 388], [1838, 388], [1838, 563], [990, 563]], "limestone");   // foyer
  b.floor([[1246, 592], [1515, 592], [1515, 770], [1246, 770]], "limestone");    // luggage room
  b.floor([[1022, 590], [1195, 590], [1195, 773], [1022, 773]], "deck", 0.004);  // lift car
  b.floor([[1838, 375], [1979, 375], [1979, 800], [1838, 800]], "paving");       // at the front door
  b.floor([[1979, 404], [2660, 404], [2660, 800], [1979, 800]], "paving", -0.12); // car porch
  b.floor([[1840, 44], [2410, 44], [2410, 375], [1840, 375]], "deck");           // front terrace
  b.floor([[2410, 44], [2660, 44], [2660, 404], [2410, 404]], "paving", -0.12);

  // foyer, north side: the store's doors, the stairs up, Bedroom 1 and its bathroom (closed)
  b.wall(1087, 380, 1092, 388);
  b.wall(1092, 381, 1200, 386, { h1: 2.1, mat: "walnut" });
  b.door(1087, 380, 1205, 388);
  b.wall(1205, 170, 1246, 388);
  b.stairs(1247, 170, 1365, 388, "n", 9, 0.175);
  b.wall(1365, 42, 1385, 388);
  b.wall(1365, 370, 1555, 388);
  b.wall(1555, 377, 1648, 382, { h1: 2.1, mat: "walnut" });
  b.door(1555, 370, 1648, 388);
  b.wall(1648, 370, 1838, 388);

  // front door (closed) and the shoe cabinet beside it outside
  b.wall(1820, 388, 1838, 420);
  b.wall(1825, 420, 1833, 535, { h1: 2.3, mat: "walnut" });
  b.door(1820, 420, 1838, 535);
  b.wall(1772, 535, 1838, 565);
  b.wall(1772, 565, 1790, 800);
  b.wardrobe(1790, 582, 1838, 767, "e", 1.9);

  // lift and luggage room (the household shelter: concrete walls, steel door shown open)
  b.wall(990, 562, 1022, 800, { faces: { e: "black" } });
  b.wall(1195, 562, 1246, 800, { faces: { w: "black" } });
  b.wall(1022, 773, 1195, 800, { faces: { n: "black" } });
  b.wall(1022, 562, 1062, 590, { faces: { s: "black" } });
  b.wall(1062, 576, 1185, 580, { h1: 2.15, mat: "steel" });          // lift doors, closed
  b.wall(1062, 562, 1185, 590, { h0: 2.15 });
  b.wall(1185, 562, 1195, 590, { faces: { s: "black" } });
  b.wall(1246, 562, 1545, 592);
  b.wall(1246, 770, 1545, 800);
  b.wall(1515, 592, 1545, 607);
  b.door(1515, 607, 1545, 702);
  b.wall(1515, 702, 1545, 800);
  b.wall(1545, 699, 1640, 704, { h1: 2.05, mat: "pot", keep: true });   // shelter door, open
  b.wardrobe(1250, 700, 1512, 768, "n", 2.3);
  b.wardrobe(1250, 596, 1300, 698, "e", 2.3);
  b.wardrobe(1547, 727, 1685, 797, "n", 2.3);
  b.wardrobe(1687, 727, 1757, 797, "n", 2.3);
  b.wall(1545, 797, 1790, 820);

  // outside: party walls, the porch columns, garden, steps, gate
  b.wall(1838, 21, 2660, 44);
  b.wall(1838, 800, 2660, 820);
  b.wall(2409, 44, 2439, 72);
  b.wall(2409, 770, 2439, 800);
  b.planter(2440, 50, 2650, 245);
  b.stairs(2440, 245, 2510, 404, "n", 3, 0.1, -0.12);
  b.wall(2610, 245, 2660, 457, { h1: 1.8, mat: "pot" });             // gate pillar
  b.slats(2650, 457, 2660, 800, 1.6);
  b.slats(2650, 44, 2660, 245, 1.2);
  b.car(2000, 512, 2500, 715);
}

// The 5th floor's shared part (attic plan): foyer, lift and stairs; the open-air laundry.
function floor5(b) {
  b.floor([[900, 385], [1150, 385], [1150, 562], [900, 562]], "limestone");      // foyer
  b.floor([[1160, 434], [1480, 434], [1480, 770], [1160, 770]], "deck");         // laundry
  b.floor([[1480, 52], [1662, 52], [1662, 782], [1480, 782]], "deck", -0.02);    // open terrace
  b.floor([[1300, 52], [1462, 52], [1462, 382], [1300, 382]], "concrete");       // AC ledge
  b.floor([[931, 600], [1116, 600], [1116, 770], [931, 770]], "deck", 0.004);    // lift car

  // stairs: down the left flight to the landing, then back down the right one
  b.wall(966, 22, 1271, 52);
  b.wall(966, 52, 991, 385);
  b.stairs(991, 181, 1113, 385, "n", 7, -0.175);
  b.box(991, 55, 1266, 181, -1.275, -1.225, "walnut");
  b.stairs(1151, 181, 1266, 385, "s", 7, -0.175, -1.225);
  b.wall(1113, 175, 1151, 392, { h1: 1.1 });

  // foyer: the Aurelia Suite's door (closed), the lift, a glass door to the laundry
  b.wall(880, 385, 900, 430);
  b.wall(884, 430, 896, 525, { h1: 2.1, mat: "walnut" });
  b.door(880, 430, 900, 525);
  b.wall(880, 525, 900, 562);
  b.wall(901, 562, 931, 790, { faces: { e: "black" } });
  b.wall(1116, 562, 1146, 790, { faces: { w: "black" } });
  b.wall(931, 770, 1116, 790, { faces: { n: "black" } });
  b.wall(931, 562, 986, 600, { faces: { s: "black" } });
  b.wall(986, 579, 1101, 583, { h1: 2.15, mat: "steel" });            // lift doors, closed
  b.wall(986, 562, 1101, 600, { h0: 2.15 });
  b.wall(1101, 562, 1116, 600, { faces: { s: "black" } });
  b.wall(1146, 382, 1164, 440);
  b.window(1150, 440, 1160, 562, { sill: 0 });
  b.wall(1146, 562, 1164, 800, { faces: { e: "tile" } });

  // laundry: utility area under cover, open terrace with a glass balustrade
  b.wall(1271, 22, 1692, 52);
  b.wall(1271, 52, 1300, 435);
  b.wall(1164, 382, 1480, 400, { faces: { s: "tile" } });
  b.wall(1462, 52, 1480, 72);
  b.wall(1466, 72, 1476, 377, { h1: 2.2, mat: "pot" });               // AC ledge doors
  b.wall(1462, 72, 1480, 377, { h0: 2.2 });
  b.wall(1462, 377, 1480, 382);
  b.wall(1164, 770, 1491, 800, { faces: { n: "tile" } });
  b.wall(1491, 782, 1692, 812);
  b.balustrade(1662, 52, 1670, 782);
  b.wardrobe(1177, 400, 1257, 434, "s", 2.3);
  b.wardrobe(1300, 400, 1450, 434, "s", 2.3);
  b.solid(1167, 695, 1237, 767);
  b.box(1167, 695, 1237, 767, 0, 1.75, "pot", { round: 0.03 });      // stacked washer and dryer
  for (const h of [0.45, 1.25]) {
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), b.m.tv);
    door.rotation.x = Math.PI / 2;
    door.position.set(px(1202), h, px(695) - 0.01);
    b.add(door);
  }
  b.solid(1249, 699, 1356, 770);
  b.box(1249, 699, 1356, 770, 0, 0.9, "concrete");                   // utility sink
  b.box(1262, 710, 1343, 760, 0.7, 0.902, "pot");
  b.box(1356, 699, 1480, 770, 0, 0.9, "concrete");
  b.solid(1356, 699, 1480, 770);
  b.plant(1615, 700, 45);
}

function elysia(b, beds) {
  b.floor([[1291, 45], [1716, 45], [1716, 562], [1412, 562], [1412, 782], [1147, 782], [1147, 582], [1291, 582]]);
  b.floor([[1432, 582], [1715, 582], [1715, 770], [1432, 770]], "stone", 0.004);
  b.wall(1266, 20, 1745, 45);
  b.wall(1269, 45, 1291, 582);
  b.wall(1147, 562, 1167, 582);
  b.door(1167, 562, 1260, 582);
  b.wall(1120, 562, 1147, 800);
  b.wall(1120, 782, 1412, 800);
  b.wall(1412, 770, 1745, 800, { faces: { n: "marble" } });
  b.wall(1412, 562, 1432, 582);
  b.door(1412, 582, 1432, 682, { faces: { e: "marble" } });
  b.wall(1412, 682, 1432, 782, { faces: { e: "marble" } });
  b.wall(1432, 562, 1716, 582, { faces: { s: "marble" } });
  b.wall(1716, 45, 1745, 90);
  b.window(1716, 90, 1745, 390, { sill: 0, mullions: [240] });
  b.wall(1716, 390, 1745, 582);
  b.window(1716, 582, 1745, 750, { sill: 1.0, faces: { w: "marble" } });
  b.wall(1715, 750, 1745, 800, { faces: { w: "marble" } });
  b.wall(1677, 752, 1715, 770, { faces: { n: "marble", w: "marble" } });
  b.balustrade(1747, 92, 1751, 388);
  if (beds === "queen") b.planter(1754, 85, 1801, 400);
  b.wall(1291, 45, 1716, 56, { h1: 1.2, mat: "walnut" });          // headboard panelling
  b.wall(1291, 56, 1299, 562, { mat: "walnut" });                    // panelled side wall
  b.wall(1299, beds === "queen" ? 320 : 330, 1308, 460, { h0: 1.0, h1: 1.8, mat: "tv" });
  b.wall(1434, 768, 1518, 770, { h0: 1.15, h1: 2.1, mat: "mirror" });
  b.ledge(1432, 752, 1677, 770);
  b.vanity(1432, 687, 1520, 752, [1446, 698, 1506, 734]);
  b.toilet(1540, 672, 1587, 752);
  b.shower(1607, 1613, 582, 752, { door: [582, 657], hinge: "n" });
  b.wardrobe(1414, 492, 1712, 562, "n");
  b.wardrobe(1149, 710, 1410, 782, "n");
  if (beds === "queen") {
    b.bed([1466, 82, 1651, 305], "n");
    b.bench(1470, 312, 1647, 358);
    b.nightstand(1361, 80, 1462, 125, 0.55);
    b.nightstand(1655, 80, 1700, 125);
    b.desk(1299, 78, 1361, 290, "n");
    b.wall(1299, 78, 1335, 290, { h0: 1.8, h1: 2.4, mat: "walnut" });  // cabinets over the desk
    b.stool(1384, 186);
  } else {
    b.bed([1381, 82, 1491, 305], "n", { pillows: 1 });
    b.bed([1541, 82, 1651, 305], "n", { pillows: 1 });
    b.nightstand(1496, 80, 1536, 122);
    b.nightstand(1656, 80, 1696, 122);
    b.hungDesk(1299, 58, 1377, 146);   // the twin suite has only a small desk beside the bed
    b.stool(1335, 158);
  }
  b.curtain(1699, 92, 1715, 132);
  b.curtain(1699, 348, 1715, 388);
}

/* ---------- scene ---------- */

// The room, its lights and a ground plane for its shadow. The sun comes from just left of the
// room's default view, so both far walls are lit and the cut walls cast short shadows inwards.
export function roomScene(renderer, id, opts = {}) {
  const room = ROOMS[id];
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const b = new Builder(materials(), opts);
  room.build(b);
  b.buildWalls();
  scene.add(b.group);
  b.group.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.envMapIntensity = 0.6; }); });

  const box = new THREE.Box3().setFromObject(b.group);
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(centre.x, -SLAB - 0.002, centre.z);
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfae, 0.35));
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.6);
  const az = (room.view.az - 20) * deg, el = 48 * deg;
  sun.position.copy(centre).add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(20));
  sun.target.position.copy(centre);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera, ext = size.length() * 0.75;
  sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = 1; sc.far = 50;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  return { room, scene, b, box, centre, size };
}

// Put the camera on the view direction and fit the visible model (every vertex) to the frame.
export function frame(cam, group, az, el, fill = 0.9, fit = null) {
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const corners = [];
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.parent.visible) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (!fit || (v.x >= fit[0] * M && v.x <= fit[2] * M && v.z >= fit[1] * M && v.z <= fit[3] * M)) corners.push(v);
    }
  });
  const target = new THREE.Box3().setFromPoints(corners).getCenter(new THREE.Vector3());
  let dist = 20;
  for (let i = 0; i < 12; i++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of corners) {
      const p = c.clone().project(cam);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const halfH = Math.tan(cam.fov * deg / 2) * dist, halfW = halfH * cam.aspect;
    target.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), (x0 + x1) / 2 * halfW);
    target.addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), (y0 + y1) / 2 * halfH);
    dist *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / fill;
  }
  return target;
}
