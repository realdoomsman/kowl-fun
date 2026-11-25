/* =====================================================================
   kowl payroll client: google sign-in, the swearing-in, kowl balance,
   memes, bagwork, withdrawals, the shill board, the payday bell, the
   congregation boards and public member cards (#k/<number>).
   constants (API_BASE, GOOGLE_CLIENT_ID) and helpers ($, esc, toast, melt,
   commas, countTo, IMG, ME, RANKS, setRanks, drawCard…) live in app.js.
   ===================================================================== */
const API = API_BASE.trim().replace(/\/+$/, "");
const GCID = GOOGLE_CLIENT_ID.trim();
const SESSION_KEY = "kowl-session";
const pr = {
  state: "offline", stats: null, token: null, me: null, range: "24h", sort: "new", cursor: null, memes: [],
  nextAt: 0, busy: false, reportId: null, meTab: "memes", wdKey: null, gsi: false, seen: new Set(),
  board: [], boardLimit: 30, rang: false,
};
try { pr.token = localStorage.getItem(SESSION_KEY); } catch { /* private mode */ }

class ApiError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}
async function api(path, body, method) {
  if (!API) throw new ApiError("payroll opens at launch.");
  const ctl = new AbortController();
  const isForm = body instanceof FormData;
  const timer = setTimeout(() => ctl.abort(), isForm ? 60000 : 10000);
  const headers = {};
  if (body && !isForm) headers["Content-Type"] = "application/json";
  if (pr.token) headers.Authorization = "Bearer " + pr.token;
  let res;
  try {
    res = await fetch(API + path, {
      method: method || (body ? "POST" : "GET"), headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined, signal: ctl.signal,
    });
  } catch {
    throw new ApiError("can't reach payroll right now. try again in a sec.");
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (res.status === 401 && pr.token) { dropSession(); throw new ApiError("your session ran out. sign in again.", 401); }
  // decisions like a rejected bagwork come back as {ok:false, status, reason} with HTTP 200: those are results, not errors
  if (!res.ok || (data && data.ok === false && data.error)) throw new ApiError((data && (data.error || data.reason)) || `payroll said ${res.status}. try again in a sec.`, res.status);
  return data;
}

/* ---- small helpers ---- */
const num = (v) => (Number.isFinite(+v) ? +v : 0);
function sol(v) {
  const n = num(v);
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toFixed(4);
  if (Math.abs(n) < 1000) return n.toFixed(3).replace(/0$/, "");
  return commas(n);
}
const shortAddr = (w) => (w && w.length > 10 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w || "");
const toMs = (t) => (typeof t === "number" ? (t < 1e12 ? t * 1000 : t) : Date.parse(t));
function ago(t) {
  const s = Math.max(0, (Date.now() - toMs(t)) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
function countdown(ms) {
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + `:${String(x).padStart(2, "0")}`;
}
const pill = (s, label) => `<span class="pill ${esc(s || "")}">${esc(label || s || "")}</span>`;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOL_SIG = /^[1-9A-HJ-NP-Za-km-z]{43,100}$/;
const X_STATUS = /^https?:\/\/(www\.|mobile\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status(es)?\/\d+/i;
const xHandle = (h) => String(h || "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
// api media is "/media/<id>.<ext>" (or absolute); only http(s) gets through
const mediaUrl = (u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : /^\//.test(u) ? API + u : "");
const safeImg = (u) => (/^https:\/\//i.test(u || "") ? u : "");
function avatar(a, name, cls = "av-s") {
  const u = safeImg(a);
  return u
    ? `<img class="${cls}" src="${esc(u)}" alt="" referrerpolicy="no-referrer" loading="lazy">`
    : `<span class="${cls} av-letter">${esc((String(name || "k").replace(/[^A-Za-z0-9]/g, "")[0] || "k").toLowerCase())}</span>`;
}
const xLink = (h) => (xHandle(h) ? ` <a class="xh" href="https://x.com/${xHandle(h)}" target="_blank" rel="noopener">@${esc(xHandle(h))}</a>` : "");
const rankName = (r) => (!r ? "" : typeof r === "string" ? r : r.name || r.title || "");
const numOf = (r) => (r ? r.number ?? r.kowl_number : null);
const noChip = (n) => (num(n) ? `<a class="rank-chip no" href="#k/${num(n)}">${kowlNo(num(n))}</a>` : "");
const genChip = (r) => (r && r.genesis && numOf(r) ? '<span class="rank-chip gen">genesis</span>' : "");
const rankChip = (r) => (rankName(r) ? `<span class="rank-chip">${esc(rankName(r))}</span>` : "");
const emptyHTML = (img, title, text) =>
  `<div class="empty"><img src="${IMG(img)}" alt="" width="800" height="800" loading="lazy"><b>${esc(title)}</b>${esc(text)}</div>`;
const failHTML = '<p class="empty"><b>couldn\'t load this</b>payroll is being shy. it retries every minute.</p>';
function setMsg(el, text, kind) { el.textContent = text || ""; el.className = "form-msg" + (kind ? " " + kind : ""); }
const isOpen = () => pr.state !== "offline";
const isLive = () => pr.state === "live";
const signInReady = () => isOpen() && !!GCID;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* ---- stats ---- */
function applyStats(s) {
  pr.stats = s;
  pr.state = s && s.status === "live" ? "live" : s ? "waiting" : "offline";
  // before launch the server answers bagwork with {status:"closed"}; /api/stats says so up front
  pr.bagOpen = !!(s && s.bagwork_open);
  if (typeof R !== "undefined" && R.room) R.room.setStats(s);
  const live = isLive(), open = isOpen();
  $("#prStatus").dataset.state = pr.state;
  $("#navPay .ember").classList.toggle("off", !live);
  const every = num(s && s.payday_minutes) || 15, windowH = num(s && s.points_window_hours) || 24;
  if (live) {
    $("#prStatusTitle").textContent = "payroll is live";
    $("#prStatusSub").textContent = `every ${every} minutes the fees that came in are split by the points kowls earned in the last ${windowH}h. withdraw anytime.`;
  } else if (open) {
    $("#prStatusTitle").textContent = "the bell rings at launch";
    $("#prStatusSub").textContent = "sign-in, memes, bagwork and points already work. paydays and withdrawals start when $KOWL is live.";
  } else {
    $("#prStatusTitle").textContent = "the bell rings at launch";
    $("#prStatusSub").textContent = "make your memes now. sign-in, points and payday open when payroll is back.";
  }
  countTo($("#stPool"), live ? num(s.pool_sol) : null, sol);
  countTo($("#stPaid"), open ? num(s.paid_total_sol) : null, sol);
  countTo($("#stPaid2"), open ? num(s.paid_total_sol) : null, sol);
  countTo($("#stKowls"), open ? num(s.kowls) : null, commas);
  countTo($("#stKowls2"), open ? num(s.kowls) : null, commas);
  countTo($("#stMemes"), open ? num(s.memes_round) : null, commas);
  $("#stEvery").textContent = every;
  $("#stWithdrawn").textContent = live ? `${sol(s.withdrawn_total_sol)} SOL withdrawn on-chain` : "withdrawals are on-chain";
  $("#stMemes2").textContent = open ? `${commas(num(s.memes_round))} memes in play this round` : "memes in play";
  $("#stEpoch").textContent = live ? "aligned to :00 :15 :30 :45 UTC" : "from launch";
  const roll = live ? num(s.rollover_sol) : 0;
  const rEl = $("#stRollover");
  rEl.textContent = roll > 0 ? `rolling over: ${sol(roll)} SOL` : live ? "since the last payday" : "fills at launch";
  rEl.classList.toggle("roll", roll > 0);
  const fw = s && SOL_ADDR.test(s.fee_wallet || "") ? s.fee_wallet : "";
  $("#feeWallet").innerHTML = fw
    ? `<a href="https://solscan.io/account/${fw}" target="_blank" rel="noopener"><code>${shortAddr(fw)}</code> on solscan ↗</a>`
    : "published at launch";
  if (s && s.ranks) setRanks(s.ranks, s.rank_unit);
  pr.nextAt = live && s.next_payday ? toMs(s.next_payday) : 0;
  tickPayday();
  renderSignin();
  renderAccount();
}
function tickPayday() {
  const left = pr.nextAt ? pr.nextAt - Date.now() : 0;
  const live = isLive();
  const cd = live && pr.nextAt ? countdown(left) : null;
  $("#stNext").textContent = cd || "at launch";
  $("#stNext2").textContent = cd ? (left <= 0 ? "ringing…" : cd) : "silent";
  $("#navPayText").innerHTML = live ? `payday in <b>${pr.nextAt ? esc(countdown(left)) : "soon"}</b>` : "payroll opens at launch";
  if (live && pr.nextAt && left <= 0 && !pr.rang) {
    pr.rang = true;
    const b = $("#bellIco");
    b.classList.remove("ring"); void b.getBoundingClientRect(); b.classList.add("ring");
  }
  if (left > 0) pr.rang = false;
}
async function loadStats() {
  const was = pr.state;
  try { applyStats(await api("/api/stats")); } catch { applyStats(null); }
  loadBoards();
  loadShillBoard();
  if (was !== pr.state || !pr.memes.length) loadGallery(true);
  if (signInReady()) initGoogle();
}

/* ---- public boards + the bell ---- */
async function loadBoards() {
  const lead = $("#leaders"), cr = $("#credits"), wd = $("#withdrawals");
  if (!isOpen()) {
    lead.innerHTML = emptyHTML("sus", "no kowls on the board yet", "the first payday lands within 15 minutes of launch. your memes could be on it.");
    cr.innerHTML = emptyHTML("rich", "no paydays yet", "every payday credit shows up here: who, how many points, how much SOL.");
    wd.innerHTML = emptyHTML("shill", "no withdrawals yet", "every withdrawal shows up here with its solscan receipt. no secrets.");
    renderBell(null);
    return;
  }
  const [l, c, w, p] = await Promise.allSettled([
    api(`/api/leaderboard?range=${pr.range}`), api("/api/payroll?limit=50"), api("/api/withdrawals?limit=50"), api("/api/payday/latest"),
  ]);
  renderLeaders(l.status === "fulfilled" ? l.value : null);
  const credits = c.status === "fulfilled" ? c.value : null;
  renderCredits(credits);
  renderWithdrawals(w.status === "fulfilled" ? w.value : null);
  const latest = p.status === "fulfilled" ? p.value : null;
  renderBell(latest && Array.isArray(latest.credits) ? latest : Array.isArray(credits) ? { credits } : null);
}
function renderBell(latest) {
  const el = $("#bellRun"), rows = latest && latest.credits;
  if (!rows || !rows.length) {
    el.classList.remove("moving");
    el.innerHTML = `<span class="bell-empty">${isLive() ? "no paydays yet. the first credits scroll past here." : "every 15 minutes from launch, each credit scrolls past here: who, how many points, how much SOL."}</span>`;
    return;
  }
  const head = latest.payday != null ? `<span class="bell-item head">payday #${esc(latest.payday)} · ${sol(latest.total_sol)} SOL · ${commas(rows.length)} kowl${rows.length === 1 ? "" : "s"} paid${latest.ts ? ` · ${esc(ago(latest.ts))}` : ""}</span>` : "";
  const items = head + rows.slice(0, 24).map((r) => `<span class="bell-item">${noChip(numOf(r))}<b>${esc(r.name || "kowl")}</b> +${sol(r.sol)} SOL <i>${commas(num(r.points))} pts</i></span>`).join("");
  el.innerHTML = items + items;
  el.classList.add("moving");
  el.style.animationDuration = Math.max(24, rows.length * 4) + "s";
}
function renderLeaders(rows) {
  const el = $("#leaders");
  if (!Array.isArray(rows)) { el.innerHTML = failHTML; return; }
  if (!rows.length) { el.innerHTML = emptyHTML("sus", "nobody in this range yet", "upload a meme or submit bagwork. the first kowls on this board are genesis."); return; }
  el.innerHTML = rows.map((r, i) => `<div class="row"><span class="rk">${i + 1}</span>
      <div class="who">${avatar(r.avatar, r.name)}<div><b>${esc(r.name || "kowl")}${noChip(numOf(r))}${genChip(r)}${rankChip(r.rank)}${xLink(r.x_handle)}</b><span>${commas(num(r.points))} points · ${commas(num(r.memes))} meme${num(r.memes) === 1 ? "" : "s"}</span></div></div>
      <div class="amt">${sol(r.earned_sol)}<small>SOL earned</small></div></div>`).join("");
}
function renderCredits(rows) {
  const el = $("#credits");
  if (!Array.isArray(rows)) { el.innerHTML = failHTML; return; }
  if (!rows.length) { el.innerHTML = emptyHTML("rich", "no paydays yet", "the first payday hasn't happened. every credit will be listed here."); return; }
  el.innerHTML = rows.map((r) => `<div class="row"><span class="rk">+</span>
      <div class="who">${avatar(r.avatar, r.name)}<div><b>${esc(r.name || "kowl")}${noChip(numOf(r))}${xLink(r.x_handle)}</b><span>${r.payday != null ? `payday #${esc(r.payday)} · ` : ""}${commas(num(r.points))} points · ${esc(ago(r.ts))}</span></div></div>
      <div class="amt">+${sol(r.sol)}<small>SOL credited</small></div></div>`).join("");
}
function renderWithdrawals(rows) {
  const el = $("#withdrawals");
  if (!Array.isArray(rows)) { el.innerHTML = failHTML; return; }
  if (!rows.length) { el.innerHTML = emptyHTML("shill", "no withdrawals yet", "every withdrawal will be listed here with its solscan receipt."); return; }
  el.innerHTML = rows.map((r) => {
    const sig = SOL_SIG.test(r.sig || "") ? r.sig : "";
    return `<div class="row"><span class="rk">◎</span>
      <div class="who">${avatar(r.avatar, r.name)}<div><b>${esc(r.name || "kowl")}${noChip(numOf(r))}</b><span>${esc(ago(r.ts))}</span></div></div>
      <div class="amt">${sol(r.sol)} SOL${sig ? `<a href="https://solscan.io/tx/${sig}" target="_blank" rel="noopener">receipt ↗</a>` : ""}</div></div>`;
  }).join("");
}
function initBoards() {
  const segs = $$("[data-board]");
  segs.forEach((b) => b.addEventListener("click", () => {
    segs.forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", String(x === b)); });
    $$("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.board; });
  }));
  const ranges = $$("#lbRange button");
  ranges.forEach((b) => b.addEventListener("click", async () => {
    ranges.forEach((x) => x.classList.toggle("on", x === b));
    pr.range = b.dataset.range;
    if (!isOpen()) return;
    try { renderLeaders(await api(`/api/leaderboard?range=${pr.range}`)); } catch { renderLeaders(null); }
  }));
}

/* ---- the shill board: accepted bagwork, newest first ---- */
async function loadShillBoard() {
  const el = $("#shillBoard");
  if (!API) { renderShillBoard([]); return; }
  try {
    const rows = await api(`/api/bagwork/feed?limit=${pr.boardLimit}`);
    pr.board = Array.isArray(rows) ? rows : [];
    renderShillBoard(pr.board);
  } catch (e) {
    if (e.status === 404 || e.status === 405) renderShillBoard([]);
    else if (!pr.board.length) el.innerHTML = failHTML;
  }
}
function renderShillBoard(rows) {
  const el = $("#shillBoard"), more = $("#boardMore");
  if (!rows.length) {
    el.innerHTML = `<div class="board-empty"><img src="${IMG("shill")}" alt="" width="800" height="800" loading="lazy">
      <div><b>the door is still bare.</b><p>the first accepted bagwork gets nailed up here, with the kowl's name on it. it could be yours: answer today's call on kowl's phone, post it with "paid by $KOWL", paste the link in the laptop's bagwork box.</p>
      <a class="btn ghost sm" href="#call">today's call →</a></div></div>`;
    more.hidden = true;
    return;
  }
  el.innerHTML = rows.map((r, i) => {
    const url = X_STATUS.test(r.url || "") ? r.url : "";
    const h = xHandle(r.x_handle);
    return `<article class="notice" data-i="${i}">
      <div class="notice-who">${avatar(null, r.name || h)}<div><b>${esc(r.name || "kowl")}${noChip(numOf(r))}</b><span>${h ? `<a href="https://x.com/${h}" target="_blank" rel="noopener">@${esc(h)}</a> · ` : ""}${esc(ago(r.ts))}</span></div></div>
      <span class="notice-stamp">paid by $KOWL · disclosed</span>
      <div class="notice-foot"><span class="notice-pts">+${commas(num(r.points) || 8)} <small>pts</small></span>
        <span>${url ? `<button class="mini-btn" type="button" data-embed>show post</button> <a class="mini-btn" href="${esc(url)}" target="_blank" rel="noopener">open on X ↗</a>` : ""}</span></div>
      <div class="notice-embed"></div>
    </article>`;
  }).join("");
  more.hidden = rows.length < pr.boardLimit || pr.boardLimit >= 100;
}
let widgetsP = null;
function loadWidgets() {
  return widgetsP || (widgetsP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://platform.twitter.com/widgets.js";
    s.async = true; s.charset = "utf-8";
    s.onload = () => res(window.twttr);
    s.onerror = () => { widgetsP = null; rej(new Error("widgets")); };
    document.head.appendChild(s);
  }));
}
function initShillBoard() {
  $("#shillBoard").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-embed]");
    if (!b) return;
    const card = b.closest(".notice"), r = pr.board[+card.dataset.i];
    if (!r || !X_STATUS.test(r.url || "")) return;
    const box = $(".notice-embed", card);
    b.disabled = true;
    box.innerHTML = `<blockquote class="twitter-tweet" data-dnt="true" data-conversation="none"><a href="${esc(r.url)}"></a></blockquote>`;
    try {
      const tw = await loadWidgets();
      await tw.widgets.load(box);
      b.remove();
    } catch {
      box.innerHTML = "";
      b.disabled = false;
      toast("X's embed didn't load (an ad blocker?). open it on X instead.");
    }
  });
  $("#boardMore").addEventListener("click", () => { pr.boardLimit = 100; loadShillBoard(); });
}

/* ---- google sign-in (Google Identity Services) ---- */
function initGoogle() {
  if (pr.gsi) return;
  pr.gsi = true;
  const ready = () => {
    const id = window.google && window.google.accounts && window.google.accounts.id;
    if (!id) { googleFailed(); return; }
    id.initialize({ client_id: GCID, callback: onCredential, auto_select: false, cancel_on_tap_outside: true, itp_support: true });
    id.renderButton($("#gsiBtn"), { type: "standard", theme: "filled_black", size: "large", shape: "pill", text: "signin_with", logo_alignment: "left", width: 260 });
  };
  if (window.google && window.google.accounts && window.google.accounts.id) { ready(); return; }
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.onload = ready;
  s.onerror = googleFailed;
  document.head.appendChild(s);
}
function googleFailed() {
  pr.gsi = false;
  $("#signinSub").textContent = "google sign-in didn't load (an ad blocker?). allow accounts.google.com and refresh.";
}
async function onCredential(resp) {
  try {
    const r = await api("/api/auth/google", { credential: resp && resp.credential });
    pr.token = r.token;
    store.set(SESSION_KEY, r.token);
    pr.me = { account: r.account, memes: [], bagwork: [], ledger: [], withdrawals: [] };
    renderSignin(); renderAccount();
    toast("you signed the register. 🫠");
    melt(innerWidth / 2, innerHeight / 2, 10);
    await loadMe();
    swearIn();
  } catch (e) {
    toast(e.message);
  }
}
function dropSession() {
  pr.token = null; pr.me = null;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
  renderSignin(); renderAccount();
}
async function signOut() {
  try { await api("/api/auth/logout", {}); } catch { /* the session dies locally anyway */ }
  dropSession();
  if (window.google && window.google.accounts && window.google.accounts.id) window.google.accounts.id.disableAutoSelect();
  toast("signed out. kowl will miss you (he won't remember).");
}
function renderSignin() {
  const a = pr.token && pr.me && pr.me.account;
  $("#signedAs").hidden = !a;
  $("#gsiBtn").hidden = !!a || !signInReady();
  if (a) {
    $("#signinTitle").textContent = "you signed the register";
    $("#signinSub").textContent = a.banned ? "this account is frozen. ask @KowlFun." : "your email is never shown anywhere. your kowl card is on the door.";
    return;
  }
  if (!signInReady()) {
    $("#signinTitle").textContent = "the register opens soon";
    $("#signinSub").textContent = "payroll is unreachable right now. your card (the door) and your pfp (the mirror) still work.";
  } else {
    $("#signinTitle").textContent = "sign the register";
    $("#signinSub").textContent = "one tap with google. no wallet needed until you withdraw. your email is never shown anywhere.";
  }
}

/* ---- the swearing-in: one oath after sign-in, one ceremony when the number lands ---- */
function swearIn() {
  const a = pr.me && pr.me.account;
  if (!a) return;
  const sworn = store.get("kowl-sworn-" + a.id), seenNo = store.get("kowl-number-" + a.id);
  const n = num(a.kowl_number);
  if (!sworn) {
    showOath({ number: n, genesis: !!a.genesis, first: true });
    return;
  }
  if (n && seenNo !== String(n)) showOath({ number: n, genesis: !!a.genesis, first: false });
}
function showOath({ number, genesis, first }) {
  const a = pr.me && pr.me.account;
  if (number) {
    $("#oathEyebrow").textContent = genesis ? "the swearing-in · genesis" : "the swearing-in";
    $("#oathTitle").textContent = `kowl ${kowlNo(number)}, you are now a kowl.`;
    $("#oathNote").innerHTML = `you will never get paid in secret.${genesis ? " you were numbered before launch: your card says <b>genesis</b>, forever." : ""}`;
    $("#oathImg").src = IMG("send-it");
  } else {
    $("#oathEyebrow").textContent = "the swearing-in";
    $("#oathTitle").textContent = "repeat after kowl.";
    $("#oathNote").innerHTML = "your kowl number comes with your first approved meme or accepted bagwork. numbers given before launch are <b>genesis</b>.";
    $("#oathImg").src = IMG("gm");
  }
  $("#oathLines").hidden = !first && !!number;
  const m = $("#oathModal");
  openModal(m);
  $("#oathBtn").onclick = (e) => {
    if (a) {
      store.set("kowl-sworn-" + a.id, "1");
      if (number) store.set("kowl-number-" + a.id, String(number));
    }
    closeModal(m);
    melt(...evPoint(e), 12);
    toast(number ? `welcome, kowl ${kowlNo(number)}. 🫠` : "sworn in. now make your first meme. 🫠");
  };
}

/* ---- my kowl ---- */
async function loadMe() {
  if (!pr.token || !isOpen()) { renderAccount(); return; }
  try {
    pr.me = await api("/api/me");
  } catch (e) {
    if (pr.token) toast(e.message);
  }
  renderSignin();
  renderAccount();
}
const MEME_ST = { pending: "in review", approved: "live", rejected: "rejected", hidden: "hidden" };
const WD_ST = { review: "in review", pending: "pending", sent: "sent", confirmed: "confirmed", failed: "failed · refunded", rejected: "rejected · refunded" };
const BAG_ST = { accepted: "credited", pending: "checking", rejected: "rejected", revoked: "revoked" };
function lifetimePoints(me) {
  const a = me.account;
  if (a.lifetime_points != null) return num(a.lifetime_points);
  const ms = Array.isArray(me.memes) ? me.memes : [], bs = Array.isArray(me.bagwork) ? me.bagwork : [];
  return ms.reduce((s, m) => s + (m.status === "approved" ? num(m.points) : 0), 0) + bs.reduce((s, b) => s + (b.status === "accepted" ? num(b.points) : 0), 0);
}
function syncME() {
  const me = pr.token ? pr.me : null, a = me && me.account;
  const was = JSON.stringify(ME);
  if (!a) {
    Object.assign(ME, { signed: false, name: "", number: null, genesis: false, rank: "", joined: null, x: "", points: 0, streak: 0 });
  } else {
    const fallbackRank = RANKS[rankForValue(lifetimePoints(me))];
    Object.assign(ME, {
      signed: true, name: a.name || "kowl", number: num(a.kowl_number) || null, genesis: !!a.genesis,
      rank: rankName(a.rank) || (fallbackRank ? fallbackRank.name : "initiate"), joined: a.joined_at,
      x: a.x_status === "verified" ? xHandle(a.x_handle) : "", points: lifetimePoints(me), streak: num(a.streak_days),
    });
  }
  if (JSON.stringify(ME) !== was) drawPfp();
}
function renderRank(a) {
  let idx = rankIndex(ME.rank);
  if (idx < 0) idx = 0;
  myRank = a ? idx : -1;
  renderRanks();
  if (!a) return;
  $("#meRank").textContent = ME.rank || "initiate";
  const next = RANKS[idx + 1];
  const have = ME.points;
  if (next && next.min != null) {
    const cur = RANKS[idx].min || 0;
    $("#meRankNext").textContent = `next: ${next.name.replace(/"/g, "")} at ${commas(next.min)} ${RANK_UNIT}`;
    $("#meRankBar").style.width = Math.max(4, Math.min(100, ((have - cur) / Math.max(1, next.min - cur)) * 100)) + "%";
  } else {
    $("#meRankNext").textContent = next ? `next: ${next.name}` : "the top of the hierarchy. there is nowhere left to melt.";
    $("#meRankBar").style.width = next ? "8%" : "100%";
  }
}
function renderAccount() {
  const me = pr.token ? pr.me : null, a = me && me.account;
  syncME();
  $("#sanctum").dataset.signed = a ? "yes" : "no";
  $("#meAvatar").src = (a && safeImg(a.avatar)) || HEAD;
  $("#meName").textContent = a ? a.name || "kowl" : "not signed in";
  $("#meSub").textContent = a
    ? a.banned ? "this account is frozen. ask @KowlFun." : `${ME.number ? `kowl ${kowlNo(ME.number)} · ` : ""}sworn in ${new Date(toMs(a.joined_at)).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toLowerCase()}${ME.x ? ` · @${ME.x}` : ""}`
    : "";
  if (a && document.activeElement !== $("#nameInput") && !$("#nameInput").dataset.dirty) $("#nameInput").value = a.name || "";
  $("#nameSave").textContent = a ? "save name" : "swear it in";
  renderRank(a);
  if (!a) { renderMeList(); return; }
  $("#meNo").textContent = `kowl ${kowlNo(ME.number)}`;
  $("#meGenesis").hidden = !ME.genesis;
  const streak = num(a.streak_days);
  $("#meStreakDays").textContent = commas(streak);
  $("#meStreakMeta").textContent = `· best ${commas(num(a.streak_best))} · ❄ ${commas(num(a.freezes_left))} freeze${num(a.freezes_left) === 1 ? "" : "s"} left`;
  $("#meStreak").classList.toggle("hot", streak > 0);
  countTo($("#meBalance"), num(a.balance_sol), sol);
  $("#meEarned").textContent = sol(a.earned_total_sol);
  $("#meWithdrawn").textContent = sol(a.withdrawn_total_sol);
  $("#mePoints").textContent = commas(num(a.points_round));
  $("#meLife").textContent = commas(ME.points);
  const canWd = isLive() && !a.banned;
  ["#wdAddr", "#wdAmt", "#wdMax"].forEach((s) => { $(s).disabled = !canWd || pr.busy; });
  $("#wdBtn").disabled = !canWd || pr.busy;
  $("#wdBtn").textContent = !isLive() ? "withdrawals open at launch" : "withdraw";
  renderX(a);
  renderMeList();
}
function renderX(a) {
  const st = a.x_status || "none", state = $("#xState"), form = $("#xForm");
  const vform = $("#xVerifyForm");
  if (st === "verified") {
    state.innerHTML = `<p class="x-ok">✓ linked: <b>@${esc(xHandle(a.x_handle))}</b>. your bagwork counts automatically.</p>`;
    form.hidden = true;
    vform.hidden = true;
  } else if (st === "pending" && a.x_code) {
    const intent = intentFor(`linking my kowl: ${a.x_code} 🫠`);
    state.innerHTML = `<p>post anything from <b>@${esc(xHandle(a.x_handle))}</b> with this code in it, then paste the post's link below. it's verified instantly (you can delete the post after).</p>
      <div class="xcode"><code>${esc(a.x_code)}</code><button class="mini-btn" type="button" id="xCopy">copy</button><a class="mini-btn" href="${esc(intent)}" target="_blank" rel="noopener">post it ↗</a></div>
      <p class="small">wrong handle? enter it again to get a new code.</p>`;
    form.hidden = false;
    vform.hidden = false;
    $("#xCopy").onclick = async () => { const ok = await copy(a.x_code); toast(ok ? "code copied. put it in a post." : "copy failed. type it."); };
  } else {
    state.innerHTML = `<p>get a code, post it, paste the link. ten seconds, then your bagwork is credited automatically.${a.x_reason ? ` <br><b>last link removed:</b> ${esc(a.x_reason)}` : ""}</p>`;
    form.hidden = false;
    vform.hidden = true;
  }
  const ok = st === "verified" && !a.banned && pr.bagOpen;
  ["#bagUrl", "#bagBtn"].forEach((s) => { $(s).disabled = !ok; });
  $("#bagForm").classList.toggle("locked", !ok);
  $("#bagForm").hidden = !pr.bagOpen;
  $("#bagNote").innerHTML = pr.bagOpen
    ? 'post on X from your linked account, starting with <code>paid by $KOWL</code>, Paid Partnership label on. paste the link: it\'s checked automatically in seconds.'
    : "<b>bagwork opens at launch.</b> link your X now so you're ready: the first disclosed posts after launch earn +8 each, checked automatically.";
  const bm = $("#bagMsg");
  if (!pr.bagOpen) { if (!bm.classList.contains("err")) setMsg(bm, ""); }
  else if (st !== "verified" && !bm.textContent) setMsg(bm, "link your X first. bagwork only counts from your own linked account.", "info");
  else if (st === "verified" && bm.classList.contains("info") && /link your X first/.test(bm.textContent)) setMsg(bm, "");
}
function renderMeList() {
  const me = pr.token ? pr.me : null, el = $("#meList");
  if (!me || !me.account) { el.innerHTML = ""; return; }
  const list = (k) => (Array.isArray(me[k]) ? me[k] : []);
  const tab = pr.meTab;
  let html = "";
  if (tab === "memes") {
    html = list("memes").map((m) => {
      const u = mediaUrl(m.url);
      const thumb = u ? (m.kind === "video" ? `<video src="${esc(u)}" muted preload="metadata"></video>` : `<img src="${esc(u)}" alt="" loading="lazy">`) : '<span class="mthumb-ph">🫠</span>';
      const e = m.engagement || {};
      const meta = m.status === "rejected" ? esc(m.reason || "rejected") : m.status === "pending" ? "a human checks it before it goes public" : m.status === "hidden" ? esc(m.reason || "hidden by a mod") : `👁 ${commas(num(e.views))} · ↗ ${commas(num(e.shares))} · ⬇ ${commas(num(e.downloads))}`;
      return `<div class="me-meme"><div class="mthumb">${thumb}</div>
        <div><b>${esc(m.title || "untitled")}</b>${pill(m.status, MEME_ST[m.status])}${m.best ? pill("best", "⭐ best") : ""}<span class="meta">${meta}</span></div>
        <div class="amt">${num(m.points) ? `+${commas(num(m.points))}<small>pts</small>` : "–"}</div></div>`;
    }).join("") || '<p class="empty">no memes yet. pin one on the polaroid wall: +10 points when it\'s approved.</p>';
  } else if (tab === "bagwork") {
    html = list("bagwork").map((b) => {
      const link = X_STATUS.test(b.url || "") ? b.url : "";
      const meta = b.status === "rejected" || b.status === "revoked" ? esc(b.reason || b.status)
        : b.status === "pending" ? "checking it with X. this takes a few seconds (longer if X is slow)."
          : esc(ago(b.created_at));
      return `<div class="me-meme"><div class="mthumb"><span class="mthumb-ph">𝕏</span></div>
        <div>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">post ↗</a>` : "post"}${pill(b.status, BAG_ST[b.status] || b.status)}
        <span class="meta">${meta}</span></div>
        <div class="amt">${b.status === "accepted" && num(b.points) ? `+${commas(num(b.points))}<small>pts</small>` : "–"}</div></div>`;
    }).join("") || '<p class="empty">no bagwork yet. link your X, post something that starts with "paid by $KOWL" (Paid Partnership label on), paste the link.</p>';
  } else if (tab === "withdrawals") {
    html = list("withdrawals").map((w) => {
      const sig = SOL_SIG.test(w.sig || "") ? w.sig : "";
      return `<div class="me-meme"><div class="mthumb"><span class="mthumb-ph">◎</span></div>
        <div><b>${sol(w.amount_sol != null ? w.amount_sol : w.sol)} SOL</b>${pill(w.status, WD_ST[w.status])}
        <span class="meta">to ${esc(shortAddr(w.address))} · ${esc(ago(w.created_at || w.ts))}${w.reason ? " · " + esc(w.reason) : ""}</span></div>
        <div class="amt">${sig ? `<a href="https://solscan.io/tx/${sig}" target="_blank" rel="noopener">solscan ↗</a>` : "–"}</div></div>`;
    }).join("") || '<p class="empty">no withdrawals yet. from 0.01 SOL, anytime after launch.</p>';
  } else {
    const KIND = { payday: "payday", withdrawal: "withdrawal", adjust: "adjustment" };
    html = list("ledger").map((l) => `<div class="ledger-row"><span>${esc(KIND[l.kind] || l.kind)}${l.ref ? ` <i>${esc(l.ref)}</i>` : ""}<small>${esc(ago(l.ts))}</small></span>
        <b class="${num(l.sol) < 0 ? "neg" : "pos"}">${num(l.sol) < 0 ? "" : "+"}${sol(l.sol)}</b></div>`).join("")
      || '<p class="empty">nothing yet. every payday credit and withdrawal lands here.</p>';
  }
  el.innerHTML = html;
}
function showMeTab(tab) {
  pr.meTab = tab;
  $$("#meTabs button").forEach((x) => { const on = x.dataset.me === tab; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
  renderMeList();
}
function initMe() {
  $$("#meTabs button").forEach((b) => b.addEventListener("click", () => showMeTab(b.dataset.me)));
  $("#nameInput").addEventListener("input", (e) => { e.target.dataset.dirty = "1"; });
  $("#nameForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#nameInput").value.trim(), msg = $("#nameMsg");
    if (!name) { setMsg(msg, "a name needs at least one letter. even kowl has one.", "err"); return; }
    if (!(pr.me && pr.me.account)) {
      setMsg(msg, "it's on your card (the door). sign in with google above to make it official.", "info");
      drawMyCard();
      return;
    }
    try {
      const r = await api("/api/me/profile", { name });
      if (r && r.account && pr.me) pr.me.account = { ...pr.me.account, ...r.account };
      delete $("#nameInput").dataset.dirty;
      setMsg(msg, "sworn in under that name. put 🫠 in it.", "ok");
      renderAccount();
    } catch (err) { setMsg(msg, err.message, "err"); }
  });
  $("#signOut").addEventListener("click", signOut);
  // withdraw
  const wdChanged = () => { pr.wdKey = null; };
  $("#wdAddr").addEventListener("input", wdChanged);
  $("#wdAmt").addEventListener("input", wdChanged);
  $("#wdMax").addEventListener("click", () => {
    const b = pr.me && pr.me.account ? num(pr.me.account.balance_sol) : 0;
    $("#wdAmt").value = b ? String(Math.floor(b * 1e9) / 1e9) : "";
    wdChanged();
  });
  $("#wdForm").addEventListener("submit", withdraw);
  // X link
  $("#xForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = xHandle($("#xHandle").value), msg = $("#xMsg");
    if (!h) { setMsg(msg, "type your X handle.", "err"); return; }
    try {
      const r = await api("/api/me/x", { handle: h });
      if (pr.me && pr.me.account) Object.assign(pr.me.account, { x_handle: h, x_status: "pending", x_code: r.code });
      setMsg(msg, "");
      renderAccount();
      $("#xUrl").focus();
    } catch (err) { setMsg(msg, err.message, "err"); }
  });
  $("#xVerifyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("#xUrl").value.trim(), msg = $("#xMsg"), btn = $("#xVerifyBtn");
    if (!X_STATUS.test(url)) { setMsg(msg, "paste the link to your post with the code. it looks like x.com/you/status/123…", "err"); return; }
    btn.disabled = true;
    try {
      const r = await api("/api/me/x/verify", { url });
      if (r && r.account && pr.me) pr.me.account = { ...pr.me.account, ...r.account };
      else if (pr.me && pr.me.account) pr.me.account.x_status = "verified";
      $("#xUrl").value = "";
      setMsg(msg, "linked 🫠 your bagwork now counts automatically.", "ok");
      renderAccount();
      loadMe();
    } catch (err) { setMsg(msg, err.message, "err"); }
    finally { btn.disabled = false; }
  });
  // bagwork: checked automatically by the server
  let bagPoll = 0;
  $("#bagForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("#bagUrl").value.trim(), msg = $("#bagMsg");
    if (!X_STATUS.test(url)) { setMsg(msg, "that's not a link to an X post. it looks like x.com/you/status/123…", "err"); return; }
    $("#bagBtn").disabled = true;
    try {
      const r = (await api("/api/bagwork", { url })) || {};
      if (r.status === "accepted") { setMsg(msg, `credited: +${commas(num(r.points) || 8)} points 🫠 it's on the shill board now. delete the post and they go too.`, "ok"); loadShillBoard(); }
      else if (r.status === "closed" || r.code === "closed") {
        setMsg(msg, `${r.reason || "bagwork opens at launch"}. nothing was sent to X. link your X now and you're ready.`, "info");
        pr.bagOpen = false;
        renderAccount();
        return;
      }
      else if (r.status === "rejected" || r.status === "paused") setMsg(msg, `not credited: ${r.reason || "it didn't pass the check"}.`, "err");
      else {
        setMsg(msg, "got it. X is slow right now, so it's queued: it'll be checked automatically in a minute.", "info");
        clearTimeout(bagPoll);
        bagPoll = setTimeout(loadMe, 30000);
      }
      $("#bagUrl").value = "";
      showMeTab("bagwork");
      await loadMe();
      swearIn();
    } catch (err) { setMsg(msg, err.message, "err"); }
    finally { $("#bagBtn").disabled = false; }
  });
}
function newKey() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 32);
}
async function withdraw(e) {
  e.preventDefault();
  const msg = $("#wdMsg"), a = pr.me && pr.me.account;
  const address = $("#wdAddr").value.trim(), amount = Number($("#wdAmt").value.replace(",", "."));
  if (!a) return;
  if (!SOL_ADDR.test(address)) { setMsg(msg, "that doesn't look like a Solana address. paste it, don't type it.", "err"); return; }
  if (!(amount >= 0.01)) { setMsg(msg, "the minimum is 0.01 SOL.", "err"); return; }
  if (amount > num(a.balance_sol) + 1e-9) { setMsg(msg, "that's more than your balance. kowl math, not ours.", "err"); return; }
  pr.wdKey = pr.wdKey || newKey(); // reused on retries so a double click or a flaky network can't send twice
  pr.busy = true; renderAccount();
  setMsg(msg, "sending the request…", "info");
  try {
    const r = await api("/api/withdraw", { address, amount_sol: amount, idempotency_key: pr.wdKey });
    const st = r && r.withdrawal && r.withdrawal.status;
    setMsg(msg, st === "review" ? "requested. it's over 1 SOL (or your account is new), so a human approves it first." : "requested 🫠 it goes out in the next batch. track it under withdrawals.", "ok");
    pr.wdKey = null;
    $("#wdAmt").value = "";
    showMeTab("withdrawals");
    await loadMe();
  } catch (err) {
    setMsg(msg, err.message, "err");
  } finally {
    pr.busy = false; renderAccount();
  }
}

/* ---- upload: make an offering ---- */
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"], VID_TYPES = ["video/mp4", "video/webm"];
const MB = 1024 * 1024;
let upFile = null, upPreviewUrl = "";
function pickFile() {
  const f = $("#upFile").files[0], msg = $("#upMsg");
  upFile = null;
  if (upPreviewUrl) { URL.revokeObjectURL(upPreviewUrl); upPreviewUrl = ""; }
  $("#dropPrev").hidden = true; $("#dropEmpty").hidden = false;
  if (!f) return;
  const isImg = IMG_TYPES.includes(f.type), isVid = VID_TYPES.includes(f.type);
  if (!isImg && !isVid) { setMsg(msg, "png, jpg, webp, gif, mp4 or webm only.", "err"); return; }
  if (isImg && f.size > 5 * MB) { setMsg(msg, "images max out at 5 MB. kowl's brain maxes out at 0.", "err"); return; }
  if (isVid && f.size > 15 * MB) { setMsg(msg, "videos max out at 15 MB.", "err"); return; }
  upFile = f;
  upPreviewUrl = URL.createObjectURL(f);
  const prev = $("#dropPrev");
  prev.innerHTML = isVid ? `<video src="${upPreviewUrl}" muted autoplay loop playsinline></video>` : `<img src="${upPreviewUrl}" alt="">`;
  prev.hidden = false; $("#dropEmpty").hidden = true;
  setMsg(msg, "");
}
async function uploadMeme(e) {
  e.preventDefault();
  const msg = $("#upMsg"), title = $("#upTitle").value.trim();
  if (!(pr.token && pr.me && pr.me.account)) { setMsg(msg, "sign in on the laptop first. then your meme earns points.", "info"); return; }
  if (!upFile) { setMsg(msg, "pick an image or a video first.", "err"); return; }
  if (!title) { setMsg(msg, "give it a title. kowl needs something to read (he can't).", "err"); $("#upTitle").focus(); return; }
  if (!$("#upAttest").checked) { setMsg(msg, "tick the box: it has to be your own meme, and payroll isn't available in the UK, EU or Australia.", "err"); return; }
  const btn = $("#upBtn");
  btn.disabled = true; btn.textContent = "uploading…";
  setMsg(msg, "");
  try {
    const fd = new FormData();
    fd.append("title", title); fd.append("attest", "1"); fd.append("file", upFile);
    await api("/api/memes", fd);
    setMsg(msg, "pinned 🫠 a human checks it before it goes public (usually within a few hours). track it on the laptop.", "ok");
    $("#uploadForm").reset();
    pickFile();
    melt(innerWidth / 2, innerHeight / 2, 10);
    showMeTab("memes");
    loadMe();
  } catch (err) {
    setMsg(msg, err.message, "err");
  } finally {
    btn.disabled = false; btn.textContent = "upload for review";
  }
}
function initDrop() {
  const d = $("#drop");
  ["dragenter", "dragover"].forEach((t) => d.addEventListener(t, () => d.classList.add("over")));
  ["dragleave", "drop"].forEach((t) => d.addEventListener(t, () => d.classList.remove("over")));
}

/* ---- the congregation's memes ---- */
function memeCard(m) {
  const u = mediaUrl(m.url), au = m.author || {}, e = m.engagement || {};
  const media = !u ? '<span class="mthumb-ph">🫠</span>' : m.kind === "video"
    ? `<video src="${esc(u)}" muted loop playsinline controls preload="metadata"></video>`
    : `<img src="${esc(u)}" alt="${esc(m.title || "kowl meme")}" loading="lazy">`;
  return `<article class="mcard${m.best ? " is-best" : ""}" data-id="${esc(m.id)}">
    <div class="mmedia">${m.best ? '<span class="best-badge">⭐ best</span>' : ""}${media}</div>
    <div class="mbody">
      <b class="mtitle">${esc(m.title || "untitled")}</b>
      <span class="mby">${avatar(au.avatar, au.name)}<span>${esc(au.name || "kowl")}${noChip(numOf(au))}${xLink(au.x_handle)} · ${esc(ago(m.created_at))}</span></span>
      <span class="mstats"><span title="views">👁 ${commas(num(e.views))}</span><span title="shares">↗ ${commas(num(e.shares))}</span><span title="downloads">⬇ ${commas(num(e.downloads))}</span><b>${commas(num(m.points))} pts</b></span>
      <div class="mfoot">
        <button class="mini-btn" type="button" data-share>share</button>
        <button class="mini-btn" type="button" data-dl>download</button>
        <button class="link-btn rep" type="button" data-report>report</button>
      </div>
    </div>
  </article>`;
}
function track(id, type) {
  if (!API) return;
  api(`/api/memes/${encodeURIComponent(id)}/event`, { type }).catch(() => { /* counting is best effort */ });
}
let viewIO = null;
function watchViews() {
  if (!("IntersectionObserver" in window)) return;
  viewIO = viewIO || new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.dataset.id;
      viewIO.unobserve(en.target);
      if (pr.seen.has(id)) return;
      pr.seen.add(id);
      track(id, "view");
    });
  }, { threshold: 0.6 });
  $$("#gallery .mcard").forEach((c) => { if (!pr.seen.has(c.dataset.id)) viewIO.observe(c); });
}
function renderGallery() {
  const el = $("#gallery");
  if (!isOpen()) {
    el.innerHTML = emptyHTML("this-is-the-one", "the community wall opens soon", "payroll is unreachable right now. the canon is all yours meanwhile.");
    $("#galMore").hidden = true;
    return;
  }
  if (!pr.memes.length) {
    el.innerHTML = emptyHTML("send-it", pr.sort === "best" ? "no ⭐ best picks yet" : "no offerings yet", "be the first: sign the register, offer a meme, and a human hangs it here.");
    $("#galMore").hidden = true;
    return;
  }
  el.innerHTML = pr.memes.map(memeCard).join("");
  $("#galMore").hidden = !pr.cursor;
  watchViews();
}
async function loadGallery(reset) {
  if (!isOpen()) { pr.memes = []; pr.cursor = null; renderGallery(); return; }
  if (reset) { pr.memes = []; pr.cursor = null; }
  try {
    const r = await api(`/api/memes?sort=${pr.sort}&limit=12${pr.cursor ? "&cursor=" + encodeURIComponent(pr.cursor) : ""}`);
    pr.memes = pr.memes.concat(Array.isArray(r && r.memes) ? r.memes : []);
    pr.cursor = r && r.next ? r.next : null;
    renderGallery();
  } catch {
    $("#gallery").innerHTML = failHTML;
  }
}
async function shareMeme(m) {
  const url = mediaUrl(m.url);
  const text = `${m.title || "kowl meme"} 🫠`;
  try {
    if (navigator.share) { await navigator.share({ title: m.title || "kowl meme", text, url }); track(m.id, "share"); return; }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const ok = await copy(url);
  toast(ok ? "link copied. go share it." : "copy failed.");
  if (ok) track(m.id, "share");
}
async function downloadMeme(m) {
  const url = mediaUrl(m.url);
  const ext = (url.split("?")[0].match(/\.(\w{3,4})$/) || [, m.kind === "video" ? "mp4" : "png"])[1];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = href; a.download = `kowl-meme-${m.id}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    track(m.id, "download");
    toast("downloaded. remix it, post it, keep it.");
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
async function report(reason) {
  const id = pr.reportId;
  closeModal($("#reportModal"));
  if (!id) return;
  try {
    await api("/api/report", { meme_id: isNaN(+id) ? id : +id, reason });
    toast("reported. a human will look.");
  } catch (e) { toast(e.message); }
}
function initGallery() {
  const sorts = $$("#galSort button");
  sorts.forEach((b) => b.addEventListener("click", () => {
    sorts.forEach((x) => x.classList.toggle("on", x === b));
    pr.sort = b.dataset.sort;
    loadGallery(true);
  }));
  $("#galMore").addEventListener("click", () => loadGallery(false));
  $("#gallery").addEventListener("click", (e) => {
    const card = e.target.closest(".mcard");
    if (!card) return;
    const m = pr.memes.find((x) => String(x.id) === card.dataset.id);
    if (!m) return;
    if (e.target.closest("[data-share]")) shareMeme(m);
    else if (e.target.closest("[data-dl]")) downloadMeme(m);
    else if (e.target.closest("[data-report]")) { pr.reportId = card.dataset.id; openModal($("#reportModal")); }
  });
  $("#repOpts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-reason]");
    if (b) report(b.dataset.reason);
  });
}

/* ---- public member cards: kowl.fun/#k/<number> ---- */
let profSeq = 0;
async function openProfile(n) {
  const seq = ++profSeq;
  const modal = $("#profileModal");
  $("#profTitle").textContent = `kowl ${kowlNo(n)}`;
  $("#profStats").innerHTML = '<div class="prof-loading">looking them up in the register…</div>';
  $("#profMemes").innerHTML = "";
  $("#profShare").onclick = () => shareCard(n);
  const cv = $("#profCanvas");
  cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
  cv.hidden = true;
  $("#profShare").hidden = true;
  openModal(modal);
  let k = null;
  try { k = await api(`/api/kowl/${n}`); } catch (e) { k = e.status === 404 ? false : null; }
  if (seq !== profSeq) return;
  if (!k) {
    $("#profStats").innerHTML = `<div class="prof-loading">${k === false ? `nobody is kowl ${esc(kowlNo(n))} yet. the next approved meme could be.` : "the register is unreachable right now. try again in a minute."}</div>`;
    return;
  }
  cv.hidden = false;
  $("#profShare").hidden = false;
  const memesList = Array.isArray(k.memes) ? k.memes : [];
  const m = {
    signed: true, name: k.name || "kowl", number: num(k.number) || n, genesis: !!k.genesis, rank: rankName(k.rank) || "kowl",
    joined: k.joined_at, x: xHandle(k.x_handle), points: num(k.lifetime_points), streak: num(k.streak_days),
  };
  $("#profTitle").textContent = `${m.name} · kowl ${kowlNo(m.number)}${m.genesis ? " · genesis" : ""}`;
  $("#profStats").innerHTML = [
    ["rank", esc(m.rank)], ["lifetime points", commas(m.points)], ["memes", commas(memesList.length)],
    ["melt streak", `${commas(m.streak)} day${m.streak === 1 ? "" : "s"}`], ["paid in public", `${sol(k.earned_sol)} SOL`],
  ].map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join("");
  $("#profMemes").innerHTML = memesList.slice(0, 6).map((x) => {
    const u = mediaUrl(x.url);
    return u ? (x.kind === "video" ? `<video src="${esc(u)}" muted playsinline preload="metadata"></video>` : `<img src="${esc(u)}" alt="${esc(x.title || "kowl meme")}" loading="lazy">`) : "";
  }).join("");
  // the face: their google photo never leaves the server, so the card wears the order's vestments
  const face = document.createElement("canvas");
  face.width = face.height = 1024;
  await renderPfp(face, { pose: "gm", bg: "altar", text: m.x ? "@" + m.x : kowlNo(m.number) });
  if (seq !== profSeq) return;
  await drawCard(cv, m, face);
}
function route() {
  const mt = location.hash.match(/^#k\/(\d{1,7})$/);
  if (mt) openProfile(+mt[1]);
}

function initPayroll() {
  initBoards();
  initShillBoard();
  initGallery();
  initMe();
  initDrop();
  $("#upFile").addEventListener("change", pickFile);
  $("#uploadForm").addEventListener("submit", uploadMeme);
  applyStats(null);
  loadBoards();
  renderGallery();
  renderShillBoard([]);
  setInterval(tickPayday, 1000);
  addEventListener("hashchange", route);
  route();
  if (!API) return;
  loadStats().then(() => { if (pr.token) loadMe().then(swearIn); });
  setInterval(() => { if (!document.hidden) loadStats(); }, 45000);
  setInterval(() => { if (!document.hidden && pr.nextAt && Date.now() > pr.nextAt + 15000) { pr.nextAt = 0; loadStats().then(() => { if (pr.token) loadMe(); }); } }, 5000);
}
