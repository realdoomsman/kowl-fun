/* =====================================================================
   KOWL TV studio: the real-time 3D kowl at the ring-lit desk.
   loaded lazily by tv.js (dynamic import) only when WebGL works.
   model: models/kowl.glb (Blender -> work/kowl_glb.py -> gltfpack meshopt).
   the jelly, the poke ripple and the melt all happen in one vertex-shader
   patch shared by every kowl material, in the kowl's own (anchor) space.
   ===================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.min.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.min.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.min.js";

const PEACH = "#F2B39A", BLUE = "#1D9BF0", GOLD = "#F5A30F", RED = "#F4212E", GREEN = "#00BA7C";

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

/* ---------------- canvas textures for the set ---------------- */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const api = { c, ctx, tex, draw: (...a) => { draw(ctx, w, h, ...a); tex.needsUpdate = true; } };
  api.draw();
  return api;
}
const DISP = '"Archivo Black", Impact, sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';

function drawDesk(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#151a22"); g.addColorStop(1, "#090b10");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // stripes
  ctx.fillStyle = "rgba(29,155,240,.10)";
  for (let x = -h; x < w; x += 46) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 22, h); ctx.lineTo(x + 22 + h, 0); ctx.lineTo(x + h, 0); ctx.fill(); }
  ctx.fillStyle = BLUE; ctx.fillRect(0, 0, w, 10);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `120px ${DISP}`; ctx.fillStyle = "#fff";
  ctx.fillText("KOWL TV", w / 2, h * 0.47);
  ctx.font = `34px ${DISP}`; ctx.fillStyle = PEACH;
  ctx.fillText("EVERY KOL IS A KOWL", w / 2, h * 0.8);
  // live dot
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(w / 2 - 300, h * 0.47, 18, 0, 7); ctx.fill();
}
function drawMug(ctx, w, h) {
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0F1419"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `64px ${DISP}`; ctx.fillText("#1 KOL", w * 0.25, h * 0.45);
  ctx.font = `26px ${DISP}`; ctx.fillStyle = BLUE; ctx.fillText("(not paid btw)", w * 0.25, h * 0.75);
  ctx.font = `64px ${DISP}`; ctx.fillStyle = "#0F1419"; ctx.fillText("#1 KOL", w * 0.75, h * 0.45);
}

// the video wall: a chart that only goes one way, a live "who paid you?" board, the payday clock
function makeScreens(getInfo) {
  const pts = [];
  let price = 1;
  for (let i = 0; i < 70; i++) { price *= 1 + (Math.random() - 0.53) * 0.08; pts.push(price); }
  const chart = canvasTex(512, 288, (ctx, w, h) => {
    ctx.fillStyle = "#0b0f16"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    for (let y = 40; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const mx = Math.max(...pts), mn = Math.min(...pts);
    const bw = w / pts.length;
    for (let i = 1; i < pts.length; i++) {
      const o = pts[i - 1], c = pts[i];
      const y0 = 50 + (1 - (o - mn) / (mx - mn + 1e-9)) * (h - 80), y1 = 50 + (1 - (c - mn) / (mx - mn + 1e-9)) * (h - 80);
      ctx.fillStyle = c >= o ? GREEN : RED;
      ctx.fillRect(i * bw + 1, Math.min(y0, y1), bw - 2, Math.max(2, Math.abs(y1 - y0)));
    }
    ctx.fillStyle = "#fff"; ctx.font = `22px ${DISP}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("$GOO / SOL", 16, 12);
    const pct = ((pts[pts.length - 1] / pts[0] - 1) * 100).toFixed(1);
    ctx.fillStyle = pct >= 0 ? GREEN : RED; ctx.textAlign = "right";
    ctx.fillText(`${pct >= 0 ? "+" : ""}${pct}%`, w - 16, 12);
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = `13px ${MONO}`; ctx.textAlign = "left";
    ctx.fillText("fictional coin · kowl called it 4 min ago", 16, h - 22);
  });
  const SLIDES = [
    (ctx, w, h) => { bigText(ctx, w, h, "WHO PAID", "YOU?", BLUE); },
    (ctx, w, h) => { bigText(ctx, w, h, "EVERY KOL", "IS A KOWL.", PEACH); },
    (ctx, w, h, info) => {
      ctx.fillStyle = "#06121d"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = GOLD; ctx.font = `24px ${DISP}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("NEXT KOWL PAYDAY", w / 2, h * 0.24);
      ctx.fillStyle = "#fff"; ctx.font = `92px ${DISP}`;
      ctx.fillText(info.payday || "SOON", w / 2, h * 0.55);
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = `17px ${MONO}`;
      ctx.fillText(info.sub || "100% of creator fees · every 15 min", w / 2, h * 0.84);
    },
    (ctx, w, h) => { bigText(ctx, w, h, "NOT PAID BTW", "(PAID)", RED); },
  ];
  function bigText(ctx, w, h, a, b, col) {
    ctx.fillStyle = "#070a10"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = col; ctx.fillRect(0, h - 16, w, 16);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
    ctx.font = `60px ${DISP}`; ctx.fillText(a, w / 2, h * 0.36);
    ctx.fillStyle = col; ctx.font = `76px ${DISP}`; ctx.fillText(b, w / 2, h * 0.66);
  }
  let slide = 0;
  const center = canvasTex(512, 288, (ctx, w, h) => SLIDES[slide](ctx, w, h, getInfo()));
  const CHAT = ["who paid you?", "🫠🫠🫠", "is this the one?", "$KOWL did. it's on-chain.", "nfa", "kowl blink twice if paid", "gm", "dyor (kowl didn't)", "who paid you?", "put 🫠 in your name", "kowl123 lmao", "the reply has more likes"];
  const NAMES = ["@notkowl", "@kowl_eth", "@alphakowl", "@0xkowl", "@kowlresearch", "@kowlcalls"];
  const lines = [];
  const chat = canvasTex(512, 288, (ctx, w, h) => {
    ctx.fillStyle = "#0b0f16"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = RED; ctx.fillRect(14, 14, 62, 24);
    ctx.fillStyle = "#fff"; ctx.font = `14px ${DISP}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("LIVE", 24, 27);
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `14px ${MONO}`;
    ctx.fillText(`${getInfo().watching || "1,204,331"} watching (840k bots)`, 88, 27);
    ctx.font = `17px ${MONO}`;
    lines.forEach((l, i) => {
      const y = 70 + i * 30;
      ctx.fillStyle = BLUE; ctx.fillText(l[0], 16, y);
      ctx.fillStyle = "#fff"; ctx.fillText(l[1], 16 + ctx.measureText(l[0] + " ").width, y);
    });
  });
  let tChart = 0, tSlide = 0, tChat = 0;
  return {
    chart, center, chat,
    update(dt) {
      tChart += dt; tSlide += dt; tChat += dt;
      if (tChart > 0.35) {
        tChart = 0;
        const last = pts[pts.length - 1];
        const pump = Math.random() < 0.06;
        pts.push(last * (pump ? 1.18 : 1 + (Math.random() - 0.56) * 0.07));
        pts.shift();
        chart.draw();
      }
      if (tSlide > 5) { tSlide = 0; slide = (slide + 1) % SLIDES.length; center.draw(); }
      else if (slide === 2) center.draw();
      if (tChat > 0.9) {
        tChat = 0;
        lines.push([NAMES[(Math.random() * NAMES.length) | 0], CHAT[(Math.random() * CHAT.length) | 0]]);
        if (lines.length > 7) lines.shift();
        chat.draw();
      }
    },
  };
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
  // poke ripple: a jelly wave running out from the poke point
  float age = uTime - uPokeT;
  if (age > 0.0 && age < 2.5) {
    float d = distance(p, uPokeP);
    vec3 n = normalize(vec3(p.x, (p.y - 0.55) * 0.7, p.z) + 1e-4);
    p += n * uWob * 0.055 * sin(d * 19.0 - age * 24.0) * exp(-d * 2.2) * exp(-age * 2.6);
  }
  // squash and stretch, volume-ish preserving
  p.y *= 1.0 - uSq;
  p.xz *= 1.0 + uSq * 0.55;
  // jelly lean: the top lags behind the base
  p.xz += uShear * h * h;
  // melt: sag, spread at the base, drip
  if (uMelt > 0.001) {
    float t = clamp(h / 1.2, 0.0, 1.0);
    float sag = 1.0 - uMelt * (0.7 + 0.08 * sin(p.x * 9.0 + p.z * 7.0));
    p.y = p.y * sag;
    p.xz *= 1.0 + uMelt * 0.8 * pow(1.0 - t * 0.85, 2.0);
    p.y -= uMelt * 0.05 * max(0.0, sin(p.x * 13.0) * sin(p.z * 11.0 + 1.3)) * (1.0 - t);
    p.y = max(p.y, 0.004);
    p.z = min(p.z, 0.62 + 0.04 * sin(p.x * 17.0)); // the puddle stops at the desk edge, lumpy
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
${skin ? "diffuseColor.rgb *= mix(vec3(0.82, 0.62, 0.6), vec3(1.0), smoothstep(-0.02, 0.4, vKH));" : ""}`);
  };
  material.customProgramCacheKey = () => "kowl" + (skin ? "s" : "");
  material.needsUpdate = true;
}

/* ---------------- main ---------------- */
export async function start(opts) {
  const { canvas, model, reduced, onPoke, onMelt, onHover, onReady, getInfo } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07090d");
  scene.fog = new THREE.Fog("#07090d", 6, 14);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);

  // lights: warm key, ring light near the lens, cool rim
  scene.add(new THREE.HemisphereLight("#cfe6ff", "#1a0f0a", 0.55));
  const key = new THREE.DirectionalLight("#fff1e2", 2.2); key.position.set(-2.5, 3.2, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(BLUE, 2.4); rim.position.set(2.6, 2.2, -2.5); scene.add(rim);
  const ringL = new THREE.PointLight("#ffe9dc", 6, 7, 1.6); ringL.position.set(0.3, 1.1, 2.6); scene.add(ringL);

  /* --- the set --- */
  const set = new THREE.Group();
  scene.add(set);
  const floorMat = new THREE.MeshStandardMaterial({ color: "#0b0e14", roughness: 0.35, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.92; set.add(floor);

  // desk: kowl sits ON it, like a paperweight with a blue check
  const deskTex = canvasTex(1024, 300, drawDesk);
  const deskMats = [
    new THREE.MeshStandardMaterial({ color: "#10141b", roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: "#10141b", roughness: 0.5 }),
    new THREE.MeshPhysicalMaterial({ color: "#151a22", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    new THREE.MeshStandardMaterial({ color: "#10141b" }),
    new THREE.MeshStandardMaterial({ map: deskTex.tex, roughness: 0.4, emissive: "#ffffff", emissiveMap: deskTex.tex, emissiveIntensity: 0.35 }),
    new THREE.MeshStandardMaterial({ color: "#10141b" }),
  ];
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.3), deskMats);
  desk.position.set(0, -0.45, 0.05); set.add(desk);
  const led = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: BLUE }));
  led.position.set(0, -0.012, 0.71); set.add(led);

  // halo ring light behind kowl
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.05, 20, 96), new THREE.MeshBasicMaterial({ color: "#fff4ea" }));
  ring.position.set(0, 0.78, -1.15); set.add(ring);
  const ringGlowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 70, 128, 128, 128);
    g.addColorStop(0, "rgba(255,220,200,0)"); g.addColorStop(0.62, "rgba(255,210,190,.55)"); g.addColorStop(0.7, "rgba(255,200,180,.18)"); g.addColorStop(1, "rgba(255,200,180,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const ringGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), new THREE.MeshBasicMaterial({ map: ringGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ringGlow.position.set(0, 0.78, -1.2); set.add(ringGlow);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 10), new THREE.MeshStandardMaterial({ color: "#20252e", metalness: 0.7, roughness: 0.3 }));
  stand.position.set(0, -0.3, -1.15); set.add(stand);

  // video wall
  const screens = makeScreens(getInfo || (() => ({})));
  const scrMat = (t) => new THREE.MeshBasicMaterial({ map: t.tex, toneMapped: false });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#05070a", roughness: 0.6 });
  const wall = [
    [screens.chart, -3.3, 1.15, -2.9, 0.42],
    [screens.center, 0, 1.75, -3.4, 0],
    [screens.chat, 3.3, 1.15, -2.9, -0.42],
  ];
  wall.forEach(([t, x, y, z, ry]) => {
    const g = new THREE.Group();
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.96, 1.72, 0.06), frameMat);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.575), scrMat(t));
    s.position.z = 0.035;
    g.add(f, s); g.position.set(x, y, z); g.rotation.y = ry; set.add(g);
  });
  // bokeh dots far back
  const bokeh = new THREE.Group();
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  for (let i = 0; i < 26; i++) {
    const m = new THREE.SpriteMaterial({ map: dotTex, color: [BLUE, PEACH, GOLD, "#ffffff"][i % 4], transparent: true, opacity: 0.18 + Math.random() * 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m);
    const s = 0.15 + Math.random() * 0.5;
    sp.scale.set(s, s, 1);
    sp.position.set((Math.random() - 0.5) * 12, -0.4 + Math.random() * 4, -4.5 - Math.random() * 3);
    sp.userData.ph = Math.random() * 6;
    bokeh.add(sp);
  }
  set.add(bokeh);

  // desk props: mic, mug, papers
  const metal = new THREE.MeshStandardMaterial({ color: "#2a2f38", metalness: 0.8, roughness: 0.3 });
  const mic = new THREE.Group();
  const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.03, 24), metal);
  const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), metal);
  micArm.position.y = 0.2; micArm.rotation.z = 0.25;
  const micHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 6, 14), new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.6, metalness: 0.4 }));
  micHead.position.set(-0.06, 0.43, 0); micHead.rotation.z = 0.25;
  mic.add(micBase, micArm, micHead); mic.position.set(-0.95, 0.015, 0.35); mic.rotation.y = 0.5; set.add(mic);
  const mugTex = canvasTex(512, 160, drawMug);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.22, 28, 1, true), new THREE.MeshStandardMaterial({ map: mugTex.tex, roughness: 0.3, side: THREE.DoubleSide }));
  mug.position.set(1.0, 0.11, 0.3); mug.rotation.y = -0.6; set.add(mug);
  const mugIn = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), new THREE.MeshStandardMaterial({ color: "#2b160b", roughness: 0.2 }));
  mugIn.rotation.x = -Math.PI / 2; mugIn.position.set(1.0, 0.19, 0.3); set.add(mugIn);
  const paper = new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.006, 0.56), paper);
    p.position.set(0.62 + i * 0.01, 0.004 + i * 0.006, 0.42); p.rotation.y = 0.3 + i * 0.09; set.add(p);
  }

  // soft contact shadow under kowl
  const shTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,.75)"); g.addColorStop(0.6, "rgba(0,0,0,.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.003, 0); set.add(shadow);

  /* --- kowl --- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(model);
  const anchor = new THREE.Group();          // deformation space (base on the desk)
  scene.add(anchor);
  const kowl = gltf.scene;
  kowl.rotation.y = -0.18;
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
    o.frustumCulled = false; // vertex shader moves things outside their bounds
    let m = o.material;
    if (seen.has(m)) { o.material = seen.get(m); return; }
    const name = m.name || "";
    let out = m;
    if (/skin/.test(name)) {
      out = new THREE.MeshPhysicalMaterial({ color: PEACH, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color("#ffd2bd"), sheenRoughness: 0.5, side: THREE.DoubleSide });
      patchKowl(out, U, true);
    } else {
      out = m.clone();
      if (/glint/.test(name)) out = new THREE.MeshBasicMaterial({ color: "#ffffff" });
      // the open mouth has to read as a hole, not a nose
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
  const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn("kowl3d: missing parts", missing);

  /* --- expression state --- */
  const st = {
    expr: "idle", ex: EXPRESSIONS.idle, lid: 0, lidT: 0, blinkAt: 2, blink: 0, talk: 0,
    shear: new THREE.Vector2(), shearV: new THREE.Vector2(), sq: 0, sqV: 0,
    melt: 0, meltT: -1, pokes: 0, look: new THREE.Vector3(0, 0.8, 3), hover: false,
    pointer: new THREE.Vector2(0, 0), pointerIn: false, lastPX: 0, lastPY: 0, lastPT: 0,
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

  /* --- camera rigs --- */
  const cam = { pos: new THREE.Vector3(0, 1.05, 4.4), tgt: new THREE.Vector3(0, 0.6, 0), fov: 32 };
  const want = { pos: cam.pos.clone(), tgt: cam.tgt.clone(), fov: 32 };
  let mode = "hero", heroP = 0, channel = 1, aspect = 1;
  const CH_CAM = {
    // pip framings per channel: [pos, target, fov]
    2: [[-0.9, 0.95, 2.6], [0.05, 0.62, 0], 30], // exposé: interrogation angle
    3: [[0.7, 1.4, 2.7], [0, 0.6, 0], 30],       // lore: high angle
    4: [[0.2, 0.35, 2.5], [0, 0.66, 0], 32],     // payroll: low hero angle, rich
    5: [[0, 0.85, 2.5], [0, 0.62, 0], 31],
    6: [[-0.5, 0.75, 2.5], [0, 0.6, 0], 31],
    7: [[0.9, 0.8, 2.4], [0, 0.62, 0], 31],
    8: [[0, 0.8, 2.3], [0, 0.66, 0], 30],
    9: [[-0.6, 1.0, 2.5], [0, 0.6, 0], 31],
    10: [[0, 1.2, 3.2], [0, 0.5, 0], 34],
  };
  const LIGHT = {
    1: ["#ffe9dc", BLUE], 2: ["#ffd6d6", "#F4212E"], 3: ["#fff0d8", GOLD], 4: ["#e9f5ff", GOLD], 5: ["#ffe9dc", BLUE],
    6: ["#fff", "#F91880"], 7: ["#e6f0ff", BLUE], 8: ["#ffe9dc", PEACH], 9: ["#f0ffe9", GREEN], 10: ["#ffe9dc", BLUE],
  };
  function heroCam() {
    const portrait = aspect < 0.9;
    const p = reduced ? 0 : heroP;
    if (portrait) {
      want.pos.set(0.15 - p * 0.1, 1.45 - p * 0.45, 6.4 - p * 2.4);
      want.tgt.set(0.12, 0.45 + p * 0.15, 0);
      want.fov = 38;
    } else {
      // kowl sits right of the headline on desktop; centred when the headline stacks under the stage
      const wide = window.innerWidth <= 860 ? 0 : aspect > 1.5 ? -1.25 : -0.8;
      want.pos.set(wide * 0.3 + p * 0.6, 1.55 - p * 0.55, 5.6 - p * 2.6);
      want.tgt.set(wide + p * 0.75, 0.5 + p * 0.12, 0);
      want.fov = 32;
    }
  }
  function pipCam() {
    const c = CH_CAM[channel] || [[0, 0.85, 2.5], [0, 0.62, 0], 31];
    want.pos.set(...c[0]); want.tgt.set(...c[1]); want.fov = c[2];
  }
  function applyChannelLight() {
    const l = LIGHT[channel] || LIGHT[1];
    ringL.color.set(l[0]); rim.color.set(l[1]);
  }

  /* --- sizing --- */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    const cap = mode === "pip" ? 2 : Math.min(window.devicePixelRatio || 1, W * H > 1.4e6 ? 1.5 : 1.75);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap) * quality);
    renderer.setSize(W, H, false);
    aspect = W / H;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (mode === "hero") heroCam(); else pipCam();
  }
  let quality = 1;
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  /* --- input: eyes follow the cursor anywhere on the page; pokes are raycast --- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6);
  function toNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    return r;
  }
  function onMove(e) {
    toNdc(e);
    // clamp so eyes don't spin when the cursor is far away on the page
    ndc.x = clamp(ndc.x, -3, 3); ndc.y = clamp(ndc.y, -3, 3);
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(planeZ, hit)) st.look.copy(hit);
    // pointer speed shakes the jelly a little when it moves over kowl's screen
    const now = performance.now();
    const inside = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
    if (inside && st.lastPT && !reduced) {
      const dtm = Math.max(8, now - st.lastPT);
      const vx = (e.clientX - st.lastPX) / dtm;
      st.shearV.x += clamp(vx, -3, 3) * 0.05;
    }
    st.lastPX = e.clientX; st.lastPY = e.clientY; st.lastPT = now;
    if (inside && e.pointerType === "mouse") {
      const hov = hitKowl();
      if (hov !== st.hover) { st.hover = hov; onHover && onHover(hov); canvas.style.cursor = hov ? "pointer" : ""; }
    }
  }
  let lastHoverCheck = 0;
  function hitKowl() {
    const now = performance.now();
    if (now - lastHoverCheck < 60) return st.hover;
    lastHoverCheck = now;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(meshes, false).some((h) => h.object.visible && visibleChain(h.object));
  }
  function visibleChain(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
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
    st.talk = 0;
    const melting = st.pokes % 7 === 0;
    if (melting) meltNow();
    onPoke && onPoke(st.pokes, melting);
  }
  function onDown(e) {
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false).find((h) => visibleChain(h.object));
    if (hit) poke(hit.point);
  }
  canvas.addEventListener("pointerdown", onDown);

  function meltNow() {
    st.meltT = 0;
    setExpr("melted");
    onMelt && onMelt(true);
  }

  /* --- loop --- */
  let lastT = performance.now();
  const clock = { getDelta() { const n = performance.now(), d = (n - lastT) / 1000; lastT = n; return d; } };
  let running = true, raf = 0, frames = 0, slowFrames = 0, fpsT = 0;
  const tmp = new THREE.Vector3();
  function lookEye(look, eye, styleIdx, dt) {
    if (!look || !eye) return;
    const ex = st.ex;
    let yaw = 0, pitch = 0;
    if (ex.eyes === "follow" || !EYES[ex.eyes]) {
      eye.worldToLocal(tmp.copy(st.look));
      yaw = clamp(Math.atan2(tmp.x, tmp.z), -0.62, 0.62);
      pitch = clamp(-Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)), -0.5, 0.5);
    } else {
      const [ox, oz] = EYES[ex.eyes][styleIdx];
      yaw = Math.atan2(ox, 1); pitch = -Math.atan2(oz, 1);
      // a little life even in a fixed stare
      eye.worldToLocal(tmp.copy(st.look));
      yaw += clamp(Math.atan2(tmp.x, tmp.z), -0.6, 0.6) * 0.15;
    }
    look.rotation.y = damp(look.rotation.y, yaw, 18, dt);
    look.rotation.x = damp(look.rotation.x, pitch, 18, dt);
  }
  function frame() {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = (U.uTime.value += dt);

    // springs
    const K = 70, C = reduced ? 14 : 5.5;
    st.shearV.x += (-K * st.shear.x - C * st.shearV.x) * dt;
    st.shearV.y += (-K * st.shear.y - C * st.shearV.y) * dt;
    st.shear.addScaledVector(st.shearV, dt);
    st.sqV += (-90 * st.sq - (reduced ? 16 : 7) * st.sqV) * dt;
    st.sq += st.sqV * dt;
    const idle = reduced ? 0.004 : 0.012;
    U.uShear.value.set(clamp(st.shear.x, -0.35, 0.35) + Math.sin(t * 1.3) * idle * 1.5, clamp(st.shear.y, -0.3, 0.3));
    U.uSq.value = clamp(st.sq, -0.35, 0.45) + Math.sin(t * 2.2) * idle;

    // melt timeline: 1.3s down, 2.6s puddle, 0.9s back up with a boing
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

    // expression life: blink, talk, arm animation, hair
    st.blinkAt -= dt;
    if (st.blinkAt <= 0) { st.blink = 0.16; st.blinkAt = 2 + Math.random() * 4; }
    if (st.blink > 0) st.blink -= dt;
    const lidTarget = st.blink > 0 ? 1 : st.lidT;
    st.lid = damp(st.lid, lidTarget, st.blink > 0 ? 40 : 10, dt);
    // open lids tuck well behind the eyeball (-2.1 rad) so their rim never shows; 1 = shut
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
    if (parts.armR.phone) parts.armR.phone.rotation.x = ar === "phone" ? Math.sin(t * 2) * 0.05 : 0;
    if (parts.hair) parts.hair.rotation.z = -st.shear.x * 2.2 + Math.sin(t * 3) * 0.05 * motion;

    // body sway toward the cursor
    tmp.copy(st.look);
    kowl.rotation.y = damp(kowl.rotation.y, -0.18 + clamp(tmp.x * 0.08, -0.25, 0.25), 3, dt);

    // camera
    cam.pos.lerp(want.pos, 1 - Math.exp(-(reduced ? 8 : 3.2) * dt));
    cam.tgt.lerp(want.tgt, 1 - Math.exp(-(reduced ? 8 : 3.2) * dt));
    cam.fov = damp(cam.fov, want.fov, 4, dt);
    const drift = reduced ? 0 : 1;
    camera.position.set(cam.pos.x + Math.sin(t * 0.25) * 0.05 * drift, cam.pos.y + Math.sin(t * 0.33) * 0.025 * drift, cam.pos.z);
    camera.lookAt(cam.tgt);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }

    // set life
    screens.update(dt);
    if (!reduced) bokeh.children.forEach((s) => { s.material.opacity = 0.15 + (Math.sin(t * 0.7 + s.userData.ph) * 0.5 + 0.5) * 0.3; });
    ring.material.color.setScalar(0.92 + Math.sin(t * 1.7) * 0.04);

    anchor.updateMatrixWorld(true);
    U.uRoot.value.copy(anchor.matrixWorld);
    U.uRootInv.value.copy(anchor.matrixWorld).invert();
    renderer.render(scene, camera);

    // adaptive quality: drop the pixel ratio if frames are slow for a couple of seconds
    frames++; fpsT += dt;
    if (fpsT > 2) {
      const fps = frames / fpsT;
      if (fps < 40 && quality > 0.6) { slowFrames++; if (slowFrames >= 2) { quality = Math.max(0.6, quality - 0.2); resize(); slowFrames = 0; } }
      else slowFrames = 0;
      frames = 0; fpsT = 0;
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  cam.pos.copy(want.pos); cam.tgt.copy(want.tgt); cam.fov = want.fov;
  // first frame before reporting ready so the crossfade never shows black
  frame();
  onReady && onReady();

  return {
    setMode(m, host) {
      mode = m;
      if (host && canvas.parentElement !== host) { ro.unobserve(canvas.parentElement); host.appendChild(canvas); ro.observe(host); }
      resize();
      // snap the camera on a mode change: the channel-switch glitch hides the cut
      cam.pos.copy(want.pos); cam.tgt.copy(want.tgt); cam.fov = want.fov;
    },
    setHeroProgress(p) { heroP = clamp(p, 0, 1); if (mode === "hero") heroCam(); },
    setChannel(n) { channel = n; applyChannelLight(); if (mode === "pip") pipCam(); },
    setExpression: setExpr,
    talk(sec) { st.talk = Math.min(4, sec); },
    poke() { poke(null); },
    get pokes() { return st.pokes; },
    set pokes(v) { st.pokes = v; },
    pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resume() { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); },
    projectHead() {
      // screen position of kowl's head (for the speech bubble), in canvas pixels
      tmp.set(0.2, 1.3, 0); anchor.localToWorld(tmp); tmp.project(camera);
      return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H];
    },
  };
}
