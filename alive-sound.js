/*
 * ALIVE SOUND — a crisp click with a little echo after it. Synthesised with the Web Audio API: no audio files.
 *
 *   press      a click (a tiny noise transient + a short glassy tick + a soft low "tap" so it feels physical),
 *              followed by a short, fading echo
 *   (middle)   silence: nothing plays while the background is open
 *   settle     a lighter version of the same click + echo as the page returns to ivory (set `settleClick: 0` to remove it)
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
  masterVolume: 0.85,      // overall level (about 0.4 = quiet, 0.85 = comfortable, 1.4 = strong)
  click: 1.0,              // level of the press click
  settleClick: 0.55,       // level of the click as the page settles back (0 = no second click)
  tickHz: 2400,            // pitch of the bright "tick" part of the click (higher = sharper, lower = woodier)
  tapHz: 170,              // pitch of the soft low "tap" under the click (0 = no body)
  echoTime: 0.19,          // seconds between echoes
  echoFeedback: 0.30,      // how much of each echo feeds the next (0 = a single repeat, 0.5 = long tail)
  echoMix: 0.45,           // how loud the echo is compared with the click (0 = dry click only)
  echoTone: 3200,          // echoes get darker: this low-pass (Hz) is applied on every repeat
};

export function createAliveSound(options = {}) {
  const cfg = { ...SOUND_CONFIG, ...options };
  let enabled = options.enabled !== false;
  let ctx = null, bus = null, noiseBuf = null, settleTimer = 0;

  // ── building blocks (they take the context + a bus, so they also work with an OfflineAudioContext for testing) ──
  function makeNoise(c) {
    const len = Math.floor(c.sampleRate * 0.1), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
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
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = cfg.echoTone;   // each repeat darker than the last
    const fb = c.createGain(); fb.gain.value = Math.min(cfg.echoFeedback, 0.85);
    const wet = c.createGain(); wet.gain.value = 1;
    input.connect(send); send.connect(delay);
    delay.connect(tone); tone.connect(fb); fb.connect(delay);            // the feedback loop
    tone.connect(wet); wet.connect(dest);
    return input;
  }

  function click(c, out, t, level) {
    // 1. transient: a few milliseconds of high-passed noise, the "snap"
    const src = c.createBufferSource(); src.buffer = noiseBuf || (noiseBuf = makeNoise(c));
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.55 * level, t + 0.0015);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp); hp.connect(ng); ng.connect(out); src.start(t); src.stop(t + 0.05);

    // 2. tick: a very short sine that drops in pitch, like a tapped glass
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(cfg.tickHz, t);
    o.frequency.exponentialRampToValueAtTime(cfg.tickHz * 0.5, t + 0.025);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.4 * level, t + 0.0012);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.07);

    // 3. tap: a soft low thump so the click has a little body
    if (cfg.tapHz > 0) {
      const b = c.createOscillator(), bg = c.createGain();
      b.type = 'sine';
      b.frequency.setValueAtTime(cfg.tapHz, t);
      b.frequency.exponentialRampToValueAtTime(cfg.tapHz * 0.45, t + 0.06);
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.003);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      b.connect(bg); bg.connect(out); b.start(t); b.stop(t + 0.12);
    }
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
    // press: the click and its echo. Nothing plays after that while the background is open.
    open() { clearTimeout(settleTimer); if (!enabled || !ensure()) return; click(ctx, bus, ctx.currentTime + 0.005, cfg.click); },
    // the page is going back to ivory: a lighter click + echo as it lands
    close(recedeSeconds) {
      clearTimeout(settleTimer);
      if (!enabled || cfg.settleClick <= 0) return;
      settleTimer = setTimeout(() => { if (enabled && ensure()) click(ctx, bus, ctx.currentTime + 0.005, cfg.settleClick); }, Math.max(0, recedeSeconds * 0.95) * 1000);
    },
    // used by tests: render the whole sequence offline into a buffer
    _render: async (spread, hold, recede) => {
      const sr = 44100, total = spread + hold + recede + 1.5;
      const off = new OfflineAudioContext(1, Math.ceil(sr * total), sr);
      const master = off.createGain(); master.gain.value = cfg.masterVolume; master.connect(off.destination);
      const b = makeBus(off, master); noiseBuf = null;
      click(off, b, 0.005, cfg.click);
      if (cfg.settleClick > 0) click(off, b, spread + hold + recede * 0.95, cfg.settleClick);
      const buf = await off.startRendering(); noiseBuf = null;
      return buf;
    },
  };
}
