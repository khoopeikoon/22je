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

// Artificial turf: fine blades of slightly different greens.
function grass({ seed }) {
  const n = noise2(seed), r = rng(seed);
  return (u, v) => {
    const c = (fbm(n, u * 20, v * 20, 3, 20, 20) - 0.5) * 26 + (r() - 0.5) * 46;
    return [72 + c * 0.6, 112 + c, 46 + c * 0.4];
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
    paving: texture(512, 0.6, speckle({ seed: 37, base: 0xa29f9a, amount: 0.05 })),   // light grey granite
    linen: texture(512, 0.6, cloth({ seed: 19, base: 0xf1eee8, amp: 4, scale: 300 })),
    woodTile: texture(1024, 2.4, planks({ seed: 53, dark: 0x6a5243, light: 0x9a7f6b, rows: 12, seam: 0.7 })),   // 20 cm wood-look tiles
    terraceTile: texture(1024, 2.4, planks({ seed: 71, dark: 0x4a3328, light: 0x7d5a46, rows: 12, seam: 0.7 })),
    turf: texture(512, 0.8, grass({ seed: 59 })),
    greyMarble: texture(1024, 1.2, marble({ seed: 61, base: 0x8a8884, vein: 0xf4f2ee })),   // powder room
    silverStone: texture(1024, 0.7, marble({ seed: 67, base: 0x908f8b, vein: 0x585853 })),  // kitchen splashbacks
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
    carPaint: std({ color: 0xe6e6e2, roughness: 0.28, metalness: 0.35 }),   // pearl white, as in the photos
    appliance: std({ color: 0x2c2e31, roughness: 0.35, metalness: 0.45 }),
    satinSilver: std({ color: 0xcfcfcb, roughness: 0.45, metalness: 0.25 }),
    display: new THREE.MeshStandardMaterial({ color: 0x9fd7ff, emissive: 0x6fbfff, emissiveIntensity: 1.2 }),
    interior: std({ color: 0x8f8b86, roughness: 0.8 }),
    ceiling: std({ color: 0xf2efea, roughness: 0.95, emissive: 0xf2efea, emissiveIntensity: 0.35 }),
    pot: std({ color: 0x4f4b47, roughness: 0.8 }),
    leaf: std({ color: 0x4a6636, roughness: 0.8, flatShading: true }),
    leaf2: std({ color: 0x6f8f4e, roughness: 0.8, flatShading: true }),
    woodTile: std({ map: tex.woodTile, roughness: 0.7 }),
    terraceTile: std({ map: tex.terraceTile, roughness: 0.7 }),
    turf: std({ map: tex.turf, roughness: 1 }),
    greyMarble: std({ map: tex.greyMarble, roughness: 0.2 }),
    silverStone: std({ map: tex.silverStone, roughness: 0.35 }),
    walnutBlack: std({ map: tex.walnut, color: 0x4a3f39, roughness: 0.5 }),
    weatheredOak: std({ color: 0x9d8b77, roughness: 0.85 }),
    bronze: std({ color: 0x6b5444, roughness: 0.4, metalness: 0.6 }),        // lift surrounds
    cabinetGrey: std({ color: 0x56585b, roughness: 0.7 }),                       // laundry cabinets
    steelDark: std({ color: 0x4b4d50, roughness: 0.4, metalness: 0.6 }),         // fridge
    glow: std({ color: 0xfff4e2, emissive: 0xffe6bf, emissiveIntensity: 1 }),    // LED strips
    sheer: new THREE.MeshStandardMaterial({ color: 0xdedad3, roughness: 1, transparent: true, opacity: 0.75 }),
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
    this.low = 0;         // the lowest floor level
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

  // roof: has a ceiling when walking around (outdoor decks don't, unless covered).
  floor(poly, mat = "floor", lift = 0, roof = !mat.startsWith("deck")) {
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(px(x), px(y))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, [this.m[mat], this.m.poche]);
    mesh.position.y = lift;
    this.low = Math.min(this.low, lift);
    this.floors.push(poly);
    if (roof) this.roofed.push(poly);
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

  // head: top of the opening (full height: no header).
  door(x0, y0, x1, y1, { head = DOOR, ...opt } = {}) {
    if (head < this.H) this.wall(x0, y0, x1, y1, { ...opt, h0: head });
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
  curtain(x0, y0, x1, y1, mat = "curtain") {
    const alongY = y1 - y0 > x1 - x0;
    const r = (alongY ? x1 - x0 : y1 - y0) / 2, [a, b] = alongY ? [y0, y1] : [x0, x1];
    const n = Math.max(2, Math.round((b - a) / (r * 1.4)));
    for (let i = 0; i < n; i++) {
      const c = a + r + (b - a - 2 * r) * i / (n - 1);
      const geo = new THREE.CylinderGeometry(px(r), px(r), this.H - 0.08, 10);
      const mesh = new THREE.Mesh(geo, this.m[mat]);
      mesh.position.set(alongY ? px((x0 + x1) / 2) : px(c), (this.H - 0.08) / 2 + 0.03, alongY ? px(c) : px((y0 + y1) / 2));
      this.add(mesh);
    }
  }

  vanity(x0, y0, x1, y1, basin, h = 0.85, body = "walnutDark") {
    this.solid(x0, y0, x1, y1);
    this.box(x0, y0, x1, y1, 0.32, h - 0.03, body);
    this.box(x0, y0, x1, y1, h - 0.03, h, "graniteTop");
    this.box(...basin, h - 0.1, h + 0.002, "porcelain");
  }

  /* A TOTO Neorest-style toilet, its back to the `back` side of the rectangle: a one-piece skirted
     body with an egg-shaped footprint, a soft domed seat and lid, and a low rounded hump behind. */
  toilet(x0, y0, x1, y1, back) {
    this.solid(x0, y0, x1, y1);
    const across = back === "n" || back === "s";
    const W = px(across ? x1 - x0 : y1 - y0), L = px(across ? y1 - y0 : x1 - x0);
    const part = this.piece((x0 + x1) / 2, (y0 + y1) / 2, { n: 180, s: 0, e: 270, w: 90 }[back]);
    // Footprint in shape space: front (the bowl) towards +y, which ends up facing the room.
    const egg = (w, l, inset, from = -l / 2) => {
      const hw = w / 2 - inset, r = Math.min(0.09, hw), b = from + inset, sh = new THREE.Shape();
      sh.moveTo(-hw, 0);
      sh.lineTo(-hw, b + r);
      sh.quadraticCurveTo(-hw, b, -hw + r, b);
      sh.lineTo(hw - r, b);
      sh.quadraticCurveTo(hw, b, hw, b + r);
      sh.lineTo(hw, 0);
      sh.absellipse(0, 0, hw, l / 2 - inset, 0, Math.PI, false);
      return sh;
    };
    const solidOf = (shape, depth, bevel) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 32 });
      geo.rotateX(-Math.PI / 2);
      return geo;
    };
    part(solidOf(egg(W, L, 0.035), 0.3, 0.035), "porcelain", 0, 0.035, 0);                       // body, skirted to the floor
    part(solidOf(egg(W * 0.94, L * 0.9, 0.025, -L * 0.25), 0.012, 0.025), "porcelain", 0, 0.395, -L * 0.03);   // seat and lid
    part(new RoundedBoxGeometry(W * 0.88, 0.2, L * 0.26, 4, 0.08), "porcelain", 0, 0.37, L * 0.37);  // rear hump
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

  // A tall two-part hi-fi speaker: tapered black bass cabinet, tapered silver head with the
  // drivers, turned to face `deg` (as in the dining room photos).
  hifiSpeaker(cx, cy, deg) {
    this.solid(cx - 22, cy - 22, cx + 22, cy + 22);
    const part = this.piece(cx, cy, deg);
    // a frustum with a rectangular section: w (across) tapering from w0 to w1, depth = w * ratio
    const frustum = (w0, w1, ratio, h, y, mat) => {
      const geo = new THREE.CylinderGeometry(w1 * Math.SQRT1_2, w0 * Math.SQRT1_2, h, 4, 1);
      geo.rotateY(Math.PI / 4);
      geo.scale(1, 1, ratio);
      part(geo, mat, 0, y + h / 2, 0);
      return (t) => -((w0 + (w1 - w0) * t) * ratio) / 2 - 0.006;   // front face at height fraction t
    };
    const driver = (r, y, z) => part(new THREE.CylinderGeometry(r, r, 0.012, 32), "black", 0, y, z).rotation.x = Math.PI / 2;
    const base = frustum(0.34, 0.27, 1.3, 0.78, 0, "tv");
    const head = frustum(0.26, 0.15, 1.25, 0.52, 0.78, "satinSilver");
    driver(0.085, 0.24, base(0.31));
    driver(0.085, 0.52, base(0.67));
    driver(0.06, 0.94, head(0.31));
    driver(0.028, 1.12, head(0.65));
  }

  // A stacked washer-dryer (washer below, dryer above, controls between), doors facing `front`.
  washerDryer(x0, y0, x1, y1, front) {
    this.solid(x0, y0, x1, y1);
    const across = front === "n" || front === "s";
    const W = px(across ? x1 - x0 : y1 - y0), D = px(across ? y1 - y0 : x1 - x0);
    const part = this.piece((x0 + x1) / 2, (y0 + y1) / 2, { n: 0, s: 180, e: 90, w: 270 }[front]);
    part(new RoundedBoxGeometry(W, 1.9, D, 4, 0.03), "appliance", 0, 0.95, 0);
    const z = -D / 2 - 0.012;                                      // just proud of the front face
    for (const h of [0.5, 1.4]) {
      part(new THREE.TorusGeometry(0.2, 0.025, 12, 48), "chrome", 0, h, z);           // door rim
      part(new THREE.CylinderGeometry(0.19, 0.19, 0.01, 48), "tv", 0, h, z).rotation.x = Math.PI / 2;
    }
    part(new THREE.BoxGeometry(W * 0.86, 0.12, 0.02), "tv", 0, 0.95, z);                // control panel
    part(new THREE.BoxGeometry(0.1, 0.03, 0.006), "display", 0, 0.95, z - 0.012);       // its display
  }

  // A car parked along x (the plan draws one in the car porch), for scale.
  car(x0, y0, x1, y1, base = 0) {
    this.solid(x0, y0, x1, y1);
    const L = x1 - x0, W = y1 - y0;
    this.box(x0, y0 + W * 0.04, x1, y1 - W * 0.04, base + 0.22, base + 0.78, "carPaint", { round: 0.12 });
    this.box(x0 + L * 0.3, y0 + W * 0.1, x1 - L * 0.22, y1 - W * 0.1, base + 0.7, base + 1.38, "tv", { round: 0.14 });
    for (const x of [x0 + L * 0.17, x1 - L * 0.17]) for (const y of [y0 + W * 0.04, y1 - W * 0.04]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), this.m.black);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(px(x), base + 0.33, px(y));
      this.add(wheel);
    }
  }

  // A flight of n treads in the rectangle, climbing towards `dir` by `rise` each (negative: down)
  // from height `from`.
  stairs(x0, y0, x1, y1, dir, n, rise, from = 0, mat = "walnut") {
    this.solid(x0, y0, x1, y1);
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n, top = from + rise * (i + 1);
      const r = { n: [x0, y1 - (y1 - y0) * b, x1, y1 - (y1 - y0) * a], s: [x0, y0 + (y1 - y0) * a, x1, y0 + (y1 - y0) * b],
        w: [x1 - (x1 - x0) * b, y0, x1 - (x1 - x0) * a, y1], e: [x0 + (x1 - x0) * a, y0, x0 + (x1 - x0) * b, y1] }[dir];
      this.box(...r, rise > 0 ? from : top - 0.05, top, mat);
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

  ledge(x0, y0, x1, y1, h = 1.0, mat = "marble") { this.solid(x0, y0, x1, y1); this.box(x0, y0, x1, y1, 0, h, mat); }

  /* A lift front (the landing side `face`): a bronze surround to the ceiling, glass doors closed
     between d0 and d1 (dark: the shaft behind), as in the photos. */
  liftFront(x0, y0, x1, y1, [d0, d1], face = "n") {
    const back = { n: "s", s: "n" }[face], faces = { [face]: "bronze", [back]: "black" };
    this.wall(x0, y0, d0, y1, { faces });
    this.wall(d1, y0, x1, y1, { faces });
    this.wall(d0, y0, d1, y1, { h0: 2.15, faces });
    const y = face === "n" ? y0 + 4 : y1 - 4;
    const door = this.wall(d0, y - 1, d1, y + 1, { h1: 2.15, mat: "tv" });
    for (const [a, b] of [[d0, d0 + 4], [(d0 + d1) / 2 - 2, (d0 + d1) / 2 + 2], [d1 - 4, d1]])
      this.wall(a, y - 2, b, y + 2, { h1: 2.15, mat: "bronze", follow: door });
  }

  /* A glass balustrade with a walnut handrail along a flight, from (y0, at height z0) to (y1, z1),
     stepped over its n treads; x0..x1 is the glass line. */
  stairRail(x0, x1, y0, y1, z0, z1, n) {
    for (let i = 0; i < n; i++) {
      const a = y0 + (y1 - y0) * i / n, b = y0 + (y1 - y0) * (i + 1) / n;
      const lo = Math.min(z0 + (z1 - z0) * i / n, z0 + (z1 - z0) * (i + 1) / n), hi = Math.max(z0 + (z1 - z0) * i / n, z0 + (z1 - z0) * (i + 1) / n);
      this.glass(x0, Math.min(a, b), x1, Math.max(a, b), lo - 0.02, hi + 0.88);
    }
    const len = Math.hypot(px(y1 - y0), z1 - z0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, len), this.m.walnut);
    rail.position.set(px(x0 + x1) / 2, (z0 + z1) / 2 + 0.95, px(y0 + y1) / 2);
    rail.lookAt(rail.position.clone().add(new THREE.Vector3(0, z1 - z0, px(y1 - y0))));   // its length (z) along the slope
    this.add(rail);
  }

  // A square bar-height table: weathered timber top on a steel column and base plate.
  barTable(cx, cy, s, h = 1.05) {
    this.solid(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2);
    this.box(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2, h - 0.05, h, "weatheredOak");
    this.box(cx - 5, cy - 5, cx + 5, cy + 5, 0.02, h - 0.05, "steel");
    this.box(cx - 32, cy - 32, cx + 32, cy + 32, 0, 0.02, "steel");
  }

  // A bar chair facing `deg`: brushed steel frame, black mesh seat and back.
  barChair(cx, cy, deg) {
    this.solid(cx - 24, cy - 24, cx + 24, cy + 24);
    const part = this.piece(cx, cy, deg), bar = (w, h, d, x, y, z) => part(new THREE.BoxGeometry(w, h, d), "steel", x, y, z);
    part(new THREE.BoxGeometry(0.42, 0.012, 0.42), "black", 0, 0.75, 0);
    part(new THREE.BoxGeometry(0.4, 0.3, 0.01), "black", 0, 0.97, 0.205);
    for (const x of [-0.2, 0.2]) {
      bar(0.02, 0.75, 0.02, x, 0.375, -0.2);           // front legs
      bar(0.02, 1.15, 0.02, x, 0.575, 0.2);            // back legs, up into the back
      bar(0.02, 0.02, 0.42, x, 0.74, 0);               // seat rails
      bar(0.02, 0.02, 0.42, x, 0.3, 0);                // footrest
    }
    bar(0.42, 0.02, 0.02, 0, 0.3, -0.2);
    bar(0.42, 0.02, 0.02, 0, 1.14, 0.2);
  }

  // A fiddle-leaf fig planted in the ground: a few slim trunks, big leaves up to about h.
  tree(cx, cy, h = 3.4, base = 0) {
    this.solid(cx - 12, cy - 12, cx + 12, cy + 12);
    const x = px(cx), z = px(cy);
    for (const [dx, dz, lean] of [[0, 0, 0.02], [0.07, 0.03, -0.05], [-0.05, 0.06, 0.04]]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, h * 0.5, 8), this.m.oak);
      trunk.position.set(x + dx, base + h * 0.25, z + dz);
      trunk.rotation.set(lean, 0, -lean);
      this.add(trunk);
    }
    this.foliage(x, base + h * 0.64, z, 0.6, h * 0.34, 0.6, 150, 0.13);
    this.foliage(x, base + 0.18, z, 0.35, 0.1, 0.35, 30, 0.06);
  }

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

const ELYSIA_LABELS = [["ensuite", 1525, 640], ["entry", 1280, 650], ["juliet", 1790, 300]];

export const ROOMS = {
  // view: the still image's camera (az: from which side, 0 = south, 90 = east; el: elevation).
  // walk: where walking around starts (plan px) and the way it faces (0 = up the plan, 90 = right).
  // labels: names shown on the 3D page, [key, x, y] in plan px; the words are in viewer3d.js.
  // Deluxe Queen 4 (4th floor; 3 is identical; 1 is below). Bed against the north wall, window at the rear.
  "deluxe-queen": {
    view: { az: 32, el: 56 },
    walk: { at: [830, 345], face: 285 },
    labels: [["ensuite", 820, 200]],
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
      b.toilet(792, 95, 836, 175, "n");
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
    labels: [["ensuite", 755, 640]],
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
      b.toilet(727, 672, 772, 752, "s");
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
    labels: [["ensuite", 910, 200], ["terrace", 190, 280]],
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
      b.toilet(884, 93, 930, 173, "n");
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
    labels: [["ensuite", 850, 640], ["terrace", 120, 560]],
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
      b.toilet(819, 670, 865, 752, "s");
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
    labels: [["kitchen", 470, 190], ["wetKitchen", 860, 250], ["dining", 450, 470], ["powder", 845, 640],
      ["lift", 1076, 690], ["stairs", 1185, 300], ["living", 1560, 560], ["openBalcony", 2040, 420]],
    build: floor2,
  },

  // The 1st floor's shared part: the entrance foyer, luggage room and lift; the covered car porch,
  // front terrace and front garden outside.
  "floor-1": {
    view: { az: 32, el: 58 },
    walk: { at: [1760, 470], face: 270 },
    labels: [["foyer", 1450, 475], ["luggage", 1380, 640], ["lift", 1108, 680], ["stairs", 1306, 300],
      ["carporch", 2300, 470], ["frontTerrace", 2230, 300], ["garden", 2575, 210]],
    build: floor1,
  },

  // The 5th floor's shared part: the open-air laundry (utility area and terrace) and the foyer.
  "floor-5": {
    view: { az: -25, el: 56 },
    walk: { at: [1060, 480], face: 90 },
    labels: [["laundry", 1320, 590], ["laundryTerrace", 1570, 420], ["lift", 1023, 690], ["stairs", 1130, 300],
      ["hall", 1025, 470], ["acLedge", 1380, 220]],
    build: floor5,
  },

  // Elysia Suite 4 (4th floor, queen). Full-height glass door to a Juliet balcony at the front.
  "elysia-4": { view: { az: -32, el: 56 }, walk: { at: [1350, 520], face: 25 }, labels: ELYSIA_LABELS, build: (b) => elysia(b, "queen") },
  // Elysia Suite 3 (3rd floor, twin): the same plan.
  "elysia-3": { view: { az: -32, el: 56 }, walk: { at: [1350, 520], face: 25 }, labels: ELYSIA_LABELS, build: (b) => elysia(b, "twin") },

  // Aurelia Suite (5th floor). Glass sliding doors onto the private balcony at the rear.
  aurelia: {
    view: { az: 30, el: 56 },
    walk: { at: [840, 470], face: 290 },
    labels: [["ensuite", 700, 640], ["balcony", 330, 450]],
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
      b.toilet(715, 667, 762, 752, "s");
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
  b.wall(709, 775, 951, 805, { faces: { n: "greyMarble" } });
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

  // powder room (pocket door; grey marble floor to ceiling, as in the photos) and lift
  b.wall(709, 568, 739, 775, { faces: { e: "greyMarble" } });
  b.wall(739, 568, 845, 585, { faces: { s: "greyMarble" } });
  b.door(845, 568, 947, 585, { faces: { s: "greyMarble" } });
  b.wall(947, 568, 951, 585);
  b.wall(951, 568, 981, 777, { faces: { w: "greyMarble", e: "black" } });
  b.wall(1171, 568, 1200, 777, { faces: { w: "black" } });
  b.liftFront(981, 568, 1171, 585, [1040, 1152]);

  // stairs: up to the 3rd floor on the left, down to the 1st on the right
  b.wall(1323, 48, 1353, 438);
  b.stairs(1046, 181, 1165, 387, "n", 7, 0.175);
  b.box(1046, 57, 1165, 181, 0, 1.225, "walnut");
  b.stairs(1205, 181, 1323, 387, "n", 7, -0.175);
  b.box(1205, 57, 1323, 181, -1.275, -1.225, "walnut");
  b.stairRail(1163, 1167, 387, 181, 0, 1.225, 7);                   // glass balustrades, as in the photos
  b.stairRail(1203, 1207, 387, 181, 0, -1.225, 7);

  // dry kitchen
  b.counter(232, 57, 709, 140);
  b.wardrobe(258, 57, 329, 140, "s", 2.3);
  b.wall(614, 60, 681, 138, { h1: 1.85, mat: "tv", furniture: true }); // black fridge (photo), cabinet above
  b.wall(612, 57, 683, 140, { h0: 1.88, h1: 2.3, mat: "walnut", furniture: true });
  b.wall(329, 57, 612, 59, { h0: 0.9, h1: 1.5, mat: "silverStone" });  // stone backsplash
  b.wall(329, 57, 612, 92, { h0: 1.5, h1: 2.3, mat: "walnut" });      // wall cabinets
  b.box(386, 66, 422, 128, 0.9, 0.906, "tv");                        // induction hob
  b.box(504, 64, 571, 113, 0.86, 0.902, "steel");                    // sink
  b.solid(346, 257, 595, 364);
  b.box(352, 257, 589, 340, 0, 0.88, "walnut");                      // island
  b.box(346, 257, 595, 364, 0.88, 0.93, "darkStone");

  // wet kitchen, as in the photos: an L of counters (sink along the window wall, hob and oven on
  // the short side) under walnut wall cabinets lit from below, grey stone splashback; a built-in
  // microwave unit and a dark steel fridge along the south wall
  b.counter(739, 57, 1016, 140);
  b.counter(950, 140, 1016, 267);
  b.box(762, 81, 840, 134, 0.86, 0.902, "tv");                       // black sink
  b.box(958, 170, 1008, 235, 0.9, 0.906, "tv");                      // induction hob
  b.box(947, 172, 951, 233, 0.15, 0.75, "tv");                       // oven
  b.wall(739, 57, 1016, 59, { h0: 0.9, h1: 1.5, mat: "silverStone" });
  b.wall(1014, 59, 1016, 267, { h0: 0.9, h1: 1.5, mat: "silverStone" });
  b.wall(739, 57, 1016, 92, { h0: 1.5, h1: 2.3, mat: "walnut" });     // wall cabinets
  b.wall(981, 92, 1016, 267, { h0: 1.5, h1: 2.3, mat: "walnut" });
  b.wall(745, 88, 1010, 92, { h0: 1.488, h1: 1.5, mat: "glow", furniture: true });
  b.wall(977, 98, 981, 262, { h0: 1.488, h1: 1.5, mat: "glow", furniture: true });
  b.wall(966, 180, 1014, 226, { h0: 1.22, h1: 1.5, mat: "tv", furniture: true });   // cooker hood
  b.wall(742, 336, 815, 420, { h1: 0.85, mat: "walnut", furniture: true });            // microwave unit
  b.wall(742, 336, 815, 420, { h0: 0.85, h1: 0.88, mat: "graniteTop", furniture: true });
  b.wall(746, 344, 811, 420, { h0: 0.88, h1: 1.27, mat: "appliance", furniture: true });
  b.wall(742, 416, 815, 420, { h0: 1.27, h1: 1.55, mat: "darkStone", furniture: true });
  b.wall(742, 360, 815, 420, { h0: 1.55, h1: 2.3, mat: "walnut", furniture: true });
  const fridge = b.wall(817, 340, 925, 420, { h1: 1.85, mat: "steelDark", furniture: true });
  b.wall(870, 339, 872, 341, { h0: 0.05, h1: 1.8, mat: "black", furniture: true, follow: fridge });
  b.wall(817, 340, 925, 420, { h0: 1.88, h1: 2.3, mat: "walnut", furniture: true });

  // dining: round table for eight, the chairs pushed in, each facing the table; a tall speaker at
  // each end of the south wall, turned towards the table
  b.roundTable(450, 606, 95);
  b.hifiSpeaker(682, 750, 302);
  b.hifiSpeaker(196, 752, 60);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    b.chair(450 + Math.cos(a) * 102, 606 + Math.sin(a) * 102, i * 45 - 90);
  }

  // powder room: a marble ledge across the back, the mirror cabinet above it lit from below, a
  // black vanity with a leathered granite top
  b.ledge(739, 757, 951, 775, 1.05, "greyMarble");
  b.toilet(769, 675, 815, 757, "s");
  b.vanity(845, 692, 951, 757, [868, 702, 928, 740], 0.85, "walnutBlack");
  b.wall(790, 773, 949, 775, { h0: 1.18, h1: 2.2, mat: "mirror" });
  b.wall(790, 768, 949, 773, { h0: 1.165, h1: 1.18, mat: "glow", furniture: true });

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
// and left out: their doors are drawn closed. Outside follows the photos (owner, 2026-10-24): the
// car porch three steps below the covered front terrace (timber-look tiles, a bar table and four
// bar chairs, Bedroom 1's glass sliding doors behind sheer curtains), a lawn with a fiddle-leaf fig.
function floor1(b) {
  const PORCH = -0.3;                                                            // car porch level
  b.floor([[832, 434], [1087, 434], [1087, 388], [1838, 388], [1838, 563], [832, 563]], "limestone");   // foyer and corridor
  b.floor([[1246, 592], [1515, 592], [1515, 770], [1246, 770]], "limestone");    // luggage room
  b.floor([[1022, 590], [1195, 590], [1195, 773], [1022, 773]], "deck", 0.004);  // lift car
  b.floor([[1838, 375], [1979, 375], [1979, 800], [1838, 800]], "paving", PORCH);       // at the front door
  b.floor([[1979, 404], [2440, 404], [2440, 800], [1979, 800]], "paving", PORCH);       // car porch, covered
  b.floor([[2440, 404], [2660, 404], [2660, 800], [2440, 800]], "paving", PORCH, false); // ...and in the open
  b.floor([[1840, 44], [2385, 44], [2385, 375], [1840, 375]], "terraceTile");          // front terrace (covered)
  b.floor([[1979, 375], [2385, 375], [2385, 72], [2440, 72], [2440, 404], [1979, 404]], "paving");   // its granite edge
  b.floor([[2440, 245], [2510, 245], [2510, 330], [2440, 330]], "paving", 0, false);  // top of the steps
  b.floor([[2440, 44], [2650, 44], [2650, 245], [2440, 245]], "turf", 0.08, false);   // lawn
  b.floor([[2510, 245], [2610, 245], [2610, 385], [2510, 385]], "turf", 0.08, false);
  b.box(1840, 369, 1979, 375, PORCH, 0, "paving");                              // terrace edges
  b.box(1979, 398, 2440, 404, PORCH, 0, "paving");
  b.box(2440, 239, 2610, 245, -0.16, 0.1, "paving");                            // lawn kerbs
  b.box(2440, 72, 2446, 245, -0.16, 0.1, "paving");
  b.box(2510, 245, 2516, 385, -0.16, 0.1, "paving");
  b.box(2510, 379, 2610, 404, PORCH, 0.1, "paving");
  b.stairs(2440, 330, 2510, 404, "n", 2, 0.1, PORCH, "paving");

  // corridor to Deluxe Queen 1 and Deluxe Twin 1 (their doors closed, nearly ceiling height), past
  // the service shaft
  b.wall(815, 404, 857, 434);
  b.wall(857, 416, 957, 422, { h1: 2.4, mat: "walnut" });
  b.door(857, 404, 957, 434, { head: 2.4 });
  b.wall(957, 404, 992, 434);
  b.wall(992, 280, 1087, 434);
  b.wall(815, 434, 832, 454);
  b.wall(820, 454, 827, 546, { h1: 2.4, mat: "walnut" });
  b.door(815, 454, 832, 546, { head: 2.4 });
  b.wall(815, 546, 832, 563);
  b.wall(810, 563, 990, 581);

  // foyer, north side: the store's full-height timber doors, the stairs up, Bedroom 1 and its
  // bathroom (closed)
  b.wall(1087, 380, 1092, 388);
  b.wall(1092, 381, 1200, 386, { mat: "walnut" });
  b.door(1087, 380, 1205, 388, { head: b.H });
  b.wall(1205, 170, 1246, 388);
  b.stairs(1247, 170, 1365, 388, "n", 9, 0.175);
  b.wall(1365, 42, 1385, 388);
  b.wall(1365, 370, 1555, 388);
  b.wall(1555, 377, 1648, 382, { h1: 2.1, mat: "walnut" });
  b.door(1555, 370, 1648, 388);
  b.wall(1648, 370, 1838, 388);

  // Bedroom 1's front onto the terrace: three glass sliding panels, sheer curtains drawn behind
  b.wall(1808, 42, 1840, 90);
  b.window(1822, 90, 1838, 360, { sill: 0.02, mullions: [180, 270] });
  b.wall(1820, 360, 1838, 370);
  b.curtain(1802, 93, 1816, 357, "sheer");

  // front door (closed) with a step up from the porch, the shoe cabinet beside it (a marble-lined
  // niche across it)
  b.wall(1820, 388, 1838, 420);
  b.wall(1825, 420, 1833, 535, { h1: 2.3, mat: "walnut" });
  b.door(1820, 420, 1838, 535, { head: 2.3 });
  b.box(1838, 405, 1885, 550, PORCH, -0.15, "limestone");
  b.wall(1772, 535, 1838, 565);
  b.wall(1772, 565, 1790, 800);
  b.box(1790, 582, 1838, 767, PORCH, 0, "walnutDark");
  b.wardrobe(1790, 582, 1838, 767, "e", 2.3);
  b.wall(1837, 600, 1840, 750, { h0: 1.02, h1: 1.28, mat: "marble", furniture: true });

  // lift (bronze surround, glass doors) and luggage room (the household shelter: concrete walls,
  // steel door shown open)
  b.wall(990, 562, 1022, 800, { faces: { e: "black" } });
  b.wall(1195, 562, 1246, 800, { faces: { w: "black" } });
  b.wall(1022, 773, 1195, 800, { faces: { n: "black" } });
  b.liftFront(1022, 562, 1195, 590, [1062, 1185]);
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

  // outside: party walls (lower and charcoal past the porch), the charcoal porch columns, the
  // gate pillar, a slatted screen along the lawn and the sliding gate (closed)
  b.wall(1838, 21, 2410, 44);
  b.wall(2410, 21, 2660, 44, { h1: 1.8, mat: "pot" });
  b.wall(1838, 800, 2440, 820);
  b.wall(2440, 800, 2660, 820, { h1: 2.2 });
  b.wall(2409, 44, 2439, 72, { mat: "pot" });
  b.wall(2409, 770, 2439, 800, { mat: "pot" });
  b.wall(2610, 245, 2660, 457, { h1: 1.8, mat: "pot" });             // gate pillar
  b.slats(2650, 457, 2660, 800, 1.6);
  b.slats(2650, 44, 2660, 245, 1.6);
  b.tree(2545, 140, 3.4, 0.08);

  // on the terrace: a bar table, four bar chairs pushed in
  b.barTable(2030, 175, 100);
  for (const [dx, dy, face] of [[0, -62, 180], [62, 0, 270], [0, 62, 0], [-62, 0, 90]]) b.barChair(2030 + dx, 175 + dy, face);
  b.car(2000, 512, 2500, 715, PORCH);
}

// The 5th floor's shared part (attic plan): foyer, lift and stairs; the open-air laundry. As in the
// photos (owner, 2026-10-24): a walnut floor in the foyer, wood-look tiles in the laundry and on its
// terrace, dark grey cabinets set in grey tile along the laundry's north wall.
function floor5(b) {
  b.floor([[900, 385], [1150, 385], [1150, 562], [900, 562]], "floor");          // foyer
  b.floor([[1160, 434], [1480, 434], [1480, 770], [1160, 770]], "woodTile");     // laundry
  b.floor([[1480, 52], [1662, 52], [1662, 782], [1480, 782]], "woodTile", -0.02, false);   // open terrace
  b.floor([[1300, 52], [1462, 52], [1462, 382], [1300, 382]], "concrete");       // AC ledge
  b.floor([[931, 600], [1116, 600], [1116, 770], [931, 770]], "deck", 0.004);    // lift car

  // stairs: down the left flight to the landing, then back down the right one
  b.wall(966, 22, 1271, 52);
  b.wall(966, 52, 991, 385);
  b.stairs(991, 181, 1113, 385, "n", 7, -0.175);
  b.box(991, 55, 1266, 181, -1.275, -1.225, "walnut");
  b.stairs(1151, 181, 1266, 385, "s", 7, -0.175, -1.225);
  b.stairRail(1111, 1115, 385, 181, 0, -1.225, 7);                   // glass balustrade, as in the photos,
  b.glass(1115, 383, 1151, 387, 0, 0.9);                              // returning across the top
  b.box(1113, 383, 1151, 387, 0.93, 0.97, "walnut");

  // foyer: the Aurelia Suite's door (closed), the lift (bronze surround, glass doors), the
  // laundry's doorway (a pocket door, open, in a walnut frame)
  b.wall(880, 385, 900, 430);
  b.wall(884, 430, 896, 525, { h1: 2.4, mat: "walnut" });
  b.door(880, 430, 900, 525, { head: 2.4 });
  b.wall(880, 525, 900, 562);
  b.wall(901, 562, 931, 790, { faces: { e: "black", n: "bronze" } });
  b.wall(1116, 562, 1146, 790, { faces: { w: "black" } });
  b.wall(931, 770, 1116, 790, { faces: { n: "black" } });
  b.liftFront(931, 562, 1116, 600, [986, 1101]);
  b.wall(1146, 382, 1164, 440);
  b.door(1146, 440, 1164, 562, { head: 2.4 });
  for (const [y0, y1] of [[437, 443], [559, 565]]) b.wall(1144, y0, 1166, y1, { h1: 2.44, mat: "walnut" });
  b.wall(1144, 437, 1166, 565, { h0: 2.39, h1: 2.44, mat: "walnut" });
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
  laundryCabinets(b);
  b.washerDryer(1167, 695, 1237, 767, "n");
  b.solid(1249, 699, 1480, 770);
  b.box(1249, 703, 1480, 770, 0.1, 0.86, "cabinetGrey");             // utility sink and counter
  b.box(1249, 699, 1480, 770, 0.86, 0.92, "tile");
  b.box(1262, 710, 1343, 760, 0.72, 0.922, "pot");
}

/* The laundry's north wall, from the photo taken at the washer-dryer: dark grey cabinets framed in
   the grey wall tile. A tall cabinet on the left; on the right, wall cabinets (the last one cut off
   on a slant, under the roof) over a tiled worktop in a recess, base cabinets below. */
function laundryCabinets(b) {
  const Y0 = 400, Y1 = 456, F = 6;   // depth; frame width (5 cm)
  // the worktop first: every other piece is cut (or not) with it, so the unit stays whole
  const top = b.wall(1278, Y0, 1472, Y1, { h0: 0.86, h1: 0.92, mat: "tile", furniture: true });
  const piece = (x0, y0, x1, y1, opt) => b.wall(x0, y0, x1, y1, { furniture: true, follow: top, ...opt });
  const lines = (x, h0, h1) => piece(x - 0.5, Y1 - 0.5, x + 0.5, Y1 + 0.5, { h0, h1, mat: "black" });
  piece(1166 + F, Y0, 1270, Y1, { h1: 2.3, mat: "cabinetGrey" });                       // tall cabinet
  piece(1166 + F, Y1 - 0.5, 1270, Y1 + 0.5, { h0: 1.445, h1: 1.455, mat: "black" });
  piece(1278, Y0, 1472, Y1 - 4, { h0: 0.08, h1: 0.86, mat: "cabinetGrey" });           // base cabinets
  const upper = piece(1278, Y0, 1472, Y1, { h0: 1.62, h1: 2.3, mat: "cabinetGrey" });  // wall cabinets
  upper.fullAs = () => {
    // in section: the top-right corner cut off at the roof's slope
    const sh = new THREE.Shape(), x = (v) => px(v);
    sh.moveTo(x(1278), 1.62); sh.lineTo(x(1472), 1.62); sh.lineTo(x(1472), 1.9); sh.lineTo(x(1425), 2.3); sh.lineTo(x(1278), 2.3);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: px(Y1 - Y0), bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, b.m.cabinetGrey);
    mesh.position.z = px(Y0);
    return b.add(mesh);
  };
  for (const x of [1343, 1407]) { lines(x, 0.1, 0.84); lines(x, 1.64, 2.28); }
  for (const [x0, x1, h1] of [[1166, 1166 + F, 2.36], [1270, 1278, 2.36], [1472, 1478, 1.9]]) piece(x0, Y0, x1, Y1 + 2, { h1, mat: "tile" });
  piece(1166, Y0, 1425, Y1 + 2, { h0: 2.3, h1: 2.36, mat: "tile" });
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
  b.toilet(1540, 672, 1587, 752, "s");
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
  ground.position.set(centre.x, b.low - SLAB - 0.002, centre.z);   // under the lowest slab (the 1st floor's car porch)
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
