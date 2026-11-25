/* =====================================================================
   kowl ($KOWL) — fill these in at launch. nothing else needs editing.
   ===================================================================== */
const CA = "coming soon";            // paste the contract address here
const LINKS = {
  x: "https://x.com/kowlcoin",       // official X. (@kowl is an unrelated real person: never link it)
  telegram: "#",                     // https://t.me/...
  pump: "#",                         // https://pump.fun/coin/<CA>
};
const API_BASE = "https://api.kowl.fun"; // kowl payroll API (Railway). "" = payroll shows "opens at launch"
const GOOGLE_CLIENT_ID = "108080030634-0gj8lmso0csho8ok0psbeft7ehhuf3n8.apps.googleusercontent.com"; // Google Identity Services web client (GCP project beaming-mode-482220-r6). authorised origins: kowl.fun, www.kowl.fun, localhost:8787/8790
// live chart: the "chart" section stays hidden while this is "". GeckoTerminal embed by POOL address:
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
const VERIFIED = '<svg class="vcheck" viewBox="0 0 22 22" aria-label="verified"><path d="M20.4 11c0-1.3-.8-2.5-2-3.1.4-1.3.2-2.7-.7-3.6s-2.3-1.2-3.6-.7c-.6-1.2-1.8-2-3.1-2s-2.5.8-3.1 2c-1.3-.5-2.7-.2-3.6.7s-1.2 2.3-.7 3.6c-1.2.6-2 1.8-2 3.1s.8 2.5 2 3.1c-.5 1.3-.2 2.7.7 3.6s2.3 1.2 3.6.7c.6 1.2 1.8 2 3.1 2s2.5-.8 3.1-2c1.3.5 2.7.2 3.6-.7s1.2-2.3.7-3.6c1.2-.6 2-1.8 2-3.1zm-10.6 4-3.6-3.6 1.4-1.4 2.2 2.2 4.9-5.3 1.5 1.3z"/></svg>';
const VERIFIED_PATH = "M20.4 11c0-1.3-.8-2.5-2-3.1.4-1.3.2-2.7-.7-3.6s-2.3-1.2-3.6-.7c-.6-1.2-1.8-2-3.1-2s-2.5.8-3.1 2c-1.3-.5-2.7-.2-3.6.7s-1.2 2.3-.7 3.6c-1.2.6-2 1.8-2 3.1s.8 2.5 2 3.1c-.5 1.3-.2 2.7.7 3.6s2.3 1.2 3.6.7c.6 1.2 1.8 2 3.1 2s2.5-.8 3.1-2c1.3.5 2.7.2 3.6-.7s1.2-2.3.7-3.6c1.2-.6 2-1.8 2-3.1zm-10.6 4-3.6-3.6 1.4-1.4 2.2 2.2 4.9-5.3 1.5 1.3z";
const IMG = (pose) => `img/kowl-${pose}.webp`;
const HEAD = "img/kowl-head-256.png";

/* ---------------- toast, copy, melt particles ---------------- */
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2200);
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
  const count = REDUCED ? Math.min(3, n) : n;
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

/* ---------------- links + CA ---------------- */
function initLinks() {
  $$("[data-link]").forEach((a) => {
    const href = LINKS[a.dataset.link] || "#";
    a.href = href;
    if (href === "#") {
      a.removeAttribute("target");
      a.addEventListener("click", (e) => { e.preventDefault(); toast("link drops at launch. don't get kowl'd by fakes."); });
    }
  });
}
const CA_READY = CA && !/coming soon/i.test(CA);
function initCA() {
  $("#caText").textContent = CA;
  $("#caCopy").addEventListener("click", async (e) => {
    if (!CA_READY) { toast("no CA yet. anyone posting one before launch is a kowl."); return; }
    const ok = await copy(CA);
    toast(ok ? "CA copied. don't get kowl'd by fakes." : "copy failed. select it by hand.");
    melt(...evPoint(e));
  });
}

/* ---------------- ticker ---------------- */
const HEADLINES = [
  "KOWL CALLS 41ST \"THE ONE\" OF THE DAY",
  "KOLS GET PAID IN SECRET. KOWLS GET PAID IN PUBLIC.",
  "KOWL'S \"NOT FINANCIAL ADVICE\" OFFICIALLY RULED FINANCIAL ADVICE",
  "KOWL POSTS \"PROOF OF BAGS\" SCREENSHOT, SEED PHRASE CLEARLY VISIBLE",
  "LOCAL BLOB \"BEEN WATCHING THIS ONE FOR A WHILE\" (4 MINUTES)",
  "100% OF $KOWL CREATOR FEES GO TO THE PEOPLE WHO POST",
  "KOWL \"JUST A HOLDER\", ON-CHAIN DATA DISAGREES",
  "47 KOLS IN ALPHA GROUP ALL SELL AT 3:01PM, BLAME JEETS",
  "KOWL'S PASSWORD WAS kowl123. NEW PASSWORD: kowl1234",
  "KOWL TAKES MENTAL HEALTH BREAK FROM CT, POSTS 41 TIMES",
  "KOWL CLICKS \"FREE AIRDROP\" LINK, SIGNS 14 TRANSACTIONS, CANNOT READ",
  "SCIENTISTS CONFIRM KOWL HAS NO SPINE",
  "KOWL DELETES TWEET. THE ARCHIVE DOES NOT.",
  "KOWL \"NOT PAID BTW\" FOR 212TH CONSECUTIVE PAID POST",
  "WHO PAID YOU? \"$KOWL DID. IT'S ON-CHAIN.\"",
  "KOWL ZOOMS OUT, FINDS ZERO",
];
function initTicker() {
  const run = $("#tickerRun");
  const html = HEADLINES.map((h) => `<span>${esc(h)}</span>`).join("");
  run.innerHTML = html + html;
}

/* ---------------- hero kowl ---------------- */
const POSES = {
  gm: ["gm", "gm to my 840k bots", "gm. anyway, this is the one"],
  "this-is-the-one": ["this is the one.", "this one. no, THIS one.", "41st \"the one\" today"],
  nfa: ["not financial advice 🫠", "nfa (it's financial advice)"],
  shill: ["not paid btw", "DM for \"partnerships\"", "check the link in bio"],
  "send-it": ["SEND IT", "we're so early!!", "to 1B (nfa)"],
  rich: ["i'm just a holder", "proof of bags (seed phrase visible)"],
  derp: ["few understand", "dyor (i didn't)"],
  sus: ["...who's asking?", "who paid me? nobody. why."],
  deleted: ["*deletes tweet*", "that wasn't me", "i never said that (i did)"],
  cry: ["taking a break from CT 🙏", "it's just a dip"],
  high: ["zoom out", "generational wealth"],
  facepalm: ["password was kowl123", "i clicked the free airdrop link", "signed whatever popped up"],
  leaving: ["brb, alpha group", "it's 3:01pm. gotta go."],
  melted: ["🫠"],
};
const POKE_POSES = Object.keys(POSES).filter((p) => p !== "melted" && p !== "sus");
function initHero() {
  // preload every pose so swaps are instant
  Object.keys(POSES).forEach((p) => { const i = new Image(); i.src = IMG(p); });
  const btn = $("#heroKowl"), img = $("#heroImg"), jelly = $(".jelly", btn), tilt = $(".jelly-tilt", btn), bubble = $("#heroBubble");
  const stage = $(".hero-art");
  let base = "gm", current = "gm", pokes = 0, clickedThisHover = false, bubbleT;

  const show = (pose, line) => {
    current = pose;
    img.src = IMG(pose);
    if (line != null) say(line);
  };
  const say = (line) => {
    bubble.textContent = line;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
  };
  const boing = () => { jelly.classList.remove("boing"); void jelly.offsetWidth; jelly.classList.add("boing"); };
  jelly.addEventListener("animationend", (e) => { if (e.animationName === "boing") jelly.classList.remove("boing"); });

  btn.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    clickedThisHover = false;
    show("sus", pick(POSES.sus));
  });
  btn.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!clickedThisHover) show(base, pick(POSES[base]));
    tilt.style.setProperty("--skx", "0deg");
    tilt.style.setProperty("--rot", "0deg");
  });
  btn.addEventListener("click", (e) => {
    pokes++;
    clickedThisHover = true;
    let pose;
    if (pokes % 7 === 0) {
      pose = "melted";
      show(pose, "you poked him so hard he melted 🫠");
    } else {
      do { pose = pick(POKE_POSES); } while (pose === current);
      show(pose, pokes === 12 ? "stop poking me. i'm a thought leader." : pick(POSES[pose]));
    }
    base = pose;
    boing();
    melt(...evPoint(e), 4);
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => { if (!btn.matches(":hover")) { base = "gm"; show("gm", "gm"); } }, 9000);
  });

  // jelly leans toward the pointer
  if (matchMedia("(pointer: fine)").matches) {
    stage.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const k = Math.max(-1, Math.min(1, dx));
      tilt.style.setProperty("--skx", (-k * 7).toFixed(2) + "deg");
      tilt.style.setProperty("--rot", (k * 3 * Math.max(0.3, 1 - Math.abs(dy) / 2)).toFixed(2) + "deg");
    });
    stage.addEventListener("pointerleave", () => {
      tilt.style.setProperty("--skx", "0deg");
      tilt.style.setProperty("--rot", "0deg");
    });
  }

  // idle chatter
  setInterval(() => {
    if (document.hidden || btn.matches(":hover")) return;
    say(pick(POSES[current]));
  }, 6500);
}

/* ---------------- timeline ---------------- */
const ICON = {
  reply: '<svg viewBox="0 0 24 24"><path d="M1.75 10c0-4.4 3.6-8 8.1-8h4.37a8.12 8.12 0 0 1 3.9 15.24l-8.07 4.47v-3.7h-.07A8.03 8.03 0 0 1 1.75 10zm8.1-6c-3.3 0-6.1 2.7-6.1 6 0 3.4 2.8 6.1 6.1 6l.4-.01h1.6v2.25l5.1-2.83A6.12 6.12 0 0 0 14.2 4z"/></svg>',
  rt: '<svg viewBox="0 0 24 24"><path d="m4.5 3.88 4.43 4.14-1.37 1.46L5.5 7.55V16c0 1.1.9 2 2 2H13v2H7.5c-2.2 0-4-1.8-4-4V7.55L1.44 9.48.07 8.02zM16.5 6H11V4h5.5c2.2 0 4 1.8 4 4v8.45l2.06-1.93 1.37 1.46-4.43 4.14-4.43-4.14 1.37-1.46 2.06 1.93V8c0-1.1-.9-2-2-2z"/></svg>',
  like: '<svg viewBox="0 0 24 24"><path d="M16.7 3.5c-1.9-.1-3.6.9-4.7 2.6-1.1-1.7-2.8-2.7-4.7-2.6C4.3 3.6 2 6.2 2.2 9.5c.3 4.6 6 8.6 9.8 11 3.8-2.4 9.5-6.4 9.8-11 .2-3.3-2.1-5.9-5.1-6zm3.1 5.9c-.2 3.2-4.3 6.6-7.8 8.9-3.5-2.3-7.6-5.7-7.8-8.9-.1-2.2 1.4-3.9 3.3-4 1.6-.1 3.2 1 3.9 2.9l.6 1.6.6-1.6c.7-1.9 2.3-3 3.9-2.9 1.9.1 3.4 1.8 3.3 4z"/></svg>',
  liked: '<svg viewBox="0 0 24 24"><path d="M20.9 9.5c-.3 4.6-6 8.6-8.9 10.6-2.9-2-8.6-6-8.9-10.6-.2-3.3 2.1-5.9 5.1-6 1.9-.1 3.6.9 3.8 2.6.2-1.7 1.9-2.7 3.8-2.6 3 .1 5.3 2.7 5.1 6z"/></svg>',
  views: '<svg viewBox="0 0 24 24"><path d="M8.75 21V3h2v18zM18 21V8.5h2V21zM4 21l.004-10h2L6 21zm9.248 0v-7h2v7z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 2.59 17.7 8.3l-1.4 1.4L13 6.41V16h-2V6.41L7.7 9.7 6.3 8.3zM21 15l-.02 3.5A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V15h2v3.5c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5L19 15z"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8.5 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM1 20c0-3.3 2.9-6 7-6s7 2.7 7 6v1H1zm15.5-7c3 0 5.5 2 5.5 5v1h-5c0-2.4-1-4.4-2.6-5.8.7-.1 1.4-.2 2.1-.2z"/></svg>',
};
const zoomChart = () => {
  // goes up, then zooming out reveals the floor
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * 600;
    let y;
    if (i < 30) y = 150 - i * 3.6 + Math.sin(i * 1.7) * 6;
    else if (i < 36) y = 42 + (i - 30) * 2 + Math.sin(i) * 5;
    else y = Math.min(172, 54 + (i - 36) ** 1.55 * 1.6 + Math.sin(i * 2.1) * 4);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `<div class="pchart"><svg viewBox="0 0 600 180" preserveAspectRatio="none"><rect width="600" height="180" fill="#fff"/><polyline points="${pts.join(" ")}" fill="none" stroke="#F4212E" stroke-width="3" stroke-linejoin="round"/><polyline points="${pts.slice(0, 31).join(" ")}" fill="none" stroke="#00BA7C" stroke-width="3" stroke-linejoin="round"/><text x="590" y="168" text-anchor="end" font-family="Segoe UI, Arial" font-size="13" fill="#536471">$JELLO · 1D · zoomed out</text></svg></div>`;
};
const POSTS = [
  {
    pin: true, tags: ["paid"], ago: "Jun 3",
    text: "my alpha group is open 🔒\n\n2 SOL / month. 47 members, all KOLs.\nyou'd be member #48 (the exit liquidity)",
    note: "the alpha group is a group chat where 47 KOLs agree on a coin at 2:55pm, post it at 3:00pm and race each other to sell at 3:01pm. member #48 has never won.",
  },
  {
    tags: [], ago: "2m", pose: null,
    text: "gm",
    note: "kowl has 1.2M followers. 840k are bots bought in a bundle. most of the rest are other KOLs saying gm back.",
  },
  {
    tags: ["paid"], ago: "14m",
    text: "been watching $GOO for a while 👀",
    note: "on-chain: kowl's wallet bought $GOO at 2:56pm. this post went up at 3:00pm. \"a while\" = 4 minutes.",
    chain: "14:56:02  kowl.sol   BUY   41,200,000 $GOO\n15:00:00  @kowlcoin \"been watching for a while\"\n15:01:13  kowl.sol   <s>SELL  41,200,000 $GOO</s>",
  },
  {
    tags: ["paid"], ago: "31m", pose: "this-is-the-one",
    text: "this is the one. nfa",
    note: "this is kowl's 38th \"the one\" today. paid partnership: 5 SOL from @kowlcapital. not disclosed.",
  },
  {
    tags: ["paid"], ago: "1h",
    text: "not paid btw. i just genuinely love the $JELLO community 🫡",
    note: "paid partnership: 12 SOL + 2% of supply. the \"community\" is 9 of kowl's own wallets talking to each other.",
  },
  {
    tags: ["brain"], ago: "2h", pose: "rich", seed: true,
    text: "posting my bags so you know i'm NOT selling 💪 proof of bags below",
    note: "the screenshot included kowl's seed phrase. the bags now live in someone else's wallet. kowl is fine. kowl has no brain to worry with.",
  },
  {
    tags: ["paid"], ago: "3h",
    text: "i'm just a holder like you guys 🤝",
    note: "on-chain: kowl sold 100% of its $SPINE yesterday at 3:01pm. kowl is still holding. holding SOL.",
    chain: "yesterday 15:01:07  kowl.sol  <s>SELL  100% $SPINE  (+212 SOL)</s>",
  },
  {
    tags: ["deleted"], ago: "4h", deleted: true,
    note: "archived copy: \"$RUGGO to 1B by friday. 100% conviction. not financial advice 🚀\". $RUGGO is now worth less than this tweet.",
  },
  {
    tags: ["brain"], ago: "5h",
    text: "just claimed a FREE airdrop 🎁 signed whatever popped up. easy money",
    note: "the \"airdrop\" was a drain link. kowl signed 14 transactions without reading them. kowl cannot read.",
  },
  {
    tags: [], ago: "6h", chart: true,
    text: "zoom out 📈",
    note: "zooming out further shows the chart goes to zero. kowl did not zoom out that far.",
  },
  {
    tags: ["paid", "deleted"], ago: "7h",
    text: "47 of us agreed on this one. 3:00pm. you'll see 🤫",
    note: "this was meant for the private alpha group. kowl posted it to the main timeline. it was deleted 40 seconds later. the archive kept it.",
  },
  {
    tags: [], ago: "9h", pose: "cry",
    text: "taking a break from CT for my mental health 🙏",
    note: "kowl posted 41 more times in the next 2 hours, including 6 new \"the one\"s.",
  },
  {
    tags: ["brain"], ago: "11h",
    text: "changed my password to something nobody will ever guess 🔐",
    note: "it's kowl1234. it used to be kowl123.",
  },
  {
    tags: ["paid"], ago: "13h",
    text: "dyor 🫡",
    note: "kowl has never done its own research. kowl does not have a brain. this is anatomy, not a joke.",
  },
  {
    tags: [], ago: "1d",
    text: "who's still holding? 👇",
    note: "not kowl.",
  },
];
const POSTS_SHOWN = matchMedia("(max-width: 640px)").matches ? 4 : 6;
function postHTML(p, i) {
  const views = randi(180000, 3200000);
  p.views = views;
  p.likes = Math.round(views * rand(0.004, 0.02));
  p.rts = Math.round(p.likes * rand(0.08, 0.3));
  p.replies = Math.round(p.likes * rand(0.05, 0.2));
  const text = p.deleted
    ? `<div class="tomb">This post was deleted by the post author. <a href="#" data-noop>Learn more</a></div>`
    : `<div class="ptext">${esc(p.text).replace(/\$[A-Z]{2,10}/g, (m) => `<span class="cash">${m}</span>`)}</div>`;
  let media = "";
  if (p.pose) {
    media = `<div class="pmedia"><img src="${IMG(p.pose)}" alt="kowl" loading="lazy" width="800" height="800">${
      p.seed ? '<div class="seed-shot">bags: <b>4,200 SOL</b> 💰  ·  seed: blob melt chain check gold sticker phone spine none brain zero kowl123</div>' : ""}</div>`;
  }
  if (p.chart) media = `<div class="pmedia">${zoomChart()}</div>`;
  const chain = p.chain ? `<span class="chain">${esc(p.chain).replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/g, '<span class="s">$1</span>').replace(/\n/g, "<br>")}</span>` : "";
  return `<article class="post${i >= POSTS_SHOWN ? " more" : ""}" data-i="${i}">
    ${p.pin ? '<div class="pin">📌 Pinned</div>' : ""}
    <img class="pfp" src="${HEAD}" alt="" width="44" height="44" loading="lazy">
    <div class="pbody">
      <div class="phead"><b>kowl</b>${VERIFIED}<span class="mut">@kowlcoin · ${p.ago}</span><span class="paid-tag">${p.tags.includes("paid") ? "paid partnership" : p.tags.includes("deleted") ? "deleted" : "context added"}</span></div>
      ${text}
      ${media}
      <button class="note-btn" aria-expanded="false">${ICON.note}<span>readers added context</span></button>
      <div class="note-wrap"><div>
        <div class="note">
          <div class="note-h">${ICON.note} readers added context they thought people might want to know</div>
          <div class="note-b">${esc(p.note)}${chain}</div>
          <div class="note-f">was this note paid for? no. that's how you know it's true.</div>
        </div>
      </div></div>
      <div class="pactions">
        <button class="pact reply" aria-label="reply">${ICON.reply}<span>${fmt(p.replies)}</span></button>
        <button class="pact rt" aria-label="repost">${ICON.rt}<span>${fmt(p.rts)}</span></button>
        <button class="pact like" aria-label="like">${ICON.like}<span>${fmt(p.likes)}</span></button>
        <button class="pact views" aria-label="views">${ICON.views}<span class="vc">${fmt(views)}</span></button>
        <button class="pact share" aria-label="share">${ICON.share}</button>
      </div>
      <div class="replies"></div>
    </div>
  </article>`;
}
function initTimeline() {
  const box = $("#posts");
  box.innerHTML = POSTS.map(postHTML).join("");
  box.addEventListener("click", (e) => {
    const art = e.target.closest(".post");
    if (!art) return;
    const p = POSTS[art.dataset.i];
    if (e.target.closest("[data-noop]")) { e.preventDefault(); toast("learn more: it went to zero."); return; }
    if (e.target.closest(".note-btn")) {
      const on = art.classList.toggle("revealed");
      e.target.closest(".note-btn").setAttribute("aria-expanded", on);
      return;
    }
    const act = e.target.closest(".pact");
    if (!act) return;
    const span = $("span", act);
    if (act.classList.contains("like")) {
      const on = act.classList.toggle("on");
      p.likes += on ? 1 : -1;
      act.firstElementChild.outerHTML = on ? ICON.liked : ICON.like;
      $("span", act).textContent = fmt(p.likes);
      if (on) melt(...evPoint(e), 3, "💸");
    } else if (act.classList.contains("rt")) {
      const on = act.classList.toggle("on");
      p.rts += on ? 1 : -1;
      span.textContent = fmt(p.rts);
      if (on) toast("reposted. congrats, you're now an unpaid KOL.");
    } else if (act.classList.contains("reply")) {
      p.replies++;
      span.textContent = fmt(p.replies);
      const r = document.createElement("div");
      r.className = "reply";
      r.innerHTML = `<div class="r-av">🫠</div><div><b>you 🫠</b> <span class="mut">@yourname · now</span><p>who paid you?</p></div>`;
      $(".replies", art).appendChild(r);
      melt(...evPoint(e), 4);
    } else if (act.classList.contains("views")) {
      toast(`${commas(p.views)} views. ${commas(p.views * 0.7)} of them are bots.`);
    } else if (act.classList.contains("share")) {
      copy(location.href.split("#")[0] + "#problem").then(() => toast("link copied. kowl will delete the post anyway."));
    }
  });

  const more = $("#morePosts");
  const showAll = () => { box.classList.add("all"); more.hidden = true; };
  more.textContent = `show ${POSTS.length - POSTS_SHOWN} more posts`;
  more.addEventListener("click", showAll);

  const ra = $("#revealAll");
  ra.addEventListener("click", () => {
    const all = $$(".post", box);
    const open = all.some((a) => !a.classList.contains("revealed"));
    if (open) showAll();
    all.forEach((a) => a.classList.toggle("revealed", open));
    ra.textContent = open ? "hide the truth (like kowl does)" : "show every community note";
  });

  // views tick up
  setInterval(() => {
    if (document.hidden) return;
    $$(".post", box).forEach((a) => {
      const p = POSTS[a.dataset.i];
      p.views += randi(3, 40) * (1 + p.views / 4e5);
      $(".vc", a).textContent = fmt(p.views);
    });
  }, 1100);
}

/* ---------------- KOL → english ---------------- */
const DICT = [
  ["not financial advice", "financial advice"],
  ["nfa", "financial advice (i'm paid for)"],
  ["dyor", "i didn't"],
  ["i'm just a holder", "i sold yesterday"],
  ["just a holder", "sold yesterday"],
  ["we're so early", "you're my exit liquidity"],
  ["still early", "you're late"],
  ["been watching this one for a while", "i bought 4 minutes ago"],
  ["this is the one", "this is one of the 40 today"],
  ["not paid", "paid"],
  ["not sponsored", "sponsored"],
  ["conviction play", "i'm stuck in it"],
  ["long term hold", "i couldn't sell in time"],
  ["zoom out", "don't look at the last 3 days"],
  ["diamond hands", "please don't sell before me"],
  ["dev is based", "the dev paid me"],
  ["community takeover", "the dev left. it's your problem now"],
  ["send it", "buy so i can sell"],
  ["taking a break from ct", "my coin just went -90%"],
  ["mental health", "bags"],
  ["gm", "please engage with my 3pm shill"],
  ["gn", "i'm selling while you sleep"],
  ["wagmi", "i'm gonna make it. you're not"],
  ["ngmi", "you didn't buy my coin"],
  ["lfg", "let me fill my sells"],
  ["alpha group", "paid group chat where we pick who to dump on"],
  ["alpha", "a coin i already bought"],
  ["partnership", "payment"],
  ["strategic partner", "got paid more"],
  ["buy the dip", "buy my bags"],
  ["just a dip", "it's over"],
  ["who's still holding", "i'm not"],
  ["100x", "0.01x"],
  ["generational wealth", "generational bags"],
  ["trust me", "don't"],
  ["i don't usually shill", "i shill 40 times a day"],
  ["organic", "bundled"],
  ["fair launch", "fair for me"],
  ["jeets", "people who sold before me"],
  ["fud", "facts"],
  ["unruggable", "about to be rugged"],
  ["few understand", "i don't understand either"],
  ["one more leg up", "one more exit"],
  ["bullish", "bought"],
  ["i'm all in", "i'm 0.4% in"],
  ["floor is in", "i need you to buy here"],
  ["hidden gem", "my bag"],
  ["easy 10x", "easy exit"],
  ["i only shill what i hold", "i hold everything for 4 minutes"],
  ["to 1b", "to me"],
  ["free airdrop", "drain link (kowl clicked it)"],
  ["not selling", "selling"],
  ["chart looks healthy", "i bought the top too"],
  ["trust the process", "there is no process"],
  ["my community", "my exit liquidity"],
  ["retail", "exit liquidity"],
  ["thread", "27 posts that all say \"buy\""],
  ["kol", "kowl"],
  ["ser", "wallet"],
  ["frens", "exit liquidity"],
  ["moon", "my sell target"],
  ["undervalued", "i can't sell it"],
  ["new ath soon", "i'm down 80%"],
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
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
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
        let score;
        if (short) score = win === d.s ? 1 : 0;
        else score = 1 - lev(win, d.s) / Math.max(win.length, d.s.length);
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
  // map match starts (token positions in raw array)
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
    } else {
      parts.push({ hit: false, text: toks[i].r });
    }
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
    ? `${esc(p.lead || "")}<span class="hit${fresh ? " fresh" : ""}" title="kol: ${esc(p.from)}">${esc(p.text)}</span>${esc(p.trail || "")}`
    : `<span class="plain">${esc(p.text)}</span>`).join(" ");
  lastOut = parts.map((p) => p.hit ? (p.lead || "") + p.text + (p.trail || "") : p.text).join(" ");
  meta.textContent = `${hits} KOL phrase${hits === 1 ? "" : "s"} translated · honesty 100%`;
}
function initTranslator() {
  const inp = $("#trIn");
  let t;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => translate(true), 120); });
  $("#trChips").innerHTML = CHIPS.map((c) => `<button class="chip">${esc(c)}</button>`).join("");
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
}

/* ---------------- shill generator (canvas) ---------------- */
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
const imgCache = {};
const loadImg = (src) => imgCache[src] || (imgCache[src] = new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
}));
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
  // returns lines; each line = array of words (kept with their own colour)
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
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const UIFONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
let drawSeq = 0;
async function drawShill() {
  const seq = ++drawSeq;
  const T = coinName();
  const st = shillState;
  const text = SHILLS[st.tpl].replaceAll("${T}", "$" + T);
  const [head, pose] = await Promise.all([loadImg(HEAD), loadImg(IMG(st.pose))]);
  try { await document.fonts.load('40px "Archivo Black"'); } catch { /* fallback font is fine */ }
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

  // header
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
  ctx.fillText("@kowlcoin", P + 124, y + 90);
  // ··· and paid badge (hidden from view, like the disclosure)
  ctx.fillStyle = C.mut; ctx.font = `700 40px ${UIFONT}`;
  ctx.textAlign = "right"; ctx.fillText("···", W - P, y + 44); ctx.textAlign = "left";
  y += 100 + 34;

  // text
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

  // media
  ctx.save();
  rr(ctx, P, y, TW, MEDIA_H, 32);
  ctx.fillStyle = C.media; ctx.fill(); ctx.clip();
  // giant ticker behind
  ctx.globalAlpha = st.dark ? 0.16 : 0.2;
  ctx.fillStyle = st.dark ? "#F2B39A" : "#F2B39A";
  ctx.font = `400 ${T.length > 6 ? 150 : 210}px "Archivo Black", Impact, sans-serif`;
  ctx.textBaseline = "middle";
  for (let r = 0; r < 3; r++) {
    ctx.fillText("$" + T + " $" + T + " $" + T, P - 120 + r * 70, y + 90 + r * 190);
  }
  ctx.globalAlpha = 1;
  const ps = MEDIA_H * 1.08;
  ctx.drawImage(pose, P + TW / 2 - ps / 2 + 120, y + MEDIA_H - ps * 0.97, ps, ps);
  // ticker sticker
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

  // time + views
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

  // stats
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

  // the reply
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
  ctx.fillText("@kowlcoin", P + 104 + ctx.measureText("Replying to ").width, y + 46);
  ctx.font = `700 50px ${UIFONT}`; ctx.fillStyle = C.fg;
  ctx.fillText("who paid you?", P + 104, y + 100);

  // watermark
  ctx.font = `400 24px "Archivo Black", Impact, sans-serif`;
  ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  ctx.fillText("$KOWL · DON'T GET KOWL'D", W - P, H - 34);
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
  $("#shillDl").addEventListener("click", (e) => {
    const cv = $("#shillCanvas");
    const name = `kowl-shills-${coinName().toLowerCase()}.png`;
    const go = (url, revoke) => {
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    if (cv.toBlob) cv.toBlob((b) => go(URL.createObjectURL(b), true), "image/png");
    else go(cv.toDataURL("image/png"), false);
    toast("downloaded. it's kowl's fake shill: meme it, don't post it as a real call.");
    melt(...evPoint(e), 5);
  });
  drawShill();
}

/* ---------------- KOL bingo ---------------- */
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
  card.innerHTML = items.map((t, i) => t === null
    ? `<button class="bcell free on" data-i="${i}" aria-pressed="true">FREE: you're exit liquidity</button>`
    : `<button class="bcell" data-i="${i}" aria-pressed="false">${esc(t)}</button>`).join("");
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

/* ---------------- quiz ---------------- */
const QUIZ = [
  {
    q: "a blue check posts \"this is the one. nfa\". you:",
    a: ["buy before finishing the sentence", "check the chart first, then buy anyway", "close the app and make a meme about it", "post the same coin 30 seconds later"],
  },
  {
    q: "your favourite KOL says they're \"just a holder\". the chart says they sold yesterday. you think:",
    a: ["they must have a second wallet that's holding", "hm. weird.", "lol. lmao even.", "rookie. i sold two days ago"],
  },
  {
    q: "how much do you pay for alpha groups?",
    a: ["2 SOL a month, worth it (it is not)", "free trial, i'm not stupid", "what's an alpha group", "i run three of them"],
  },
  {
    q: "how many coins were \"the one\" for you this week?",
    a: ["all 40 of them", "a few", "none. they're memes. that's the point", "i launched 12 of them"],
  },
];
const RESULTS = [
  { pose: "melted", title: "fully kowl'd.", text: "you buy every \"the one\". you are the exit liquidity every KOL dreams about. it's ok. become a kowl: make memes about it and get paid in public instead." },
  { pose: "sus", title: "half kowl'd.", text: "you check the chart. after you buy. that's progress. one more \"i'm just a holder\" and you'll see it." },
  { pose: "send-it", title: "a kowl. 🫠", text: "you laugh at the blue checks and nobody fools you. now get paid for it: upload a meme, get voted, get paid. put 🫠 in your name." },
  { pose: "shill", title: "you're the KOL.", text: "you run the alpha group. you deleted the tweet. we see you. you could just say it's paid, you know. kowls do." },
];
function initQuiz() {
  const box = $("#quizBox");
  let step = 0, tally = [0, 0, 0, 0];
  const render = () => {
    if (step >= QUIZ.length) {
      const max = Math.max(...tally);
      const r = RESULTS[tally.indexOf(max)];
      box.innerHTML = `<div class="q-result">
        <img src="${IMG(r.pose)}" alt="kowl">
        <div><small>your result</small><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p>
        <div class="modal-btns"><button class="btn blue" data-act="share">copy result</button><button class="btn ghost" data-act="again">retake</button></div></div>
      </div>`;
      $("[data-act=share]", box).addEventListener("click", async (e) => {
        const ok = await copy(`i took the "have you been kowl'd?" test: ${r.title} 🫠 $KOWL`);
        toast(ok ? "copied. post it with \"paid by $KOWL\"." : "copy failed");
        melt(...evPoint(e), 5);
      });
      $("[data-act=again]", box).addEventListener("click", () => { step = 0; tally = [0, 0, 0, 0]; render(); });
      return;
    }
    const Q = QUIZ[step];
    box.innerHTML = `<div class="q-progress"><i style="width:${(step / QUIZ.length) * 100}%"></i></div>
      <div class="q-num">question ${step + 1} of ${QUIZ.length}</div>
      <div class="q-title">${esc(Q.q)}</div>
      <div class="q-opts">${Q.a.map((a, i) => `<button class="q-opt" data-i="${i}">${esc(a)}</button>`).join("")}</div>`;
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

/* ---------------- rules: copy buttons ---------------- */
function initRules() {
  const bind = (id, text, msg) => $(id).addEventListener("click", async (e) => {
    const ok = await copy(text);
    toast(ok ? msg : "copy failed. type it.");
    melt(...evPoint(e), 8);
  });
  bind("#copyAnswer", "$KOWL did. it's on-chain. 🫠", "copied. for when they ask you.");
  bind("#copyMelt", "🫠", "🫠 copied. put it in your name.");
}

/* ---------------- memes gallery ---------------- */
let memes = [], lbIndex = 0;
async function initMemes() {
  const grid = $("#memeGrid");
  try {
    const res = await fetch("memes.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    memes = (await res.json()).filter((m) => m && m.file);
  } catch (err) {
    grid.innerHTML = '<p class="mut">memes are loading slower than kowl\'s "disclosure". refresh in a sec.</p>';
    return;
  }
  if (!memes.length) { grid.innerHTML = '<p class="mut">no memes yet. kowl deleted them.</p>'; return; }
  grid.innerHTML = memes.map((m, i) =>
    `<button class="meme" data-i="${i}"><img src="${esc(m.file)}" alt="${esc(m.caption || "kowl meme")}" loading="lazy"><span>${esc(m.caption || "")}</span></button>`).join("");
  grid.addEventListener("click", (e) => {
    const b = e.target.closest(".meme");
    if (b) openLightbox(+b.dataset.i);
  });
  const more = $("#moreMemes");
  if (memes.length > 10) {
    grid.classList.add("clip");
    more.hidden = false;
    more.textContent = `show all ${memes.length} memes`;
    more.addEventListener("click", () => { grid.classList.remove("clip"); more.hidden = true; });
  }
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

/* ---------------- modals ---------------- */
let lastFocus = null;
function openModal(m) {
  if (m.hidden) lastFocus = document.activeElement;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  const f = $("button", m);
  f && f.focus({ preventScroll: true });
}
function closeModal(m) {
  m.hidden = true;
  if ($$(".modal").every((x) => x.hidden)) document.body.style.overflow = "";
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}
function initModals() {
  $$(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
    });
  });
  document.addEventListener("keydown", (e) => {
    const open = $$(".modal").find((m) => !m.hidden);
    if (!open) return;
    if (e.key === "Escape") closeModal(open);
    if (open.id === "lightbox") {
      if (e.key === "ArrowLeft") openLightbox(lbIndex - 1);
      if (e.key === "ArrowRight") openLightbox(lbIndex + 1);
    }
  });
}

/* ---------------- toolkit tabs ---------------- */
function initToolkit() {
  const tabs = $$("[data-tool]");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    $$("[data-tool-pane]").forEach((p) => { p.hidden = p.dataset.toolPane !== t.dataset.tool; });
  }));
}

/* =====================================================================
   get your kowl (pfp generator)
   ===================================================================== */
const PFP_BGS = [
  { id: "blue", label: "verified", css: "#1D9BF0", fill: "#1D9BF0" },
  { id: "peach", label: "peach", css: "#F2B39A", fill: "#F2B39A" },
  { id: "black", label: "X black", css: "#0F1419", fill: "#0F1419" },
  { id: "gold", label: "gold", css: "#F5A30F", fill: "#F5A30F" },
  { id: "melt", label: "melt", css: "linear-gradient(160deg,#F2B39A,#1D9BF0)", grad: ["#F2B39A", "#1D9BF0"] },
  { id: "lineup", label: "lineup", css: "repeating-linear-gradient(#cfd5da 0 7px,#8f9aa3 7px 9px)" },
];
const pfp = { meta: null, pose: "gm", bg: "blue", seq: 0 };
const cleanHandle = (h) => String(h || "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
const intentFor = (text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
const pfpHandle = () => cleanHandle($("#pfpName").value);
function drawPfpBg(ctx, S) {
  const bg = PFP_BGS.find((b) => b.id === pfp.bg) || PFP_BGS[0];
  if (bg.id === "lineup") {
    ctx.fillStyle = "#d3d9de"; ctx.fillRect(0, 0, S, S);
    ctx.font = `400 28px "Archivo Black", Impact, sans-serif`;
    ctx.textBaseline = "middle";
    for (let i = 0, y = 90; y < S; i++, y += 82) {
      ctx.fillStyle = "#8f9aa3"; ctx.fillRect(0, y, S, i % 2 ? 2 : 4);
      if (i % 2 === 0) {
        const ft = 8 - i / 2;
        ctx.fillStyle = "#6b7680";
        ctx.textAlign = "left"; ctx.fillText(`${ft}'`, 22, y - 22);
        ctx.textAlign = "right"; ctx.fillText(`${ft}'`, S - 22, y - 22);
      }
    }
    ctx.textAlign = "left";
    return;
  }
  if (bg.grad) {
    const g = ctx.createLinearGradient(0, 0, S * 0.4, S);
    g.addColorStop(0, bg.grad[0]); g.addColorStop(1, bg.grad[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = bg.fill;
  ctx.fillRect(0, 0, S, S);
  const r = ctx.createRadialGradient(S / 2, S * 0.45, 0, S / 2, S * 0.45, S * 0.62);
  r.addColorStop(0, "rgba(255,255,255,.22)"); r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 0, S, S);
}
async function drawPfp() {
  if (!pfp.meta) return;
  const seq = ++pfp.seq;
  const pose = pfp.meta.poses[pfp.pose];
  const img = await loadImg(pose.file);
  try { await document.fonts.load('100px "Archivo Black"'); } catch { /* fallback font */ }
  if (seq !== pfp.seq) return;
  const cv = $("#pfpCanvas"), ctx = cv.getContext("2d"), S = cv.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  drawPfpBg(ctx, S);
  ctx.drawImage(img, 0, 0, S, S);
  // the @ on the plaque: affine map from the plaque's tl/tr/bl corners (base pixels → canvas pixels)
  const k = S / pfp.meta.size;
  const [tl, tr, , bl] = pose.plaque.map(([x, y]) => [x * k, y * k]);
  const W = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), H = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  const handle = pfpHandle();
  const text = handle ? "@" + handle : "KOWL"; // never default to "@kowl": that handle is a real, unrelated person
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
function radioPick(group, btn) {
  $$("button", group).forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
}
async function initPfp() {
  try {
    const res = await fetch("img/pfp/plaque.json");
    pfp.meta = await res.json();
  } catch {
    $("#pfpCanvas").replaceWith(Object.assign(document.createElement("p"), { className: "empty", textContent: "pfp generator didn't load. refresh." }));
    return;
  }
  const poses = Object.keys(pfp.meta.poses);
  if (!pfp.meta.poses[pfp.pose]) pfp.pose = poses[0];
  const pg = $("#poseGrid");
  pg.innerHTML = poses.map((p) =>
    `<button role="radio" aria-checked="${p === pfp.pose}" data-pose="${esc(p)}" aria-label="${esc(p)}"><img src="${esc(pfp.meta.poses[p].thumb || pfp.meta.poses[p].file)}" alt="" width="192" height="192" loading="lazy"></button>`).join("");
  pg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    pfp.pose = b.dataset.pose; radioPick(pg, b); drawPfp();
  });
  const bgg = $("#bgGrid");
  bgg.innerHTML = PFP_BGS.map((b) =>
    `<button role="radio" aria-checked="${b.id === pfp.bg}" data-bg="${b.id}" style="background:${b.css}" aria-label="${esc(b.label)}"><span>${esc(b.label)}</span></button>`).join("");
  bgg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    pfp.bg = b.dataset.bg; radioPick(bgg, b); drawPfp();
  });
  let t;
  $("#pfpName").addEventListener("input", () => { clearTimeout(t); t = setTimeout(drawPfp, 80); });
  $("#pfpDl").addEventListener("click", (e) => {
    const cv = $("#pfpCanvas");
    const name = `kowl-${pfpHandle() || "pfp"}.png`;
    const go = (url, revoke) => {
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    if (cv.toBlob) cv.toBlob((b) => go(URL.createObjectURL(b), true), "image/png");
    else go(cv.toDataURL("image/png"), false);
    pfp.downloaded = true;
    toast("downloaded. now set it as your pfp and put 🫠 in your name.");
    melt(...evPoint(e), 6);
  });
  $("#pfpPost").addEventListener("click", () => {
    window.open(intentFor("i'm a kowl now 🫠 $KOWL"), "_blank", "noopener");
    toast(pfp.downloaded ? "attach the PNG you just downloaded." : "tip: hit download first, then attach it to the post.");
  });
  drawPfp();
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

/* ---------------- hero toy: poke counter + sound (off by default) ---------------- */
let audioCtx = null, soundOn = false;
function boing() {
  if (!soundOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(420 + Math.random() * 120, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.32);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g).connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.42);
}
function initToy() {
  let pokes = 0;
  try { pokes = +localStorage.getItem("kowl-pokes") || 0; } catch { /* private mode */ }
  const out = $("#pokeCount");
  out.textContent = commas(pokes);
  $("#heroKowl").addEventListener("click", () => {
    pokes++;
    out.textContent = commas(pokes);
    try { localStorage.setItem("kowl-pokes", pokes); } catch { /* private mode */ }
    boing();
  });
  const snd = $("#sndBtn");
  snd.addEventListener("click", () => {
    soundOn = !soundOn;
    snd.textContent = soundOn ? "🔊" : "🔇";
    snd.setAttribute("aria-pressed", soundOn);
    snd.setAttribute("aria-label", soundOn ? "sound is on" : "sound is off");
    boing();
  });
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
  ].map(([n, u]) => `<a class="btn ghost" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join("");
}

/* ---------------- nav highlight ---------------- */
function initNav() {
  const links = $$(".topnav a, .tabbar a");
  const ids = [...new Set(links.map((a) => a.getAttribute("href").slice(1)))];
  const secs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach((s) => io.observe(s));
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initLinks();
  initCA();
  initTicker();
  initHero();
  initTimeline();
  initPayroll();
  initToy();
  initChart();
  initPfp();
  initTranslator();
  initShill();
  initBingo();
  initQuiz();
  initRules();
  initToolkit();
  initModals();
  initLightbox();
  initMemes();
  initNav();
});
