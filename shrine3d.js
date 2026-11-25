/* =====================================================================
   the shrine: the real-time 3D kowl on his altar, candles lit, halo on.
   loaded lazily by app.js (dynamic import) on the first interaction,
   only when WebGL works. model: models/kowl.glb (Blender ->
   work/kowl_glb.py -> gltfpack meshopt). the jelly, the poke ripple and
   the melt are one vertex-shader patch shared by every kowl material.
   ===================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.min.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.min.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.min.js";

const PEACH = "#F2B39A", GOLD = "#E2A93B";

// pupil offsets per eye style (big eye A, small eye B), straight from kowl_lib EYE_STYLES
const EYES = {
  derp: [[0.45, 0.32], [-0.22, -0.45]], cross: [[-0.42, -0.05], [0.42, -0.05]], up: [[0.10, 0.6], [-0.15, 0.65]],
  side: [[-0.55, 0], [-0.5, 0.05]], down: [[0.15, -0.6], [-0.1, -0.62]], fwd: [[0.04, 0], [-0.04, 0]],
};
export const EXPRESSIONS = {
  idle: { eyes: "follow", mouth: "dumb" },
  gm: { eyes: "follow", mouth: "grin", l: "wave", glasses: "eyes" },
  shill: { eyes: "down", mouth: "dumb", r: "phone", headset: true },
  sus: { eyes: "side", lids: 0.62, mouth: "flat", l: "hip", r: "hip" },
  "this-is-the-one": { eyes: "cross", mouth: "dumb", l: "point", glasses: "forehead" },
  "send-it": { eyes: "up", mouth: "tongue", l: "up", r: "up" },
  nfa: { eyes: "derp", lids: 0.42, mouth: "flat", l: "out", r: "out" },
  deleted: { eyes: "side", mouth: "o", sweat: true, r: "phone" },
  cry: { eyes: "up", mouth: "frown", tears: true },
  high: { eyes: "cross", lids: 0.75, mouth: "tongue", glasses: "forehead" },
  rich: { eyes: "follow", glasses: "eyes", mouth: "grin", l: "hip", r: "phone" },
  derp: { eyes: "derp", mouth: "tongue" },
  facepalm: { eyes: "up", mouth: "frown", tears: true, l: "face" },
  melted: { eyes: "derp", mouth: "o", tears: true, l: "out", r: "out" },
};
const MOUTHS = ["dumb", "grin", "o", "flat", "tongue", "frown"];
const ARMS_L = ["down", "hip", "out", "up", "point", "wave", "face"];
const ARMS_R = ["down", "hip", "out", "up", "phone"];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
// soft radial sprite (flames, glows, contact shadow)
function radial(stops, size = 128) {
  return canvasTex(size, size, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
}
// cream marble with grey-gold veins
function drawMarble(ctx, w, h) {
  ctx.fillStyle = "#efe6d6"; ctx.fillRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    let x = rnd() * w, y = rnd() * h;
    ctx.moveTo(x, y);
    for (let s = 0; s < 14; s++) { x += (rnd() - 0.3) * 90; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); }
    ctx.strokeStyle = i % 5 === 0 ? "rgba(176,134,64,.35)" : "rgba(120,104,90,.16)";
    ctx.lineWidth = rnd() * 2.2 + 0.4;
    ctx.stroke();
  }
}
function drawPlaque(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#f3cf7a"); g.addColorStop(0.5, "#c9922c"); g.addColorStop(1, "#8a5d14");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(60,35,5,.55)"; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(h * 0.36)}px "Instrument Serif", Georgia, serif`;
  ctx.fillStyle = "rgba(255,236,190,.55)"; ctx.fillText("ORDO KOWLORUM", w / 2, h * 0.5 + 3);
  ctx.fillStyle = "#3a2405"; ctx.fillText("ORDO KOWLORUM", w / 2, h * 0.5);
}
function drawBurst(ctx, w) {
  const c = w / 2;
  ctx.translate(c, c);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, long = i % 2 === 0;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * c, Math.sin(a) * c);
    g.addColorStop(0.25, long ? "rgba(255,206,120,.55)" : "rgba(255,190,120,.25)");
    g.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const spread = long ? 0.028 : 0.018, r = long ? c : c * 0.78;
    ctx.lineTo(Math.cos(a - spread) * r, Math.sin(a - spread) * r);
    ctx.lineTo(Math.cos(a + spread) * r, Math.sin(a + spread) * r);
    ctx.closePath(); ctx.fill();
  }
}

/* ---------------- the shader patch: jelly shear, squash, poke ripple, melt ---------------- */
function patchKowl(material, U, skin) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform mat4 uRoot; uniform mat4 uRootInv; uniform vec2 uShear; uniform float uSq; uniform float uMelt;
uniform float uTime; uniform vec3 uPokeP; uniform float uPokeT; uniform float uWob;
varying float vKH;
vec3 kowlDeform(vec3 p){
  float h = max(p.y, 0.0);
  float age = uTime - uPokeT;
  if (age > 0.0 && age < 2.5) {
    float d = distance(p, uPokeP);
    vec3 n = normalize(vec3(p.x, (p.y - 0.55) * 0.7, p.z) + 1e-4);
    p += n * uWob * 0.055 * sin(d * 19.0 - age * 24.0) * exp(-d * 2.2) * exp(-age * 2.6);
  }
  p.y *= 1.0 - uSq;
  p.xz *= 1.0 + uSq * 0.55;
  p.xz += uShear * h * h;
  if (uMelt > 0.001) {
    float t = clamp(h / 1.2, 0.0, 1.0);
    float sag = 1.0 - uMelt * (0.7 + 0.08 * sin(p.x * 9.0 + p.z * 7.0));
    p.y = p.y * sag;
    p.xz *= 1.0 + uMelt * 0.8 * pow(1.0 - t * 0.85, 2.0);
    p.y -= uMelt * 0.05 * max(0.0, sin(p.x * 13.0) * sin(p.z * 11.0 + 1.3)) * (1.0 - t);
    p.y = max(p.y, 0.004);
    float r = length(p.xz), rMax = 0.98 + 0.03 * sin(p.x * 17.0);
    if (r > rMax) p.xz *= rMax / r; // the puddle stays on the altar
  }
  return p;
}`)
      .replace("#include <project_vertex>", `
vec4 kw = modelMatrix * vec4(transformed, 1.0);
vec3 kl = (uRootInv * kw).xyz;
vKH = kl.y;
kl = kowlDeform(kl);
kw = uRoot * vec4(kl, 1.0);
vec4 mvPosition = viewMatrix * kw;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vKH;")
      .replace("#include <color_fragment>", `#include <color_fragment>
${skin ? "diffuseColor.rgb *= mix(vec3(0.84, 0.64, 0.6), vec3(1.0), smoothstep(-0.02, 0.4, vKH));" : ""}`);
  };
  material.customProgramCacheKey = () => "kowl" + (skin ? "s" : "");
  material.needsUpdate = true;
}

/* ---------------- main ---------------- */
// the framing box the camera keeps in shot (world units around the altar): kowl, the halo, the altar top
const FRAME = { cx: 0, cy: 0.46, halfW: 1.48, halfH: 1.36 };
const FOV = 30;

export async function start(opts) {
  const { canvas, model, reduced, onPoke, onMelt, onReady } = opts;
  try { await document.fonts.load('600 72px "Instrument Serif"'); } catch { /* the plaque falls back to Georgia */ }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);

  // candlelight: warm key from low front, gold rim behind, a cool fill so he isn't all orange
  scene.add(new THREE.HemisphereLight("#ffe6cc", "#2a1408", 0.6));
  const key = new THREE.DirectionalLight("#fff0de", 2.0); key.position.set(-2.2, 2.6, 3.2); scene.add(key);
  const rim = new THREE.DirectionalLight("#ffb347", 2.6); rim.position.set(2.4, 2.4, -2.6); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9cc8ff", 0.45); fill.position.set(3, 0.8, 2); scene.add(fill);

  /* --- the altar --- */
  const set = new THREE.Group();
  scene.add(set);
  const marble = canvasTex(1024, 256, drawMarble);
  marble.wrapS = THREE.RepeatWrapping; marble.repeat.set(2, 1);
  const stone = new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const gilt = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 });
  const tiers = [
    [1.08, 1.12, 0.07, -0.035],   // top slab (kowl sits on y = 0)
    [0.9, 0.9, 0.62, -0.38],      // drum
    [1.12, 1.2, 0.12, -0.75],     // base
    [1.32, 1.4, 0.1, -0.86],      // step
  ];
  tiers.forEach(([rt, rb, h, y]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 64), stone);
    m.position.y = y; set.add(m);
  });
  [[1.1, -0.002], [0.91, -0.08], [0.91, -0.68], [1.16, -0.69]].forEach(([r, y]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 10, 96), gilt);
    t.rotation.x = Math.PI / 2; t.position.y = y; set.add(t);
  });
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.2),
    new THREE.MeshStandardMaterial({ map: canvasTex(980, 200, drawPlaque), metalness: 0.65, roughness: 0.35 }),
  );
  plaque.position.set(0, -0.36, 0.905); set.add(plaque);

  // the halo: a gilded ring and a slow sunburst behind kowl's head
  const halo = new THREE.Group();
  halo.position.set(0, 0.9, -0.7);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 16, 128), gilt);
  const burstTex = canvasTex(1024, 1024, drawBurst);
  // kept inside the camera frame (the CSS rays carry the light beyond the canvas edge, so no hard cut shows)
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ map: burstTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  burst.position.z = -0.05;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({
    map: radial([[0, "rgba(255,210,150,.55)"], [0.45, "rgba(255,170,90,.18)"], [1, "rgba(255,160,80,0)"]], 256),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.position.z = -0.08;
  halo.add(glow, burst, ring);
  set.add(halo);

  // candles on the altar step and the top slab
  const flameTex = radial([[0, "rgba(255,255,235,1)"], [0.25, "rgba(255,214,120,.95)"], [0.6, "rgba(255,140,40,.35)"], [1, "rgba(255,120,30,0)"]]);
  const wax = new THREE.MeshStandardMaterial({ color: "#f6ecd9", roughness: 0.55, emissive: "#ffb066", emissiveIntensity: 0.06 });
  const candles = [];
  [[-1.18, -0.81, 0.35, 0.34], [-0.98, -0.81, 0.62, 0.22], [1.2, -0.81, 0.4, 0.3], [1.0, -0.81, 0.78, 0.2], [-0.8, 0, 0.55, 0.12], [0.82, 0, 0.5, 0.16]].forEach(([x, y, z, h], i) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, h, 18), wax);
    c.position.set(x, y + h / 2, z); set.add(c);
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    f.position.set(x, y + h + 0.06, z); f.scale.set(0.12, 0.2, 1); set.add(f);
    candles.push({ f, ph: i * 1.7, base: f.position.y });
  });
  const candleL = new THREE.PointLight("#ffb35c", 2.2, 4, 1.6); candleL.position.set(-1.0, 0.1, 0.7); scene.add(candleL);
  const candleR = new THREE.PointLight("#ffb35c", 2.2, 4, 1.6); candleR.position.set(1.0, 0.1, 0.7); scene.add(candleR);

  // contact shadow on the slab
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({
    map: radial([[0, "rgba(40,20,10,.7)"], [0.6, "rgba(40,20,10,.22)"], [1, "rgba(40,20,10,0)"]]), transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; set.add(shadow);

  /* --- kowl --- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(model);
  const anchor = new THREE.Group();
  scene.add(anchor);
  const kowl = gltf.scene;
  kowl.rotation.y = -0.1;
  anchor.add(kowl);

  const U = {
    uRoot: { value: new THREE.Matrix4() }, uRootInv: { value: new THREE.Matrix4() },
    uShear: { value: new THREE.Vector2() }, uSq: { value: 0 }, uMelt: { value: 0 },
    uTime: { value: 0 }, uPokeP: { value: new THREE.Vector3(0, 0.7, 0.5) }, uPokeT: { value: -10 }, uWob: { value: 0 },
  };
  const seen = new Map();
  const meshes = [];
  kowl.traverse((o) => {
    if (!o.isMesh) return;
    meshes.push(o);
    o.frustumCulled = false;
    const m = o.material;
    if (seen.has(m)) { o.material = seen.get(m); return; }
    const name = m.name || "";
    let out;
    if (/skin/.test(name)) {
      out = new THREE.MeshPhysicalMaterial({ color: PEACH, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color("#ffd2bd"), sheenRoughness: 0.5, side: THREE.DoubleSide });
      patchKowl(out, U, true);
    } else {
      out = m.clone();
      if (/glint/.test(name)) out = new THREE.MeshBasicMaterial({ color: "#ffffff" });
      if (/mouth/.test(name)) out = new THREE.MeshStandardMaterial({ color: "#16040a", roughness: 0.85, envMapIntensity: 0.15 });
      patchKowl(out, U, false);
    }
    seen.set(m, out);
    o.material = out;
  });
  const N = (n) => kowl.getObjectByName(n);
  const parts = {
    mouths: Object.fromEntries(MOUTHS.map((m) => [m, N("mouth_" + m)])),
    armL: Object.fromEntries(ARMS_L.map((a) => [a, N("arm_l_" + a)])),
    armR: Object.fromEntries(ARMS_R.map((a) => [a, N("arm_r_" + a)])),
    glasses: { eyes: N("glasses_eyes"), forehead: N("glasses_forehead") },
    headset: N("headset"), tears: N("tears"), sweat: N("sweat"), hair: N("hair"),
    eyeA: N("eyeA"), eyeB: N("eyeB"), lookA: N("eyeA_look"), lookB: N("eyeB_look"), lidA: N("lidA"), lidB: N("lidB"),
  };

  const st = {
    expr: "idle", ex: EXPRESSIONS.idle, lid: 0, lidT: 0, blinkAt: 2, blink: 0, talk: 0,
    shear: new THREE.Vector2(), shearV: new THREE.Vector2(), sq: 0, sqV: 0,
    melt: 0, meltT: -1, pokes: 0, look: new THREE.Vector3(0, 0.8, 3), hover: false, lastPX: 0, lastPT: 0,
  };
  function setExpr(name) {
    const ex = EXPRESSIONS[name] || EXPRESSIONS.idle;
    st.expr = name; st.ex = ex;
    MOUTHS.forEach((m) => { if (parts.mouths[m]) parts.mouths[m].visible = m === (ex.mouth || "dumb"); });
    ARMS_L.forEach((a) => { if (parts.armL[a]) parts.armL[a].visible = a === (ex.l || "down"); });
    ARMS_R.forEach((a) => { if (parts.armR[a]) parts.armR[a].visible = a === (ex.r || "down"); });
    if (parts.glasses.eyes) parts.glasses.eyes.visible = ex.glasses === "eyes";
    if (parts.glasses.forehead) parts.glasses.forehead.visible = ex.glasses === "forehead";
    if (parts.headset) parts.headset.visible = !!ex.headset;
    if (parts.tears) parts.tears.visible = !!ex.tears;
    if (parts.sweat) parts.sweat.visible = !!ex.sweat;
    st.lidT = ex.lids || 0;
  }
  setExpr("idle");

  /* --- sizing: fit the frame box whatever the stage's aspect --- */
  let W = 1, H = 1, quality = 1, meshesReady = false;
  const camBase = new THREE.Vector3();
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * quality);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const d = Math.max(FRAME.halfH / t, FRAME.halfW / (t * camera.aspect)) + 1.0;
    camBase.set(0, FRAME.cy + 0.55, d);
    camera.updateProjectionMatrix();
    // a paused stage still gets a correct frame, so a resize never shows a stretched old buffer
    if (meshesReady && !raf) { camera.position.copy(camBase); camera.lookAt(FRAME.cx, FRAME.cy, 0); renderer.render(scene, camera); }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  /* --- input: eyes follow the cursor anywhere on the page; pokes are raycast --- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6);
  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function visibleChain(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
  const hitKowl = () => { ray.setFromCamera(ndc, camera); return ray.intersectObjects(meshes, false).find((h) => visibleChain(h.object)); };
  let hoverAt = 0;
  function onMove(e) {
    toNdc(e);
    ndc.x = clamp(ndc.x, -3, 3); ndc.y = clamp(ndc.y, -3, 3);
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(planeZ, hit)) st.look.copy(hit);
    const now = performance.now();
    const inside = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
    if (inside && st.lastPT && !reduced) st.shearV.x += clamp((e.clientX - st.lastPX) / Math.max(8, now - st.lastPT), -3, 3) * 0.05;
    st.lastPX = e.clientX; st.lastPT = now;
    if (inside && e.pointerType === "mouse" && now - hoverAt > 60) {
      hoverAt = now;
      const hov = !!hitKowl();
      if (hov !== st.hover) { st.hover = hov; canvas.style.cursor = hov ? "pointer" : ""; }
    }
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  function poke(hitWorld) {
    const lp = hitWorld ? anchor.worldToLocal(hitWorld.clone()) : new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.7, 0.45);
    U.uPokeP.value.copy(lp);
    U.uPokeT.value = U.uTime.value;
    U.uWob.value = reduced ? 0.45 : 1;
    st.sqV += reduced ? 1.2 : 2.6;
    st.shearV.x += (lp.x > 0 ? -1 : 1) * (reduced ? 0.25 : 0.6);
    st.shearV.y -= reduced ? 0.15 : 0.35;
    st.pokes++;
    const melting = st.pokes % 7 === 0;
    if (melting) { st.meltT = 0; setExpr("melted"); onMelt && onMelt(true); }
    onPoke && onPoke(st.pokes, melting);
  }
  canvas.addEventListener("pointerdown", (e) => {
    toNdc(e);
    const hit = hitKowl();
    if (hit) poke(hit.point);
  });

  /* --- loop --- */
  let lastT = performance.now();
  let running = true, raf = 0, frames = 0, slowFrames = 0, fpsT = 0;
  const tmp = new THREE.Vector3();
  function lookEye(look, eye, styleIdx, dt) {
    if (!look || !eye) return;
    let yaw, pitch;
    eye.worldToLocal(tmp.copy(st.look));
    if (st.ex.eyes === "follow" || !EYES[st.ex.eyes]) {
      yaw = clamp(Math.atan2(tmp.x, tmp.z), -0.62, 0.62);
      pitch = clamp(-Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)), -0.5, 0.5);
    } else {
      const [ox, oz] = EYES[st.ex.eyes][styleIdx];
      yaw = Math.atan2(ox, 1) + clamp(Math.atan2(tmp.x, tmp.z), -0.6, 0.6) * 0.15;
      pitch = -Math.atan2(oz, 1);
    }
    look.rotation.y = damp(look.rotation.y, yaw, 18, dt);
    look.rotation.x = damp(look.rotation.x, pitch, 18, dt);
  }
  function frame() {
    raf = 0;
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - lastT) / 1000, 1 / 20);
    lastT = now;
    const t = (U.uTime.value += dt);

    const K = 70, C = reduced ? 14 : 5.5;
    st.shearV.x += (-K * st.shear.x - C * st.shearV.x) * dt;
    st.shearV.y += (-K * st.shear.y - C * st.shearV.y) * dt;
    st.shear.addScaledVector(st.shearV, dt);
    st.sqV += (-90 * st.sq - (reduced ? 16 : 7) * st.sqV) * dt;
    st.sq += st.sqV * dt;
    const idle = reduced ? 0.003 : 0.012;
    U.uShear.value.set(clamp(st.shear.x, -0.35, 0.35) + Math.sin(t * 1.3) * idle * 1.5, clamp(st.shear.y, -0.3, 0.3));
    U.uSq.value = clamp(st.sq, -0.35, 0.45) + Math.sin(t * 2.2) * idle;

    // melt: 1.3s down, 2.6s puddle, 0.9s back up with a boing
    if (st.meltT >= 0) {
      st.meltT += dt;
      const m = st.meltT;
      let v;
      if (m < 1.3) v = 1 - Math.pow(1 - m / 1.3, 3);
      else if (m < 3.9) v = 1 + Math.sin(m * 5) * 0.015;
      else if (m < 4.8) v = 1 - (m - 3.9) / 0.9;
      else { v = 0; st.meltT = -1; st.sqV -= 3.2; setExpr("idle"); onMelt && onMelt(false); }
      U.uMelt.value = clamp(v, 0, 1.02);
    }

    st.blinkAt -= dt;
    if (st.blinkAt <= 0) { st.blink = 0.16; st.blinkAt = 2 + Math.random() * 4; }
    if (st.blink > 0) st.blink -= dt;
    st.lid = damp(st.lid, st.blink > 0 ? 1 : st.lidT, st.blink > 0 ? 40 : 10, dt);
    const lidRot = (l) => -2.1 + l * (2.1 + Math.PI / 2);
    if (parts.lidB) parts.lidB.rotation.x = lidRot(st.lid);
    if (parts.lidA) parts.lidA.rotation.x = lidRot(st.blink > 0 ? st.lid : st.lid * 0.35);
    lookEye(parts.lookA, parts.eyeA, 0, dt);
    lookEye(parts.lookB, parts.eyeB, 1, dt);
    const mouth = parts.mouths[st.ex.mouth || "dumb"];
    if (mouth) {
      if (st.talk > 0) { st.talk -= dt; mouth.scale.y = 0.55 + Math.abs(Math.sin(t * 17)) * 0.75; mouth.scale.x = 1 - Math.abs(Math.sin(t * 17)) * 0.12; }
      else { mouth.scale.y = damp(mouth.scale.y, 1, 12, dt); mouth.scale.x = damp(mouth.scale.x, 1, 12, dt); }
    }
    const motion = reduced ? 0.35 : 1;
    const al = st.ex.l || "down", ar = st.ex.r || "down";
    if (parts.armL.wave) parts.armL.wave.rotation.y = al === "wave" ? Math.sin(t * 9) * 0.35 * motion : 0;
    if (parts.armL.up) parts.armL.up.rotation.z = al === "up" ? Math.sin(t * 7) * 0.18 * motion : 0;
    if (parts.armR.up) parts.armR.up.rotation.z = ar === "up" ? -Math.sin(t * 7 + 1) * 0.18 * motion : 0;
    if (parts.armL.point) parts.armL.point.rotation.x = al === "point" ? Math.max(0, Math.sin(t * 5)) * 0.2 * motion : 0;
    if (parts.hair) parts.hair.rotation.z = -st.shear.x * 2.2 + Math.sin(t * 3) * 0.05 * motion;

    kowl.rotation.y = damp(kowl.rotation.y, -0.1 + clamp(st.look.x * 0.08, -0.25, 0.25), 3, dt);

    // the altar breathes: halo spins slowly, candles flicker
    if (!reduced) burst.rotation.z = t * 0.05;
    glow.material.opacity = 0.85 + Math.sin(t * 1.3) * 0.08;
    candles.forEach((c) => {
      const fl = reduced ? 1 : 1 + Math.sin(t * 11 + c.ph) * 0.08 + Math.sin(t * 23 + c.ph * 2) * 0.05;
      c.f.scale.set(0.12 * (2 - fl), 0.2 * fl, 1);
    });
    const flick = reduced ? 0 : Math.sin(t * 9.3) * 0.25 + Math.sin(t * 17.1) * 0.15;
    candleL.intensity = 2.2 + flick; candleR.intensity = 2.2 - flick;

    const drift = reduced ? 0 : 1;
    camera.position.set(camBase.x + Math.sin(t * 0.25) * 0.06 * drift, camBase.y + Math.sin(t * 0.33) * 0.03 * drift, camBase.z);
    camera.lookAt(FRAME.cx, FRAME.cy, 0);

    anchor.updateMatrixWorld(true);
    U.uRoot.value.copy(anchor.matrixWorld);
    U.uRootInv.value.copy(anchor.matrixWorld).invert();
    renderer.render(scene, camera);

    frames++; fpsT += dt;
    if (fpsT > 2) {
      const fps = frames / fpsT;
      if (fps < 40 && quality > 0.6) { if (++slowFrames >= 2) { quality = Math.max(0.6, quality - 0.2); resize(); slowFrames = 0; } }
      else slowFrames = 0;
      frames = 0; fpsT = 0;
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  frame();
  meshesReady = true;
  onReady && onReady();

  return {
    setExpression: setExpr,
    talk(sec) { st.talk = Math.min(4, sec); },
    poke() { poke(null); },
    get pokes() { return st.pokes; },
    set pokes(v) { st.pokes = v; },
    pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); },
    projectHead() {
      tmp.set(0.25, 1.25, 0); anchor.localToWorld(tmp); tmp.project(camera);
      return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H];
    },
  };
}
