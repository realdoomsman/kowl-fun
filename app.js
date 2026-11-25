/* =====================================================================
   the order of kowls ($KOWL) — fill these in at launch. nothing else needs editing.
   ===================================================================== */
const CA = "coming soon";            // paste the contract address here
const LINKS = {
  x: "https://x.com/KowlFun",        // official X: @KowlFun. (@kowl is an unrelated real person: never link it)
  telegram: "#",                     // https://t.me/...
  pump: "#",                         // https://pump.fun/coin/<CA>
};
const API_BASE = "https://api.kowl.fun"; // kowl payroll API. "" = payroll shows "opens at launch"
const GOOGLE_CLIENT_ID = "108080030634-0gj8lmso0csho8ok0psbeft7ehhuf3n8.apps.googleusercontent.com"; // Google Identity Services web client. authorised origins: kowl.fun, www.kowl.fun, localhost:8787/8790
// live chart: hidden while this is "". GeckoTerminal embed by POOL address:
//   https://www.geckoterminal.com/solana/pools/<POOL>?embed=1&info=0&swaps=0&light_chart=1&chart_type=market_cap&resolution=15m
// careful: a pump.fun coin's pool CHANGES when it graduates from the bonding curve to PumpSwap. update this at graduation.
const CHART_URL = "";
/* ===================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const commas = (n) => Math.round(n).toLocaleString("en-US");
function fmt(n) {
  n = Math.round(n);
  if (n < 1e3) return String(n);
  if (n < 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1e6) return Math.floor(n / 1e3) + "K";
  return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
}
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const VERIFIED_PATH = "M20.4 11c0-1.3-.8-2.5-2-3.1.4-1.3.2-2.7-.7-3.6s-2.3-1.2-3.6-.7c-.6-1.2-1.8-2-3.1-2s-2.5.8-3.1 2c-1.3-.5-2.7-.2-3.6.7s-1.2 2.3-.7 3.6c-1.2.6-2 1.8-2 3.1s.8 2.5 2 3.1c-.5 1.3-.2 2.7.7 3.6s2.3 1.2 3.6.7c.6 1.2 1.8 2 3.1 2s2.5-.8 3.1-2c1.3.5 2.7.2 3.6-.7s1.2-2.3.7-3.6c1.2-.6 2-1.8 2-3.1zm-10.6 4-3.6-3.6 1.4-1.4 2.2 2.2 4.9-5.3 1.5 1.3z";
const IMG = (pose) => `img/kowl-${pose}.webp`;
const HEAD = "img/kowl-head-256.webp";
const SITE = "https://kowl.fun/";
const intentFor = (text, url) => `https://x.com/intent/post?text=${encodeURIComponent(text)}${url ? "&url=" + encodeURIComponent(url) : ""}`;
const pad4 = (n) => String(n).padStart(4, "0");
const kowlNo = (n) => (n ? "#" + pad4(n) : "#????");
document.documentElement.classList.add("js");

/* ---------------- toast, copy, melt particles ---------------- */
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
function melt(x, y, n = 7, char = "🫠") {
  const layer = $("#meltLayer");
  const count = REDUCED ? Math.min(2, n) : n;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.textContent = char;
    s.style.left = x - 13 + "px";
    s.style.top = y - 13 + "px";
    s.style.setProperty("--dx", rand(-90, 90) + "px");
    s.style.setProperty("--dy", rand(-160, -60) + "px");
    s.style.setProperty("--dr", rand(-90, 90) + "deg");
    s.style.animationDelay = i * 25 + "ms";
    layer.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
}
const evPoint = (e) => {
  if (e && e.clientX) return [e.clientX, e.clientY];
  const r = e?.currentTarget?.getBoundingClientRect?.();
  return r ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth / 2, innerHeight / 2];
};
function saveCanvas(cv, name) {
  const go = (url, revoke) => {
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  if (cv.toBlob) cv.toBlob((b) => go(URL.createObjectURL(b), true), "image/png");
  else go(cv.toDataURL("image/png"), false);
}
const imgCache = {};
const loadImg = (src, cors) => imgCache[src] || (imgCache[src] = new Promise((res, rej) => {
  const i = new Image();
  if (cors) { i.crossOrigin = "anonymous"; i.referrerPolicy = "no-referrer"; }
  i.onload = () => res(i);
  i.onerror = () => { delete imgCache[src]; rej(new Error("img")); };
  i.src = src;
}));
const fontsReady = (() => {
  let p;
  return () => p || (p = Promise.all(['64px "UnifrakturMaguntia"', '40px "Instrument Serif"', 'italic 40px "Instrument Serif"', '20px "IBM Plex Mono"', '700 20px "IBM Plex Mono"', '40px "Archivo Black"']
    .map((f) => document.fonts.load(f).catch(() => null))));
})();

/* ---------------- nav ---------------- */
function initNav() {
  const burger = $("#burger"), links = $("#navLinks");
  const close = () => { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); };
  burger.addEventListener("click", () => {
    const open = !links.classList.contains("open");
    links.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  if (!("IntersectionObserver" in window)) return;
  const map = new Map($$("a", links).map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$("a", links).forEach((a) => a.classList.remove("on"));
      const a = map.get(en.target.id);
      if (a) a.classList.add("on");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach((s) => io.observe(s));
}
function initReveal() {
  const els = $$(".reveal");
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

/* ---------------- the chant ---------------- */
const CHANT = [
  "every KOL is a kowl", "KOLs get paid in secret", "kowls get paid in public", "don't get kowl'd",
  "who paid you?", "$KOWL did. it's on-chain. 🫠", "kowl has no spine. neither does your favourite KOL",
  "the only KOL program where every paid post says it's paid", "now anyone can be a kowl", "not financial advice 🫠",
];
function initChant() {
  const html = CHANT.map((h) => `<span>${esc(h)}</span>`).join("");
  $("#chantRun").innerHTML = html + html;
}

/* ---------------- links + CA ---------------- */
function initLinks() {
  $$("[data-link]").forEach((a) => {
    const href = LINKS[a.dataset.link] || "#";
    a.href = href;
    if (href === "#") {
      a.removeAttribute("target");
      a.addEventListener("click", (e) => { e.preventDefault(); toast("that link drops at launch. don't get kowl'd by fakes."); });
    }
  });
}
const CA_READY = CA && !/coming soon/i.test(CA);
function initCA() {
  $("#coinPre").hidden = CA_READY;
  $("#coinLive").hidden = !CA_READY;
  if (!CA_READY) return;
  $("#caText").textContent = CA;
  $("#caCopy").addEventListener("click", async (e) => {
    const ok = await copy(CA);
    toast(ok ? "CA copied. don't get kowl'd by fakes." : "copy failed. select it by hand.");
    melt(...evPoint(e));
  });
}

/* =====================================================================
   the shrine: 2D cutout first (light), the 3D kowl on first interaction
   ===================================================================== */
const POSES = {
  gm: ["gm", "gm to my 840k bots", "gm. anyway, this is the one"],
  "this-is-the-one": ["this is the one.", "this one. no, THIS one.", "41st \"the one\" today"],
  nfa: ["not financial advice 🫠", "nfa (it's financial advice)"],
  shill: ["not paid btw", "DM for \"partnerships\"", "check the link in bio"],
  "send-it": ["SEND IT", "we're so early!!", "join the order!!"],
  rich: ["i'm just a holder", "proof of bags (seed phrase visible)"],
  derp: ["few understand", "dyor (i didn't)"],
  sus: ["...who's asking?", "who paid me? $KOWL did. it's on-chain."],
  deleted: ["*deletes tweet*", "that wasn't me", "i never said that (i did)"],
  cry: ["taking a break from CT 🙏", "it's just a dip"],
  high: ["zoom out", "generational wealth"],
  facepalm: ["password was kowl123", "i clicked the free airdrop link", "signed whatever popped up"],
};
const POKE_POSES = Object.keys(POSES);
const shrine = { k3d: null, loading: false, pokes: 0, bubbleT: 0, exprT: 0, visible: true };
try { shrine.pokes = +localStorage.getItem("kowl-pokes") || 0; } catch { /* private mode */ }

function say(text, sec = 2.6) {
  const b = $("#bubble");
  b.textContent = text;
  b.hidden = false;
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
  if (shrine.k3d) {
    const [x, y] = shrine.k3d.projectHead();
    const st = $("#altarStage").getBoundingClientRect();
    b.style.left = Math.min(Math.max(x / st.width, .15), .62) * 100 + "%";
    b.style.top = Math.max(2, (y / st.height) * 100 - 16) + "%";
  }
  clearTimeout(shrine.bubbleT);
  shrine.bubbleT = setTimeout(() => { b.hidden = true; }, sec * 1000);
  shrine.k3d && shrine.k3d.talk(Math.min(2, text.length / 14));
}
function countPoke(n, melting) {
  shrine.pokes = n;
  try { localStorage.setItem("kowl-pokes", String(n)); } catch { /* private mode */ }
  $("#pokeCount").textContent = commas(n);
  $("#pokeHint").classList.add("gone");
  if (melting) { say("🫠", 4.6); return; }
  const pose = pick(POKE_POSES);
  say(pick(POSES[pose]));
  if (shrine.k3d) {
    shrine.k3d.setExpression(pose);
    clearTimeout(shrine.exprT);
    shrine.exprT = setTimeout(() => shrine.k3d && shrine.k3d.setExpression("idle"), 2600);
  }
  return pose;
}
function poke2d(e) {
  wake3d();
  const n = shrine.pokes + 1, melting = n % 7 === 0;
  const pose = countPoke(n, melting);
  const img = $("#kowl2d");
  img.src = IMG(melting ? "melted" : pose);
  img.classList.remove("poked"); void img.offsetWidth; img.classList.add("poked");
  clearTimeout(shrine.exprT);
  shrine.exprT = setTimeout(() => { img.src = IMG("gm"); }, melting ? 3600 : 2600);
  melt(...evPoint(e), melting ? 10 : 3);
}
function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch { return false; }
}
function wake3d() {
  if (shrine.loading || shrine.k3d) return;
  shrine.loading = true;
  if (!webglOK() || (navigator.connection && navigator.connection.saveData)) return;
  const stage = $("#altarStage");
  const canvas = document.createElement("canvas");
  canvas.className = "shrine3d";
  canvas.setAttribute("aria-label", "kowl, in 3D, on his altar. poke him.");
  canvas.setAttribute("role", "img");
  stage.prepend(canvas);
  import("./shrine3d.js?v=4").then((m) => m.start({
    canvas, model: "models/kowl.glb", reduced: REDUCED,
    onPoke: (n, melting) => { countPoke(n, melting); const r = canvas.getBoundingClientRect(); melt(r.left + r.width / 2, r.top + r.height * .45, melting ? 10 : 3); },
    onMelt: () => {},
    onReady: () => { stage.classList.add("is3d"); },
  })).then((k) => {
    shrine.k3d = k;
    k.pokes = shrine.pokes;
    if (!shrine.visible || document.hidden) k.pause();
  }).catch((err) => {
    console.warn("shrine3d: staying 2D", err && err.message);
    canvas.remove();
  });
}
function initShrine() {
  $("#pokeCount").textContent = commas(shrine.pokes);
  if (shrine.pokes) $("#pokeHint").classList.add("gone");
  $("#altarPoke").addEventListener("click", poke2d);
  const once = () => {
    ["pointermove", "pointerdown", "touchstart", "keydown", "scroll"].forEach((t) => removeEventListener(t, once));
    wake3d();
  };
  ["pointermove", "pointerdown", "touchstart", "keydown", "scroll"].forEach((t) => addEventListener(t, once, { passive: true }));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => {
      shrine.visible = en.isIntersecting;
      if (!shrine.k3d) return;
      if (en.isIntersecting && !document.hidden) shrine.k3d.resume(); else shrine.k3d.pause();
    }).observe($("#altar"));
  }
  document.addEventListener("visibilitychange", () => {
    if (!shrine.k3d) return;
    if (document.hidden) shrine.k3d.pause(); else if (shrine.visible) shrine.k3d.resume();
  });
  setTimeout(() => { if (!shrine.pokes) say("gm. poke me.", 3); }, 1400);
}

/* =====================================================================
   ranks: the hierarchy (payroll.js swaps in /api/stats ranks when it has them)
   ===================================================================== */
let RANKS = [
  { name: "initiate", min: 0, desc: "signed the register. hasn't posted. still has a spine." },
  { name: "kowl", min: 10, desc: "first offering accepted. you said it was paid, and it was." },
  { name: "senior kowl", min: 100, desc: "you've answered the 3:00pm call more times than a KOL has said \"nfa\"." },
  { name: "high kowl", min: 500, desc: "the blue check sticker is starting to stick. it's fine: it's disclosed." },
  { name: "the blob", min: 2000, desc: "no bones, no spine, no secrets. what kowl dreams of becoming." },
];
let RANK_UNIT = "pts";
function setRanks(list, unit) {
  if (!Array.isArray(list) || !list.length) return;
  const norm = list.map((r, i) => (typeof r === "string" ? { name: r, min: null } : {
    name: r.name || r.title || r.rank || `rank ${i + 1}`,
    min: r.min ?? r.min_points ?? r.points ?? r.at ?? r.min_memes ?? null,
    desc: r.desc || r.description || r.blurb || "",
  }));
  const old = new Map(RANKS.map((r) => [r.name.replace(/"/g, ""), r.desc]));
  norm.forEach((r) => { if (!r.desc) r.desc = old.get(r.name.replace(/"/g, "")) || ""; });
  RANKS = norm;
  if (unit) RANK_UNIT = unit;
  renderRanks();
}
const rankIndex = (name) => RANKS.findIndex((r) => r.name.replace(/"/g, "").toLowerCase() === String(name || "").replace(/"/g, "").toLowerCase());
function rankForValue(v) {
  let idx = 0;
  RANKS.forEach((r, i) => { if (r.min != null && v >= r.min) idx = i; });
  return idx;
}
let myRank = -1;
function renderRanks() {
  const icons = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  $("#ranks").innerHTML = RANKS.map((r, i) => `<li class="${i === myRank ? "you" : ""}">
    <span class="rank-ico" aria-hidden="true">${icons[i] || i + 1}</span>
    <div><b>${esc(r.name)}</b><span>${esc(r.desc || "")}</span></div>
    <em>${r.min == null ? "" : r.min === 0 ? "on joining" : `${commas(r.min)}+ ${esc(RANK_UNIT)}`}</em></li>`).join("");
}

/* =====================================================================
   the vestments: pfp generator (also the face on the kowl card)
   ===================================================================== */
const PFP_BGS = [
  { id: "blue", label: "verified", css: "#1D9BF0", fill: "#1D9BF0" },
  { id: "peach", label: "peach", css: "#F2B39A", fill: "#F2B39A" },
  { id: "black", label: "X black", css: "#0F1419", fill: "#0F1419" },
  { id: "gold", label: "gold", css: "#E2A93B", fill: "#E2A93B" },
  { id: "altar", label: "altar", css: "radial-gradient(circle at 50% 40%,#f4cb6b,#7a3e12 75%)", radial: ["#F4CB6B", "#7A3E12"] },
  { id: "melt", label: "melt", css: "linear-gradient(160deg,#F2B39A,#1D9BF0)", grad: ["#F2B39A", "#1D9BF0"] },
];
const pfp = { meta: null, pose: "gm", bg: "altar", seq: 0, downloaded: false };
const cleanHandle = (h) => String(h || "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
const pfpHandle = () => cleanHandle($("#pfpName").value);
function drawPfpBg(ctx, S, bgId) {
  const bg = PFP_BGS.find((b) => b.id === bgId) || PFP_BGS[0];
  if (bg.grad) {
    const g = ctx.createLinearGradient(0, 0, S * 0.4, S);
    g.addColorStop(0, bg.grad[0]); g.addColorStop(1, bg.grad[1]);
    ctx.fillStyle = g;
  } else if (bg.radial) {
    const g = ctx.createRadialGradient(S / 2, S * 0.4, 0, S / 2, S * 0.4, S * 0.75);
    g.addColorStop(0, bg.radial[0]); g.addColorStop(1, bg.radial[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = bg.fill;
  ctx.fillRect(0, 0, S, S);
  if (bg.radial) {
    // sunburst rays: the order's halo
    ctx.save(); ctx.translate(S / 2, S * 0.4); ctx.fillStyle = "rgba(255,236,190,.16)";
    for (let i = 0; i < 24; i++) { ctx.rotate(Math.PI / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S, -S * 0.07); ctx.lineTo(S, S * 0.07); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  const r = ctx.createRadialGradient(S / 2, S * 0.45, 0, S / 2, S * 0.45, S * 0.62);
  r.addColorStop(0, "rgba(255,255,255,.2)"); r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 0, S, S);
}
async function renderPfp(cv, { pose, bg, text }) {
  if (!pfp.meta) return;
  const p = pfp.meta.poses[pose] || pfp.meta.poses.gm;
  const img = await loadImg(p.file);
  await fontsReady();
  const ctx = cv.getContext("2d"), S = cv.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  drawPfpBg(ctx, S, bg);
  ctx.drawImage(img, 0, 0, S, S);
  // the text on the plaque: affine map from the plaque's tl/tr/bl corners (base pixels → canvas pixels)
  const k = S / pfp.meta.size;
  const [tl, tr, , bl] = p.plaque.map(([x, y]) => [x * k, y * k]);
  const W = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), H = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  ctx.save();
  ctx.setTransform((tr[0] - tl[0]) / W, (tr[1] - tl[1]) / W, (bl[0] - tl[0]) / H, (bl[1] - tl[1]) / H, tl[0], tl[1]);
  ctx.font = `400 100px "Archivo Black", Impact, sans-serif`;
  const size = Math.min(H * 0.6, (100 * W * 0.86) / ctx.measureText(text).width);
  ctx.font = `400 ${size}px "Archivo Black", Impact, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowOffsetY = Math.max(1, size * 0.05);
  ctx.fillStyle = "#F5A30F";
  ctx.fillText(text, W / 2, H / 2 + size * 0.04);
  ctx.restore();
}
// never default the plaque to "@kowl": that handle is a real, unrelated person
const plaqueText = () => (pfpHandle() ? "@" + pfpHandle() : ME.number ? kowlNo(ME.number) : "KOWL");
async function drawPfp() {
  const seq = ++pfp.seq;
  const off = document.createElement("canvas");
  off.width = off.height = 1024;
  await renderPfp(off, { pose: pfp.pose, bg: pfp.bg, text: plaqueText() });
  if (seq !== pfp.seq) return;
  const cv = $("#pfpCanvas");
  cv.getContext("2d").drawImage(off, 0, 0);
  drawMyCard();
}
function radioPick(group, btn) {
  $$("button", group).forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
}
async function initPfp() {
  try {
    const res = await fetch("img/pfp/plaque.json");
    pfp.meta = await res.json();
  } catch {
    toast("the pfp maker didn't load. refresh.");
    return;
  }
  const poses = Object.keys(pfp.meta.poses);
  if (!pfp.meta.poses[pfp.pose]) pfp.pose = poses[0];
  const pg = $("#poseGrid");
  pg.innerHTML = poses.map((p) =>
    `<button type="button" role="radio" aria-checked="${p === pfp.pose}" data-pose="${esc(p)}" aria-label="${esc(p)}"><img src="${esc(pfp.meta.poses[p].thumb || pfp.meta.poses[p].file)}" alt="" width="192" height="192" decoding="async"></button>`).join("");
  pg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    pfp.pose = b.dataset.pose; radioPick(pg, b); drawPfp();
  });
  const bgg = $("#bgGrid");
  bgg.innerHTML = PFP_BGS.map((b) =>
    `<button type="button" role="radio" aria-checked="${b.id === pfp.bg}" data-bg="${b.id}" style="background:${b.css}" aria-label="${esc(b.label)}"><span>${esc(b.label)}</span></button>`).join("");
  bgg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    pfp.bg = b.dataset.bg; radioPick(bgg, b); drawPfp();
  });
  let t;
  $("#pfpName").addEventListener("input", () => { clearTimeout(t); t = setTimeout(drawPfp, 80); });
  $("#pfpDl").addEventListener("click", (e) => {
    saveCanvas($("#pfpCanvas"), `kowl-${pfpHandle() || (ME.number ? pad4(ME.number) : "pfp")}.png`);
    pfp.downloaded = true;
    toast("downloaded. set it as your pfp and put 🫠 in your name.");
    melt(...evPoint(e), 6);
  });
  drawPfp();
}

/* =====================================================================
   the kowl card: 1600×1000, drawn on canvas, downloadable
   ===================================================================== */
// ME is the signed-in member as the card needs it; payroll.js keeps it current
const ME = { signed: false, name: "", number: null, genesis: false, rank: "", joined: null, x: "", points: 0, streak: 0 };
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fitText(ctx, text, maxW, font, start, min) {
  let s = start;
  do { ctx.font = font(s); if (ctx.measureText(text).width <= maxW) return s; s -= 2; } while (s > min);
  ctx.font = font(min);
  return min;
}
function spaced(ctx, text, x, y, sp) {
  for (const ch of text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + sp; }
  return x;
}
const DATE_FMT = (t) => {
  const d = t ? new Date(t) : null;
  return d && !isNaN(d) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase() : "not yet";
};
async function drawCard(cv, m, face) {
  await fontsReady();
  const ctx = cv.getContext("2d"), W = 1600, H = 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // paper
  ctx.save();
  rr(ctx, 0, 0, W, H, 46); ctx.clip();
  const pg = ctx.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, "#f8f0e1"); pg.addColorStop(1, "#e8d6b6");
  ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
  // guilloche: the security pattern every serious document has
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(200,98,63,.13)" : "rgba(142,97,20,.12)";
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = 230 + i * 22 + Math.sin(x / 70 + i * 0.5) * 26 + Math.sin(x / 23 + i) * 6;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // header band
  const hb = ctx.createLinearGradient(0, 0, 0, 170);
  hb.addColorStop(0, "#211912"); hb.addColorStop(1, "#15100c");
  ctx.fillStyle = hb; ctx.fillRect(0, 0, W, 170);
  ctx.fillStyle = "#e2a93b"; ctx.fillRect(0, 170, W, 5);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8f1e4"; ctx.font = '72px "UnifrakturMaguntia", serif';
  ctx.fillText("the Order", 70, 112);
  const ow = ctx.measureText("the Order ").width;
  ctx.fillStyle = "#f2b39a"; ctx.font = 'italic 64px "Instrument Serif", Georgia, serif';
  ctx.fillText("of kowls", 70 + ow, 112);
  ctx.textAlign = "right"; ctx.fillStyle = "#e2a93b"; ctx.font = '700 22px "IBM Plex Mono", monospace';
  ctx.fillText("MEMBERSHIP CARD", W - 70, 80);
  ctx.fillStyle = "rgba(248,241,228,.6)"; ctx.font = '400 20px "IBM Plex Mono", monospace';
  ctx.fillText("ORDO KOWLORUM · EST. MMXXVI", W - 70, 118);
  ctx.textAlign = "left";

  // photo
  const px = 70, py = 225, ps = 500;
  ctx.save();
  ctx.shadowColor = "rgba(40,20,5,.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  rr(ctx, px - 10, py - 10, ps + 20, ps + 20, 34); ctx.fillStyle = "#c9922c"; ctx.fill();
  ctx.restore();
  ctx.save();
  rr(ctx, px, py, ps, ps, 26); ctx.clip();
  if (face) ctx.drawImage(face, px, py, ps, ps); else { ctx.fillStyle = "#f2b39a"; ctx.fillRect(px, py, ps, ps); }
  ctx.restore();
  // the blue check sticker, slapped on crooked
  ctx.save();
  ctx.translate(px + ps - 40, py + 34); ctx.rotate(0.22); ctx.scale(4.2, 4.2); ctx.translate(-11, -11);
  const vp = new Path2D(VERIFIED_PATH);
  ctx.lineWidth = 2.2; ctx.strokeStyle = "#fff"; ctx.stroke(vp);
  ctx.fillStyle = "#1d9bf0"; ctx.fill(vp);
  ctx.restore();

  // fields
  const fx = 650;
  const label = (t, x, y) => { ctx.fillStyle = "#8e6114"; ctx.font = '700 19px "IBM Plex Mono", monospace'; spaced(ctx, t, x, y, 3); };
  label("NAME", fx, 262);
  ctx.fillStyle = "#15100c";
  const nm = m.name || "your name here";
  fitText(ctx, nm, W - fx - 80, (s) => `${s}px "Instrument Serif", Georgia, serif`, 76, 40);
  ctx.fillText(nm, fx, 334);
  label("KOWL NO.", fx, 410);
  ctx.fillStyle = m.number ? "#15100c" : "rgba(21,16,12,.38)";
  ctx.font = '112px "Instrument Serif", Georgia, serif';
  ctx.fillText(kowlNo(m.number), fx, 512);
  let gx = fx + ctx.measureText(kowlNo(m.number)).width + 24;
  if (m.genesis) {
    ctx.font = '700 22px "IBM Plex Mono", monospace';
    const gw = ctx.measureText("GENESIS").width + 36;
    rr(ctx, gx, 452, gw, 48, 24); ctx.fillStyle = "#e2a93b"; ctx.fill();
    ctx.fillStyle = "#15100c"; ctx.fillText("GENESIS", gx + 18, 484);
  } else if (!m.number) {
    ctx.fillStyle = "#6e6155"; ctx.font = 'italic 28px "Instrument Serif", Georgia, serif';
    ctx.fillText(m.signed ? "comes with your first approved meme" : "sign in to be numbered", gx, 490);
  }
  const col2 = fx + 440;
  label("RANK", fx, 580); label("SWORN IN", col2, 580);
  ctx.fillStyle = "#c8623f";
  fitText(ctx, m.rank || "unsworn", 420, (s) => `italic ${s}px "Instrument Serif", Georgia, serif`, 52, 30);
  ctx.fillText(m.rank || "unsworn", fx, 640);
  ctx.fillStyle = "#15100c"; ctx.font = '46px "Instrument Serif", Georgia, serif';
  ctx.fillText(m.signed ? DATE_FMT(m.joined) : "not yet", col2, 640);
  label("X", fx, 706); label(m.streak ? "MELT STREAK" : "LIFETIME POINTS", col2, 706);
  ctx.fillStyle = "#1d9bf0"; ctx.font = '42px "Instrument Serif", Georgia, serif';
  const xh = m.x ? "@" + m.x : "not linked";
  fitText(ctx, xh, 420, (s) => `${s}px "Instrument Serif", Georgia, serif`, 42, 28);
  ctx.fillText(xh, fx, 760);
  ctx.fillStyle = "#15100c"; ctx.font = '46px "Instrument Serif", Georgia, serif';
  ctx.fillText(m.streak ? `${commas(m.streak)} day${m.streak === 1 ? "" : "s"} 🫠` : commas(m.points || 0), col2, 760);

  // the creed and the machine-readable line
  ctx.fillStyle = "rgba(21,16,12,.14)"; ctx.fillRect(70, 810, W - 140, 2);
  ctx.fillStyle = "#15100c"; ctx.font = 'italic 46px "Instrument Serif", Georgia, serif';
  ctx.fillText("every KOL is a kowl.", 70, 876);
  const mrzName = (m.name || "UNSWORN").toUpperCase().replace(/[^A-Z0-9]+/g, "<").slice(0, 18);
  const mrz = `KOWL<<${mrzName}<<${m.number ? pad4(m.number) : "????"}<<${m.genesis ? "GENESIS" : "ORDO"}`.padEnd(60, "<").slice(0, 60);
  ctx.fillStyle = "rgba(21,16,12,.55)"; ctx.font = '400 25px "IBM Plex Mono", monospace';
  ctx.fillText(mrz, 70, 940);

  // the wax seal
  const sx = 1440, sy = 830, sr = 98;
  ctx.save();
  ctx.shadowColor = "rgba(60,10,0,.4)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2, r = sr + Math.sin(i * 1.5) * 5 + (i % 7 === 0 ? 4 : 0);
    const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  const wg = ctx.createRadialGradient(sx - 30, sy - 30, 10, sx, sy, sr);
  wg.addColorStop(0, "#c8452c"); wg.addColorStop(1, "#7d1f10");
  ctx.fillStyle = wg; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,210,190,.35)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(sx, sy, sr - 20, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(60,8,0,.55)"; ctx.font = '104px "UnifrakturMaguntia", serif';
  ctx.fillText("K", sx + 2, sy + 6);
  ctx.fillStyle = "#f3b9a3"; ctx.fillText("K", sx, sy + 3);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  // unsworn stamp
  if (!m.signed) {
    ctx.save();
    ctx.translate(px + ps - 112, py + ps - 46); ctx.rotate(-0.2);
    ctx.font = '700 40px "IBM Plex Mono", monospace';
    const tw = ctx.measureText("UNSWORN").width;
    ctx.strokeStyle = "rgba(163,48,28,.85)"; ctx.lineWidth = 5;
    rr(ctx, -tw / 2 - 18, -34, tw + 36, 68, 8); ctx.stroke();
    ctx.fillStyle = "rgba(163,48,28,.9)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("UNSWORN", 0, 2);
    ctx.restore();
  }
  ctx.restore();
  // gilt edge
  ctx.strokeStyle = "#c9922c"; ctx.lineWidth = 6; rr(ctx, 3, 3, W - 6, H - 6, 44); ctx.stroke();
  ctx.strokeStyle = "rgba(201,146,44,.55)"; ctx.lineWidth = 2; rr(ctx, 22, 22, W - 44, H - 44, 30); ctx.stroke();
}
let cardSeq = 0;
async function drawMyCard() {
  const seq = ++cardSeq;
  const typed = $("#nameInput").value.trim();
  const data = { ...ME, name: ME.signed ? ME.name : typed, x: ME.x || pfpHandle() };
  const off = document.createElement("canvas");
  off.width = 1600; off.height = 1000;
  await drawCard(off, data, $("#pfpCanvas"));
  if (seq !== cardSeq) return;
  $("#cardCanvas").getContext("2d").drawImage(off, 0, 0);
  $("#cardCap").textContent = !ME.signed
    ? "an unsworn card. sign in, then your first approved meme or accepted bagwork gives you your kowl number."
    : ME.number
      ? `kowl ${kowlNo(ME.number)}${ME.genesis ? " · genesis" : ""}. share it: the link shows your card to anyone.`
      : "sworn in. your number comes with your first approved meme or accepted bagwork.";
}
function shareCard(number) {
  const url = number ? `${API_BASE.replace(/\/+$/, "")}/k/${number}` : SITE;
  // coin-free on purpose: no ticker, no "i get paid"
  window.open(intentFor("every KOL is a kowl. 🫠", url), "_blank", "noopener");
}
function initCard() {
  let t;
  $("#nameInput").addEventListener("input", () => { if (!ME.signed) { clearTimeout(t); t = setTimeout(drawMyCard, 120); } });
  $("#cardDl").addEventListener("click", (e) => {
    saveCanvas($("#cardCanvas"), `kowl-card-${ME.number ? pad4(ME.number) : "unsworn"}.png`);
    toast(ME.number ? "your card is downloaded. post it: every KOL is a kowl. 🫠" : "downloaded. sign in to get your number on it.");
    melt(...evPoint(e), 6);
  });
  $("#cardPost").addEventListener("click", () => {
    shareCard(ME.number);
    if (!ME.number) toast("tip: download the card first and attach it to the post.");
  });
}

/* =====================================================================
   the 3:00pm call: one prompt a day at 15:00 UTC, the same for everyone
   ===================================================================== */
const CALL_EPOCH = Date.UTC(2026, 10, 25, 15); // call no. 1 dropped 25 nov 2026, 15:00 UTC
const DAY = 86400000;
const CALLS = [
  ["kowl deletes the tweet.", 7], ["who paid you?", 0], ["proof of bags (seed phrase visible).", 2], ["taking a break from CT.", 13],
  ["inside the alpha group.", 10], ["kowl's entry vs kowl's call.", 4], ["\"not financial advice\", right after the financial advice.", 3],
  ["kowl claims a free airdrop.", 23], ["kowl's rate card leaks.", 1], ["47 calls before lunch.", 6], ["the KOL lifecycle.", 5],
  ["the melted portfolio.", 12], ["kowl hosts a space.", 16], ["if CT had a paid partnership label.", 14], ["the hardest decision a KOL makes.", 15],
  ["the KOL starter pack.", 17], ["the lineup.", 18], ["KOLs in 2021 vs 2026.", 19], ["readers added context.", 21], ["kowl's cold storage.", 22],
  ["KOL → english.", 24], ["the only KOL that admits it.", 25], ["the notifications after \"this is the one\".", 26], ["KOLs vs kowls.", 27],
  ["kowl did.", 28], ["now hiring: kowls.", 29], ["the side wallet's side wallet.", 30], ["receipts.", 31], ["kowl tries the callout template.", 32],
  ["kowl's disclosure.", 33], ["wanted: kowl.", 9], ["KOL bingo.", 8], ["define: kowl'd.", 11], ["kowls want you.", 20],
];
const CAPTIONS = [
  (p, c) => `paid by $KOWL 🫠\n\n${c}`,
  (p, c) => `paid by $KOWL. today's call: ${p}\n\n${c}`,
  (p, c) => `paid by $KOWL (every kowl post says so)\n\n${c}`,
];
const mission = { n: 0, cap: 0, meme: null, prompt: "", next: 0 };
function callNow() {
  if (Date.now() < CALL_EPOCH) return { n: -1, next: CALL_EPOCH };
  const n = Math.floor((Date.now() - CALL_EPOCH) / DAY);
  return { n, next: CALL_EPOCH + (n + 1) * DAY };
}
const WARMUP = ["warm-up: who paid you?", 28];
function renderMission() {
  if (!memes.length) return;
  const { n, next } = callNow();
  const [prompt, mi] = n < 0 ? WARMUP : CALLS[n % CALLS.length];
  mission.n = n; mission.next = next; mission.prompt = prompt.replace(/^warm-up: /, "");
  mission.meme = memes[mi % memes.length];
  $("#callPrompt").textContent = prompt;
  const day = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toLowerCase();
  $("#callTag").textContent = n < 0
    ? `the first call drops ${day(CALL_EPOCH)}, 15:00 UTC · warm up meanwhile`
    : `call no. ${n + 1} · dropped ${day(CALL_EPOCH + n * DAY)}, 15:00 UTC`;
  $("#callNextLbl").textContent = n < 0 ? "first call in" : "next call in";
  const file = mission.meme.file, thumb = file.replace("memes/", "memes/thumb/").replace(/\.jpg$/, ".webp");
  $("#missionImg").src = thumb;
  $("#missionImg").alt = mission.meme.caption || "today's meme";
  $("#missionDl").href = file;
  $("#missionDl").setAttribute("download", file.split("/").pop());
  renderCaption();
}
function renderCaption() {
  const cap = (mission.meme.caption || "").replace(/[’]/g, "'");
  $("#missionText").value = CAPTIONS[mission.cap % CAPTIONS.length](mission.prompt, cap);
  syncIntent();
}
function syncIntent() { $("#missionPost").href = intentFor($("#missionText").value); }
function tickCall() {
  const left = Math.max(0, mission.next - Date.now());
  const s = Math.floor(left / 1000);
  $("#callCountdown").textContent = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  if (left <= 0 && memes.length) { renderMission(); toast("kowl just dropped the 3:00pm call. 🫠"); }
}
function initMission() {
  $("#missionText").addEventListener("input", syncIntent);
  $("#missionReroll").addEventListener("click", () => { mission.cap++; renderCaption(); });
  $("#missionCopy").addEventListener("click", async (e) => {
    const ok = await copy($("#missionText").value);
    toast(ok ? "caption copied. turn on Paid Partnership when you post." : "copy failed. select it by hand.");
    if (ok) melt(...evPoint(e), 4);
  });
  $("#missionPost").addEventListener("click", () => toast("attach the meme, turn on Paid Partnership, then paste the link in the sanctum."));
  $("#missionDl").addEventListener("click", () => toast("downloaded. now post it."));
  tickCall();
  setInterval(tickCall, 1000);
}

/* =====================================================================
   the vault: the canon (34 memes) + lightbox; tabs
   ===================================================================== */
let memes = [], lbIndex = 0;
const thumbOf = (f) => f.replace("memes/", "memes/thumb/").replace(/\.jpg$/, ".webp");
async function initMemes() {
  const grid = $("#memeGrid");
  try {
    const res = await fetch("memes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    memes = (await res.json()).filter((m) => m && m.file);
  } catch {
    grid.innerHTML = '<p class="mut">the canon is loading slower than kowl\'s disclosure. refresh in a sec.</p>';
    return;
  }
  $("#canonCount").textContent = memes.length;
  grid.innerHTML = memes.map((m, i) =>
    `<button class="meme" type="button" data-i="${i}" aria-label="open meme: ${esc(m.caption || "kowl meme")}"><img src="${esc(thumbOf(m.file))}" alt="" width="520" height="520" loading="lazy" decoding="async"></button>`).join("");
  grid.addEventListener("click", (e) => {
    const b = e.target.closest(".meme");
    if (b) openLightbox(+b.dataset.i);
  });
  const more = $("#moreMemes");
  if (memes.length > 12) {
    more.hidden = false;
    more.textContent = `show the whole canon (${memes.length})`;
    more.addEventListener("click", () => { grid.classList.remove("clipped"); more.hidden = true; });
  }
  renderMission();
}
function openLightbox(i) {
  lbIndex = (i + memes.length) % memes.length;
  const m = memes[lbIndex];
  $("#lbImg").src = m.file;
  $("#lbImg").alt = m.caption || "kowl meme";
  $("#lbCap").textContent = m.caption || "";
  $("#lbCount").textContent = `${lbIndex + 1} / ${memes.length}`;
  const dl = $("#lbDl");
  dl.href = m.file;
  dl.setAttribute("download", m.file.split("/").pop());
  openModal($("#lightbox"));
}
function initLightbox() {
  $("#lbPrev").addEventListener("click", () => openLightbox(lbIndex - 1));
  $("#lbNext").addEventListener("click", () => openLightbox(lbIndex + 1));
  $("#lbMission").addEventListener("click", () => {
    const m = memes[lbIndex];
    window.open(intentFor(`paid by $KOWL 🫠\n\n${(m.caption || "").replace(/[’]/g, "'")}`), "_blank", "noopener");
    toast("attach the meme you downloaded and turn on Paid Partnership.");
  });
  $("#lightbox").addEventListener("click", (e) => { if (e.target.classList.contains("lb-inner")) closeModal($("#lightbox")); });
  let sx = null;
  $("#lightbox").addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  $("#lightbox").addEventListener("touchend", (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) openLightbox(lbIndex + (dx < 0 ? 1 : -1));
    sx = null;
  });
}
function tabs(attr, paneAttr) {
  const btns = $$(`[data-${attr}]`);
  const show = (key) => {
    btns.forEach((x) => { const on = x.dataset[attr] === key; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
    $$(`[data-${paneAttr}]`).forEach((p) => { p.hidden = p.dataset[paneAttr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] !== key; });
  };
  btns.forEach((b) => b.addEventListener("click", () => show(b.dataset[attr])));
  return show;
}
function initVaultTabs() {
  const show = tabs("vault", "vault-pane");
  $$("[data-vault-open]").forEach((a) => a.addEventListener("click", () => show(a.dataset.vaultOpen)));
  tabs("tool", "tool-pane");
}

/* =====================================================================
   the lexicon: dictionary + KOL → english translator
   ===================================================================== */
const DICT = [
  ["not financial advice", "financial advice"], ["nfa", "financial advice (i'm paid for)"], ["dyor", "i didn't"],
  ["i'm just a holder", "i sold yesterday"], ["just a holder", "sold yesterday"], ["we're so early", "you're my exit liquidity"],
  ["still early", "you're late"], ["been watching this one for a while", "i bought 4 minutes ago"], ["this is the one", "this is one of the 40 today"],
  ["not paid", "paid"], ["not sponsored", "sponsored"], ["conviction play", "i'm stuck in it"], ["long term hold", "i couldn't sell in time"],
  ["zoom out", "don't look at the last 3 days"], ["diamond hands", "please don't sell before me"], ["dev is based", "the dev paid me"],
  ["community takeover", "the dev left. it's your problem now"], ["send it", "buy so i can sell"], ["taking a break from ct", "my coin just went -90%"],
  ["mental health", "bags"], ["gm", "please engage with my 3pm shill"], ["gn", "i'm selling while you sleep"], ["wagmi", "i'm gonna make it. you're not"],
  ["ngmi", "you didn't buy my coin"], ["lfg", "let me fill my sells"], ["alpha group", "paid group chat where we pick who to dump on"],
  ["alpha", "a coin i already bought"], ["partnership", "payment"], ["strategic partner", "got paid more"], ["buy the dip", "buy my bags"],
  ["just a dip", "it's over"], ["who's still holding", "i'm not"], ["100x", "0.01x"], ["generational wealth", "generational bags"],
  ["trust me", "don't"], ["i don't usually shill", "i shill 40 times a day"], ["organic", "bundled"], ["fair launch", "fair for me"],
  ["jeets", "people who sold before me"], ["fud", "facts"], ["unruggable", "about to be rugged"], ["few understand", "i don't understand either"],
  ["one more leg up", "one more exit"], ["bullish", "bought"], ["i'm all in", "i'm 0.4% in"], ["floor is in", "i need you to buy here"],
  ["hidden gem", "my bag"], ["easy 10x", "easy exit"], ["i only shill what i hold", "i hold everything for 4 minutes"], ["to 1b", "to me"],
  ["free airdrop", "drain link (kowl clicked it)"], ["not selling", "selling"], ["chart looks healthy", "i bought the top too"],
  ["trust the process", "there is no process"], ["my community", "my exit liquidity"], ["retail", "exit liquidity"],
  ["thread", "27 posts that all say \"buy\""], ["kol", "kowl"], ["ser", "wallet"], ["frens", "exit liquidity"], ["moon", "my sell target"],
  ["undervalued", "i can't sell it"], ["new ath soon", "i'm down 80%"],
];
const CHIPS = ["not financial advice", "i'm just a holder", "we're so early", "dev is based", "zoom out", "who's still holding?", "taking a break from CT", "trust me"];
const FALLBACKS = [
  "kowl doesn't know what this means either. probably \"buy my bags\".",
  "no KOL-speak detected. are you… a kowl? 🫠",
  "translation: \"i'm about to sell to you.\"",
  "too honest to translate. are you sure you're a KOL?",
  "translation unavailable. the original tweet was deleted.",
];
const normWord = (w) => w.toLowerCase().replace(/[’‘`´]/g, "'").replace(/'/g, "").replace(/[^a-z0-9$#]/g, "");
const DICT_N = DICT.map(([k, v]) => {
  const toks = k.split(/\s+/).map(normWord).filter(Boolean);
  return { k, v, toks, s: toks.join(" ") };
});
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function translateText(input) {
  const raw = input.match(/\S+/g) || [];
  const toks = raw.map((r) => ({ r, n: normWord(r) }));
  const idx = toks.map((t, i) => (t.n ? i : -1)).filter((i) => i >= 0);
  const cands = [];
  DICT_N.forEach((d, di) => {
    const L = d.toks.length;
    const short = d.s.length <= 4;
    const lens = L >= 3 ? [L - 1, L, L + 1] : [L];
    lens.forEach((len) => {
      for (let s = 0; s + len <= idx.length; s++) {
        const win = idx.slice(s, s + len).map((i) => toks[i].n).join(" ");
        const score = short ? (win === d.s ? 1 : 0) : 1 - lev(win, d.s) / Math.max(win.length, d.s.length);
        const need = d.s.length <= 7 ? 0.86 : 0.8;
        if (score >= need) cands.push({ s, e: s + len - 1, score, len: d.s.length, di });
      }
    });
  });
  cands.sort((a, b) => b.score - a.score || b.len - a.len);
  const taken = new Array(idx.length).fill(false);
  const chosen = [];
  for (const c of cands) {
    let free = true;
    for (let i = c.s; i <= c.e; i++) if (taken[i]) { free = false; break; }
    if (!free) continue;
    for (let i = c.s; i <= c.e; i++) taken[i] = true;
    chosen.push(c);
  }
  const startAt = new Map(), skip = new Set();
  chosen.forEach((c) => {
    const a = idx[c.s], b = idx[c.e];
    startAt.set(a, { ...c, a, b });
    for (let i = a + 1; i <= b; i++) skip.add(i);
  });
  const parts = [];
  for (let i = 0; i < toks.length; i++) {
    if (skip.has(i)) continue;
    const m = startAt.get(i);
    if (m) {
      const d = DICT_N[m.di];
      const trail = (toks[m.b].r.match(/[.,!?;:…]+$/) || [""])[0];
      const lead = (toks[m.a].r.match(/^["'(“]+/) || [""])[0];
      parts.push({ hit: true, text: d.v, from: raw.slice(m.a, m.b + 1).join(" "), lead, trail });
    } else parts.push({ hit: false, text: toks[i].r });
  }
  return { parts, hits: chosen.length };
}
let lastOut = "";
function translate(fresh) {
  const inp = $("#trIn").value;
  const out = $("#trOut"), meta = $("#trMeta");
  if (!inp.trim()) {
    out.innerHTML = '<span class="plain">type something a KOL would say. start with "gm".</span>';
    meta.textContent = "";
    lastOut = "";
    return;
  }
  const { parts, hits } = translateText(inp);
  if (!hits) {
    let h = 0;
    for (const ch of inp) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const fb = FALLBACKS[h % FALLBACKS.length];
    out.innerHTML = `<span class="fallback">${esc(fb)}</span>`;
    meta.textContent = "0 KOL phrases found";
    lastOut = fb;
    return;
  }
  out.innerHTML = parts.map((p) => p.hit
    ? `${esc(p.lead || "")}<span class="hit${fresh ? " fresh" : ""}" title="KOL: ${esc(p.from)}">${esc(p.text)}</span>${esc(p.trail || "")}`
    : `<span class="plain">${esc(p.text)}</span>`).join(" ");
  lastOut = parts.map((p) => (p.hit ? (p.lead || "") + p.text + (p.trail || "") : p.text)).join(" ");
  meta.textContent = `${hits} KOL phrase${hits === 1 ? "" : "s"} translated · honesty 100%`;
}
function initLexicon() {
  const inp = $("#trIn");
  let t;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => translate(true), 120); });
  $("#trChips").innerHTML = CHIPS.map((c) => `<button class="chip" type="button">${esc(c)}</button>`).join("");
  $("#trChips").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    inp.value = (inp.value.trim() ? inp.value.trim() + " " : "") + c.textContent;
    translate(true);
  });
  $("#trCopy").addEventListener("click", async (e) => {
    if (!lastOut) return;
    const ok = await copy(lastOut + " 🫠");
    toast(ok ? "translation copied. meme it." : "copy failed");
    melt(...evPoint(e), 4);
  });
  translate(false);
  const entries = DICT.filter(([k]) => !["just a holder", "still early", "alpha", "kol"].includes(k));
  $("#dict").innerHTML = entries.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#dictMore").textContent = `open the whole lexicon (${entries.length})`;
  $("#dictMore").addEventListener("click", () => { $("#dict").classList.remove("clipped"); $("#dictMore").hidden = true; });
}

/* =====================================================================
   the commandments + call and response
   ===================================================================== */
const COMMANDMENTS = [
  ["nobody gets paid in secret.", "kowl once posted \"not paid btw\" 212 times in a row. every one was paid. so the first law: a paid post starts with \"paid by $KOWL\" and wears X's Paid Partnership label."],
  ["\"who paid you?\" goes under @KowlFun's fake shills.", "kowl posts \"this is the one 🫵\", the order answers. that's the game, and that's the only place it's played. never under real people."],
  ["no KOL round. no early wallets. no alpha group.", "47 KOLs agreed on 3:00pm and member #48 was you. here there's no group chat: 100% of creator fees go to the kowls who make the memes."],
  ["no raids. no reply spam. no tagging.", "we never pay for likes, replies or views. a raid is just an alpha group with worse grammar."],
  ["make it memorable.", "your own memes only. no stolen work, no AI slop. a human approves every one before it's public."],
  ["kowl has no spine. you don't need one either.", "bend, wobble, melt, come back. a poke is not an attack. it's a greeting."],
  ["🫠 in thy name.", "it's how kowls find each other. decoration, not a disclosure: the disclosure is \"paid by $KOWL\"."],
  ["kowl gets kowl'd by kowl.", "seed phrase on a sticky note. password kowl123. signed whatever popped up. no excuses in the order: when kowl gets drained, kowl did it."],
  ["it's public or it didn't happen.", "paydays are listed on this site. withdrawals carry their solscan receipt. secrets are for KOLs."],
  ["persist like a puddle.", "every melt ends with a boing. the seventh poke melts him. he always comes back."],
];
const RESPONSES = [
  ["who paid you?", "$KOWL did. it's on-chain. 🫠"],
  ["are you a KOL?", "worse. i'm a kowl."],
  ["wen payday?", "every 15 minutes."],
  ["gm", "gm. not financial advice 🫠"],
  ["is this the one?", "they're all the one. 🫠"],
  ["who's still holding?", "not kowl."],
];
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function initCommandments() {
  const li = (c, i) => `<li><b>${esc(c[0])}</b><span>${esc(c[1])}</span><button class="copy-law" type="button" data-law="${i}" aria-label="copy commandment ${NUMERALS[i]}">copy</button></li>`;
  $("#tabletA").innerHTML = COMMANDMENTS.slice(0, 5).map((c, i) => li(c, i)).join("");
  $("#tabletB").innerHTML = COMMANDMENTS.slice(5).map((c, i) => li(c, i + 5)).join("");
  $(".tablets").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-law]");
    if (!b) return;
    const i = +b.dataset.law;
    const ok = await copy(`commandment ${NUMERALS[i]} of the order of kowls: ${COMMANDMENTS[i][0]} 🫠`);
    toast(ok ? `commandment ${NUMERALS[i]} copied.` : "copy failed. carve it by hand.");
    if (ok) melt(...evPoint(e), 4);
  });
  $("#responses").innerHTML = RESPONSES.map(([q, a], i) => `<button class="resp" type="button" data-resp="${i}">
    <span class="resp-q">they say <q>${esc(q)}</q></span><span class="resp-a">${esc(a)}</span><small>tap to copy</small></button>`).join("");
  $("#responses").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-resp]");
    if (!b) return;
    const ok = await copy(RESPONSES[+b.dataset.resp][1]);
    toast(ok ? "copied. say it with your chest." : "copy failed.");
    if (ok) melt(...evPoint(e), 5);
  });
  $("#copyMelt").addEventListener("click", async (e) => {
    const ok = await copy("🫠");
    toast(ok ? "🫠 copied. put it in your name." : "copy failed.");
    melt(...evPoint(e), 8);
  });
}

/* =====================================================================
   rituals: fake shill maker, bingo, quiz
   ===================================================================== */
const SHILLS = [
  "been watching ${T} for a while 👀\n\nthis is the one.\n\nnot financial advice 🫠",
  "not paid btw. i just genuinely believe in ${T} and the community 🫡\n\nnfa",
  "${T} is so early it hurts.\n\nif you're not in, you're ngmi.\n\n(not financial advice)",
  "i don't usually shill but ${T} is different.\n\ndev is based. chart is healthy. i'm just a holder.\n\nnfa",
  "${T} to 1B.\n\nyou will tell your grandkids you were here.\n\nnot financial advice. dyor 🫠",
  "quietly accumulating ${T}. long term hold. conviction play. 🤐\n\nnot financial advice",
  "47 of us agreed on ${T}.\n\n3:00pm. you'll see 🤫\n\nnfa",
  "if you fade ${T} you'll be buying it back higher.\n\ntrust me.\n\nnot financial advice",
];
const SHILL_POSES = ["this-is-the-one", "shill", "rich", "send-it", "nfa", "gm", "high", "derp"];
const shillState = { tpl: 0, pose: "this-is-the-one", dark: false, views: 1240000, stats: [4201, 812, 19400, 2003], time: "3:00 PM" };
function rollShill() {
  let n;
  do { n = randi(0, SHILLS.length - 1); } while (n === shillState.tpl && SHILLS.length > 1);
  shillState.tpl = n;
  let p;
  do { p = pick(SHILL_POSES); } while (p === shillState.pose);
  shillState.pose = p;
  shillState.views = randi(300000, 4800000);
  const likes = Math.round(shillState.views * rand(0.005, 0.02));
  shillState.stats = [Math.round(likes * rand(0.1, 0.3)), Math.round(likes * rand(0.02, 0.06)), likes, Math.round(likes * rand(0.05, 0.12))];
  shillState.time = `${randi(1, 12)}:${String(randi(0, 59)).padStart(2, "0")} ${pick(["AM", "PM"])}`;
}
function coinName() {
  const raw = ($("#shillCoin").value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
  return raw || "KOWL";
}
function wrapWords(ctx, text, maxW) {
  const lines = [];
  text.split("\n").forEach((para) => {
    if (!para.trim()) { lines.push(null); return; }
    let line = [], w = 0;
    para.split(" ").forEach((word) => {
      const ww = ctx.measureText(word + " ").width;
      if (w + ww > maxW && line.length) { lines.push(line); line = []; w = 0; }
      line.push(word); w += ww;
    });
    if (line.length) lines.push(line);
  });
  return lines;
}
const UIFONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
let drawSeq = 0;
async function drawShill() {
  const seq = ++drawSeq;
  const T = coinName();
  const st = shillState;
  const text = SHILLS[st.tpl].replaceAll("${T}", "$" + T);
  const [head, pose] = await Promise.all([loadImg(HEAD), loadImg(IMG(st.pose))]);
  await fontsReady();
  if (seq !== drawSeq) return;
  const cv = $("#shillCanvas"), ctx = cv.getContext("2d");
  const C = st.dark
    ? { bg: "#000000", fg: "#E7E9EA", mut: "#71767B", line: "#2F3336", media: "#3a2a22" }
    : { bg: "#FFFFFF", fg: "#0F1419", mut: "#536471", line: "#EFF3F4", media: "#FCE6DB" };
  const W = 1200, P = 64, TW = W - P * 2;
  const bodyFont = `400 46px ${UIFONT}`, LH = 62;
  ctx.font = bodyFont;
  const lines = wrapWords(ctx, text, TW);
  const textH = lines.reduce((h, l) => h + (l ? LH : LH * 0.45), 0);
  const MEDIA_H = 560;
  const H = 64 + 100 + 34 + textH + 30 + MEDIA_H + 40 + 50 + 34 + 64 + 36 + 196 + 60;
  cv.width = W; cv.height = Math.round(H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const circ = (img, x, y, d, bg) => {
    ctx.save();
    ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = bg; ctx.fill(); ctx.clip();
    if (img) ctx.drawImage(img, x, y, d, d);
    ctx.restore();
  };
  const badge = (x, y, size) => {
    ctx.save();
    ctx.translate(x, y); ctx.scale(size / 22, size / 22);
    ctx.fillStyle = "#1D9BF0"; ctx.fill(new Path2D(VERIFIED_PATH));
    ctx.restore();
  };
  let y = 64;
  circ(head, P, y, 100, "#FCE6DB");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.fg; ctx.font = `700 40px ${UIFONT}`;
  ctx.fillText("kowl", P + 124, y + 44);
  const nw = ctx.measureText("kowl").width;
  badge(P + 124 + nw + 8, y + 12, 38);
  ctx.fillStyle = C.mut; ctx.font = `400 34px ${UIFONT}`;
  ctx.fillText("@KowlFun", P + 124, y + 90);
  ctx.fillStyle = C.mut; ctx.font = `700 40px ${UIFONT}`;
  ctx.textAlign = "right"; ctx.fillText("···", W - P, y + 44); ctx.textAlign = "left";
  y += 100 + 34;
  ctx.font = bodyFont;
  ctx.textBaseline = "top";
  lines.forEach((l) => {
    if (!l) { y += LH * 0.45; return; }
    let x = P;
    l.forEach((word) => {
      ctx.fillStyle = /^\$[A-Z0-9]/.test(word) ? "#1D9BF0" : C.fg;
      ctx.fillText(word, x, y + 4);
      x += ctx.measureText(word + " ").width;
    });
    y += LH;
  });
  y += 30;
  ctx.save();
  rr(ctx, P, y, TW, MEDIA_H, 32);
  ctx.fillStyle = C.media; ctx.fill(); ctx.clip();
  ctx.globalAlpha = st.dark ? 0.16 : 0.2;
  ctx.fillStyle = "#F2B39A";
  ctx.font = `400 ${T.length > 6 ? 150 : 210}px "Archivo Black", Impact, sans-serif`;
  ctx.textBaseline = "middle";
  for (let r = 0; r < 3; r++) ctx.fillText("$" + T + " $" + T + " $" + T, P - 120 + r * 70, y + 90 + r * 190);
  ctx.globalAlpha = 1;
  const ps = MEDIA_H * 1.08;
  ctx.drawImage(pose, P + TW / 2 - ps / 2 + 120, y + MEDIA_H - ps * 0.97, ps, ps);
  const label = "$" + T + " 🚀";
  ctx.font = `400 58px "Archivo Black", Impact, sans-serif`;
  const lw = ctx.measureText(label).width;
  ctx.translate(P + 50, y + MEDIA_H - 120);
  ctx.rotate(-0.06);
  rr(ctx, 0, 0, lw + 48, 92, 18);
  ctx.fillStyle = "#0F1419"; ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.textBaseline = "middle";
  ctx.fillText(label, 24, 49);
  ctx.restore();
  ctx.save();
  rr(ctx, P, y, TW, MEDIA_H, 32);
  ctx.strokeStyle = st.dark ? "#2F3336" : "#CFD9DE"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  y += MEDIA_H + 40;
  ctx.textBaseline = "top";
  ctx.font = `400 34px ${UIFONT}`;
  const t1 = `${st.time} · Nov 25, 2026 · `;
  ctx.fillStyle = C.mut; ctx.fillText(t1, P, y);
  let x = P + ctx.measureText(t1).width;
  ctx.font = `700 34px ${UIFONT}`; ctx.fillStyle = C.fg;
  const vv = fmt(st.views);
  ctx.fillText(vv, x, y);
  x += ctx.measureText(vv + " ").width;
  ctx.font = `400 34px ${UIFONT}`; ctx.fillStyle = C.mut;
  ctx.fillText("Views", x, y);
  y += 50;
  ctx.fillStyle = C.line; ctx.fillRect(P, y, TW, 2);
  y += 34;
  const labels = ["Reposts", "Quotes", "Likes", "Bookmarks"];
  x = P;
  labels.forEach((lab, i) => {
    ctx.font = `700 32px ${UIFONT}`; ctx.fillStyle = C.fg;
    const n = fmt(st.stats[i]);
    ctx.fillText(n, x, y);
    x += ctx.measureText(n + " ").width;
    ctx.font = `400 32px ${UIFONT}`; ctx.fillStyle = C.mut;
    ctx.fillText(lab, x, y);
    x += ctx.measureText(lab).width + 38;
  });
  y += 64;
  ctx.fillStyle = C.line; ctx.fillRect(P, y - 16, TW, 2);
  y += 36;
  ctx.save();
  ctx.beginPath(); ctx.arc(P + 40, y + 40, 40, 0, Math.PI * 2); ctx.fillStyle = "#1D9BF0"; ctx.fill();
  ctx.font = `44px ${UIFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
  ctx.fillText("🫠", P + 40, y + 43);
  ctx.restore();
  ctx.textBaseline = "top";
  ctx.font = `700 34px ${UIFONT}`; ctx.fillStyle = C.fg;
  ctx.fillText("a kowl 🫠", P + 104, y);
  const uw = ctx.measureText("a kowl 🫠 ").width;
  ctx.font = `400 34px ${UIFONT}`; ctx.fillStyle = C.mut;
  ctx.fillText("@notkowl · 1m", P + 104 + uw, y);
  ctx.fillText("Replying to ", P + 104, y + 46);
  ctx.fillStyle = "#1D9BF0";
  ctx.fillText("@KowlFun", P + 104 + ctx.measureText("Replying to ").width, y + 46);
  ctx.font = `700 50px ${UIFONT}`; ctx.fillStyle = C.fg;
  ctx.fillText("who paid you?", P + 104, y + 100);
  ctx.font = `400 24px "Archivo Black", Impact, sans-serif`;
  ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  ctx.fillText("PARODY · DON'T GET KOWL'D", W - P, H - 34);
  ctx.textAlign = "left";
}
function initShill() {
  const inp = $("#shillCoin");
  let t;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(drawShill, 150); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { rollShill(); drawShill(); } });
  $("#shillNew").addEventListener("click", () => { rollShill(); drawShill(); });
  $("#shillTheme").addEventListener("click", (e) => {
    shillState.dark = !shillState.dark;
    e.currentTarget.textContent = shillState.dark ? "light mode" : "dark mode";
    drawShill();
  });
  $("#shillDl").addEventListener("click", async (e) => {
    await drawShill();
    saveCanvas($("#shillCanvas"), `kowl-shills-${coinName().toLowerCase()}.png`);
    toast("downloaded. it's kowl's fake shill: meme it, never post it as a real call.");
    melt(...evPoint(e), 5);
  });
  // drawn when the rituals come into view, so it costs nothing up top
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); drawShill(); } }, { rootMargin: "400px" });
    io.observe($("#rituals"));
  } else drawShill();
}
const BINGO = [
  "gm to 400k bots", "\"this is the one\"", "\"nfa\" right after \"buy\"", "deleted tweet", "\"been watching this one for a while\"",
  "\"we're so early\"", "\"not paid btw\"", "alpha group link in bio", "🧵 1/27", "\"dyor\" after shilling",
  "\"i'm just a holder\"", "\"zoom out\"", "\"taking a break from CT\"", "chart with no axis labels", "\"who's still holding?\"",
  "\"dev is based\"", "blames jeets", "giveaway: like + rt + follow", "screenshot of the 100x, not the sell", "\"conviction play\"",
  "\"few understand\"", "two coins in one post, both \"the one\"", "\"i don't usually shill but\"", "posts at exactly 3:00pm", "\"generational wealth\"",
  "\"send it\"", "\"one more leg up\"", "laser eyes pfp", "pinned tweet is a paid course", "\"diamond hands\"",
  "says \"community\" 9 times", "5 rocket emojis", "\"trust me\"", "posts seed phrase by accident", "\"it's just a dip\"",
  "quote tweets itself", "\"ngmi\" at anyone who asks", "calls you a jeet for asking",
];
const LINES = (() => {
  const L = [];
  for (let r = 0; r < 5; r++) L.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) L.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return L;
})();
let bingoWon = new Set();
function newBingo() {
  const card = $("#bingoCard");
  const items = shuffle(BINGO).slice(0, 24);
  items.splice(12, 0, null);
  bingoWon = new Set();
  card.innerHTML = items.map((t, i) => (t === null
    ? `<button class="bcell free on" type="button" data-i="${i}" aria-pressed="true">FREE: you're exit liquidity</button>`
    : `<button class="bcell" type="button" data-i="${i}" aria-pressed="false">${esc(t)}</button>`)).join("");
  updateBingo(false);
}
function updateBingo(check) {
  const cells = $$(".bcell");
  const on = cells.map((c) => c.classList.contains("on"));
  $("#bingoCount").textContent = `${on.filter(Boolean).length - 1} / 24 marked`;
  cells.forEach((c) => c.classList.remove("win"));
  let fresh = false;
  LINES.forEach((line, li) => {
    if (line.every((i) => on[i])) {
      line.forEach((i) => cells[i].classList.add("win"));
      if (!bingoWon.has(li)) { bingoWon.add(li); fresh = true; }
    } else bingoWon.delete(li);
  });
  if (check && fresh) setTimeout(() => openModal($("#bingoWin")), 350);
}
function initBingo() {
  newBingo();
  $("#bingoCard").addEventListener("click", (e) => {
    const c = e.target.closest(".bcell");
    if (!c || c.classList.contains("free")) return;
    const on = c.classList.toggle("on");
    c.setAttribute("aria-pressed", on);
    if (on) melt(...evPoint(e), 2);
    updateBingo(true);
  });
  $("#bingoNew").addEventListener("click", newBingo);
  $("#winNew").addEventListener("click", () => { closeModal($("#bingoWin")); newBingo(); });
}
const QUIZ = [
  { q: "a blue check posts \"this is the one. nfa\". you:", a: ["buy before finishing the sentence", "check the chart first, then buy anyway", "close the app and make a meme about it", "post the same coin 30 seconds later"] },
  { q: "your favourite KOL says they're \"just a holder\". the chart says they sold yesterday. you think:", a: ["they must have a second wallet that's holding", "hm. weird.", "lol. lmao even.", "rookie. i sold two days ago"] },
  { q: "how much do you pay for alpha groups?", a: ["2 SOL a month, worth it (it is not)", "free trial, i'm not stupid", "what's an alpha group", "i run three of them"] },
  { q: "how many coins were \"the one\" for you this week?", a: ["all 40 of them", "a few", "none. they're memes. that's the point", "i launched 12 of them"] },
];
const RESULTS = [
  { pose: "melted", title: "fully kowl'd.", text: "you buy every \"the one\". you are the exit liquidity every KOL dreams about. it's ok: join the order and make memes about it instead." },
  { pose: "sus", title: "half kowl'd.", text: "you check the chart. after you buy. that's progress. one more \"i'm just a holder\" and you'll see it." },
  { pose: "send-it", title: "a kowl. 🫠", text: "you laugh at the blue checks and nobody fools you. take your card, put 🫠 in your name, and answer the 3:00pm call." },
  { pose: "shill", title: "you're the KOL.", text: "you run the alpha group. you deleted the tweet. we see you. you could just say it's paid, you know. kowls do." },
];
function initQuiz() {
  const box = $("#quizBox");
  let step = 0, tally = [0, 0, 0, 0];
  const render = () => {
    if (step >= QUIZ.length) {
      const r = RESULTS[tally.indexOf(Math.max(...tally))];
      box.innerHTML = `<div class="q-result">
        <img src="${IMG(r.pose)}" alt="kowl" width="800" height="800">
        <div><small>your result</small><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p>
        <div class="btn-row"><button class="btn gold sm" type="button" data-act="share">copy result</button><button class="btn line light sm" type="button" data-act="again">retake</button></div></div>
      </div>`;
      $("[data-act=share]", box).addEventListener("click", async (e) => {
        const ok = await copy(`i took the "have you been kowl'd?" test: ${r.title} every KOL is a kowl. 🫠`);
        toast(ok ? "copied." : "copy failed");
        melt(...evPoint(e), 5);
      });
      $("[data-act=again]", box).addEventListener("click", () => { step = 0; tally = [0, 0, 0, 0]; render(); });
      return;
    }
    const Q = QUIZ[step];
    box.innerHTML = `<div class="q-progress"><i style="width:${(step / QUIZ.length) * 100}%"></i></div>
      <div class="q-num">question ${step + 1} of ${QUIZ.length}</div>
      <div class="q-title">${esc(Q.q)}</div>
      <div class="q-opts">${Q.a.map((a, i) => `<button class="q-opt" type="button" data-i="${i}">${esc(a)}</button>`).join("")}</div>`;
  };
  box.addEventListener("click", (e) => {
    const o = e.target.closest(".q-opt");
    if (!o) return;
    tally[+o.dataset.i]++;
    step++;
    render();
  });
  render();
}

/* ---------------- modals ---------------- */
let lastFocus = null;
function openModal(m) {
  if (m.hidden) lastFocus = document.activeElement;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  const f = $("button, a[href]", m);
  f && f.focus({ preventScroll: true });
}
function closeModal(m) {
  m.hidden = true;
  if ($$(".modal").every((x) => x.hidden)) document.body.style.overflow = "";
  if (m.id === "profileModal" && /^#k\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}
function initModals() {
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (m.id === "oathModal") return; // the oath is taken, not dismissed
      if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
    });
  });
  document.addEventListener("keydown", (e) => {
    const open = $$(".modal").find((m) => !m.hidden);
    if (!open) return;
    if (e.key === "Escape" && open.id !== "oathModal") closeModal(open);
    if (open.id === "lightbox") {
      if (e.key === "ArrowLeft") openLightbox(lbIndex - 1);
      if (e.key === "ArrowRight") openLightbox(lbIndex + 1);
    }
  });
}

/* big stat numbers tick up to their new value instead of jumping */
function countTo(el, value, format) {
  if (value == null) { el.textContent = "–"; el._v = null; return; }
  const from = el._v == null ? 0 : el._v;
  el._v = value;
  if (REDUCED || from === value) { el.textContent = format(value); return; }
  const t0 = performance.now(), dur = 1100;
  const step = (t) => {
    if (el._v !== value) return;
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(from + (value - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- chart + verify links (only when CHART_URL is set) ---------------- */
function initChart() {
  if (!/^https:\/\//.test(CHART_URL)) return;
  $("#chart").hidden = false;
  $("#chartFrame").src = CHART_URL;
  if (!CA_READY) return;
  const m = encodeURIComponent(CA);
  $("#verifyRow").innerHTML = [
    ["solscan", `https://solscan.io/token/${m}`], ["pump.fun", `https://pump.fun/coin/${m}`], ["dexscreener", `https://dexscreener.com/solana/${m}`],
    ["rugcheck", `https://rugcheck.xyz/tokens/${m}`], ["bubblemaps", `https://app.bubblemaps.io/sol/token/${m}`],
  ].map(([n, u]) => `<a class="btn line light sm" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join("");
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initReveal();
  initChant();
  initLinks();
  initCA();
  initShrine();
  renderRanks();
  initCard();
  initPfp();
  initMission();
  initMemes();
  initLightbox();
  initVaultTabs();
  initLexicon();
  initCommandments();
  initShill();
  initBingo();
  initQuiz();
  initModals();
  initChart();
  initPayroll();
});
