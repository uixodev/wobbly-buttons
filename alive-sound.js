/*
 * ALIVE SOUND — a magical click with a shimmering echo. Synthesised with the Web Audio API: no audio files.
 *
 *   press      a soft click (a tiny snap + a glassy tick), then a quick rising flick of three glass-bell notes
 *              (like a wand), a puff of sparkle dust, and an airy, fading echo of all of it
 *   (middle)   silence: nothing plays while the background is open
 *   settle     a gentler, falling version as the page returns to ivory (set `settleSparkle: 0` to remove it)
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created on the first press.
 *
 *   const sound = createAliveSound({ enabled: true });
 *   sound.open();   sound.close(2.2);   sound.setEnabled(false);
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const SOUND_CONFIG = {
  masterVolume: 1.5,       // overall level (about 0.7 = quiet, 1.5 = comfortable, 2.2 = strong)

  // — the click —
  click: 0.8,              // level of the click itself (0 = no click, only the magic)
  tickHz: 1500,            // pitch of the glassy tick inside the click (higher = brighter)

  // — the magic —
  magic: 1.0,              // level of the bell notes and sparkle dust (0 = back to a plain click)
  notes: [659.26, 830.61, 987.77],      // E5, G#5, B5: a rising E-major flick. Edit to change the "spell" (halve the numbers = an octave lower)
  flickSeconds: 0.12,      // how fast the notes run up (smaller = quicker flick)
  dust: 0.7,               // level of the airy sparkle-dust whoosh (0 = none)
  dustHz: [1400, 4200],    // the dust sweeps between these two frequencies (lower = softer, less shrill)

  // — the echo —
  echoTime: 0.21,          // seconds between echoes
  echoFeedback: 0.36,      // how much of each echo feeds the next (0 = a single repeat, 0.5 = long tail)
  echoMix: 0.55,           // how loud the echo is compared with the dry sound (0 = none)
  echoTone: 3200,          // echoes get darker: this low-pass (Hz) is applied on every repeat

  // — settling back —
  settleSparkle: 0.5,      // level of the gentle falling sparkle as the page returns to ivory (0 = silent)
};

export function createAliveSound(options = {}) {
  const cfg = { ...SOUND_CONFIG, ...options };
  let enabled = options.enabled !== false;
  let ctx = null, bus = null, noiseBuf = null, settleTimer = 0;

  // ── building blocks (they take the context + a bus, so they also work with an OfflineAudioContext for testing) ──
  function makeNoise(c) {
    const len = Math.floor(c.sampleRate * 0.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // a bus = dry path + a feedback echo, both into the destination. `input` is where sounds are connected.
  function makeBus(c, dest) {
    const input = c.createGain();
    const dry = c.createGain(); dry.gain.value = 1;
    input.connect(dry); dry.connect(dest);

    const send = c.createGain(); send.gain.value = cfg.echoMix;
    const delay = c.createDelay(1.5); delay.delayTime.value = cfg.echoTime;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = cfg.echoTone;   // each repeat a little darker than the last
    const fb = c.createGain(); fb.gain.value = Math.min(cfg.echoFeedback, 0.85);
    const wet = c.createGain(); wet.gain.value = 1;
    input.connect(send); send.connect(delay);
    delay.connect(tone); tone.connect(fb); fb.connect(delay);            // the feedback loop
    tone.connect(wet); wet.connect(dest);
    return input;
  }

  // a soft click: a tiny snap and a glassy tick
  function click(c, out, t, level) {
    const src = c.createBufferSource(); src.buffer = noiseBuf || (noiseBuf = makeNoise(c));
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.4 * level, t + 0.0012);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    src.connect(hp); hp.connect(ng); ng.connect(out); src.start(t); src.stop(t + 0.04);

    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(cfg.tickHz, t);
    o.frequency.exponentialRampToValueAtTime(cfg.tickHz * 0.6, t + 0.02);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.3 * level, t + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.06);
  }

  // one glass-bell note: a sine with a few inharmonic partials, like a struck glass / celesta
  function bell(c, out, t, freq, level, ring = 1) {
    const partials = [[1, 1.0, 0.9], [2.0, 0.35, 0.55], [2.76, 0.18, 0.4], [5.4, 0.03, 0.18]];   // [ratio, gain, decay seconds]
    for (const [ratio, gain, decay] of partials) {
      const f = freq * ratio;
      if (f > 14000) continue;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16 * gain * level, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * ring);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + decay * ring + 0.05);
    }
  }

  // sparkle dust: high-passed noise with a band that sweeps upward (or downward), over a quarter of a second
  function dust(c, out, t, level, up = true) {
    const src = c.createBufferSource(); src.buffer = noiseBuf || (noiseBuf = makeNoise(c));
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    const [lo, hi] = cfg.dustHz;
    bp.frequency.setValueAtTime(up ? lo : hi, t);
    bp.frequency.exponentialRampToValueAtTime(up ? hi : lo, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * level, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.4);
  }

  // the press: click → rising bell flick → dust (the echo is added by the bus)
  function playPress(c, out, t) {
    if (cfg.click > 0) click(c, out, t, cfg.click);
    if (cfg.magic > 0) {
      const n = cfg.notes.length;
      cfg.notes.forEach((f, i) => bell(c, out, t + 0.012 + (i / Math.max(1, n - 1)) * cfg.flickSeconds, f, cfg.magic * (0.8 + 0.2 * (i / Math.max(1, n - 1))), i === n - 1 ? 1.3 : 0.8));
      if (cfg.dust > 0) dust(c, out, t + 0.01, cfg.dust * cfg.magic, true);
    }
  }
  // settling back: the same notes falling, softer
  function playSettle(c, out, t) {
    const lvl = cfg.settleSparkle;
    if (lvl <= 0) return;
    const notes = [...cfg.notes].reverse(), n = notes.length;
    notes.forEach((f, i) => bell(c, out, t + (i / Math.max(1, n - 1)) * cfg.flickSeconds * 1.4, f * 0.5, lvl * 1.2, 1.1));   // an octave lower: calmer
    if (cfg.dust > 0) dust(c, out, t, cfg.dust * lvl, false);
  }

  // ── public API (real-time) ──
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const master = ctx.createGain(); master.gain.value = cfg.masterVolume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    bus = makeBus(ctx, master);
    return true;
  }

  return {
    config: cfg,
    get enabled() { return enabled; },
    setEnabled(v) { enabled = !!v; if (!enabled) clearTimeout(settleTimer); },
    // press: the magical click and its echo. Nothing plays after that while the background is open.
    open() { clearTimeout(settleTimer); if (!enabled || !ensure()) return; playPress(ctx, bus, ctx.currentTime + 0.005); },
    // the page is going back to ivory: a gentle falling sparkle as it lands
    close(recedeSeconds) {
      clearTimeout(settleTimer);
      if (!enabled || cfg.settleSparkle <= 0) return;
      settleTimer = setTimeout(() => { if (enabled && ensure()) playSettle(ctx, bus, ctx.currentTime + 0.005); }, Math.max(0, recedeSeconds * 0.95) * 1000);
    },
    // used by tests: render the whole sequence offline into a buffer
    _render: async (spread, hold, recede) => {
      const sr = 44100, total = spread + hold + recede + 2;
      const off = new OfflineAudioContext(1, Math.ceil(sr * total), sr);
      const master = off.createGain(); master.gain.value = cfg.masterVolume; master.connect(off.destination);
      const b = makeBus(off, master); noiseBuf = null;
      playPress(off, b, 0.005);
      playSettle(off, b, spread + hold + recede * 0.95);
      const buf = await off.startRendering(); noiseBuf = null;
      return buf;
    },
  };
}
