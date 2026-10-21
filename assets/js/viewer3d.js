/* Explorable 3D view of a room (3d/index.html?room=<id>&lang=<en|zh|ja|es|fr>).

   Two modes: "dollhouse" (turn and zoom the cut-away room from above; the walls on the camera's
   side are cut low as it turns) and "walk" (stand inside at eye height under a ceiling: drag to look,
   tap the floor to walk there, or use the arrow keys / WASD). The rooms are in rooms3d.js.
*/
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ROOMS, M, deg, roomScene, frame } from "./rooms3d.js";

const T = {
  en: { back: "Rooms", backShared: "Features", orbit: "Dollhouse", walk: "Walk around", loading: "Loading the room…",
    hintOrbit: "Drag to turn · scroll or pinch to zoom · right-drag or two fingers to move",
    hintWalk: "Drag to look around · tap the floor to walk there · arrow keys or WASD to move",
    note: "Illustrative 3D view based on the floor plan",
    labels: { ensuite: "Ensuite", balcony: "Private balcony", juliet: "Juliet balcony", entry: "Entry",
      terrace: "Rear terrace", foyer: "Entrance foyer", luggage: "Luggage room", lift: "Lift",
      stairs: "Stairs", carporch: "Car porch", frontTerrace: "Front terrace", garden: "Front garden",
      kitchen: "Kitchen", wetKitchen: "Wet kitchen", dining: "Dining", powder: "Powder room",
      living: "Living room", openBalcony: "Open balcony", laundry: "Laundry", laundryTerrace: "Terrace",
      hall: "Foyer", acLedge: "AC ledge" },
    rooms: { aurelia: "Aurelia Suite", "elysia-4": "Elysia Suite 4 · queen", "elysia-3": "Elysia Suite 3 · twin",
      "deluxe-queen": "Deluxe Queen 3 & 4", "deluxe-twin": "Deluxe Twin 3 & 4",
      "deluxe-queen-1": "Deluxe Queen 1 · terrace", "deluxe-twin-1": "Deluxe Twin 1 · terrace",
      "floor-1": "1st floor · entrance", "floor-2": "2nd floor · living, dining, kitchen", "floor-5": "5th floor · laundry" } },
  zh: { back: "房间", backShared: "设施", orbit: "俯视", walk: "漫游", loading: "正在载入房间…",
    hintOrbit: "拖动旋转 · 滚轮或双指缩放 · 右键拖动或双指平移",
    hintWalk: "拖动环顾四周 · 点按地面走过去 · 方向键或 WASD 移动",
    note: "3D 示意图，依据平面图绘制",
    labels: { ensuite: "独立卫浴", balcony: "私人阳台", juliet: "法式阳台", entry: "玄关", terrace: "后露台", foyer: "入口门厅",
      luggage: "行李存放室", lift: "电梯", stairs: "楼梯", carporch: "车廊", frontTerrace: "前庭露台", garden: "前花园",
      kitchen: "厨房", wetKitchen: "湿厨房", dining: "餐厅", powder: "化妆间", living: "客厅", openBalcony: "开放式阳台",
      laundry: "洗衣区", laundryTerrace: "露台", hall: "门厅", acLedge: "空调机位" },
    rooms: { aurelia: "Aurelia 金曦套房", "elysia-4": "Elysia 怡境套房 4 · 大床", "elysia-3": "Elysia 怡境套房 3 · 双床",
      "deluxe-queen": "豪华大床房 3 和 4", "deluxe-twin": "豪华双床房 3 和 4",
      "deluxe-queen-1": "豪华大床房 1 · 后露台", "deluxe-twin-1": "豪华双床房 1 · 后露台",
      "floor-1": "1 楼 · 入口", "floor-2": "2 楼 · 客厅、餐厅、厨房", "floor-5": "5 楼 · 洗衣露台" } },
  ja: { back: "お部屋", backShared: "設備", orbit: "全体を見る", walk: "歩いて見る", loading: "お部屋を読み込み中…",
    hintOrbit: "ドラッグで回転 · スクロールまたはピンチで拡大縮小 · 右ドラッグまたは2本指で移動",
    hintWalk: "ドラッグで見回す · 床をタップしてその場所へ · 矢印キーまたは WASD で移動",
    note: "間取り図をもとにした3Dイメージです",
    labels: { ensuite: "専用バスルーム", balcony: "専用バルコニー", juliet: "ジュリエットバルコニー", entry: "玄関", terrace: "リアテラス",
      foyer: "エントランスホール", luggage: "荷物置き場", lift: "エレベーター", stairs: "階段", carporch: "カーポーチ",
      frontTerrace: "フロントテラス", garden: "フロントガーデン", kitchen: "キッチン", wetKitchen: "ウェットキッチン", dining: "ダイニング",
      powder: "パウダールーム", living: "リビング", openBalcony: "オープンバルコニー", laundry: "ランドリー", laundryTerrace: "テラス",
      hall: "ホール", acLedge: "室外機置き場" },
    rooms: { aurelia: "Aurelia スイート", "elysia-4": "Elysia スイート 4 · クイーン", "elysia-3": "Elysia スイート 3 · ツイン",
      "deluxe-queen": "デラックスクイーン 3・4", "deluxe-twin": "デラックスツイン 3・4",
      "deluxe-queen-1": "デラックスクイーン 1 · リアテラス", "deluxe-twin-1": "デラックスツイン 1 · リアテラス",
      "floor-1": "1階 · エントランス", "floor-2": "2階 · リビング、ダイニング、キッチン", "floor-5": "5階 · ランドリー" } },
  es: { back: "Habitaciones", backShared: "Servicios", orbit: "Vista general", walk: "Recorrer", loading: "Cargando la habitación…",
    hintOrbit: "Arrastre para girar · rueda o pellizco para acercar · clic derecho o dos dedos para desplazar",
    hintWalk: "Arrastre para mirar alrededor · toque el suelo para ir allí · flechas o WASD para moverse",
    note: "Vista 3D orientativa basada en el plano",
    labels: { ensuite: "Baño privado", balcony: "Balcón privado", juliet: "Balcón francés", entry: "Recibidor",
      terrace: "Terraza trasera", foyer: "Vestíbulo de entrada", luggage: "Consigna de equipaje",
      lift: "Ascensor", stairs: "Escalera", carporch: "Porche", frontTerrace: "Terraza delantera",
      garden: "Jardín delantero", kitchen: "Cocina", wetKitchen: "Cocina de servicio", dining: "Comedor",
      powder: "Aseo", living: "Salón", openBalcony: "Balcón abierto", laundry: "Lavandería",
      laundryTerrace: "Terraza", hall: "Vestíbulo", acLedge: "Aire acondicionado" },
    rooms: { aurelia: "Suite Aurelia", "elysia-4": "Suite Elysia 4 · queen", "elysia-3": "Suite Elysia 3 · dos camas",
      "deluxe-queen": "Deluxe Queen 3 y 4", "deluxe-twin": "Deluxe Twin 3 y 4",
      "deluxe-queen-1": "Deluxe Queen 1 · terraza", "deluxe-twin-1": "Deluxe Twin 1 · terraza",
      "floor-1": "Planta 1 · entrada", "floor-2": "Planta 2 · salón, comedor, cocina", "floor-5": "Planta 5 · lavandería" } },
  fr: { back: "Chambres", backShared: "Équipements", orbit: "Vue d'ensemble", walk: "Visite", loading: "Chargement de la chambre…",
    hintOrbit: "Faites glisser pour tourner · molette ou pincement pour zoomer · clic droit ou deux doigts pour déplacer",
    hintWalk: "Faites glisser pour regarder autour · touchez le sol pour y aller · flèches ou WASD pour avancer",
    note: "Vue 3D indicative d'après le plan",
    labels: { ensuite: "Salle de bains", balcony: "Balcon privé", juliet: "Balcon à la française", entry: "Entrée",
      terrace: "Terrasse arrière", foyer: "Hall d'entrée", luggage: "Rangement des bagages",
      lift: "Ascenseur", stairs: "Escalier", carporch: "Abri à voiture", frontTerrace: "Terrasse avant",
      garden: "Jardin avant", kitchen: "Cuisine", wetKitchen: "Arrière-cuisine", dining: "Salle à manger",
      powder: "Toilettes", living: "Salon", openBalcony: "Balcon ouvert", laundry: "Buanderie",
      laundryTerrace: "Terrasse", hall: "Palier", acLedge: "Climatisation" },
    rooms: { aurelia: "Suite Aurelia", "elysia-4": "Suite Elysia 4 · queen", "elysia-3": "Suite Elysia 3 · lits jumeaux",
      "deluxe-queen": "Deluxe Queen 3 et 4", "deluxe-twin": "Deluxe Twin 3 et 4",
      "deluxe-queen-1": "Deluxe Queen 1 · terrasse", "deluxe-twin-1": "Deluxe Twin 1 · terrasse",
      "floor-1": "1er étage · entrée", "floor-2": "2e étage · salon, salle à manger, cuisine", "floor-5": "5e étage · buanderie" } },
};
// Where "back" goes: the room's section on rooms.html, or the floor plans on features.html.
const BACK = { aurelia: "rooms.html#aurelia", "elysia-4": "rooms.html#elysia", "elysia-3": "rooms.html#elysia",
  "deluxe-queen": "rooms.html#deluxe-queen", "deluxe-twin": "rooms.html#deluxe-twin",
  "deluxe-queen-1": "rooms.html#deluxe-queen", "deluxe-twin-1": "rooms.html#deluxe-twin",
  "floor-1": "features.html#floor-plans", "floor-2": "features.html#floor-plans", "floor-5": "features.html#floor-plans" };
const EYE = 1.6, H = 2.7;

const params = new URLSearchParams(location.search);
const lang = T[params.get("lang")] ? params.get("lang") : "en";
const id = ROOMS[params.get("room")] ? params.get("room") : "deluxe-queen";
const t = T[lang];
document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;

/* ---------- page ---------- */

const $ = (s) => document.querySelector(s);
$("#back").textContent = "← " + (id.startsWith("floor-") ? t.backShared : t.back);
$("#back").href = `../${lang === "en" ? "" : lang + "/"}${BACK[id]}`;
$("#loading").textContent = t.loading;
$("#note").textContent = t.note;
$('[data-mode="orbit"]').textContent = t.orbit;
$('[data-mode="walk"]').textContent = t.walk;
const select = $("#room");
const shared = (k) => k.startsWith("floor-");   // the rooms first, then the shared floors in order
const order = Object.keys(ROOMS).sort((a, b) => shared(a) - shared(b) || (shared(a) ? a.localeCompare(b) : 0));
for (const key of order) select.add(new Option(t.rooms[key], key, false, key === id));
select.addEventListener("change", () => {
  params.set("room", select.value);
  location.search = params.toString();
});
document.title = `${t.rooms[id]} · 3D | 22 Jalan Elok`;

/* ---------- scene ---------- */

const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // the room doesn't move: redraw shadows only when the cut changes
renderer.shadowMap.needsUpdate = true;

const { room, scene, b } = roomScene(renderer, id, { H });
scene.background = new THREE.Color(0xf3ede4);
const ceiling = b.ceiling();
ceiling.visible = false;
// Inside, under the ceiling: a warm room light and more sky light, so the walls in shade aren't grey.
const hemi = scene.children.find((o) => o.isHemisphereLight);
const lamp = new THREE.PointLight(0xffe2c0, 7, 0, 2);
const [cx, cy] = b.centre;
lamp.position.set(cx * M, H - 0.3, cy * M);
lamp.visible = false;
scene.add(lamp);

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minPolarAngle = 8 * deg;
controls.maxPolarAngle = 80 * deg;
controls.minDistance = 3;
controls.maxDistance = 30;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, 1, 1);
ao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1, thickness: 3, scale: 1.6, samples: 16 });
ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
composer.addPass(ao);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  if (mode === "walk") camera.fov = walkFov();
  camera.updateProjectionMatrix();
  request();
}

// About 75° across when walking, so a phone held upright doesn't feel zoomed in.
function walkFov() {
  return Math.min(95, Math.max(65, 2 * Math.atan(Math.tan(37.5 * deg) / camera.aspect) / deg));
}
addEventListener("resize", resize);

/* ---------- rendering on demand: plain while moving, with ambient occlusion once still ---------- */

let frameQueued = false, idle;
function request() {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(draw);
}
function draw(now) {
  frameQueued = false;
  const moving = mode === "orbit" ? controls.update() : walkStep(now);
  if (mode === "orbit") updateCut();
  renderer.render(scene, camera);
  placeLabels();
  clearTimeout(idle);
  if (moving) request();
  else idle = setTimeout(() => composer.render(), 250);
}

function updateCut() {
  const off = camera.position.clone().sub(controls.target);
  if (b.setCut(Math.atan2(off.x, off.z) / deg)) renderer.shadowMap.needsUpdate = true;
}

/* ---------- labels: the names of the spaces ----------
   In Dollhouse they sit on the floor of each space. Walking around, they hang at door height like
   discreet signs, show only while nothing solid (glass aside) stands between you and the space,
   and fade out with distance. */

const labelLayer = $("#labels");
const labels = (room.labels || []).map(([key, x, y]) => {
  const el = document.createElement("div");
  el.className = "v-label";
  el.textContent = t.labels[key];
  labelLayer.append(el);
  return { el, floor: new THREE.Vector3(x * M, 0.1, y * M), sign: new THREE.Vector3(x * M, 2.1, y * M) };
});
const sight = new THREE.Raycaster();
const occluders = b.walls.filter((w) => w.mat !== "glass" && w.mat !== "black").map((w) => w.full);
function inSight(at, d) {
  sight.set(camera.position, at.clone().sub(camera.position).normalize());
  sight.far = d - 0.15;
  return sight.intersectObjects(occluders, true).length === 0;
}
// Labels are listed most important first; one that would overlap a label already shown waits
// until zooming in (or walking closer) makes room for it.
function placeLabels() {
  const r = canvas.getBoundingClientRect(), placed = [], walk = mode === "walk";
  for (const l of labels) {
    const at = walk ? l.sign : l.floor;
    const p = at.clone().project(camera), x = (p.x + 1) / 2 * r.width, y = (1 - p.y) / 2 * r.height;
    let alpha = p.z < 1 ? 1 : 0;
    if (walk && alpha) {
      const d = camera.position.distanceTo(at);
      alpha = Math.max(0, Math.min(1, 1 - (d - 3) / 5));     // full within 3 m, gone by 8 m
      if (alpha && !inSight(at, d)) alpha = 0;
    }
    const w = l.el.offsetWidth / 2 + 4, h = l.el.offsetHeight / 2 + 3;
    const clear = alpha > 0 && !placed.some((q) => Math.abs(q.x - x) < q.w + w && Math.abs(q.y - y) < q.h + h);
    l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    l.el.style.opacity = clear ? alpha : 0;
    if (clear) placed.push({ x, y, w, h });
  }
}

/* ---------- modes ---------- */

let mode = "orbit";
const look = { yaw: 0, pitch: 0 };

function setMode(m) {
  mode = m;
  document.querySelectorAll("[data-mode]").forEach((el) => el.setAttribute("aria-pressed", el.dataset.mode === m));
  $("#hint").textContent = m === "orbit" ? t.hintOrbit : t.hintWalk;
  controls.enabled = m === "orbit";
  ceiling.visible = lamp.visible = m === "walk";
  hemi.intensity = m === "walk" ? 0.9 : 0.35;
  b.m.glass.opacity = m === "walk" ? 0.12 : 0.38;   // up close, the glass would look like fog
  renderer.toneMappingExposure = m === "walk" ? 1.2 : 1.05;
  if (m === "orbit") {
    camera.fov = 30;
    camera.updateProjectionMatrix();
    b.setCut(room.view.az);
    controls.target.copy(frame(camera, b.group, room.view.az * deg, room.view.el * deg, 0.85));
    controls.maxDistance = Math.max(30, camera.position.distanceTo(controls.target) * 1.6);   // a whole floor on a phone is far out
    controls.update();
  } else {
    b.setCut(null);
    const [x, y] = room.walk.at;
    camera.fov = walkFov();
    camera.updateProjectionMatrix();
    camera.position.set(x * M, EYE, y * M);
    look.yaw = -room.walk.face * deg;
    look.pitch = -8 * deg;
    walkTo = null;
  }
  renderer.shadowMap.needsUpdate = true;
  request();
}
document.querySelectorAll("[data-mode]").forEach((el) => el.addEventListener("click", () => setMode(el.dataset.mode)));
controls.addEventListener("change", request);

/* ---------- walking ---------- */

const keys = new Set();
let walkTo = null, last = 0;
addEventListener("keydown", (e) => {
  if (mode !== "walk" || !/^(Arrow|Key[WASD])/.test(e.code)) return;
  keys.add(e.code);
  e.preventDefault();
  request();
});
addEventListener("keyup", (e) => keys.delete(e.code));

// One step of walking (keys or a tap target). Returns whether to keep animating.
function walkStep(now) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
  last = now;
  let fwd = 0, side = 0, turn = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) fwd += 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) fwd -= 1;
  if (keys.has("KeyA")) side -= 1;
  if (keys.has("KeyD")) side += 1;
  if (keys.has("ArrowLeft")) turn += 1;
  if (keys.has("ArrowRight")) turn -= 1;
  look.yaw += turn * 1.6 * dt;
  const sin = Math.sin(look.yaw), cos = Math.cos(look.yaw);
  let dx = (-sin * fwd + cos * side) * 1.4 * dt, dz = (-cos * fwd - sin * side) * 1.4 * dt;
  if (walkTo) {
    const ox = walkTo.x - camera.position.x, oz = walkTo.z - camera.position.z, d = Math.hypot(ox, oz);
    const s = Math.min(d, 1.6 * dt);
    if (d < 0.02) walkTo = null;
    else { dx = ox / d * s; dz = oz / d * s; }
  }
  if (dx || dz) {
    const p = camera.position;
    if (b.free(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (b.free(p.x + dx, p.z)) p.x += dx;        // slide along walls
    else if (b.free(p.x, p.z + dz)) p.z += dz;
    else walkTo = null;
  }
  camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
  const moving = keys.size > 0 || walkTo !== null;
  if (!moving) last = 0;
  return moving;
}

// Drag to look around; a tap (no drag) on the floor walks there.
let drag = null;
const ray = new THREE.Raycaster(), floors = b.group.children.filter((o) => o.geometry?.type === "ExtrudeGeometry");
canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "walk") return;
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.clientX; drag.y = e.clientY;
  look.yaw += dx * 0.004;
  look.pitch = Math.max(-80 * deg, Math.min(80 * deg, look.pitch + dy * 0.004));
  request();
});
canvas.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const tap = drag.moved < 6;
  drag = null;
  if (!tap) return;
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
  const hit = ray.intersectObjects(floors)[0];
  if (hit) { walkTo = hit.point; request(); }   // walks until something is in the way
});
canvas.addEventListener("pointercancel", () => { drag = null; });

/* ---------- start ---------- */

resize();
setMode(params.get("mode") === "walk" ? "walk" : "orbit");
$("#loading").hidden = true;
