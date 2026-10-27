/*
 * ALIVE SOUND — deep, vibrating audio for the "alive." press animation. Synthesised with the Web Audio API: no audio files.
 *
 *   press     a deep thud (a sine dropping from ~120 Hz to ~38 Hz, plus a soft low-passed punch)
 *   spread    a sub-bass drone swells in and RISES in pitch while a low-pass filter opens up; two slightly mistuned saws
 *             beat against each other (a slow wobble), a slow "heartbeat" pulse breathes through it, and a faster tremble
 *             (the vibration) speeds up as the purple spreads
 *   hold      the drone keeps pulsing and trembling
 *   recede    the pitch sinks, the filter closes, the tremble slows and fades, and one last deep thud settles the page
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created on the first press.
 * Most of the weight lives below ~200 Hz, with upper harmonics so small laptop and phone speakers can still reproduce it.
 *
 *   const sound = createAliveSound({ enabled: true });
 *   sound.open(2.4);   sound.close(2.2);   sound.setEnabled(false);
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const SOUND_CONFIG = {
  masterVolume: 0.8,        // overall level (about 0.4 = quiet, 0.8 = comfortable, 1.4 = strong)
  baseHz: 55,               // the drone's starting pitch (A1). Lower = deeper, higher = more audible on small speakers
  riseSemitones: 7,         // how far the drone climbs while the purple spreads (and falls again on the way back)
  drone: 0.9,               // level of the sustained drone
  sub: 0.8,                 // level of the pure sub-bass sine underneath
  rumble: 0.5,              // level of the low, breathy noise bed
  boom: 0.9,                // level of the press thud and the settling thud
  detuneCents: 18,          // how mistuned the two drone saws are (more = faster, wider wobble)
  pulseHz: 1.5,             // the slow heartbeat pulse (times per second)
  pulseDepth: 0.35,         // how deep that pulse is (0 = steady)
  vibrationHz: [6, 13],     // the fast tremble: starts at the first value and speeds up to the second as it spreads
  vibrationDepth: 0.28,     // how strong the tremble is (0 = smooth)
  filterHz: [90, 620],      // the drone's low-pass filter opens from the first value to the second while spreading
};

export function createAliveSound(options = {}) {
  const cfg = { ...SOUND_CONFIG, ...options };
  let enabled = options.enabled !== false;
  let ctx = null, master = null, noise = null, drone = null;

  // ── building blocks (they take the context + destination + start time, so they also work with an OfflineAudioContext for testing) ──
  function makeNoise(c) {
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;                                       // pink-ish noise: soft and dark
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16; }
    return buf;
  }

  // a deep thud: a sine falling in pitch, with a short low-passed noise punch on the front
  function thud(c, dest, t, level, from = 120, to = 38, decay = 0.9) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay + 0.1);
    // soft punch so it is felt even where the sub is too low to hear
    const src = c.createBufferSource(); src.buffer = noise || (noise = makeNoise(c));
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(lp); lp.connect(ng); ng.connect(dest); src.start(t); src.stop(t + 0.3);
  }

  // the sustained drone: two mistuned saws (they beat), a sub sine, a noise bed, a filter, a slow pulse and a fast tremble
  function startDrone(c, dest, t, spread) {
    const f0 = cfg.baseHz, f1 = cfg.baseHz * Math.pow(2, cfg.riseSemitones / 12);
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.3, t + spread * 0.7);          // swells in

    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3.5;
    lp.frequency.setValueAtTime(cfg.filterHz[0], t);
    lp.frequency.exponentialRampToValueAtTime(cfg.filterHz[1], t + spread);

    // two layers of amplitude modulation: the slow pulse (heartbeat) and the fast tremble (vibration)
    const pulse = c.createGain(); pulse.gain.value = 1 - cfg.pulseDepth / 2;
    const lfoSlow = c.createOscillator(), slowAmt = c.createGain();
    lfoSlow.frequency.value = cfg.pulseHz; slowAmt.gain.value = cfg.pulseDepth / 2;
    lfoSlow.connect(slowAmt); slowAmt.connect(pulse.gain);
    const trem = c.createGain(); trem.gain.value = 1 - cfg.vibrationDepth / 2;
    const lfoFast = c.createOscillator(), fastAmt = c.createGain();
    lfoFast.frequency.setValueAtTime(cfg.vibrationHz[0], t);
    lfoFast.frequency.linearRampToValueAtTime(cfg.vibrationHz[1], t + spread);   // the vibration speeds up as it spreads
    fastAmt.gain.value = cfg.vibrationDepth / 2;
    lfoFast.connect(fastAmt); fastAmt.connect(trem.gain);

    const oscs = [];
    const mix = c.createGain(); mix.gain.value = 1;
    for (const [type, mul, cents, lvl] of [['sawtooth', 1, -cfg.detuneCents / 2, 0.5 * cfg.drone], ['sawtooth', 1, cfg.detuneCents / 2, 0.5 * cfg.drone], ['sine', 0.5, 0, cfg.sub]]) {
      const o = c.createOscillator(); o.type = type; o.detune.value = cents;
      o.frequency.setValueAtTime(f0 * mul, t);
      o.frequency.exponentialRampToValueAtTime(f1 * mul, t + spread);       // rising pitch
      const g = c.createGain(); g.gain.value = lvl;
      o.connect(g); g.connect(mix); o.start(t); oscs.push(o);
    }
    // breathy rumble
    const ns = c.createBufferSource(); ns.buffer = noise || (noise = makeNoise(c)); ns.loop = true;
    const nlp = c.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 160;
    const ng = c.createGain(); ng.gain.value = 0.5 * cfg.rumble;
    ns.connect(nlp); nlp.connect(ng); ng.connect(mix); ns.start(t);

    mix.connect(lp); lp.connect(pulse); pulse.connect(trem); trem.connect(out); out.connect(dest);
    lfoSlow.start(t); lfoFast.start(t);

    const peak = 0.3, levelAt = (w) => 0.0001 * Math.pow(peak / 0.0001, Math.min(1, Math.max(0, (w - t) / (spread * 0.7))));
    return {
      // sink in pitch, close the filter, slow the tremble and fade out
      stop(when, recede) {
        const end = when + recede;
        const p = Math.min(1, Math.max(0, (when - t) / spread));              // how far the swell had got when we stop
        const fAt = f0 * Math.pow(f1 / f0, p);
        const filterAt = cfg.filterHz[0] * Math.pow(cfg.filterHz[1] / cfg.filterHz[0], p);
        const vibAt = cfg.vibrationHz[0] + (cfg.vibrationHz[1] - cfg.vibrationHz[0]) * p;
        out.gain.cancelScheduledValues(when); out.gain.setValueAtTime(levelAt(when), when);
        out.gain.exponentialRampToValueAtTime(0.0001, end);
        oscs.forEach((o, i) => {                                                // sink in pitch
          const mul = i === 2 ? 0.5 : 1;
          o.frequency.cancelScheduledValues(when); o.frequency.setValueAtTime(fAt * mul, when);
          o.frequency.exponentialRampToValueAtTime(f0 * 0.72 * mul, end);
        });
        lp.frequency.cancelScheduledValues(when); lp.frequency.setValueAtTime(filterAt, when);   // close the filter
        lp.frequency.exponentialRampToValueAtTime(cfg.filterHz[0] * 0.6, end);
        lfoFast.frequency.cancelScheduledValues(when); lfoFast.frequency.setValueAtTime(vibAt, when);   // slow the tremble
        lfoFast.frequency.linearRampToValueAtTime(2, end);
        for (const o of [...oscs, lfoSlow, lfoFast]) o.stop(end + 0.1);
        ns.stop(end + 0.1);
      },
    };
  }

  // ── the two sequences ──
  function playOpen(c, dest, t, spread) {
    thud(c, dest, t, cfg.boom, 120, 38, 0.9);
    return startDrone(c, dest, t + 0.05, spread);
  }
  function playClose(c, dest, t, recede, handle) {
    handle?.stop(t, recede);
    thud(c, dest, t + recede * 0.92, cfg.boom * 0.9, 80, 30, 1.1);       // one last deep thud as the page settles
  }

  // ── public API (real-time) ──
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = cfg.masterVolume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;   // keeps big bass from clipping
    master.connect(comp); comp.connect(ctx.destination);
    return true;
  }

  return {
    config: cfg,
    get enabled() { return enabled; },
    setEnabled(v) { enabled = !!v; if (!enabled && drone) { drone.stop(ctx.currentTime, 0.25); drone = null; } },
    open(spreadSeconds) { if (!enabled || !ensure()) return; drone?.stop(ctx.currentTime, 0.3); drone = playOpen(ctx, master, ctx.currentTime + 0.01, spreadSeconds); },
    close(recedeSeconds) { if (!enabled || !ensure()) return; playClose(ctx, master, ctx.currentTime + 0.01, recedeSeconds, drone); drone = null; },
    // used by tests: render both sequences offline into a buffer
    _render: async (spread, hold, recede) => {
      const sr = 44100, total = spread + hold + recede + 1.5;
      const off = new OfflineAudioContext(1, Math.ceil(sr * total), sr);
      const m = off.createGain(); m.gain.value = cfg.masterVolume; m.connect(off.destination);
      noise = null;
      const h = playOpen(off, m, 0.01, spread);
      playClose(off, m, spread + hold, recede, h);
      const buf = await off.startRendering(); noise = null;
      return buf;
    },
  };
}
