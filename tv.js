/* =====================================================================
   KOWL TV broadcast layer: channels, OSD + static, kowl cam (PIP),
   live chat, clock, sound (off by default), the 2D poke toy that runs
   until (or instead of) the 3D studio, lore widgets, lazy video.
   helpers ($, $$, esc, toast, melt, pick, rand, randi, commas, REDUCED,
   IMG, POSES, POKE_POSES, DICT) come from app.js; pr/countdown/sol from payroll.js.
   ===================================================================== */
const TV = { ch: 1, mode: "hero", k3d: null, gl: false, pokes: 0, pipMin: false, basePose: "idle", busyT: 0 };

/* ---------------- sound: tiny WebAudio synth, off by default ---------------- */
const SFX = {
  ctx: null, on: false,
  ensure() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, to, dur, type = "sine", vol = 0.25, delay = 0) {
    const a = this.ensure(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.18, vol = 0.12) {
    const a = this.ensure(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.6; g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  },
  play(name) {
    if (!this.on) return;
    switch (name) {
      case "boing": this.tone(420 + Math.random() * 120, 90, 0.38); break;
      case "blip": this.tone(880, 1320, 0.07, "square", 0.06); break;
      case "static": this.noise(0.2, 0.1); break;
      case "melt": this.tone(620, 55, 1.1, "sine", 0.28); this.tone(310, 40, 1.2, "triangle", 0.12, 0.05); break;
      case "cash": this.tone(1318, 0, 0.12, "triangle", 0.18); this.tone(1568, 0, 0.3, "triangle", 0.18, 0.09); break;
      case "jingle": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0, 0.22, "triangle", 0.16, i * 0.11)); this.tone(1047, 0, 0.5, "sine", 0.1, 0.44); break;
    }
  },
};
function initSound() {
  const b = $("#sndBtn");
  b.addEventListener("click", () => {
    SFX.on = !SFX.on;
    b.setAttribute("aria-pressed", SFX.on);
    b.setAttribute("aria-label", SFX.on ? "sound is on" : "sound is off");
    b.classList.toggle("on", SFX.on);
    if (SFX.on) SFX.play("jingle");
    toast(SFX.on ? "sound on. kowl tv jingle (paid for by nobody)." : "sound off.");
  });
}

/* ---------------- clock, viewers, live chat ---------------- */
function initClock() {
  const el = $("#clock"), w = $("#watching");
  let viewers = 1204331;
  const tick = () => {
    const d = new Date();
    el.textContent = d.toTimeString().slice(0, 8);
    viewers = Math.max(900000, viewers + randi(-900, 1400));
    w.textContent = commas(viewers);
  };
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
}
const CHAT_NAMES = ["notkowl", "kowl_eth", "alphakowl", "0xkowl", "kowlresearch", "kowlcalls", "kowlcapital", "blobwatcher", "exitliq_48", "jeet_fren"];
const CHAT_LINES = [
  "who paid you?", "🫠🫠🫠", "is this the one?", "$KOWL did. it's on-chain. 🫠", "nfa", "kowl blink twice if paid",
  "gm", "dyor (kowl didn't)", "the reply has more likes than the post lol", "put 🫠 in your name", "kowl123 💀",
  "been watching this chat for a while (4 min)", "poke him", "poke him 7 times trust me", "47 of us agreed on this chat",
  "where's the CA", "CA only from kowl.fun or @KowlFun. never DMs", "payday every 15 min??", "first", "my bags are kowl'd",
  "ok but the chain is kinda hard", "who's still holding 👇", "taking a break from chat (types 41 more times)",
];
function initChat() {
  const list = $("#chatList");
  if (!list) return;
  const add = (name, text, mod) => {
    const li = document.createElement("li");
    if (mod) li.className = "mod";
    li.innerHTML = `<b>${mod ? "🛡 " : ""}@${esc(name)}</b> ${esc(text)}`;
    list.appendChild(li);
    while (list.children.length > 9) list.firstElementChild.remove();
  };
  for (let i = 0; i < 6; i++) add(pick(CHAT_NAMES), pick(CHAT_LINES));
  add("KowlFun", "reminder: \"who paid you?\" only goes under our own fake shills. never real people.", true);
  let n = 0;
  setInterval(() => {
    if (document.hidden || TV.mode !== "hero") return;
    n++;
    if (n % 14 === 0) add("KowlFun", "reminder: every paid post says it's paid. that's the whole thing.", true);
    else add(pick(CHAT_NAMES), pick(CHAT_LINES));
  }, REDUCED ? 3200 : 1500);
}

/* ---------------- ransom-note headlines ---------------- */
function initRansom() {
  const looks = ["r1", "r2", "r3", "r4", "r5", "r6"];
  $$("[data-ransom]").forEach((h) => {
    const text = h.textContent;
    h.setAttribute("aria-label", text);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    h.innerHTML = text.split(" ").map((word) => `<span class="rw" aria-hidden="true">${[...word].map((ch) =>
      `<span class="rl ${looks[Math.floor(rnd() * looks.length)]}" style="--r:${((rnd() - 0.5) * 14).toFixed(1)}deg;--y:${((rnd() - 0.5) * 6).toFixed(1)}px">${esc(ch)}</span>`).join("")}</span>`).join(" ");
  });
}

/* ---------------- the KOL dictionary ---------------- */
const WORD_CLASS = ["phr.", "n.", "adj.", "interj.", "v."];
function initDictionary() {
  const list = $("#dictList"), q = $("#dictQ"), n = $("#dictN");
  if (!list || typeof DICT === "undefined") return;
  const entries = DICT.map(([k, v], i) => ({ k, v, c: k.split(" ").length > 1 ? "phr." : WORD_CLASS[i % WORD_CLASS.length] }))
    .sort((a, b) => a.k.localeCompare(b.k));
  const render = () => {
    const s = q.value.trim().toLowerCase();
    const hits = entries.filter((e) => !s || e.k.includes(s) || e.v.toLowerCase().includes(s));
    list.innerHTML = hits.map((e) => `<div><dt>${esc(e.k)} <i>${e.c}</i></dt><dd>${esc(e.v)}</dd></div>`).join("")
      || `<div class="none"><dt>${esc(s)}</dt><dd>not in the dictionary. probably means "buy my bags".</dd></div>`;
    n.textContent = `${hits.length} of ${entries.length} entries · compiled by kowls, not paid for`;
  };
  q.addEventListener("input", render);
  render();
}

/* ---------------- number count-ups ---------------- */
function initNumbers() {
  const els = $$("[data-count]");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((ens) => ens.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const el = en.target, end = +el.dataset.count;
    if (REDUCED || !end) { el.textContent = commas(end); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1200);
      el.textContent = commas(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  els.forEach((e) => { e.textContent = "0"; io.observe(e); });
}

/* ---------------- lazy video: no bytes (not even posters) until it's near the screen, then only metadata ---------------- */
function initVideos() {
  const vids = $$("video.lazy-video");
  const load = (v) => {
    if (!v.poster && v.dataset.poster) v.poster = v.dataset.poster;
    if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = "metadata"; }
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { load(en.target); io.unobserve(en.target); } }), { rootMargin: "600px" });
    vids.forEach((v) => io.observe(v));
  } else vids.forEach(load);
  vids.forEach((v) => v.addEventListener("play", () => {
    load(v);
    vids.forEach((o) => { if (o !== v && !o.paused) o.pause(); });
    SFX.play("blip");
  }));
}

/* ---------------- speech bubbles ---------------- */
const CH_LINES = {
  1: ["gm", "gm to my 840k bots", "this is the one.", "not paid btw"],
  2: ["that wasn't me (it was)", "*deletes tweet*", "who leaked my rate card??", "no comment. nfa."],
  3: ["i've been watching this lore for a while", "4,000 \"the one\"s. a legacy.", "zoom out"],
  4: ["wait, you SAY it's paid??", "100% of fees… to meme makers??", "payday every 15 min? i only get paid per tweet"],
  5: ["gm future kowl", "sign in. no wallet. no alpha group.", "put 🫠 in your name"],
  6: ["few understand these memes", "this meme is the one", "post it. say it's paid if it's paid."],
  7: ["my AMA. every answer was \"the one\"", "like and subscribe (to my alpha group)", "not paid btw (paid)"],
  8: ["this is the one (pfp)", "you look like a kowl. compliment.", "put your @ on my chain"],
  9: ["not financial advice 🫠", "translate \"nfa\". i dare you.", "bingo? i AM the card"],
  10: ["brb, alpha group", "taking a break from CT 🙏", "gn (selling while you sleep)"],
};
let bubbleT = 0;
function say(line, where) {
  const b = where === "pip" || (where == null && TV.mode === "pip") ? $("#pipBubble") : $("#heroBubble");
  if (!b) return;
  b.textContent = line;
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  if (b.id === "pipBubble") { clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.remove("pop"), 4200); }
  TV.saidAt = Date.now();
  if (TV.k3d) TV.k3d.talk(0.25 + line.length * 0.045);
}

/* ---------------- poses: 3D expression or 2D image ---------------- */
const PIP_POSE_2D = { idle: "gm", melted: "melted" };
function setPose(pose) {
  if (TV.k3d) TV.k3d.setExpression(pose === "leaving" ? "idle" : pose);
  const file = IMG(PIP_POSE_2D[pose] || pose);
  if (TV.mode === "hero") { const img = $("#heroImg"); if (img && !TV.gl) img.src = file; }
  else { const pi = $("#pipImg"); if (pi && !TV.gl) pi.src = file; }
}
function restBase(delay = 9000) {
  clearTimeout(TV.busyT);
  TV.busyT = setTimeout(() => { setPose(TV.basePose); }, delay);
}
function savePokes() { try { localStorage.setItem("kowl-pokes", TV.pokes); } catch { /* private mode */ } $("#pokeCount").textContent = commas(TV.pokes); }

function onPoke(count3d, melting, x, y) {
  TV.pokes++;
  savePokes();
  $("#pokeHint").classList.add("gone");
  if (melting) {
    say("you poked him so hard he melted 🫠");
    SFX.play("melt");
    if (!TV.gl) setPose("melted");
    restBase(5200);
  } else {
    let pose;
    do { pose = pick(POKE_POSES.filter((p) => p !== "leaving")); } while (pose === TV.lastPoke);
    TV.lastPoke = pose;
    setPose(pose);
    say(TV.pokes % 12 === 0 ? "stop poking me. i'm a thought leader." : pick(POSES[pose]));
    SFX.play("boing");
    restBase();
  }
  if (x != null) melt(x, y, 4);
}

/* ---------------- 2D toy (before 3D is ready, or instead of it) ---------------- */
function init2D() {
  const btn = $("#heroKowl"), jelly = $(".jelly", btn), tilt = $(".jelly-tilt", btn), stage = $("#stage");
  let local = 0;
  const boing = () => { jelly.classList.remove("boing"); void jelly.offsetWidth; jelly.classList.add("boing"); };
  jelly.addEventListener("animationend", (e) => { if (e.animationName === "boing") jelly.classList.remove("boing"); });
  // WebKit can leave an animated layer blank when its image decodes after the layer was composited:
  // restart the wobble whenever the 2D kowl's image (re)loads so it gets repainted.
  const img = $("#heroImg", btn);
  const repaint = () => { jelly.style.animation = "none"; void jelly.offsetWidth; jelly.style.animation = ""; };
  img.addEventListener("load", repaint);
  if (img.complete) requestAnimationFrame(repaint);
  addEventListener("load", () => requestAnimationFrame(repaint), { once: true });
  btn.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !TV.gl) { setPose("sus"); say(pick(POSES.sus)); } });
  btn.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    tilt.style.setProperty("--skx", "0deg"); tilt.style.setProperty("--rot", "0deg");
    if (!TV.gl) restBase(400);
  });
  btn.addEventListener("click", (e) => {
    if (TV.gl) return;
    local++;
    boing();
    onPoke(local, local % 7 === 0, ...evPoint(e));
  });
  if (matchMedia("(pointer: fine)").matches && !REDUCED) {
    stage.addEventListener("pointermove", (e) => {
      if (TV.gl) return;
      const r = btn.getBoundingClientRect();
      const k = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      tilt.style.setProperty("--skx", (-k * 7).toFixed(2) + "deg");
      tilt.style.setProperty("--rot", (k * 3).toFixed(2) + "deg");
    });
  }
  // the pip's poke button (2D mode, and keyboard users in 3D mode)
  $("#pipPoke").addEventListener("click", (e) => {
    if (TV.k3d) { TV.k3d.poke(); return; }
    local++;
    const pi = $("#pipImg");
    pi.classList.remove("boing"); void pi.offsetWidth; pi.classList.add("boing");
    onPoke(local, local % 7 === 0, ...evPoint(e));
  });
  // idle chatter
  setInterval(() => {
    if (document.hidden) return;
    if (TV.mode === "hero" && Date.now() - (TV.saidAt || 0) > 6000) say(pick(CH_LINES[1]), "hero");
  }, 7000);
}

/* ---------------- fallbacks when there's no 3D ---------------- */
function useLoopVideo() {
  // the rendered loop (VP9 with alpha) where the browser can play it; Safari can't do webm alpha, so it keeps the 2D toy
  const v = document.createElement("video");
  const ua = navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  if (safari || !v.canPlayType('video/webm; codecs="vp9"')) return;
  Object.assign(v, { muted: true, loop: true, autoplay: !REDUCED, playsInline: true, src: "video/kowl_loop.webm", className: "stage-loop" });
  v.setAttribute("aria-hidden", "true");
  v.addEventListener("loadeddata", () => $("#stage").classList.add("loop-on"), { once: true });
  $("#heroKowl").prepend(v);
}

/* ---------------- 3D studio ---------------- */
function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
async function init3D() {
  const conn = navigator.connection;
  if (conn && conn.saveData) { useLoopVideo(); return; }
  if (!webglOK()) { useLoopVideo(); return; }
  const canvas = document.createElement("canvas");
  canvas.className = "gl";
  canvas.setAttribute("aria-label", "kowl, live in 3D at the KOWL TV desk. click or tap him to poke him.");
  canvas.setAttribute("role", "img");
  $("#stage3d").appendChild(canvas);
  try {
    const mod = await import("./kowl3d.js?v=3");
    TV.k3d = await mod.start({
      canvas, model: "models/kowl.glb?v=3", reduced: REDUCED,
      getInfo: () => {
        const live = typeof pr !== "undefined" && pr.state === "live" && pr.nextAt;
        return {
          payday: live ? countdown(pr.nextAt - Date.now()) : "SOON",
          sub: live ? `${sol(pr.stats.pool_sol)} SOL in the pool · 100% to kowls` : "opens at launch · 100% of fees to kowls",
          watching: $("#watching").textContent,
        };
      },
      onPoke: (n, melting) => { onPoke(n, melting); },
      onMelt: (on) => { if (!on) say("i'm fine. this is fine. nfa.", TV.mode === "pip" ? "pip" : "hero"); },
      onHover: (on) => {
        if (on) { TV.k3d.setExpression("sus"); say(pick(POSES.sus)); }
        else restBase(500);
      },
    });
    TV.gl = true;
    document.body.classList.add("gl-on");
    TV.k3d.setChannel(TV.ch);
    if (TV.mode === "pip") { TV.k3d.setMode("pip", $("#pipScreen")); TV.k3d.setExpression(TV.basePose); }
    onScroll();
    // speech bubble follows kowl's head in the hero
    setInterval(() => {
      if (TV.mode !== "hero" || !TV.k3d) return;
      const [x, y] = TV.k3d.projectHead();
      const b = $("#heroBubble");
      b.style.setProperty("--bx", Math.round(x) + "px");
      b.style.setProperty("--by", Math.round(y) + "px");
    }, 120);
    document.addEventListener("visibilitychange", () => { if (document.hidden) TV.k3d.pause(); else if (!TV.pipMin || TV.mode === "hero") TV.k3d.resume(); });
  } catch (err) {
    console.warn("kowl tv: 3D studio unavailable, using the 2D kowl", err);
    canvas.remove();
    TV.k3d = null; TV.gl = false;
    useLoopVideo();
  }
}

/* ---------------- channels ---------------- */
let staticTimer = 0, osdTimer = 0;
function makeStatic() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"), d = x.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  $("#static").style.backgroundImage = `url(${c.toDataURL()})`;
}
function flashStatic() {
  if (REDUCED) return;
  const s = $("#static");
  s.classList.remove("on"); void s.offsetWidth; s.classList.add("on");
  clearTimeout(staticTimer);
  staticTimer = setTimeout(() => s.classList.remove("on"), 320);
  SFX.play("static");
}
function showOSD(n, name) {
  const o = $("#osd");
  $("#osdNum").textContent = "CH " + String(n).padStart(2, "0");
  $("#osdName").textContent = name;
  o.classList.add("show");
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => o.classList.remove("show"), 1700);
}
function setChannel(sec, announce) {
  const n = +sec.dataset.ch;
  if (n === TV.ch) return;
  TV.ch = n;
  $$(".guide a").forEach((a) => a.classList.toggle("on", +a.dataset.chn === n));
  showOSD(n, sec.dataset.name || "");
  flashStatic();
  if (announce) $("#chAnnounce").textContent = `channel ${n}: ${sec.dataset.name}`;
  $("#pipCh").textContent = "CH " + String(n).padStart(2, "0");
  TV.basePose = sec.dataset.pose || "idle";
  if (TV.k3d) TV.k3d.setChannel(n);
  setPose(TV.basePose);
  if (n > 1) setTimeout(() => { if (TV.ch === n) say(pick(CH_LINES[n] || CH_LINES[1]), "pip"); }, 500);
}
function setMode(mode) {
  if (mode === TV.mode) return;
  TV.mode = mode;
  const pip = $("#pip");
  pip.hidden = mode === "hero";
  document.body.classList.toggle("in-pip", mode === "pip");
  flashStatic();
  if (TV.k3d) {
    if (mode === "pip") {
      TV.k3d.setMode("pip", $("#pipScreen"));
      if (TV.pipMin) TV.k3d.pause();
    } else { TV.k3d.setMode("hero", $("#stage3d")); TV.k3d.resume(); }
  }
  setPose(TV.basePose);
}
function initChannels() {
  const secs = $$("[data-ch]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => { if (en.isIntersecting) setChannel(en.target); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => io.observe(s));
    const live = $("#live");
    const io2 = new IntersectionObserver(([en]) => setMode(en.intersectionRatio < 0.25 ? "pip" : "hero"), { threshold: [0, 0.25, 0.5] });
    io2.observe(live);
  }
  // remote: number keys change channel, like a real TV
  const jump = (n) => {
    const sec = document.querySelector(`[data-ch="${n}"]`);
    if (!sec) return;
    sec.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    setChannel(sec, true);
  };
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if ($$(".modal").some((m) => !m.hidden)) return;
    jump(+e.key);
  });
  $$(".guide a").forEach((a) => a.addEventListener("click", () => { setTimeout(() => setChannel(document.querySelector(`[data-ch="${a.dataset.chn}"]`), true), 50); SFX.play("blip"); }));
  // mobile channel guide
  const grid = $("#remoteGrid");
  grid.innerHTML = $$(".guide a").map((a) => `<a href="${a.getAttribute("href")}" data-chn="${a.dataset.chn}"><b>${a.dataset.chn.padStart(2, "0")}</b>${esc(a.textContent.replace(/^\d+/, ""))}</a>`).join("");
  grid.addEventListener("click", (e) => { if (e.target.closest("a")) closeModal($("#remote")); });
  const rb = $("#remoteBtn");
  rb.addEventListener("click", () => { openModal($("#remote")); rb.setAttribute("aria-expanded", "true"); });
  $("#remote").addEventListener("click", () => { if ($("#remote").hidden) rb.setAttribute("aria-expanded", "false"); });
  // pip minimise
  const min = $("#pipMin");
  min.addEventListener("click", () => {
    TV.pipMin = !TV.pipMin;
    $("#pip").classList.toggle("min", TV.pipMin);
    min.textContent = TV.pipMin ? "+" : "–";
    min.setAttribute("aria-expanded", String(!TV.pipMin));
    min.setAttribute("aria-label", TV.pipMin ? "show kowl cam" : "minimise kowl cam");
    if (TV.k3d && TV.mode === "pip") TV.pipMin ? TV.k3d.pause() : TV.k3d.resume();
  });
}

/* ---------------- hero scroll drives the camera ---------------- */
let scrollRaf = 0;
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    if (!TV.k3d || TV.mode !== "hero") return;
    const h = $("#live").offsetHeight || innerHeight;
    TV.k3d.setHeroProgress(Math.min(1, Math.max(0, scrollY / (h * 0.8))));
  });
}

/* ---------------- payday chime ---------------- */
function initPaydayChime() {
  let armed = 0;
  setInterval(() => {
    if (typeof pr === "undefined" || !pr.nextAt) return;
    const left = pr.nextAt - Date.now();
    if (left > 0 && left < 3000) armed = pr.nextAt;
    if (armed && left <= 0) { armed = 0; SFX.play("cash"); say("PAYDAY. in public. weird.", TV.mode === "pip" ? "pip" : "hero"); }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  try { TV.pokes = +localStorage.getItem("kowl-pokes") || 0; } catch { /* private mode */ }
  $("#pokeCount").textContent = commas(TV.pokes);
  initSound();
  initClock();
  initChat();
  initRansom();
  initDictionary();
  initNumbers();
  initVideos();
  init2D();
  initChannels();
  initPaydayChime();
  makeStatic();
  addEventListener("scroll", onScroll, { passive: true });
  // the studio loads after first paint so the page is usable straight away
  const go = () => init3D();
  if (document.readyState === "complete") setTimeout(go, 50);
  else addEventListener("load", () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 200)), { once: true });
});
