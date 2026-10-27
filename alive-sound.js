/*
 * ALIVE SOUND — the audio for the "alive." press animation. Synthesised with the Web Audio API: no audio files.
 *
 *   press      a soft "bloop"
 *   spread     a whoosh that rises as the purple floods outward, while a quiet shimmering chord fades in and sparkle pings
 *              (random notes from a lilac-coloured scale) twinkle across the spread
 *   recede     the whoosh falls again, the chord fades out, and one low note settles the page back to ivory
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created on the first press.
 * Everything is quiet by default (see MASTER_VOLUME) and can be switched off.
 *
 *   const sound = createAliveSound({ enabled: true });
 *   sound.open(2.4);   sound.close(2.2);   sound.setEnabled(false);
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const SOUND_CONFIG = {
  masterVolume: 1.8,                 // overall level (about 0.5 = whisper, 1.8 = comfortable, 3 = loud). Everything below is relative to this
  whoosh: 0.55,                      // level of the rising / falling noise sweep
  chord: 0.5,                        // level of the shimmering chord
  sparkles: 0.6,                     // level of the twinkling pings (0 = none)
  sparkleCount: 11,                  // how many pings across the spread
  bloop: 0.7,                        // level of the press "bloop" and the settling note
  // lilac, slightly dreamy: D major 7 with a high pentatonic for the pings
  chordNotes: [293.66, 369.99, 440.0, 554.37],                  // D4  F#4  A4  C#5
  sparkleNotes: [587.33, 659.25, 739.99, 880.0, 987.77, 1108.73, 1318.51],   // D5 E5 F#5 A5 B5 C#6 E6
};

export function createAliveSound(options = {}) {
  const cfg = { ...SOUND_CONFIG, ...options };
  let enabled = options.enabled !== false;
  let ctx = null, master = null, noise = null, chord = null;

  const rand = (a, b) => a + Math.random() * (b - a);

  // ── building blocks (they take the context + destination + start time, so they also work with an OfflineAudioContext for testing) ──
  function makeNoise(c) {
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;                                       // pink-ish noise: softer than white
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16; }
    return buf;
  }

  function bloop(c, dest, t, level, up = true) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(up ? 240 : 330, t);
    o.frequency.exponentialRampToValueAtTime(up ? 560 : 196, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * level, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (up ? 0.42 : 0.9));
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 1);
  }

  function whoosh(c, dest, t, dur, from, to, level) {
    const src = c.createBufferSource(); src.buffer = noise || (noise = makeNoise(c)); src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * level, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur * 1.1 + 0.1);
  }

  function ping(c, dest, t, freq, level) {
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2.01;   // a touch of glassy overtone
    const g2 = c.createGain(); g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + 0.8); o2.stop(t + 0.8);
  }

  // a soft sustained chord: slightly detuned sine pairs through a low-pass, with a slow tremolo so it shimmers
  function startChord(c, dest, t, fadeIn, level) {
    const peak = 0.11 * level;
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + fadeIn);
    const levelAt = (w) => 0.0001 * Math.pow(peak / 0.0001, Math.min(1, Math.max(0, (w - t) / fadeIn)));   // where the fade-in has got to at time w
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const trem = c.createGain(); trem.gain.value = 1;
    const lfo = c.createOscillator(), lfoAmt = c.createGain(); lfo.frequency.value = 4.2; lfoAmt.gain.value = 0.22;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
    const oscs = [];
    cfg.chordNotes.forEach((f, i) => {
      for (const det of [-5, 5]) {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det + i;
        const og = c.createGain(); og.gain.value = 1 / cfg.chordNotes.length / 2;
        o.connect(og); og.connect(trem); o.start(t); oscs.push(o);
      }
    });
    trem.connect(lp); lp.connect(out); out.connect(dest); lfo.start(t);
    return {
      stop(when, fadeOut) {
        out.gain.cancelScheduledValues(when);
        out.gain.setValueAtTime(levelAt(when), when);
        out.gain.exponentialRampToValueAtTime(0.0001, when + fadeOut);
        for (const o of [...oscs, lfo]) o.stop(when + fadeOut + 0.1);
      },
    };
  }

  // ── the two sequences ──
  function playOpen(c, dest, t, spread) {
    bloop(c, dest, t, cfg.bloop, true);
    whoosh(c, dest, t, spread, 220, 3400, cfg.whoosh);
    const ch = startChord(c, dest, t + 0.1, spread * 0.8, cfg.chord);
    if (cfg.sparkles > 0) {
      for (let i = 0; i < cfg.sparkleCount; i++) {
        const when = t + 0.25 + (i / cfg.sparkleCount) * spread * 0.95 + rand(0, 0.12);
        ping(c, dest, when, cfg.sparkleNotes[Math.floor(rand(0, cfg.sparkleNotes.length))], cfg.sparkles);
      }
    }
    return ch;
  }
  function playClose(c, dest, t, recede, chordHandle) {
    whoosh(c, dest, t, recede, 2600, 160, cfg.whoosh * 0.85);
    chordHandle?.stop(t, recede * 0.9);
    // one low note as the page settles back to ivory
    bloop(c, dest, t + recede * 0.88, cfg.bloop, false);
    ping(c, dest, t + recede * 0.9, cfg.sparkleNotes[0] / 2, cfg.sparkles * 0.8);
  }

  // ── public API (real-time) ──
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = cfg.masterVolume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;   // gentle safety net against clipping
    master.connect(comp); comp.connect(ctx.destination);
    return true;
  }

  return {
    config: cfg,
    get enabled() { return enabled; },
    setEnabled(v) { enabled = !!v; if (!enabled && chord) { chord.stop(ctx.currentTime, 0.2); chord = null; } },
    open(spreadSeconds) { if (!enabled || !ensure()) return; chord?.stop(ctx.currentTime, 0.2); chord = playOpen(ctx, master, ctx.currentTime + 0.01, spreadSeconds); },
    close(recedeSeconds) { if (!enabled || !ensure()) return; playClose(ctx, master, ctx.currentTime + 0.01, recedeSeconds, chord); chord = null; },
    // used by tests: render both sequences offline into a buffer
    _render: async (spread, hold, recede) => {
      const sr = 44100, total = spread + hold + recede + 1.5;
      const off = new OfflineAudioContext(1, Math.ceil(sr * total), sr);
      const m = off.createGain(); m.gain.value = cfg.masterVolume; m.connect(off.destination);
      noise = null;
      const ch = playOpen(off, m, 0.01, spread);
      playClose(off, m, spread + hold, recede, ch);
      const buf = await off.startRendering(); noise = null;
      return buf;
    },
  };
}
