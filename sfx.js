/* =====================================================================
   kowl's room: every sound is synthesised with WebAudio (no files).
   off by default; the speaker button in the corner turns it on.
   window.SFX.play(name) is a no-op while muted.
   ===================================================================== */
(function () {
  const KEY = "kowl-sound";
  let ctx = null, master = null, amb = null, on = false, lastHover = 0;

  function boot() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    return ctx;
  }
  function noiseBuf(sec, brown) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  function tone(type, f0, f1, dur, vol, when = 0, dest = master) {
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(dur, vol, freq, q = 1, type = "bandpass", when = 0, f1) {
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf(dur + 0.05);
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.01, vol, dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  /* the room tone: a fan, a fridge-hum and a slow lo-fi pad from the laptop speakers */
  function ambience() {
    if (amb) return;
    amb = ctx.createGain(); amb.gain.value = 0.0; amb.connect(master);
    const fan = ctx.createBufferSource(); fan.buffer = noiseBuf(4, true); fan.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
    const fg = ctx.createGain(); fg.gain.value = 0.22;
    fan.connect(lp).connect(fg).connect(amb); fan.start();
    const hum = ctx.createOscillator(); hum.frequency.value = 58; const hg = ctx.createGain(); hg.gain.value = 0.018;
    hum.connect(hg).connect(amb); hum.start();
    // pad: Fmaj7 -> Em7 -> Dm7 -> Cmaj7, soft triangles through a lowpass with a wobbly tremolo
    const chords = [[174.6, 220, 261.6, 329.6], [164.8, 196, 246.9, 293.7], [146.8, 174.6, 220, 261.6], [130.8, 164.8, 196, 246.9]];
    const padF = ctx.createBiquadFilter(); padF.type = "lowpass"; padF.frequency.value = 900; padF.Q.value = 0.4;
    const padG = ctx.createGain(); padG.gain.value = 0.05; padF.connect(padG).connect(amb);
    const trem = ctx.createOscillator(); trem.frequency.value = 0.18; const tg = ctx.createGain(); tg.gain.value = 0.015; trem.connect(tg).connect(padG.gain); trem.start();
    let ci = 0;
    const step = () => {
      if (!amb) return;
      const t = ctx.currentTime;
      chords[ci++ % chords.length].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i ? "triangle" : "sine"; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 7.6);
        o.connect(g).connect(padF); o.start(t); o.stop(t + 7.8);
      });
      amb._t = setTimeout(step, 6400);
    };
    step();
    amb.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
  }

  const SOUNDS = {
    hover() { const n = performance.now(); if (n - lastHover < 70) return; lastHover = n; tone("sine", 1900, 1500, 0.04, 0.04); },
    open() { noise(0.45, 0.18, 400, 0.7, "bandpass", 0, 2600); tone("sine", 520, 880, 0.18, 0.08, 0.05); },
    close() { noise(0.35, 0.12, 2200, 0.7, "bandpass", 0, 380); },
    click() { tone("square", 900, 500, 0.05, 0.05); },
    poke() { tone("sine", 320, 140, 0.18, 0.28); noise(0.08, 0.08, 900, 2); },
    squish() { tone("sine", 260, 90, 0.28, 0.32); tone("triangle", 520, 180, 0.2, 0.08, 0.02); noise(0.16, 0.12, 700, 3, "bandpass", 0, 250); },
    boing() { const o = tone("sine", 180, 0, 0.55, 0.3); const t = ctx.currentTime; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.08); o.frequency.exponentialRampToValueAtTime(210, t + 0.5); },
    thud() { tone("sine", 120, 45, 0.22, 0.4); noise(0.1, 0.15, 300, 1, "lowpass"); },
    whoosh() { noise(0.5, 0.22, 300, 0.8, "bandpass", 0, 1800); },
    melt() { tone("sine", 600, 70, 1.4, 0.22); for (let i = 0; i < 6; i++) tone("sine", 300 + Math.random() * 500, 120, 0.12, 0.08, 0.2 + i * 0.17); },
    reform() { tone("sine", 90, 600, 0.9, 0.18); SOUNDS.boing(); },
    print() { for (let i = 0; i < 12; i++) { noise(0.06, 0.12, 1800, 4, "bandpass", i * 0.11); tone("square", 70, 60, 0.05, 0.03, i * 0.11); } },
    ping() { tone("sine", 1318, 0, 0.25, 0.12); tone("sine", 1760, 0, 0.35, 0.1, 0.09); },
    type() { for (let i = 0; i < 6; i++) noise(0.03, 0.08, 3000, 6, "bandpass", i * 0.06 + Math.random() * 0.03); },
    bell() { [880, 1320, 1760].forEach((f, i) => tone("sine", f, 0, 1.4 - i * 0.3, 0.1 / (i + 1))); },
    snore() { noise(1.1, 0.12, 300, 2, "bandpass", 0, 140); noise(0.8, 0.08, 900, 2, "bandpass", 1.3, 400); },
    can() { noise(0.12, 0.2, 5000, 1, "highpass"); noise(0.4, 0.1, 2400, 1, "bandpass", 0.1); },
    stamp() { tone("sine", 90, 40, 0.3, 0.5); noise(0.12, 0.25, 600, 1); },
    safe() { for (let i = 0; i < 5; i++) tone("square", 2400, 0, 0.02, 0.05, i * 0.12); tone("sine", 300, 200, 0.3, 0.1, 0.7); },
    switch() { tone("square", 2200, 0, 0.015, 0.08); noise(0.03, 0.1, 4000, 2); },
  };

  function set(v, fromUser) {
    on = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ }
    if (v) {
      if (!boot()) return;
      if (ctx.state === "suspended") ctx.resume();
      ambience();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.4);
      if (fromUser) SOUNDS.switch();
    } else if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.3);
    }
    document.dispatchEvent(new CustomEvent("kowl-sound", { detail: on }));
  }
  window.SFX = {
    get on() { return on; },
    set,
    toggle() { set(!on, true); },
    play(name) { if (!on || !ctx || !SOUNDS[name]) return; try { SOUNDS[name](); } catch { /* audio is a garnish */ } },
    wanted() { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } },
  };
})();
