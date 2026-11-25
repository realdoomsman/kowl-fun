/* =====================================================================
   the order of kowls ($KOWL) — fill these in at launch. nothing else needs editing.
   ===================================================================== */
const CA = "41TQSL8UvPVrcVUsQLJkQ92mSA6RPiLkGmQ3NBnrpump";            // paste the contract address here
const LINKS = {
  x: "https://x.com/KowlFun",        // official X: @KowlFun. (@kowl is an unrelated real person: never link it)
  telegram: "#",                     // https://t.me/...
  pump: "https://pump.fun/coin/41TQSL8UvPVrcVUsQLJkQ92mSA6RPiLkGmQ3NBnrpump",                         // https://pump.fun/coin/<CA>
  twitch: "https://twitch.tv/kowlfun", // kowl live
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

/* ---------------- the chant ---------------- */
const CHANT = [
  "every KOL is a kowl", "KOLs get paid in secret", "kowls get paid in public", "don't get kowl'd",
  "who paid you?", "$KOWL did. it's on-chain. 🫠", "kowl has no spine. neither does your favourite KOL",
  "the only KOL program where every paid post says it's paid", "now anyone can be a kowl", "not financial advice 🫠",
];
function initChant() {
  const html = CHANT.filter((h) => !(PRELAUNCH && /\$KOWL/.test(h))).map((h) => `<span>${esc(h)}</span>`).join("");
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
  const bar = $("#launchbar");
  if (bar) {
    bar.hidden = false;
    $("#lbCaText").textContent = CA;
    $("#lbCa").addEventListener("click", async () => {
      const ok = await copy(CA);
      toast(ok ? "CA copied. don't get kowl'd by fakes." : "copy failed. select it by hand.");
    });
  }
}

/* =====================================================================
   kowl's room: the scene is the site. every feature lives in an object;
   clicking one flies the camera in and opens its panel. room.js draws the
   3D (lazy module, WebGL2); without it the same room is a still image map.
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
const IDLE = [
  ["gm chat", "gm"], ["chat is this real", "sus"], ["who's still holding?", "sus"], ["been watching this one for a while", "this-is-the-one"],
  ["3:00pm. you know what to do.", "shill"], ["i'm not paid. (i am. it's on the laptop.)", "rich"], ["don't look at the sticky note", "deleted"],
  ["the mirror says i'm handsome", "gm"], ["anyone want pizza? it's an alpha slice", "derp"], ["poke me. i dare you.", "send-it"],
];
// every object: its handwritten label, what it is, and the panel it opens (or what it does)
const OBJ = {
  laptop: { label: "the laptop", sub: "kowl payroll", panel: "laptop" },
  phone: { label: "kowl's phone", sub: "today's 3:00pm call", panel: "phone" },
  clock: { label: "it's always 3:00pm", sub: "today's call", panel: "phone" },
  tv: { label: "the TV", sub: "kowl's AMA + shorts", panel: "tv" },
  wall: { label: "the polaroid wall", sub: "the meme vault", panel: "wall" },
  mirror: { label: "the mirror", sub: "get your kowl", panel: "mirror" },
  door: { label: "the door", sub: "join the order", panel: "door" },
  cert: { label: "blue check certificate", sub: "your kowl card", panel: "door" },
  note: { label: "\"seed phrase\"", sub: "the commandments", panel: "note" },
  trash: { label: "deleted tweets", sub: "the KOL dictionary", panel: "trash" },
  mon2: { label: "the alpha group", sub: "chat · bingo · quiz", panel: "alpha" },
  mon1: { label: "the chart", sub: "fake shill maker", panel: "shill" },
  chain: { label: "the gold chain", sub: "the hierarchy", panel: "chain" },
  window: { label: "the window", sub: "kowl live · X", panel: "window" },
  neon: { label: "kowl live", sub: "the stream", panel: "window" },
  safe: { label: "the safe", sub: "coin not live yet", panel: "safe" },
  bed: { label: "the bed", sub: "mental health break", toy: "bed" },
  pizza: { label: "pizza", sub: "an alpha slice", toy: "pizza" },
  drinks: { label: "MELT energy", sub: "0% spine", toy: "drinks" },
  ring: { label: "the ring light", sub: "content mode", toy: "ring" },
  kowl: { label: "kowl", sub: "poke him · drag him · throw him" },
};
const PANEL_OBJ = { laptop: "laptop", phone: "phone", tv: "tv", wall: "wall", mirror: "mirror", door: "door", note: "note", trash: "trash", alpha: "mon2", shill: "mon1", chain: "chain", window: "window", safe: "safe" };
const PANEL_HASH = { laptop: "payroll", phone: "call", tv: "tv", wall: "vault", mirror: "mirror", door: "order", note: "commandments", trash: "lexicon", alpha: "alpha", shill: "shill", chain: "chain", window: "live", safe: "coin" };
const HASH_PANEL = {
  ...Object.fromEntries(Object.entries(PANEL_HASH).map(([p, h]) => [h, p])),
  sanctum: "laptop", initiation: "laptop", bagPanel: "laptop", board: "laptop", congregation: "laptop", mission: "phone", creed: "door",
  card: "door", rituals: "alpha", hierarchy: "chain", stream: "window", ca: "safe",
};
const R = { room: null, mode: "loading", panel: null, pokes: 0, bubbleT: 0, lastSay: 0, hover: null, hoverX: 0, hoverY: 0, slow: 0, lastFocus: null, stills: null };
try { R.pokes = +localStorage.getItem("kowl-pokes") || 0; } catch { /* private mode */ }
const sfx = (n) => window.SFX && window.SFX.play(n);
const isDesk = () => innerWidth > 860 && innerHeight > 520;

function say(text, sec = 2.8) {
  const b = $("#bubble");
  b.textContent = text;
  b.hidden = false;
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  clearTimeout(R.bubbleT);
  R.bubbleT = setTimeout(() => { b.hidden = true; }, sec * 1000);
  R.lastSay = Date.now();
  R.room && R.room.talk(Math.min(2.2, text.length / 14));
}
function express(pose, sec = 2.6) { R.room && R.room.setExpression(pose, sec); }
function countPoke(n, melting) {
  R.pokes = n;
  try { localStorage.setItem("kowl-pokes", String(n)); } catch { /* private mode */ }
  hideHint();
  if (melting) { say("🫠", 5); sfx("melt"); return; }
  sfx("squish");
  const pose = pick(POKE_POSES);
  say(pick(POSES[pose]));
  express(pose, 2.6);
  return pose;
}

/* ---- toys: things that don't open a panel, they just make kowl do something ---- */
const TOYS = {
  bed() { say("taking a break from CT for mental health 🙏", 3.5); sfx("snore"); if (R.room) { R.room.sleep(true); setTimeout(() => R.room.sleep(false), 6500); } },
  pizza() { say(pick(["that's an alpha slice. you're late.", "long-term hold (it's from tuesday)", "the missing slice was a paid partnership"])); express("high", 2.4); sfx("poke"); },
  drinks() { say(pick(["MELT energy: 0% spine, 100% cope", "can number 14. i'm fine.", "sponsored. (it's disclosed. look, a kowl.)"])); sfx("can"); R.room && R.room.poke(); },
  ring() { say(pick(["lighting is everything. so is the paid partnership toggle.", "content mode: on", "is my blue check visible? the sticker keeps peeling"])); express("gm", 2.4); sfx("switch"); },
};

/* ---- the hover label: handwritten, pinned above the thing ---- */
function showLabel(key) {
  const l = $("#label"), o = OBJ[key];
  if (!o) { l.classList.remove("on"); return; }
  $("b", l).textContent = o.label;
  $("span", l).textContent = o.sub;
  l.classList.add("on");
}
function placeLabel() {
  const l = $("#label");
  if (!R.hover || !l.classList.contains("on")) return;
  // kowl's own label would sit under his speech bubble: he can introduce himself
  l.classList.toggle("mute", R.hover === "kowl" && !$("#bubble").hidden);
  let p = null;
  if (R.room) p = R.room.labelAt(R.hover);
  if (!p) return;
  const [x, y] = p;
  l.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}
function placeBubble() {
  const b = $("#bubble");
  if (b.hidden) return;
  let x, y;
  if (R.room) [x, y] = R.room.projectHead();
  else if (R.stills) { const r = stillRect("kowl"); if (!r) return; x = r.left + r.width / 2; y = r.top; }
  else return;
  b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}
function uiLoop() {
  placeLabel();
  placeBubble();
  requestAnimationFrame(uiLoop);
}

/* ---- panels ---- */
const PANEL_HOOKS = {
  laptop() { sfx("type"); if (typeof loadMe === "function") loadMe(); },
  phone() { sfx("ping"); },
  door() { printCard(); },
  shill() { if (!shillState.drawn) { shillState.drawn = true; drawShill(); } },
  alpha() { chatStart(); },
  window() { skyLine(); },
  safe() { sfx("safe"); express("sus", 2.5); },
  tv() { sfx("switch"); },
};
function openPanel(name, key) {
  const p = $("#p-" + name);
  if (!p) return;
  closeIndex();
  if (R.panel === name) return;
  if (R.panel) hidePanel(R.panel);
  key = key || PANEL_OBJ[name];
  R.lastFocus = R.lastFocus || document.activeElement;
  R.panel = name;
  p.hidden = false;
  p.classList.remove("out");
  // grow out of the object it belongs to
  const pr = p.getBoundingClientRect();
  let ox = pr.width / 2, oy = pr.height / 2;
  const r = R.room ? R.room.rectOf(key) : stillRect(key);
  if (r) {
    const cx = (r.x != null ? r.x + r.w / 2 : r.left + r.width / 2), cy = (r.y != null ? r.y + r.h / 2 : r.top + r.height / 2);
    ox = cx - pr.left; oy = cy - pr.top;
  }
  p.style.transformOrigin = `${Math.round(ox)}px ${Math.round(oy)}px`;
  p.classList.remove("in"); void p.offsetWidth; p.classList.add("in");
  document.body.classList.add("has-panel");
  document.body.dataset.panel = name;
  R.hover = null; showLabel(null);
  if (R.room) { R.room.flyTo(key); setShift(); }
  sfx("open");
  hideHint();
  PANEL_HOOKS[name] && PANEL_HOOKS[name]();
  if (location.hash !== "#" + PANEL_HASH[name] && !/^#k\//.test(location.hash)) history.replaceState(null, "", "#" + PANEL_HASH[name]);
  const h = $("h2", p);
  if (h) { h.tabIndex = -1; setTimeout(() => h.focus({ preventScroll: true }), 30); }
}
function hidePanel(name) {
  const p = $("#p-" + name);
  if (!p) return;
  p.classList.remove("in");
  p.classList.add("out");
  $$("video", p).forEach((v) => v.pause());
  setTimeout(() => { if (R.panel !== name) { p.hidden = true; p.classList.remove("out"); } }, 220);
}
function closePanel() {
  if (!R.panel) return;
  hidePanel(R.panel);
  if (R.panel === "alpha") chatStop();
  R.panel = null;
  document.body.classList.remove("has-panel");
  delete document.body.dataset.panel;
  if (R.room) { R.room.flyHome(); R.room.setShift(0, 0); }
  sfx("close");
  if (location.hash && !/^#k\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  const f = R.lastFocus;
  R.lastFocus = null;
  if (f && f.focus && document.contains(f) && f !== document.body) f.focus({ preventScroll: true });
}
function setShift() {
  if (!R.room) return;
  if (!R.panel) { R.room.setShift(0, 0); return; }
  const p = $("#p-" + R.panel).getBoundingClientRect();
  if (isDesk()) R.room.setShift(Math.min(p.width, innerWidth * 0.6) / 2, 0);
  else R.room.setShift(0, Math.max(0, innerHeight / 2 - (innerHeight - p.height) / 2 + 10));
}
function pickThing(key, kind) {
  const o = OBJ[key];
  if (!key) { if (R.panel) closePanel(); return; }
  if (!o) return;
  hideHint();
  if (o.toy) { if (R.panel) closePanel(); TOYS[o.toy](); return; }
  if (!o.panel) return;
  if (kind === "touch" || kind === "pen") {
    // on touch: show the label and the glow for a beat, then go in
    R.hover = key; showLabel(key); R.room && R.room.hover(key);
    setTimeout(() => { R.room && R.room.hover(null); openPanel(o.panel, key); }, 320);
    return;
  }
  openPanel(o.panel, key);
}

/* ---- the index (menu): every object, for keyboards, screen readers and the impatient ---- */
function openIndex() { document.body.classList.add("index-open"); $("#menuBtn").setAttribute("aria-expanded", "true"); const a = $("#index a"); a && a.focus({ preventScroll: true }); }
function closeIndex() { if (!document.body.classList.contains("index-open")) return; document.body.classList.remove("index-open"); $("#menuBtn").setAttribute("aria-expanded", "false"); }
function initIndex() {
  $("#menuBtn").addEventListener("click", () => (document.body.classList.contains("index-open") ? closeIndex() : openIndex()));
  $$("[data-open]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    openPanel(a.dataset.open);
    if (a.dataset.vaultOpen) $(`[data-vault="${a.dataset.vaultOpen}"]`).click();
  }));
  $$("[data-close]").forEach((b) => { if (b.closest(".panel")) b.addEventListener("click", closePanel); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($$(".modal").some((m) => !m.hidden)) return;
    if (document.body.classList.contains("index-open")) { closeIndex(); $("#menuBtn").focus(); return; }
    closePanel();
  });
  document.addEventListener("pointerdown", (e) => {
    if (document.body.classList.contains("index-open") && !e.target.closest("#index, #menuBtn")) closeIndex();
  });
  // in-page links from the old sections (#mission, #vault, #bagPanel…) open the right object
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.dataset.open) return;
    const h = a.getAttribute("href").slice(1);
    if (HASH_PANEL[h]) { e.preventDefault(); closeModalsQuiet(); openPanel(HASH_PANEL[h]); }
  });
  addEventListener("hashchange", () => { const h = location.hash.slice(1); if (HASH_PANEL[h]) openPanel(HASH_PANEL[h]); });
  addEventListener("resize", () => setShift());
}
function closeModalsQuiet() { $$(".modal").forEach((m) => { if (!m.hidden && m.id !== "oathModal") closeModal(m); }); }
function routeOnLoad() {
  const h = location.hash.slice(1);
  if (HASH_PANEL[h]) openPanel(HASH_PANEL[h]);
}

/* ---- the first-time hint ---- */
let hintT = 0;
function showHint() {
  let seen = false;
  try { seen = !!localStorage.getItem("kowl-visited"); localStorage.setItem("kowl-visited", "1"); } catch { /* private mode */ }
  if (seen && R.pokes) return;
  if (matchMedia("(pointer: coarse)").matches) { $("#hint span").textContent = "tap things."; $("#hint small").textContent = "drag kowl. fling him. he's fine."; }
  $("#hint").hidden = false;
  requestAnimationFrame(() => $("#hint").classList.add("on"));
  hintT = setTimeout(hideHint, 15000);
}
function hideHint() {
  const h = $("#hint");
  if (h.hidden) return;
  h.classList.remove("on");
  clearTimeout(hintT);
  setTimeout(() => { h.hidden = true; }, 400);
}

/* ---- the still fallback: the same room as an image map ---- */
function stillRect(key) {
  const b = $(`#hotLayer [data-key="${key}"]`);
  return b ? b.getBoundingClientRect() : null;
}
async function startStill(reason) {
  if (R.mode === "still") return;
  R.mode = "still";
  if (R.room) { R.room.pause(); R.room = null; }
  document.body.classList.add("is-still");
  document.body.classList.remove("is-3d");
  $("#still").removeAttribute("aria-hidden");
  try { R.stills = R.stills || await (await fetch("room/stills.json")).json(); } catch { R.stills = null; }
  const build = () => {
    const portrait = matchMedia("(orientation: portrait)").matches;
    const rects = R.stills && R.stills[portrait ? "1080x1920" : "1920x1080"];
    if (!rects) { $("#hotLayer").innerHTML = ""; return; }
    // every target at least 44px (touch guidelines), kept inside the frame; toys stay out of the image map so their
    // big boxes can't swallow the things that matter. smaller targets go last so they sit on top of bigger ones.
    const box = $("#stillBox").getBoundingClientRect();
    const minW = (44 / Math.max(1, box.width)) * 100, minH = (44 / Math.max(1, box.height)) * 100;
    const hits = Object.keys(rects).filter((k) => OBJ[k] && !OBJ[k].toy).map((k) => {
      let [x, y, w, h] = rects[k];
      if (w < minW) { x -= (minW - w) / 2; w = minW; }
      if (h < minH) { y -= (minH - h) / 2; h = minH; }
      const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(100, x + w), y1 = Math.min(100, y + h);
      return { k, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }).filter((r) => r.w > minW * 0.5 && r.h > minH * 0.5).sort((a, b) => b.w * b.h - a.w * a.h);
    $("#hotLayer").innerHTML = hits.map(({ k, x, y, w, h }) => {
      const o = OBJ[k];
      return `<button class="hs-btn" type="button" data-key="${k}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${w.toFixed(2)}%;height:${h.toFixed(2)}%" aria-label="${esc(o.label + ": " + o.sub)}"><span class="hot-l"><b>${esc(o.label)}</b><small>${esc(o.sub)}</small></span></button>`;
    }).join("");
  };
  build();
  matchMedia("(orientation: portrait)").addEventListener("change", build);
  addEventListener("resize", build);
  $("#hotLayer").addEventListener("click", (e) => {
    const b = e.target.closest(".hs-btn");
    if (!b) return;
    const k = b.dataset.key;
    if (k === "kowl") { const n = R.pokes + 1; countPoke(n, n % 7 === 0); melt(...evPoint(e), n % 7 === 0 ? 10 : 3); return; }
    pickThing(k, "mouse");
  });
  $("#hotLayer").addEventListener("pointerover", (e) => { const b = e.target.closest(".hs-btn"); if (b) sfx("hover"); });
  finishLoading();
  if (reason) console.info("kowl's room: still mode,", reason);
}

/* ---- the loader: kowl waking up ---- */
let loadedOnce = false;
function finishLoading() {
  if (loadedOnce) return;
  loadedOnce = true;
  const L = $("#loader");
  $("#loaderBar").style.width = "100%";
  L.classList.add("awake");
  $("#loaderT").textContent = "gm.";
  $("#loaderS").textContent = R.mode === "still" ? "(the 3D room is asleep on this device. the doors all still work.)" : "come in. don't touch the seed phrase.";
  setTimeout(() => {
    L.classList.add("gone");
    setTimeout(() => { L.hidden = true; }, 700);
    document.body.classList.add("ready");
    routeOnLoad();
    if (!R.panel) {
      showHint();
      setTimeout(() => { if (!R.panel) { say(R.pokes ? "oh. you're back. gm." : "gm. click things. (poke me too.)", 3.4); express("gm", 3); } }, 600);
    }
  }, REDUCED ? 200 : 1100);
}

/* ---- the 3D room ---- */
function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch { return false; }
}
async function bootRoom() {
  const q = new URLSearchParams(location.search);
  if (q.has("still")) return startStill("asked for it");
  if (!webglOK()) return startStill("no WebGL2");
  const small = matchMedia("(max-width: 760px), (max-height: 560px)").matches;
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.connection && navigator.connection.saveData);
  const mobile = small || matchMedia("(pointer: coarse)").matches;
  const atlasUrl = small || weak ? "room/atlas-2k.webp" : "room/atlas-4k.webp";
  const guard = setTimeout(() => { if (!R.room) startStill("took too long"); }, 25000);
  try {
    const m = await import("./room.js?v=7");
    if (R.mode === "still") return;
    const room = await m.start({
      canvas: $("#room3d"), mobile, reduced: REDUCED, atlasUrl,
      onProgress: (p) => { $("#loaderBar").style.width = Math.round(8 + p * 88) + "%"; },
      onHover: (key, x, y, same) => {
        if (R.panel && key) { R.hover = null; showLabel(null); return; }
        if (!same) { R.hover = key; showLabel(key); if (key) sfx("hover"); }
      },
      onPick: (key, x, y, kind) => pickThing(key, kind),
      onPoke: (n, melting) => { countPoke(n, melting); },
      onKowl: (ev, v) => {
        hideHint();
        if (ev === "grab") { say(pick(["put me down!!", "unhand me, i'm verified", "this is not financial advice", "wheee"]), 1.8); sfx("poke"); }
        else if (ev === "throw") { if (v > 1.5) sfx("whoosh"); }
        else if (ev === "land") { sfx(v > 4 ? "thud" : "boing"); if (v > 3 && Date.now() - R.lastSay > 1500) say(pick(["ow", "i'm fine (i'm not)", "-90%", "that's a dip. just a dip.", "rugged"]), 1.6); }
        else if (ev === "bump") sfx("thud");
        else if (ev === "respawn") { say("i got rugged off the map", 2.6); sfx("whoosh"); }
        else if (ev === "hop") sfx("boing");
        else if (ev === "home") say(pick(["anyway. gm.", "where was i. oh right: this is the one.", "back to work (posting)"]), 2.4);
        else if (ev === "reformed") { say("i'm back. bags still down.", 2.6); sfx("reform"); }
      },
      onFps: (fps, quality) => {
        // a device that can't hold ~18fps at the lowest resolution gets the image map
        if (fps < 18 && quality <= 0.56) { if (++R.slow >= 3) startStill("too slow"); } else R.slow = 0;
      },
    });
    clearTimeout(guard);
    if (R.mode === "still") { room.pause(); return; }
    R.room = room;
    R.mode = "3d";
    room.pokes = R.pokes;
    document.body.classList.add("is-3d");
    feedRoom();
    document.addEventListener("visibilitychange", () => { if (!R.room) return; if (document.hidden) R.room.pause(); else R.room.resume(); });
    finishLoading();
  } catch (err) {
    clearTimeout(guard);
    console.warn("kowl's room: falling back to the still", err && err.message);
    startStill("3D failed");
  }
}
// the screens in the room show live things: payroll stats, today's call, the TV
function feedRoom() {
  if (!R.room) return;
  Promise.all(["video/kowl_ama.jpg", "video/clip_who_paid_you.jpg", "video/clip_the_one.jpg", "video/clip_seed_phrase.jpg"].map((s) => loadImg(s).catch(() => null)))
    .then((imgs) => R.room && R.room.setTV(imgs.filter(Boolean)));
  if (mission.m) loadImg(mission.thumb).then((img) => R.room && R.room.setMission(mission.m, img)).catch(() => {});
  if (typeof pr !== "undefined" && pr.stats) R.room.setStats(pr.stats);
}

/* ---- idle chatter ---- */
function initChatter() {
  setInterval(() => {
    if (document.hidden || R.panel || !loadedOnce || Date.now() - R.lastSay < 14000) return;
    if (R.room && R.room.kowlMode() !== "seat") return;
    const [line, pose] = pick(IDLE);
    say(line, 3);
    express(pose, 3);
  }, 9000);
}

/* ---- easter eggs: type "nfa", "gm", "kowl123" or "wagmi" anywhere ---- */
function initEggs() {
  let buf = "";
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    buf = (buf + e.key.toLowerCase()).slice(-12);
    if (buf.endsWith("nfa")) { buf = ""; nfa(); }
    else if (buf.endsWith("kowl123")) {
      buf = "";
      openPanel("safe");
      $("#safeNote").textContent = "password accepted. the safe is empty. kowl spent it all on MELT energy drinks. (this is why you don't use kowl123.)";
      say("HOW did you know my password", 3); express("facepalm", 3);
    } else if (buf.endsWith("wagmi")) { buf = ""; say("we're not all gonna make it. i am, though.", 3); express("rich", 3); }
    else if (buf.endsWith("gm") && !buf.endsWith("ngm")) { buf = ""; say("gm 🫠", 2); express("gm", 2.4); }
  });
}
function nfa() {
  const s = $("#stamp");
  s.hidden = false;
  s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit");
  sfx("stamp");
  say("not financial advice 🫠", 3);
  express("nfa", 3);
  melt(innerWidth / 2, innerHeight / 2, 14);
  setTimeout(() => { s.hidden = true; }, 1900);
}

/* ---- sound ---- */
function initSound() {
  const b = $("#soundBtn");
  const sync = () => { const on = window.SFX && window.SFX.on; b.setAttribute("aria-pressed", String(!!on)); b.setAttribute("aria-label", on ? "sound on. turn sound off" : "sound off. turn sound on"); b.classList.toggle("on", !!on); };
  b.addEventListener("click", () => { window.SFX && window.SFX.toggle(); sync(); });
  document.addEventListener("kowl-sound", sync);
  sync();
}

/* ---- the TV: channels ---- */
function initTV() {
  const v = $("#sermonVideo");
  $("#channels").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]");
    if (!b) return;
    $$("#channels button").forEach((x) => x.classList.toggle("on", x === b));
    v.poster = b.dataset.poster;
    v.src = b.dataset.src;
    $("#t-tv").innerHTML = `${esc(b.dataset.title)} <small>${esc(b.dataset.len)}</small>`;
    sfx("switch");
    v.play().catch(() => {});
  });
}

/* ---- the alpha group chat (a dramatisation, all made-up kowls) ---- */
const ALPHA = [
  ["alpha kowl 🐋", "ok team. 3:00pm sharp. same chart, same words"], ["0xkowl", "who dumps first this time"], ["kowl", "not me 🫡"],
  ["kowlcapital", "remember to say nfa"], ["alpha kowl 🐋", "and DON'T say it's paid"], ["kowlresearch", "47 of us posting the same chart is so organic"],
  ["kowl", "been watching this one for a while"], ["notkowl", "you bought it 4 minutes ago"], ["kowl", "a while"], ["kowl_eth", "my tweet is drafted. thread 1/27"],
  ["alpha kowl 🐋", "2:59. hold"], ["kowl", "posted"], ["alpha kowl 🐋", "KOWL IT'S 2:58"], ["kowlcalls", "he always does this"], ["kowl", "i'm just a holder"],
  ["0xkowl", "chart's -60%"], ["kowl", "zoom out"], ["kowl_eth", "who's still holding"], ["kowl", "*deletes tweet*"], ["system", "kowl changed the group name to \"mental health break\""],
  ["alpha kowl 🐋", "meanwhile those kowls just say it's paid. on everything."], ["kowlresearch", "disgusting. honest."], ["kowl", "can i join them"], ["system", "kowl left the group"],
];
let chatI = 0, chatTimer = 0;
function chatPush() {
  const box = $("#tgChat");
  const [who, msg] = ALPHA[chatI++ % ALPHA.length];
  const el = document.createElement("div");
  el.className = who === "system" ? "tg-sys" : "tg-msg" + (who === "kowl" ? " me" : "");
  el.innerHTML = who === "system" ? esc(msg) : `<b style="--h:${(who.length * 47) % 360}">${esc(who)}</b><span>${esc(msg)}</span><i>${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</i>`;
  box.appendChild(el);
  while (box.children.length > 40) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
  if (who === "kowl") sfx("ping");
}
function chatStart() {
  if (!$("#tgChat").children.length) for (let i = 0; i < 6; i++) chatPush();
  clearInterval(chatTimer);
  chatTimer = setInterval(chatPush, REDUCED ? 4000 : 2100);
}
function chatStop() { clearInterval(chatTimer); }

/* ---- the card printer on the door ---- */
function printCard() {
  drawMyCard();
  const f = $("#cardFig");
  f.classList.remove("printing"); void f.offsetWidth; f.classList.add("printing");
  sfx("print");
}

/* ---- the window's caption follows the real time of day ---- */
function skyLine() {
  const h = new Date().getHours();
  $("#skyLine").textContent = h >= 7 && h < 17 ? "it's daytime outside. kowl hasn't been outside since the last bull run."
    : h >= 17 && h < 20 ? "the sun's going down. kowl's 3:00pm call has already been deleted."
      : "it's night. kowl is awake. kowl is always awake.";
}

function initRoomUI() {
  initIndex();
  initSound();
  initTV();
  initChatter();
  initEggs();
  $("#cardPrint").addEventListener("click", printCard);
  if (window.SFX && window.SFX.wanted()) {
    // browsers need a gesture before audio: resume on the first one
    const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); window.SFX.set(true); };
    addEventListener("pointerdown", go); addEventListener("keydown", go);
  }
  uiLoop();
  bootRoom();
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
   the 3:00pm call (kowl's phone): one mission a day at 15:00 UTC, the same
   for everyone, from missions.json (content/missions.json: the 30 calls)
   ===================================================================== */
const CALL_EPOCH = Date.UTC(2026, 10, 25, 15); // call no. 1 dropped 25 nov 2026, 15:00 UTC
const DAY = 86400000;
// before launch nobody posts the $KOWL cashtag (copycat tickers). captions switch to the "paid by $KOWL" form once CA is set.
const PRELAUNCH = !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(CA);
const coinFree = (s) => s.replace(/\s*\(?paid by \$KOWL\)?[.,:]?/gi, "").replace(/\s*\$KOWL\b/g, "").replace(/[.,]?\s*(make memes, )?get paid in public\.?/gi, ".").replace(/\s*100% of creator fees\.?/gi, "").replace(/\.\./g, ".").replace(/[ \t]+\n/g, "\n").trim();
const CAPTIONS = PRELAUNCH ? [
  (m) => m.caption_prelaunch,
  (m) => `today's call: ${m.title}\n\n${m.caption_prelaunch}`,
  (m) => `${m.caption_prelaunch}\n\nfollow @KowlFun`,
] : [
  (m) => m.caption,
  (m) => `${m.caption}\n\ntoday's call: ${m.title}`,
];
let MISSIONS = [];
const mission = { n: 0, cap: 0, m: null, file: "", thumb: "", next: 0 };
function callNow() {
  if (Date.now() < CALL_EPOCH) return { n: -1, next: CALL_EPOCH };
  const n = Math.floor((Date.now() - CALL_EPOCH) / DAY);
  return { n, next: CALL_EPOCH + (n + 1) * DAY };
}
function renderMission() {
  if (!MISSIONS.length) return;
  const { n, next } = callNow();
  const m = MISSIONS[Math.max(n, 0) % MISSIONS.length];
  mission.n = n; mission.next = next; mission.m = m;
  mission.file = (PRELAUNCH && m.meme_prelaunch) || m.meme;
  mission.thumb = (PRELAUNCH && m.thumb_prelaunch) || m.thumb;
  $("#callPrompt").textContent = m.title;
  $("#callIdea").textContent = `make your own: ${m.prompt}`;
  const day = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toLowerCase();
  $("#callTag").textContent = n < 0
    ? `the first call drops ${day(CALL_EPOCH)}, 15:00 UTC`
    : `call no. ${n + 1} · dropped ${day(CALL_EPOCH + n * DAY)}, 15:00 UTC`;
  $("#callNextLbl").textContent = n < 0 ? "first call in" : "next call in";
  $("#missionImg").src = mission.thumb;
  $("#missionImg").alt = m.title;
  $("#missionDl").href = mission.file;
  $("#missionDl").setAttribute("download", mission.file.split("/").pop());
  renderCaption();
  if (R.room) loadImg(mission.thumb).then((img) => R.room && R.room.setMission(m, img)).catch(() => {});
}
function renderCaption() {
  $("#missionText").value = CAPTIONS[mission.cap % CAPTIONS.length](mission.m).replace(/[’]/g, "'");
  syncIntent();
}
function syncIntent() { $("#missionPost").href = intentFor($("#missionText").value); }
function tickCall() {
  const left = Math.max(0, mission.next - Date.now());
  const s = Math.floor(left / 1000);
  const cd = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  $("#callCountdown").textContent = cd;
  $("#phoneTime").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  R.room && R.room.setCountdown(cd);
  if (left <= 0 && MISSIONS.length) { renderMission(); toast("kowl just dropped the 3:00pm call. 🫠"); sfx("ping"); }
}
async function initMission() {
  if (!PRELAUNCH) {
    $(".mission-stamp").innerHTML = "paid<br>by $KOWL";
    $('label[for="missionText"] small').textContent = "(starts with \"paid by $KOWL\": that's the rule and the joke)";
    $(".mission-steps").innerHTML = "<li><b>download</b> the meme (X's post button can't attach it for you).</li><li><b>post</b> with the caption, attach the image, turn on X's Paid Partnership label.</li><li><b>paste the link</b> into the laptop's bagwork box. checked in seconds, +8 points.</li>";
  }
  $("#missionText").addEventListener("input", syncIntent);
  $("#missionReroll").addEventListener("click", () => { mission.cap++; renderCaption(); });
  $("#missionCopy").addEventListener("click", async (e) => {
    const ok = await copy($("#missionText").value);
    toast(ok ? (PRELAUNCH ? "caption copied. go post it." : "caption copied. turn on Paid Partnership when you post.") : "copy failed. select it by hand.");
    if (ok) melt(...evPoint(e), 4);
  });
  $("#missionPost").addEventListener("click", () => toast(PRELAUNCH ? "attach the meme you downloaded, then post." : "attach the meme, turn on Paid Partnership, then paste the link in the laptop."));
  $("#missionDl").addEventListener("click", () => toast("downloaded. now post it."));
  setInterval(tickCall, 1000);
  try {
    const res = await fetch("missions.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    MISSIONS = (await res.json()).filter((m) => m && m.meme && m.title);
  } catch {
    $("#callPrompt").textContent = "kowl's phone has no signal. refresh in a sec.";
    return;
  }
  renderMission();
  tickCall();
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
    // before launch the vault (free ammo for posting) leaves out the memes whose image shows $KOWL or payroll
    memes = (await res.json()).filter((m) => m && m.file && !(PRELAUNCH && /^memes\/(21|28|29|30|32|33)_/.test(m.file)));
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
}
function openLightbox(i) {
  lbIndex = (i + memes.length) % memes.length;
  const m = memes[lbIndex];
  $("#lbImg").src = m.file;
  $("#lbImg").alt = m.caption || "kowl meme";
  $("#lbCap").textContent = PRELAUNCH ? coinFree(m.caption || "") : m.caption || "";
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
    const base = (m.caption || "").replace(/[’]/g, "'");
    window.open(intentFor(PRELAUNCH ? `${coinFree(base)}\n\nevery KOL is a kowl 🫠` : `paid by $KOWL 🫠\n\n${base}`), "_blank", "noopener");
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
  tabs("term", "term-pane");
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
  return raw || (PRELAUNCH ? "THEONE" : "KOWL"); // no $KOWL cashtag images before launch
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
  // each feature boots on its own: one that throws costs that feature, never the room
  [initChant, initLinks, initCA, renderRanks, initCard, initPfp, initMission, initMemes, initLightbox, initVaultTabs, initLexicon,
    initCommandments, initShill, initBingo, initQuiz, initModals, initChart, initPayroll, initRoomUI].forEach((f) => {
    try { const r = f(); if (r && r.catch) r.catch((e) => console.error(f.name, e)); } catch (e) { console.error(f.name, e); }
  });
});
