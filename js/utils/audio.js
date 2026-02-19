// audio.js — Web Audio API synth sound effects (no external files)

let ctx = null;
let muted = false;

// Musical note frequencies (Hz)
const NOTE = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50,
  Eb4: 311.13, Ab4: 415.30, Bb4: 466.16, Eb5: 622.25,
};

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an oscillator that auto-disconnects after `duration` seconds. */
function osc(type, freq, gainValue, startTime, duration, destination) {
  const ac = ensureContext();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(gainValue, startTime);
  o.connect(g);
  g.connect(destination || ac.destination);
  o.start(startTime);
  o.stop(startTime + duration);
  return { oscillator: o, gain: g };
}

/** Create a buffer of white noise. */
function noiseBuffer(duration) {
  const ac = ensureContext();
  const sampleRate = ac.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ac.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Call once (on a user gesture) to create the AudioContext eagerly. */
export function initAudio() {
  ensureContext();
}

/** Toggle mute — returns the new muted state (true = muted). */
export function toggleMute() {
  muted = !muted;
  if (bgMusic) bgMusic.volume = muted ? 0 : bgMusicVolume;
  return muted;
}

// ---------------------------------------------------------------------------
// Background music
// ---------------------------------------------------------------------------

let bgMusic = null;
const bgMusicVolume = 0.35;

export function playBgMusic() {
  if (muted) return;
  if (!bgMusic) {
    // Path relative to index.html (document root), not this JS file
    bgMusic = new Audio('./audio/genxbeats-dark-dungeon-game-hiphop-20241015-252251.mp3');
    bgMusic.loop = true;
    bgMusic.volume = bgMusicVolume;
  }
  if (bgMusic.paused) {
    bgMusic.play().catch((e) => console.warn('BgMusic play blocked:', e));
  }
}

export function stopBgMusic() {
  if (bgMusic && !bgMusic.paused) {
    bgMusic.pause();
  }
}

// ---------------------------------------------------------------------------
// Sound effects
// ---------------------------------------------------------------------------

/** Short rattling click — rapid series of tiny noise bursts. */
export function playDiceRoll() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  const burstCount = 8;
  const spacing = 0.025;

  for (let i = 0; i < burstCount; i++) {
    const t = now + i * spacing;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(0.015);
    const g = ac.createGain();
    const volume = 0.15 + Math.random() * 0.1;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000 + Math.random() * 3000, t);

    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start(t);
    src.stop(t + 0.02);
  }
}

/** Positive thwack — medium frequency sine with quick decay. */
export function playHit() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(NOTE.E4, now);
  o.frequency.exponentialRampToValueAtTime(NOTE.C4, now + 0.12);

  g.gain.setValueAtTime(0.4, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  o.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.16);

  // Add a percussive click layer
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(0.03);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.25, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1200, now);
  bp.Q.setValueAtTime(2, now);
  src.connect(bp);
  bp.connect(ng);
  ng.connect(ac.destination);
  src.start(now);
  src.stop(now + 0.05);
}

/** Negative buzz — low sawtooth, short. */
export function playMiss() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, now);
  o.frequency.linearRampToValueAtTime(80, now + 0.18);

  g.gain.setValueAtTime(0.2, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, now);

  o.connect(lp);
  lp.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.22);
}

/** Triumphant ascending arpeggio — 3 quick rising tones. */
export function playExact() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  const notes = [NOTE.C5, NOTE.E5, NOTE.G5];
  const spacing = 0.08;

  notes.forEach((freq, i) => {
    const t = now + i * spacing;
    const { gain } = osc('sine', freq, 0, t, 0.2, ac.destination);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  });
}

/** Sparkly chime — high triangle with a short delay effect. */
export function playCombo() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  // Primary chime
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(NOTE.A5, now);

  g.gain.setValueAtTime(0.001, now);
  g.gain.linearRampToValueAtTime(0.3, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  o.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.36);

  // Delayed echo at lower volume
  const delays = [0.1, 0.2];
  delays.forEach((d) => {
    const t = now + d;
    const { gain } = osc('triangle', NOTE.C6, 0, t, 0.25, ac.destination);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  });
}

/** Ascending major chord arpeggio over ~0.8s. */
export function playVictory() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  // C major arpeggio across two octaves
  const notes = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5];
  const spacing = 0.12;

  notes.forEach((freq, i) => {
    const t = now + i * spacing;
    // Sine layer
    const { gain: g1 } = osc('sine', freq, 0, t, 0.45, ac.destination);
    g1.gain.setValueAtTime(0.001, t);
    g1.gain.linearRampToValueAtTime(0.25, t + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    // Triangle shimmer layer
    const { gain: g2 } = osc('triangle', freq * 2, 0, t, 0.35, ac.destination);
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.linearRampToValueAtTime(0.08, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  });
}

/** Descending minor chord, slow fade ~0.8s. */
export function playDefeat() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  // Descending C-minor voicing
  const notes = [NOTE.Eb5, NOTE.C5, NOTE.Ab4, NOTE.Eb4, NOTE.C4];
  const spacing = 0.13;

  notes.forEach((freq, i) => {
    const t = now + i * spacing;
    const { gain, oscillator } = osc('sine', freq, 0, t, 0.55, ac.destination);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    // Slight detune for a somber feel
    oscillator.detune.setValueAtTime(-10, t);
  });
}

/** Tiny UI click — very short high-freq blip. */
export function playClick() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1800, now);

  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  o.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.05);
}

/** Coin clink — metallic high ping. */
export function playGold() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  // Two detuned high-frequency oscillators for metallic timbre
  const freqs = [NOTE.B5, NOTE.B5 * 1.504];
  freqs.forEach((freq) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2000, now);

    o.connect(hp);
    hp.connect(g);
    g.connect(ac.destination);
    o.start(now);
    o.stop(now + 0.26);
  });
}

/** Silly squish — low wet thud when player takes damage. */
export function playSquish() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;

  // Low thud body
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(50, now + 0.15);
  g.gain.setValueAtTime(0.45, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  o.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.22);

  // Wet splat layer — filtered noise burst
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(0.08);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.35, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(800, now);
  lp.frequency.exponentialRampToValueAtTime(200, now + 0.08);
  src.connect(lp);
  lp.connect(ng);
  ng.connect(ac.destination);
  src.start(now);
  src.stop(now + 0.1);

  // Squelchy wobble — quick pitch-modulated sine
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(350, now + 0.02);
  o2.frequency.setValueAtTime(250, now + 0.05);
  o2.frequency.setValueAtTime(300, now + 0.08);
  o2.frequency.exponentialRampToValueAtTime(80, now + 0.15);
  g2.gain.setValueAtTime(0.2, now + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  o2.connect(g2);
  g2.connect(ac.destination);
  o2.start(now + 0.02);
  o2.stop(now + 0.18);
}

/** Menacing enemy dice rattle — lower-pitched, slower than player roll. */
export function playEnemyRoll() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  const burstCount = 6;
  const spacing = 0.04;

  for (let i = 0; i < burstCount; i++) {
    const t = now + i * spacing;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(0.025);
    const g = ac.createGain();
    const volume = 0.12 + Math.random() * 0.08;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 1200, t);
    filter.Q.setValueAtTime(3, t);

    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start(t);
    src.stop(t + 0.03);
  }

  // Ominous low rumble underneath
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(65, now);
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(200, now);
  o.connect(lp);
  lp.connect(g);
  g.connect(ac.destination);
  o.start(now);
  o.stop(now + 0.32);
}

/** Warm ascending whoosh — filtered noise sweep upward. */
export function playHeal() {
  if (muted) return;
  const ac = ensureContext();
  const now = ac.currentTime;
  const duration = 0.4;

  // Noise source
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(duration + 0.05);

  // Bandpass filter sweeping upward
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.setValueAtTime(5, now);
  bp.frequency.setValueAtTime(300, now);
  bp.frequency.exponentialRampToValueAtTime(3000, now + duration);

  // Gain envelope
  const g = ac.createGain();
  g.gain.setValueAtTime(0.001, now);
  g.gain.linearRampToValueAtTime(0.25, now + duration * 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(bp);
  bp.connect(g);
  g.connect(ac.destination);
  src.start(now);
  src.stop(now + duration + 0.05);

  // Warm sine undertone rising in pitch
  const o = ac.createOscillator();
  const sg = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(NOTE.C4, now);
  o.frequency.exponentialRampToValueAtTime(NOTE.C5, now + duration);

  sg.gain.setValueAtTime(0.001, now);
  sg.gain.linearRampToValueAtTime(0.15, now + duration * 0.25);
  sg.gain.exponentialRampToValueAtTime(0.001, now + duration);

  o.connect(sg);
  sg.connect(ac.destination);
  o.start(now);
  o.stop(now + duration + 0.02);
}
