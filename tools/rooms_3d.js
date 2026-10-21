/* Still 3D views of the rooms for rooms.html. The rooms themselves are in assets/js/rooms3d.js.

   ?room=<id>   one of the ROOMS keys
   ?w=&h=       canvas size in CSS px (render_rooms_3d.py passes it)
   ?top=1       straight-down orthographic view at 1 px per plan px, to check against the plan
*/
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { M, deg, roomScene, frame } from "../assets/js/rooms3d.js";

const params = new URLSearchParams(location.search);
const id = params.get("room") || "deluxe-queen";
const top = params.has("top");
// Canvas size in CSS px (render_rooms_3d.py passes it: headless Chrome's viewport is shorter than its window).
const CW = +params.get("w") || innerWidth, CH = +params.get("h") || innerHeight;

// Transparent canvas over the page colour (rooms_3d.html), so tone mapping leaves the background alone
// and it matches figure.render's background on the site exactly.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(CW, CH);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const { room, scene, b, box, centre, size } = roomScene(renderer, id);
b.setCut(top ? null : room.view.az);

let camera;
if (top) {
  // 1 canvas px per plan px, north (up the plan) at the top: for overlaying on the plan.
  const w = size.x / M, h = size.z / M;
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(w), Math.round(h));
  camera = new THREE.OrthographicCamera(-size.x / 2, size.x / 2, size.z / 2, -size.z / 2, 0.1, 100);
  camera.position.set(centre.x, 50, centre.z);
  camera.up.set(0, 0, -1);
  camera.lookAt(centre.x, 0, centre.z);
  document.title = `top ${Math.round(box.min.x / M)} ${Math.round(box.min.z / M)} ${Math.round(w)} ${Math.round(h)}`;
} else {
  camera = new THREE.PerspectiveCamera(24, CW / CH, 0.1, 200);
  frame(camera, b.group, room.view.az * deg, room.view.el * deg);
}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (!top) {
  const ao = new GTAOPass(scene, camera, renderer.domElement.width, renderer.domElement.height);
  ao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1, thickness: 3, scale: 1.6, samples: 24 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  ao.blendIntensity = 1;
  composer.addPass(ao);
}
composer.addPass(new OutputPass());
composer.render();
if (!top) document.title = "done";
