/* =====================================================================
   kowl's room: the real-time diorama. loaded by app.js (dynamic import)
   when WebGL2 works. the room is lightmap-baked in Blender
   (work/room_build.py) into one atlas, so every surface is a single
   unlit texture lookup; kowl is the only lit, live thing in here.
   hotspot meshes are named hs_<key>, screens scr_<key>.
   ===================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.min.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.min.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.min.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const PEACH = "#F2B39A";

/* ---------------- kowl's rig (same GLB + shader patch as the old shrine) ---------------- */
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
  flying: { eyes: "derp", mouth: "o", l: "up", r: "up", sweat: true },
  dizzy: { eyes: "cross", lids: 0.3, mouth: "tongue", sweat: true },
  sleep: { eyes: "down", lids: 1, mouth: "flat" },
  streamer: { eyes: "follow", mouth: "grin", headset: true, r: "phone" },
};
const MOUTHS = ["dumb", "grin", "o", "flat", "tongue", "frown"];
const ARMS_L = ["down", "hip", "out", "up", "point", "wave", "face"];
const ARMS_R = ["down", "hip", "out", "up", "phone"];

function patchKowl(material, U, skin) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform mat4 uRoot; uniform mat4 uRootInv; uniform vec2 uShear; uniform float uSq; uniform float uMelt; uniform float uPuddle;
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
    float r = length(p.xz), rMax = uPuddle + 0.03 * sin(p.x * 17.0 + uTime * 1.5);
    if (r > rMax) p.xz *= rMax / r;
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

function canvasTex(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // glTF UV convention
  t.anisotropy = 4;
  return { c, ctx: c.getContext("2d"), t };
}
function radialTex(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };

// the room in three.js units (Blender x, y, z -> three x, z, -y)
const ROOM = { min: new THREE.Vector3(-2.12, -0.25, -2.12), max: new THREE.Vector3(2.12, 2.7, 2.12) };
const HOME_DIR = new THREE.Vector3(0.5708, 0.454, 0.6803).normalize();
const HOME_TARGET = new THREE.Vector3(0.05, 0.95, -0.35);
// platforms kowl can land on: [x0, x1, z0, z1, top]
const PLATFORMS = [
  [-2.0, -1.0, -1.98, -0.26, 0.5],   // bed
  [0.32, 1.96, -1.98, -1.36, 0.76],  // desk
  [-2.0, -1.57, -0.33, 0.62, 0.6],   // dresser
  [0.17, 0.67, -1.23, -0.73, 0.51],  // chair seat
  [0.95, 1.75, 0.45, 1.05, 0.3],     // beanbag
];
// where the camera goes to look at each thing: direction from the thing to the camera, distance scale
const VIEWS = {
  laptop: [[0.35, 0.42, 1], 1.9], mon1: [[0.2, 0.15, 1], 1.25], mon2: [[0.45, 0.12, 1], 1.2], phone: [[0.4, 0.5, 1], 2.4],
  wall: [[0.1, 0.05, 1], 0.95], note: [[-0.35, 0.25, 1], 1.8], window: [[0.12, 0.25, 1], 0.8], neon: [[0.25, 0.05, 1], 1.15],
  safe: [[0.35, 0.45, 1], 1.5], trash: [[0.1, 0.9, 1], 4.2], pizza: [[0.6, 0.9, 1], 1.6], drinks: [[0.4, 0.5, 1], 1.1],
  tv: [[1, 0.05, 0.12], 1.0], mirror: [[1, 0.1, 0.35], 1.0], door: [[1, 0.05, 0.25], 0.95], cert: [[1, 0.05, 0.15], 1.25],
  chain: [[1, 0.1, 0.25], 1.7], clock: [[1, 0, 0.15], 2.0], bed: [[0.9, 0.7, 0.6], 0.9], ring: [[0.7, 0.3, 1], 1.2],
};

export async function start(opts) {
  const { canvas, mobile, reduced, atlasUrl, onProgress, onHover, onPick, onPoke, onKowl, onReady } = opts;

  /* ---------------- renderer ---------------- */
  const dprCap = mobile ? 1.6 : 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(mobile ? 34 : 28, 1, 0.05, 60);

  /* ---------------- load: room geometry, atlas, kowl ---------------- */
  const progress = { room: 0, atlas: 0, kowl: 0 };
  const report = () => onProgress && onProgress((progress.room + progress.atlas * 3 + progress.kowl) / 5);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const track = (k) => (e) => { if (e.total) { progress[k] = e.loaded / e.total; report(); } };
  const atlasP = (async () => {
    // fetch (same request as the <link rel=preload as=fetch>, so it isn't downloaded twice), streamed so the bar moves
    const res = await fetch(atlasUrl);
    if (!res.ok) throw new Error("atlas " + res.status);
    const total = +res.headers.get("content-length") || 0;
    let blob;
    if (res.body && total) {
      const reader = res.body.getReader(), parts = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length;
        progress.atlas = got / total; report();
      }
      blob = new Blob(parts, { type: "image/webp" });
    } else blob = await res.blob();
    progress.atlas = 1; report();
    // decode off the main thread where we can (no options: older Safari rejects option values it doesn't know)
    let src;
    try { src = await createImageBitmap(blob); } catch { src = await loadImg(URL.createObjectURL(blob)); }
    const t = new THREE.Texture(src);
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  })();
  const [roomG, atlas, kowlG] = await Promise.all([
    loader.loadAsync("room/room.glb", track("room")),
    atlasP,
    loader.loadAsync("models/kowl.glb", track("kowl")),
  ]);

  /* ---------------- the room ---------------- */
  const room = roomG.scene;
  scene.add(room);
  const hot = {};          // key -> { meshes, mat, box, center }
  const screens = {};      // key -> mesh
  const hitList = [];
  room.traverse((o) => {
    if (!o.isMesh) return;
    o.matrixAutoUpdate = false;
    o.updateMatrix();
    // gltfpack wraps each named node around an unnamed mesh node: walk up to the hs_/scr_ name
    let name = "";
    for (let p = o; p && !name; p = p.parent) if (/^(hs|scr|room)_/.test(p.name)) name = p.name;
    const scr = name.match(/^scr_(\w+)/);
    if (scr) { screens[scr[1]] = o; return; }
    const hs = name.match(/^hs_(\w+)/);
    const mat = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false });
    o.material = mat;
    if (hs) {
      const key = hs[1];
      (hot[key] = hot[key] || { key, meshes: [], mat }).meshes.push(o);
      o.userData.hot = key;
      hitList.push(o);
    }
  });
  room.updateMatrixWorld(true);
  Object.values(hot).forEach((h) => {
    const b = new THREE.Box3();
    h.meshes.forEach((m) => b.expandByObject(m));
    h.box = b; h.center = b.getCenter(new THREE.Vector3()); h.size = b.getSize(new THREE.Vector3());
  });
  // the window glass and the screens count as part of their hotspot for hover and fly-to
  [["window", "window"], ["laptop", "laptop"], ["mon1", "mon1"], ["mon2", "mon2"], ["phone", "phone"], ["tv", "tv"]].forEach(([s, k]) => {
    const m = screens[s];
    if (m && hot[k]) { m.userData.hot = k; hitList.push(m); hot[k].meshes.push(m); hot[k].box.expandByObject(m); hot[k].center = hot[k].box.getCenter(new THREE.Vector3()); hot[k].size = hot[k].box.getSize(new THREE.Vector3()); }
  });
  const seatNode = room.getObjectByName("kowl_seat");
  const seat = seatNode ? seatNode.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.42, 0.51, -0.98);
  const seatQ = seatNode ? seatNode.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.698);
  const seatYaw = new THREE.Euler().setFromQuaternion(seatQ, "YXZ").y;

  /* ---------------- live screens ---------------- */
  const S = {};
  function screenMat(key, w, h) {
    const m = screens[key];
    if (!m) return null;
    const ct = canvasTex(w, h);
    m.material = new THREE.MeshBasicMaterial({ map: ct.t, toneMapped: false, side: THREE.DoubleSide });
    S[key] = ct;
    return ct;
  }
  screenMat("laptop", 512, 326);
  screenMat("mon1", 640, 360);
  screenMat("mon2", 300, 512);
  screenMat("phone", 192, 400);
  screenMat("tv", 512, 288);
  screenMat("window", 512, 548);
  const data = { stats: null, mission: null, missionImg: null, countdown: "--:--:--", chat: [], tvImgs: [], tvIdx: 0, tvSwitch: 0 };
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const CHAT = [
    ["alpha kowl 🐋", "ok everyone post at 3:00pm sharp"], ["0xkowl", "who dumps first"], ["kowl", "not me (it's me)"], ["kowlcapital", "remember: say nfa"],
    ["notkowl", "ser my bags"], ["kowl", "this is the one"], ["alpha kowl 🐋", "DON'T say it's paid"], ["kowlresearch", "47 of us posting the same chart lol"],
    ["kowl_eth", "i deleted mine already"], ["kowl", "gm. anyway, sending it"], ["0xkowl", "wen exit"], ["alpha kowl 🐋", "3:00pm. no early posting"],
    ["kowl", "i posted at 2:58"], ["kowlcalls", "bro"], ["notkowl", "kowl'd again"], ["kowl", "taking a break from CT"],
  ];
  let chatI = 0;
  function drawLaptop(t) {
    const { ctx: g, c, t: tex } = S.laptop || {};
    if (!g) return;
    const W = c.width, H = c.height;
    g.fillStyle = "#0a0d08"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1a2214"; g.fillRect(0, 0, W, 26);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(16 + i * 18, 13, 5, 0, 7); g.fill(); });
    g.fillStyle = "#c7d6a8"; g.font = `600 13px ${MONO}`; g.fillText("kowl@payroll: ~", 80, 18);
    const s = data.stats;
    const lines = [
      "$ kowl payroll --status",
      s ? `status ......... ${s.status === "live" ? "LIVE" : "waiting for CA"}` : "status ......... connecting…",
      s ? `kowls .......... ${s.kowls ?? 0}` : "kowls .......... …",
      s ? `memes (round) .. ${s.memes_round ?? 0}` : "memes .......... …",
      s && s.status === "live" ? `pool ........... ${(+s.pool_sol || 0).toFixed(3)} SOL` : "pool ........... opens at launch",
      `fees to kowls .. 100%`,
      "$ who paid you?",
      "> payroll did. in public.",
    ];
    g.font = `500 17px ${MONO}`;
    lines.forEach((l, i) => { g.fillStyle = l.startsWith("$") ? "#ffb347" : l.startsWith(">") ? "#7dff9b" : "#d9e6c4"; g.fillText(l, 16, 58 + i * 30); });
    if (Math.floor(t * 2) % 2) { g.fillStyle = "#ffb347"; g.fillRect(16 + g.measureText("> payroll did. in public.").width + 6, 58 + 7 * 30 - 15, 10, 18); }
    g.fillStyle = "rgba(255,180,70,.06)"; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    tex.needsUpdate = true;
  }
  const chart = []; { let v = 60; for (let i = 0; i < 46; i++) { const o = v; v = clamp(v + (i < 18 ? 3.2 : i < 22 ? 9 : -4.2) + (Math.random() - 0.5) * 10, 6, 98); chart.push([o, v]); } }
  function drawMon1(t) {
    const { ctx: g, c, t: tex } = S.mon1 || {};
    if (!g) return;
    const W = c.width, H = c.height;
    g.fillStyle = "#0b0e14"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(120,140,170,.12)"; g.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H); g.stroke(); }
    for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = "#e7ecf3"; g.font = `700 20px ${MONO}`; g.fillText("$KOL/USD", 16, 28);
    g.fillStyle = "#ff4d6a"; g.font = `700 16px ${MONO}`; g.fillText("-87.4%  (nfa)", 150, 28);
    g.fillStyle = "#8aa0b8"; g.font = `500 13px ${MONO}`; g.fillText("1m · kowl's call ↓ · kowl's exit ↑", 360, 28);
    const n = chart.length, cw = (W - 40) / n, shown = Math.min(n, Math.floor(((t * 3) % (n + 12))));
    for (let i = 0; i < shown; i++) {
      const [o, v] = chart[i], up = v >= o;
      const y0 = H - 20 - (o / 100) * (H - 70), y1 = H - 20 - (v / 100) * (H - 70);
      g.fillStyle = up ? "#25d07d" : "#ff4d6a";
      g.fillRect(20 + i * cw, Math.min(y0, y1), cw * 0.7, Math.max(2, Math.abs(y1 - y0)));
      g.fillRect(20 + i * cw + cw * 0.33, Math.min(y0, y1) - 6, 1.5, Math.abs(y1 - y0) + 12);
    }
    if (shown > 20) { g.fillStyle = "#ffd34d"; g.font = `700 15px ${MONO}`; g.fillText("← kowl: \"this is the one\"", 20 + 21 * cw, 70); }
    tex.needsUpdate = true;
  }
  function drawMon2() {
    const { ctx: g, c, t: tex } = S.mon2 || {};
    if (!g) return;
    const W = c.width, H = c.height;
    g.fillStyle = "#0e1621"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#17212b"; g.fillRect(0, 0, W, 56);
    g.fillStyle = "#2aabee"; g.beginPath(); g.arc(30, 28, 18, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = "700 16px system-ui, sans-serif"; g.fillText("🔒 alpha group", 56, 25);
    g.fillStyle = "#7d8b99"; g.font = "13px system-ui, sans-serif"; g.fillText("47 KOLs · 3 online", 56, 44);
    let y = H - 14;
    for (let i = data.chat.length - 1; i >= 0 && y > 70; i--) {
      const [who, msg] = data.chat[i], me = who === "kowl";
      g.font = "15px system-ui, sans-serif";
      const w = Math.min(W - 70, Math.max(g.measureText(msg).width, g.measureText(who).width) + 24);
      const h = 50, x = me ? W - w - 10 : 10;
      y -= h + 8;
      g.fillStyle = me ? "#2b5278" : "#182533"; rr(g, x, y, w, h, 12); g.fill();
      g.fillStyle = me ? "#8fd1ff" : ["#f78b6c", "#7ed37e", "#e0b34c", "#c993ff"][who.length % 4];
      g.font = "700 13px system-ui, sans-serif"; g.fillText(who, x + 12, y + 18);
      g.fillStyle = "#e9eef3"; g.font = "15px system-ui, sans-serif"; g.fillText(msg, x + 12, y + 39);
    }
    tex.needsUpdate = true;
  }
  function drawPhone() {
    const { ctx: g, c, t: tex } = S.phone || {};
    if (!g) return;
    const W = c.width, H = c.height;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#e7e9ea"; g.font = `700 13px system-ui, sans-serif`; g.fillText("3:00", 14, 22);
    g.fillStyle = "#1d9bf0"; g.font = `800 12px ${MONO}`; g.fillText("TODAY'S CALL", 14, 52);
    g.fillStyle = "#fff"; g.font = `700 16px system-ui, sans-serif`;
    const title = (data.mission && data.mission.title) || "kowl deletes the tweet.";
    wrap(g, title, 14, 74, W - 28, 19, 3);
    if (data.missionImg) g.drawImage(data.missionImg, 14, 140, W - 28, W - 28);
    else { g.fillStyle = "#16181c"; g.fillRect(14, 140, W - 28, W - 28); }
    g.fillStyle = "#71767b"; g.font = `500 12px ${MONO}`; g.fillText("next call in", 14, 150 + W - 18);
    g.fillStyle = "#fff"; g.font = `700 22px ${MONO}`; g.fillText(data.countdown, 14, 176 + W - 18);
    tex.needsUpdate = true;
  }
  function wrap(g, text, x, y, w, lh, max) {
    const words = String(text).split(/\s+/); let line = "", n = 0;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (g.measureText(test).width > w && line) { g.fillText(line, x, y + n * lh); line = word; if (++n >= max) return; } else line = test;
    }
    if (line) g.fillText(line, x, y + n * lh);
  }
  function drawTV(t) {
    const { ctx: g, c, t: tex } = S.tv || {};
    if (!g) return;
    const W = c.width, H = c.height;
    const img = data.tvImgs[data.tvIdx % Math.max(1, data.tvImgs.length)];
    const sw = t - data.tvSwitch;
    if (img && sw > 0.25) {
      const k = 1 + 0.03 * Math.sin(t * 0.3);
      g.drawImage(img, (W - W * k) / 2, (H - H * k) / 2, W * k, H * k);
    } else {
      const d = g.createImageData(W / 4, H / 4);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      const tmp = document.createElement("canvas"); tmp.width = W / 4; tmp.height = H / 4; tmp.getContext("2d").putImageData(d, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, W, H); g.imageSmoothingEnabled = true;
    }
    g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    g.fillStyle = "#e0245e"; rr(g, W - 92, 14, 76, 28, 6); g.fill();
    g.fillStyle = "#fff"; g.font = `800 16px system-ui, sans-serif`; g.fillText("● LIVE", W - 84, 34);
    tex.needsUpdate = true;
  }
  // the window: a sky for the real local time of day
  const stars = Array.from({ length: 70 }, () => [Math.random(), Math.random() * 0.62, Math.random()]);
  const city = []; { let x = 0; while (x < 1) { const w = 0.05 + Math.random() * 0.09; city.push([x, w, 0.16 + Math.random() * 0.24, Math.random()]); x += w; } }
  function skyPhase() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 7.5 && h < 17) return "day";
    if ((h >= 5.5 && h < 7.5) || (h >= 17 && h < 19.5)) return "dusk";
    return "night";
  }
  function drawWindow(t) {
    const { ctx: g, c, t: tex } = S.window || {};
    if (!g) return;
    const W = c.width, H = c.height, ph = skyPhase();
    const sky = g.createLinearGradient(0, 0, 0, H);
    const cols = ph === "day" ? ["#5fb2ff", "#b9e2ff"] : ph === "dusk" ? ["#2a3a7a", "#ff9a6b"] : ["#05081a", "#1a1d4a"];
    sky.addColorStop(0, cols[0]); sky.addColorStop(1, cols[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (ph === "night") {
      stars.forEach(([x, y, p]) => { g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + p * 9)); g.fillStyle = "#fff"; g.fillRect(x * W, y * H, 2, 2); });
      g.globalAlpha = 1;
      g.fillStyle = "#fff4d6"; g.beginPath(); g.arc(W * 0.72, H * 0.2, 30, 0, 7); g.fill();
      g.fillStyle = cols[0]; g.beginPath(); g.arc(W * 0.72 + 12, H * 0.2 - 6, 27, 0, 7); g.fill();
    } else {
      g.fillStyle = ph === "day" ? "#fff6c9" : "#ffd08a"; g.beginPath(); g.arc(W * 0.7, ph === "day" ? H * 0.2 : H * 0.62, 34, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 4; i++) { const x = ((t * 6 + i * 160) % (W + 200)) - 100, y = 60 + i * 50; g.beginPath(); g.ellipse(x, y, 56, 16, 0, 0, 7); g.ellipse(x + 30, y - 10, 36, 16, 0, 0, 7); g.fill(); }
    }
    city.forEach(([x, w, h, r]) => {
      g.fillStyle = ph === "day" ? "#5a6a86" : ph === "dusk" ? "#2a2440" : "#0b0d1c";
      g.fillRect(x * W, H * (1 - h), w * W - 3, h * H);
      if (ph !== "day") {
        for (let yy = H * (1 - h) + 8; yy < H - 6; yy += 14) for (let xx = x * W + 5; xx < (x + w) * W - 9; xx += 11) {
          if (Math.sin(xx * 12.9 + yy * 78.2 + r * 40) > 0.25) { g.fillStyle = "rgba(255,214,120,.85)"; g.fillRect(xx, yy, 5, 7); }
        }
      }
    });
    tex.needsUpdate = true;
  }

  /* ---------------- kowl ---------------- */
  const KS = 0.6;
  const anchor = new THREE.Group();
  scene.add(anchor);
  const kowl = kowlG.scene;
  anchor.add(kowl);
  anchor.scale.setScalar(KS);
  anchor.position.copy(seat);
  anchor.rotation.y = seatYaw;
  const U = {
    uRoot: { value: new THREE.Matrix4() }, uRootInv: { value: new THREE.Matrix4() },
    uShear: { value: new THREE.Vector2() }, uSq: { value: 0 }, uMelt: { value: 0 }, uPuddle: { value: 0.62 },
    uTime: { value: 0 }, uPokeP: { value: new THREE.Vector3(0, 0.7, 0.5) }, uPokeT: { value: -10 }, uWob: { value: 0 },
  };
  const seen = new Map(), kMeshes = [];
  kowl.traverse((o) => {
    if (!o.isMesh) return;
    kMeshes.push(o);
    o.frustumCulled = false;
    o.userData.kowl = true;
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
  // lights that only kowl really feels (the room is baked): ring-light key, neon rim, screen fill
  scene.add(new THREE.HemisphereLight("#b7a8ff", "#3a2216", 0.9));
  const key = new THREE.DirectionalLight("#fff4ea", 2.1); key.position.set(0.12, 1.25, 0.32); key.target.position.copy(seat); scene.add(key, key.target);
  const neon = new THREE.PointLight("#ff3c9a", 5, 5, 1.4); neon.position.set(-1.5, 1.75, -1.75); scene.add(neon);
  const scr = new THREE.PointLight("#62c8ff", 3.2, 3.5, 1.5); scr.position.set(1.25, 1.1, -1.5); scene.add(scr);
  const rim = new THREE.DirectionalLight("#ffb26b", 1.2); rim.position.set(-1, 2, -2.5); scene.add(rim);

  // a soft contact shadow that follows him
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: radialTex([[0, "rgba(10,4,12,.62)"], [0.55, "rgba(10,4,12,.25)"], [1, "rgba(10,4,12,0)"]]), transparent: true, depthWrite: false, toneMapped: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  // glows: neon halo (flickers), lava lamp, dust in the window light
  const glowMat = (col, op) => new THREE.SpriteMaterial({ map: radialTex([[0, col], [1, "rgba(0,0,0,0)"]]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op, toneMapped: false });
  const neonGlow = new THREE.Sprite(glowMat("rgba(255,60,160,.55)", 0.55)); neonGlow.position.set(-1.5, 1.8, -1.9); neonGlow.scale.set(1.5, 0.9, 1); scene.add(neonGlow);
  const lavaGlow = new THREE.Sprite(glowMat("rgba(255,120,30,.6)", 0.5)); lavaGlow.position.set(-1.8, 0.8, 0.5); lavaGlow.scale.set(0.45, 0.6, 1); scene.add(lavaGlow);
  const dustN = reduced ? 0 : mobile ? 40 : 90;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) { dustPos.set([-0.8 + Math.random() * 1.0, 0.2 + Math.random() * 1.8, -1.9 + Math.random() * 1.6], i * 3); dustSeed[i] = Math.random() * 10; }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.014, map: radialTex([[0, "rgba(255,240,220,1)"], [1, "rgba(255,240,220,0)"]], 32), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  if (dustN) scene.add(dust);

  /* ---------------- hover outline: mask + one screen pass ---------------- */
  const maskRT = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
  const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { tMask: { value: maskRT.texture }, texel: { value: new THREE.Vector2() }, uTime: { value: 0 }, uAmt: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D tMask; uniform vec2 texel; uniform float uTime; uniform float uAmt; varying vec2 vUv;
      void main(){
        float m = texture2D(tMask, vUv).r;
        float near = 0.0, far = 0.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 0.5236;
          vec2 d = vec2(cos(a), sin(a));
          near = max(near, texture2D(tMask, vUv + d * texel * 2.2).r);
          far += texture2D(tMask, vUv + d * texel * 6.0).r;
        }
        float edge = clamp(near - m, 0.0, 1.0);
        float glow = clamp(far / 12.0 - m, 0.0, 1.0);
        vec3 col = mix(vec3(1.0, 0.93, 0.72), vec3(1.0, 0.72, 0.45), 0.5 + 0.5 * sin(uTime * 4.0));
        float a = (edge * 0.95 + glow * 0.45 + m * 0.07) * uAmt;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), outlineMat);
  fsQuad.frustumCulled = false;
  const fsScene = new THREE.Scene(); fsScene.add(fsQuad);

  /* ---------------- sizing + camera rig ---------------- */
  let W = 1, H = 1, quality = 1, homeDist = 8;
  // portrait screens look down more steeply, so the diorama fills a tall frame (you swipe to see the sides)
  const homeDir = HOME_DIR.clone();
  const PORTRAIT_DIR = new THREE.Vector3(0.4925, 0.6428, 0.5868).normalize();
  const cam = {
    target: HOME_TARGET.clone(), dir: HOME_DIR.clone(), dist: 8,
    yaw: 0, pitch: 0, yawV: 0, pitchV: 0, zoom: 1, par: new THREE.Vector2(), parT: new THREE.Vector2(),
    fly: null, focus: null, shift: new THREE.Vector2(), shiftT: new THREE.Vector2(),
  };
  const tmpCam = new THREE.PerspectiveCamera();
  function fitHome() {
    // binary-search the distance at which the room box fits the viewport
    const portrait = H > W * 1.15;
    homeDir.copy(portrait ? PORTRAIT_DIR : HOME_DIR);
    const margin = portrait ? 0.98 : 0.9;
    const corners = [];
    for (const x of [ROOM.min.x, ROOM.max.x]) for (const y of [ROOM.min.y, ROOM.max.y]) for (const z of [ROOM.min.z, ROOM.max.z]) corners.push(new THREE.Vector3(x, y, z));
    tmpCam.fov = camera.fov; tmpCam.aspect = W / H; tmpCam.near = 0.05; tmpCam.far = 80; tmpCam.updateProjectionMatrix();
    let lo = 2, hi = 40;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      tmpCam.position.copy(HOME_TARGET).addScaledVector(homeDir, mid);
      tmpCam.lookAt(HOME_TARGET); tmpCam.updateMatrixWorld();
      let ok = true;
      for (const c of corners) {
        const p = c.clone().project(tmpCam);
        // portrait: the outer corners may crop (swipe to look around); keep the top clear for the HUD
        const lim = portrait ? 1.65 : margin;
        if (Math.abs(p.x) > lim || p.y > margin - (portrait ? 0.12 : 0.05) || p.y < -margin) { ok = false; break; }
      }
      if (ok) hi = mid; else lo = mid;
    }
    homeDist = hi;
    if (!cam.focus && !cam.fly) cam.dir.copy(homeDir);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * quality;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    maskRT.setSize(Math.round(W * dpr * 0.5), Math.round(H * dpr * 0.5));
    outlineMat.uniforms.texel.value.set(1 / (W * dpr * 0.5), 1 / (H * dpr * 0.5));
    fitHome();
    if (!cam.focus && !cam.fly) cam.dist = homeDist;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function viewFor(key) {
    const h = hot[key];
    const [d, k] = VIEWS[key] || [[0.5, 0.4, 1], 1.2];
    const dir = new THREE.Vector3(...d).normalize();
    const r = Math.max(h.size.x, h.size.y, h.size.z) * 0.5;
    const fit = (r / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * k * (W < H ? 1.5 : 1.0) + 0.25;
    return { target: h.center.clone(), dir, dist: Math.max(0.55, fit) };
  }
  function flyTo(key, ms = 1100) {
    if (!hot[key]) return;
    const v = viewFor(key);
    cam.fly = { t0: performance.now(), ms: reduced ? 1 : ms, from: { target: cam.target.clone(), dir: currentDir(), dist: cam.dist }, to: v };
    cam.focus = key;
  }
  function flyHome(ms = 1000) {
    cam.fly = { t0: performance.now(), ms: reduced ? 1 : ms, from: { target: cam.target.clone(), dir: currentDir(), dist: cam.dist }, to: { target: HOME_TARGET.clone(), dir: homeDir.clone(), dist: homeDist } };
    cam.focus = null;
  }
  function currentDir() {
    return cam.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), cam.yaw).normalize();
  }

  /* ---------------- kowl state + physics ---------------- */
  const st = {
    expr: "idle", ex: EXPRESSIONS.idle, lid: 0, lidT: 0, blinkAt: 2, blink: 0, talk: 0,
    shear: new THREE.Vector2(), shearV: new THREE.Vector2(), sq: 0, sqV: 0,
    melt: 0, meltT: -1, pokes: 0, look: new THREE.Vector3(2, 1.2, 2),
    mode: "seat", // seat | drag | fly | rest | hop | fall
    pos: seat.clone(), vel: new THREE.Vector3(), yaw: seatYaw, grabOff: new THREE.Vector3(), restT: 0, hop: null, dragPlane: new THREE.Plane(),
    lastDrag: [], exprT: 0, sleeping: false,
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
  setExpr("streamer");
  function exprFor(name, sec) {
    setExpr(name);
    clearTimeout(st.exprT);
    if (sec) st.exprT = setTimeout(() => { if (st.meltT < 0 && st.mode === "seat") setExpr(st.sleeping ? "sleep" : "streamer"); }, sec * 1000);
  }
  function groundAt(x, z, fromY) {
    // highest platform under (x, z) that kowl is above; the floor inside the room; nothing outside it
    let g = (x > ROOM.min.x && x < ROOM.max.x && z > ROOM.min.z && z < ROOM.max.z) ? 0 : -Infinity;
    for (const [x0, x1, z0, z1, top] of PLATFORMS) if (x > x0 && x < x1 && z > z0 && z < z1 && fromY >= top - 0.08) g = Math.max(g, top);
    return g;
  }
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
    if (melting) { st.meltT = 0; U.uPuddle.value = st.mode === "seat" ? 0.62 : 0.98; setExpr("melted"); }
    onPoke && onPoke(st.pokes, melting);
  }
  function startHopHome() {
    st.mode = "hop";
    st.hop = null;
    setExpr("dizzy");
  }
  function nextHop() {
    const to = new THREE.Vector3(), d = new THREE.Vector3(seat.x - st.pos.x, 0, seat.z - st.pos.z);
    const dist = d.length();
    const last = dist < 0.5;
    if (last) to.copy(seat);
    else { d.normalize().multiplyScalar(Math.min(0.42, dist - 0.3)); to.set(st.pos.x + d.x, 0, st.pos.z + d.z); to.y = Math.max(0, groundAt(to.x, to.z, 0)); }
    st.hop = { from: st.pos.clone(), to, t: 0, dur: last ? 0.5 : 0.34, h: last ? 0.42 : 0.22, last };
    st.yaw = Math.atan2(to.x - st.pos.x, to.z - st.pos.z) || st.yaw;
  }
  function respawn() {
    st.pos.set(seat.x, 4.2, seat.z);
    st.vel.set(0, -1, 0);
    st.mode = "fly";
    setExpr("flying");
    onKowl && onKowl("respawn");
  }

  /* ---------------- input ---------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, pointer = { x: 0, y: 0, in: false }, down = null, hoverDirty = false;
  function toNdc(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }
  function visibleChain(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
  function pick(x, y) {
    toNdc(x, y);
    ray.setFromCamera(ndc, camera);
    const k = ray.intersectObjects(kMeshes, false).find((h) => visibleChain(h.object));
    const r = ray.intersectObjects(hitList, false)[0];
    if (k && (!r || k.distance <= r.distance + 0.05)) return { key: "kowl", point: k.point };
    if (r) return { key: r.object.userData.hot, point: r.point };
    return null;
  }
  function setHover(key, x, y) {
    if (key === hovered) { onHover && onHover(key, x, y, true); return; }
    if (hovered && hot[hovered]) hot[hovered].mat.color.setScalar(1);
    hovered = key;
    if (key && hot[key]) hot[key].mat.color.setScalar(1.22);
    canvas.style.cursor = key === "kowl" ? "grab" : key ? "pointer" : "";
    onHover && onHover(key, x, y, false);
  }
  canvas.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.in = true;
    const r = canvas.getBoundingClientRect();
    cam.parT.set(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2);
    if (down) dragMove(e);
    else if (e.pointerType === "mouse") hoverDirty = true;
  }, { passive: true });
  canvas.addEventListener("pointerleave", () => { pointer.in = false; if (!down) setHover(null); cam.parT.set(0, 0); });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button && e.button !== 0) return;
    const p = pick(e.clientX, e.clientY);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), key: p && p.key, point: p && p.point, moved: false, yaw0: cam.yaw, pitch0: cam.pitch, id: e.pointerId, type: e.pointerType };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
    if (down.key === "kowl" && st.meltT < 0 && !cam.focus) {
      // grab: a vertical plane through kowl facing the camera
      const n = new THREE.Vector3().subVectors(camera.position, st.pos); n.y = 0; n.normalize();
      st.dragPlane.setFromNormalAndCoplanarPoint(n, p.point);
      st.grabOff.copy(st.pos).sub(p.point);
      down.grab = true;
    }
  });
  function dragMove(e) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > (down.type === "mouse" ? 5 : 10)) down.moved = true;
    if (!down.moved) return;
    if (down.grab) {
      if (st.mode !== "drag") { st.mode = "drag"; st.sleeping = false; setExpr("flying"); canvas.style.cursor = "grabbing"; onKowl && onKowl("grab"); }
      toNdc(e.clientX, e.clientY);
      ray.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(st.dragPlane, hit)) {
        hit.add(st.grabOff);
        hit.y = Math.max(hit.y, -0.1);
        st.dragTarget = hit;
        st.lastDrag.push([performance.now(), hit.clone()]);
        if (st.lastDrag.length > 6) st.lastDrag.shift();
      }
      return;
    }
    if (!cam.focus) {
      // drag on the room: look around (within limits)
      cam.yaw = clamp(down.yaw0 - (dx / W) * 1.6, -0.55, 0.55);
      cam.pitch = clamp(down.pitch0 + (dy / H) * 0.8, -0.18, 0.22);
    }
  }
  function endDown(e) {
    if (!down) return;
    const d = down; down = null;
    try { canvas.releasePointerCapture(d.id); } catch { /* fine */ }
    if (d.grab && st.mode === "drag") {
      // fling with the drag's recent velocity
      const L = st.lastDrag;
      if (L.length >= 2) {
        const [t0, p0] = L[0], [t1, p1] = L[L.length - 1];
        const dt = Math.max(0.016, (t1 - t0) / 1000);
        st.vel.subVectors(p1, p0).divideScalar(dt).clampLength(0, 9);
      }
      st.lastDrag = [];
      st.mode = "fly";
      canvas.style.cursor = "grab";
      onKowl && onKowl("throw", st.vel.length());
      return;
    }
    if (d.moved) return;
    if (d.key === "kowl") { poke(d.point); return; }
    if (d.key) { onPick && onPick(d.key, e.clientX, e.clientY, d.type); return; }
    onPick && onPick(null, e.clientX, e.clientY, d.type);
  }
  canvas.addEventListener("pointerup", endDown);
  canvas.addEventListener("pointercancel", (e) => { if (down && down.grab && st.mode === "drag") { st.mode = "fly"; st.vel.set(0, 0, 0); } down = null; });
  canvas.addEventListener("wheel", (e) => {
    if (cam.focus) return;
    cam.zoom = clamp(cam.zoom * (1 + Math.sign(e.deltaY) * 0.06), 0.62, 1.08);
  }, { passive: true });

  /* ---------------- loop ---------------- */
  let lastT = performance.now(), running = true, raf = 0, frames = 0, fpsT = 0, slow = 0, screenT = 0, chatT = 0, flickT = 3;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const lookPlane = new THREE.Plane();
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
  function physics(dt) {
    const R = 0.28; // kowl's body radius in the room
    if (st.mode === "drag" && st.dragTarget) {
      const prev = st.pos.clone();
      st.pos.lerp(st.dragTarget, 1 - Math.exp(-22 * dt));
      const v = tmp2.subVectors(st.pos, prev).divideScalar(Math.max(dt, 1e-3));
      st.shearV.x += clamp(-v.x, -4, 4) * 0.06; st.shearV.y += clamp(-v.z, -4, 4) * 0.06;
      st.sqV += clamp(v.y, -4, 4) * -0.05;
      st.yaw = damp(st.yaw, Math.atan2(camera.position.x - st.pos.x, camera.position.z - st.pos.z), 6, dt);
    } else if (st.mode === "fly") {
      st.vel.y -= 9.8 * dt;
      st.vel.multiplyScalar(Math.exp(-0.25 * dt));
      st.pos.addScaledVector(st.vel, dt);
      // walls (the back and left walls are solid; the open sides are a cliff)
      if (st.pos.x < -2 + R && st.pos.y < 2.7) { st.pos.x = -2 + R; st.vel.x = Math.abs(st.vel.x) * 0.5; bump(Math.abs(st.vel.x)); }
      if (st.pos.z < -2 + R && st.pos.y < 2.7) { st.pos.z = -2 + R; st.vel.z = Math.abs(st.vel.z) * 0.5; bump(Math.abs(st.vel.z)); }
      const g = groundAt(st.pos.x, st.pos.z, st.pos.y - st.vel.y * dt);
      if (st.pos.y <= g && st.vel.y < 0) {
        st.pos.y = g;
        const impact = -st.vel.y;
        if (impact > 1.2) {
          st.vel.y = impact * 0.42; st.vel.x *= 0.7; st.vel.z *= 0.7;
          st.sqV += Math.min(5, impact * 0.9); U.uPokeT.value = U.uTime.value; U.uPokeP.value.set(0, 0.1, 0); U.uWob.value = Math.min(1.2, impact * 0.25);
          onKowl && onKowl("land", impact);
        } else {
          st.vel.set(0, 0, 0);
          st.mode = "rest"; st.restT = 0;
          setExpr("dizzy");
        }
      }
      if (st.pos.y < -4) respawn();
      st.shearV.x += -st.vel.x * 0.02 * dt * 60 * 0.1; st.shearV.y += -st.vel.z * 0.02 * dt * 60 * 0.1;
    } else if (st.mode === "rest") {
      st.restT += dt;
      if (st.restT > 1.1) startHopHome();
    } else if (st.mode === "hop") {
      if (!st.hop) nextHop();
      const h = st.hop;
      h.t += dt / h.dur;
      const k = Math.min(1, h.t);
      st.pos.lerpVectors(h.from, h.to, k);
      st.pos.y += Math.sin(k * Math.PI) * h.h;
      if (k >= 1) {
        st.sqV += 1.4;
        onKowl && onKowl("hop");
        if (h.last) { st.mode = "seat"; st.pos.copy(seat); st.yaw = seatYaw; st.hop = null; exprFor("gm", 2.2); onKowl && onKowl("home"); }
        else st.hop = null;
      }
    } else if (st.mode === "seat") {
      st.pos.lerp(seat, 1 - Math.exp(-8 * dt));
      st.yaw = damp(st.yaw, seatYaw + clamp((st.look.x - seat.x) * 0.06, -0.25, 0.25), 3, dt);
    }
    function bump(v) { if (v > 0.8) { st.sqV += 1.2; onKowl && onKowl("bump", v); } }
  }
  function frame() {
    raf = 0;
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - lastT) / 1000, 1 / 20);
    lastT = now;
    const t = (U.uTime.value += dt);

    // hover pick, at most once a frame
    if (hoverDirty && !down) {
      hoverDirty = false;
      const p = pointer.in ? pick(pointer.x, pointer.y) : null;
      setHover(p ? p.key : null, pointer.x, pointer.y);
    }

    physics(dt);
    // jelly springs
    const K = 70, C = reduced ? 14 : 5.5;
    st.shearV.x += (-K * st.shear.x - C * st.shearV.x) * dt;
    st.shearV.y += (-K * st.shear.y - C * st.shearV.y) * dt;
    st.shear.addScaledVector(st.shearV, dt);
    st.sqV += (-90 * st.sq - (reduced ? 16 : 7) * st.sqV) * dt;
    st.sq += st.sqV * dt;
    const idle = reduced ? 0.003 : 0.012;
    U.uShear.value.set(clamp(st.shear.x, -0.4, 0.4) + Math.sin(t * 1.3) * idle * 1.5, clamp(st.shear.y, -0.35, 0.35));
    U.uSq.value = clamp(st.sq, -0.4, 0.5) + Math.sin(t * 2.2) * idle;
    // melt: 1.3s down, 4s puddle, 2.2s slowly back up, then a boing
    if (st.meltT >= 0) {
      st.meltT += dt;
      const m = st.meltT;
      let v;
      if (m < 1.3) v = 1 - Math.pow(1 - m / 1.3, 3);
      else if (m < 5.3) v = 1 + Math.sin(m * 5) * 0.015;
      else if (m < 7.5) v = 1 - ease((m - 5.3) / 2.2);
      else { v = 0; st.meltT = -1; st.sqV -= 3.2; exprFor("gm", 2); onKowl && onKowl("reformed"); }
      U.uMelt.value = clamp(v, 0, 1.02);
    }
    // blink
    st.blinkAt -= dt;
    if (st.blinkAt <= 0) { st.blink = 0.16; st.blinkAt = 2 + Math.random() * 4; }
    if (st.blink > 0) st.blink -= dt;
    st.lid = damp(st.lid, st.blink > 0 ? 1 : st.lidT, st.blink > 0 ? 40 : 10, dt);
    const lidRot = (l) => -2.1 + l * (2.1 + Math.PI / 2);
    if (parts.lidB) parts.lidB.rotation.x = lidRot(st.lid);
    if (parts.lidA) parts.lidA.rotation.x = lidRot(st.blink > 0 ? st.lid : st.lid * 0.35);
    // eyes: follow the pointer (a plane between kowl and the camera), else drift to the camera
    if (pointer.in) {
      toNdc(pointer.x, pointer.y);
      ray.setFromCamera(ndc, camera);
      const n = tmp.subVectors(camera.position, st.pos).normalize();
      lookPlane.setFromNormalAndCoplanarPoint(n, tmp2.copy(st.pos).addScaledVector(n, 1.0));
      ray.ray.intersectPlane(lookPlane, st.look);
    } else {
      st.look.lerp(camera.position, 1 - Math.exp(-2 * dt));
    }
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

    anchor.position.copy(st.pos);
    anchor.rotation.y = st.yaw + (st.mode === "seat" && !reduced ? Math.sin(t * 0.7) * 0.06 : 0); // he swivels on his chair
    if (st.mode === "fly" && !reduced) anchor.rotation.y += dt * 0; // keep facing; the jelly does the drama
    const g = groundAt(st.pos.x, st.pos.z, st.pos.y + 0.01);
    shadow.visible = Number.isFinite(g);
    if (shadow.visible) {
      const hgt = Math.max(0, st.pos.y - g);
      const sc = (0.75 + U.uMelt.value * 0.5) * (1 + hgt * 0.5);
      shadow.position.set(st.pos.x, g + 0.006, st.pos.z);
      shadow.scale.set(sc, sc, 1);
      shadow.material.opacity = clamp(1 - hgt * 0.5, 0.15, 1);
    }

    // ambience
    flickT -= dt;
    let neonK = 1;
    if (!reduced && flickT < 0) { neonK = Math.random() > 0.5 ? 0.35 : 0.8; if (flickT < -0.12) flickT = 2 + Math.random() * 7; }
    if (hot.neon && hovered !== "neon") hot.neon.mat.color.setScalar(neonK);
    neonGlow.material.opacity = 0.55 * neonK + Math.sin(t * 2) * 0.03;
    neon.intensity = 5 * neonK;
    lavaGlow.material.opacity = 0.45 + Math.sin(t * 0.9) * 0.12;
    if (dustN) {
      const a = dustGeo.attributes.position.array;
      for (let i = 0; i < dustN; i++) { a[i * 3 + 1] += Math.sin(t * 0.4 + dustSeed[i]) * 0.0006 + 0.0004; a[i * 3] += Math.cos(t * 0.3 + dustSeed[i] * 2) * 0.0005; if (a[i * 3 + 1] > 2.1) a[i * 3 + 1] = 0.15; }
      dustGeo.attributes.position.needsUpdate = true;
    }
    screenT -= dt;
    if (screenT <= 0) {
      screenT = 0.12;
      drawLaptop(t); drawMon1(t);
      if (Math.floor(t * 8) % 4 === 0) { drawPhone(); drawTV(t); }
      if (Math.floor(t * 8) % 16 === 0) drawWindow(t);
    }
    chatT -= dt;
    if (chatT <= 0) { chatT = 1.6 + Math.random() * 2.4; data.chat.push(CHAT[chatI++ % CHAT.length]); if (data.chat.length > 9) data.chat.shift(); drawMon2(); }
    if (data.tvImgs.length && t - data.tvSwitch > 6) { data.tvSwitch = t; data.tvIdx++; }

    // camera: home orbit + parallax, or a flight to a hotspot
    cam.par.x = damp(cam.par.x, cam.parT.x, 2.5, dt); cam.par.y = damp(cam.par.y, cam.parT.y, 2.5, dt);
    cam.shift.x = damp(cam.shift.x, cam.shiftT.x, 6, dt); cam.shift.y = damp(cam.shift.y, cam.shiftT.y, 6, dt);
    let target, dir, dist;
    if (cam.fly) {
      const k = Math.min(1, (now - cam.fly.t0) / cam.fly.ms), e = ease(k);
      target = tmp.lerpVectors(cam.fly.from.target, cam.fly.to.target, e).clone();
      dir = cam.fly.from.dir.clone().lerp(cam.fly.to.dir, e).normalize();
      dist = cam.fly.from.dist + (cam.fly.to.dist - cam.fly.from.dist) * e;
      // arc a little so it feels like a camera move, not a zoom
      dist *= 1 + Math.sin(e * Math.PI) * 0.12;
      if (k >= 1) {
        cam.target.copy(cam.fly.to.target); cam.dir.copy(cam.fly.to.dir); cam.dist = cam.fly.to.dist;
        if (!cam.focus) { cam.yaw = 0; cam.pitch = 0; cam.dir.copy(homeDir); }
        else { cam.yaw = 0; cam.pitch = 0; }
        cam.fly = null;
      }
    } else {
      if (!cam.focus) { cam.dist = damp(cam.dist, homeDist * cam.zoom, 6, dt); }
      target = cam.target.clone();
      dir = currentDir();
      dist = cam.dist;
    }
    const pY = cam.focus ? 0.03 : 0.06, pX = cam.focus ? 0.04 : 0.09;
    const yawP = reduced ? 0 : -cam.par.x * pX, pitchP = reduced ? 0 : cam.par.y * pY * 0.6;
    const d2 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yawP);
    const side = new THREE.Vector3().crossVectors(d2, new THREE.Vector3(0, 1, 0)).normalize();
    d2.applyAxisAngle(side, (cam.fly ? 0 : cam.pitch) + pitchP).normalize();
    camera.position.copy(target).addScaledVector(d2, dist);
    camera.lookAt(target);
    if (Math.abs(cam.shift.x) > 0.5 || Math.abs(cam.shift.y) > 0.5) camera.setViewOffset(W, H, cam.shift.x, cam.shift.y, W, H);
    else camera.clearViewOffset();

    anchor.updateMatrixWorld(true);
    U.uRoot.value.copy(anchor.matrixWorld);
    U.uRootInv.value.copy(anchor.matrixWorld).invert();
    renderer.setRenderTarget(null);
    renderer.autoClear = true;
    renderer.render(scene, camera);

    // outline the hovered thing
    const amt = outlineMat.uniforms.uAmt;
    amt.value = damp(amt.value, hovered && hot[hovered] && !cam.fly ? 1 : 0, 14, dt);
    if (amt.value > 0.02 && outlineKey()) {
      const h = hot[outlineKey()];
      const prevBg = scene.background, prevEnv = scene.environment;
      h.meshes.forEach((m) => m.layers.enable(1));
      camera.layers.set(1);
      scene.overrideMaterial = maskMat;
      renderer.setRenderTarget(maskRT);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
      camera.layers.set(0);
      h.meshes.forEach((m) => m.layers.disable(1));
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      scene.background = prevBg; scene.environment = prevEnv;
      outlineMat.uniforms.uTime.value = t;
      renderer.autoClear = false;
      renderer.render(fsScene, fsCam);
      renderer.autoClear = true;
    }

    // adapt resolution if the device struggles
    frames++; fpsT += dt;
    if (fpsT > 2) {
      const fps = frames / fpsT;
      if (fps < 42 && quality > 0.55) { if (++slow >= 2) { quality = Math.max(0.55, quality - 0.15); resize(); slow = 0; } }
      else slow = 0;
      opts.onFps && opts.onFps(fps, quality);
      frames = 0; fpsT = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  let lastOutline = null;
  function outlineKey() { if (hovered && hot[hovered]) lastOutline = hovered; return lastOutline; }

  resize();
  drawWindow(0); drawMon2(); drawLaptop(0); drawMon1(0); drawPhone(); drawTV(0);
  renderer.compile(scene, camera);
  frame();
  onReady && onReady();

  const project = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z]; };
  return {
    hot: Object.keys(hot),
    flyTo, flyHome,
    setShift(x, y) { cam.shiftT.set(x, y); },
    hover(key) { setHover(key, 0, 0); },
    labelAt(key) {
      if (key === "kowl") { tmp.copy(st.pos); tmp.y += 0.78 * (1 - U.uMelt.value * 0.7); return project(tmp); }
      const h = hot[key]; if (!h) return null;
      tmp.set(h.center.x, h.box.max.y, h.center.z);
      return project(tmp);
    },
    rectOf(key) {
      const h = hot[key]; if (!h) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const x of [h.box.min.x, h.box.max.x]) for (const y of [h.box.min.y, h.box.max.y]) for (const z of [h.box.min.z, h.box.max.z]) {
        const [px, py] = project(tmp.set(x, y, z)); x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },
    projectHead() { tmp.copy(st.pos); tmp.y += 0.8 * (1 - U.uMelt.value * 0.75); return project(tmp); },
    setExpression: exprFor,
    talk(sec) { st.talk = Math.min(4, sec); },
    poke() { poke(null); },
    sleep(on) { st.sleeping = on; if (st.mode === "seat" && st.meltT < 0) setExpr(on ? "sleep" : "streamer"); },
    kowlMode: () => st.mode,
    get pokes() { return st.pokes; },
    set pokes(v) { st.pokes = v; },
    setStats(s) { data.stats = s; },
    setMission(m, img) { data.mission = m; if (img) data.missionImg = img; drawPhone(); },
    setCountdown(s) { data.countdown = s; },
    setTV(imgs) { data.tvImgs = imgs; },
    pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); },
    quality: () => quality,
  };
}
