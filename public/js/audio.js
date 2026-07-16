// ==================== Audio Engine (synthesized, no external files) ====================
let audioCtx = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let bgmTimer = null;
let bgmMode = 'normal'; // 'normal' | 'power'
let bgmStep = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.22;
  bgmGain.connect(masterGain);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(masterGain);
}

function tone(freq, start, dur, opts) {
  opts = opts || {};
  const type = opts.type || 'square';
  const gainVal = opts.gain !== undefined ? opts.gain : 0.18;
  const dest = opts.dest || bgmGain;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1,opts.slideTo), start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gainVal, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// plucked-string style tone (guzheng/pipa-like: fast attack, fast exponential decay, slight detune shimmer)
function pluck(freq, start, dur, opts) {
  opts = opts || {};
  const gainVal = opts.gain !== undefined ? opts.gain : 0.16;
  const dest = opts.dest || bgmGain;
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'triangle';
  osc2.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  osc2.frequency.setValueAtTime(freq * 2.01, start); // slight detune overtone for shimmer
  const g2 = audioCtx.createGain();
  g2.gain.value = 0.25;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gainVal, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  g.connect(dest);
  osc.start(start); osc.stop(start + dur + 0.02);
  osc2.start(start); osc2.stop(start + dur + 0.02);
}

// low gong hit for atmosphere accent
function gongHit(start, opts) {
  opts = opts || {};
  const dest = opts.dest || bgmGain;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, start);
  osc.frequency.exponentialRampToValueAtTime(90, start + 1.2);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(opts.gain || 0.14, start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);
  osc.connect(g);
  g.connect(dest);
  osc.start(start); osc.stop(start + 1.35);
}

function noiseBurst(start, dur, opts) {
  opts = opts || {};
  const dest = opts.dest || sfxGain;
  const bufSize = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random()*2-1) * (1 - i/bufSize);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = opts.filterType || 'bandpass';
  filter.frequency.value = opts.filterFreq || 1200;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(opts.gain || 0.3, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// Chinese pentatonic (gong/shang/jue/zhi/yu ~ C D E G A) melody patterns, guzheng/pipa-style pluck + gong accents
// A minor pentatonic rooted around D for a traditional feel: D E G A C(oct)
const PENT_NORMAL = [293.66, 349.23, 392.00, 440.00, 349.23, 293.66, 261.63, 293.66]; // D F A B F D C D (D pentatonic-ish, calm)
const PENT_POWER  = [440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00, 587.33]; // brighter/faster octave up, energetic
let gongCounter = 0;

function scheduleBgmStep() {
  if (!audioCtx) return;
  const pattern = bgmMode === 'power' ? PENT_POWER : PENT_NORMAL;
  const now = audioCtx.currentTime;
  const freq = pattern[bgmStep % pattern.length];
  const dur = bgmMode === 'power' ? 0.22 : 0.34;
  pluck(freq, now, dur, { gain: bgmMode === 'power' ? 0.14 : 0.12 });
  // low drone/bass pluck an octave down every other step for grounding
  if (bgmStep % 2 === 0) pluck(freq / 2, now, dur * 1.3, { gain: 0.06 });
  // occasional gong accent on downbeat for atmosphere (normal mode only)
  if (bgmMode !== 'power' && bgmStep % 8 === 0) {
    gongHit(now, { gain: 0.09 });
  }
  bgmStep++;
}

function playBgm() {
  if (!audioCtx) return;
  if (bgmTimer) clearInterval(bgmTimer);
  const stepMs = bgmMode === 'power' ? 190 : 280;
  bgmTimer = setInterval(scheduleBgmStep, stepMs);
}

function setBgmMode(mode) {
  if (bgmMode === mode) return;
  bgmMode = mode;
  playBgm();
}

function sfxMeteor() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  tone(900, now, 0.5, { type: 'sawtooth', gain: 0.16, dest: sfxGain, slideTo: 90 });
  noiseBurst(now, 0.5, { gain: 0.22, filterFreq: 700, filterType: 'lowpass' });
}

function sfxOleCrowd() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // "Ole!" vocal-ish shout: quick rising-falling tone
  tone(440, now, 0.12, { type: 'sawtooth', gain: 0.2, dest: sfxGain, slideTo: 660 });
  tone(660, now + 0.1, 0.22, { type: 'sawtooth', gain: 0.2, dest: sfxGain, slideTo: 340 });
  // crowd cheer: layered filtered noise swell
  noiseBurst(now, 0.9, { gain: 0.28, filterFreq: 1800, filterType: 'bandpass' });
  noiseBurst(now + 0.05, 0.8, { gain: 0.22, filterFreq: 2600, filterType: 'bandpass' });
}

function sfxFlap() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  tone(300, now, 0.08, { type: 'square', gain: 0.12, dest: sfxGain, slideTo: 500 });
}

function sfxPowerup() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [440, 554, 660, 880].forEach((f, i) => tone(f, now + i*0.06, 0.14, { type: 'square', gain: 0.16, dest: sfxGain }));
}

function sfxCrash() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  noiseBurst(now, 0.35, { gain: 0.35, filterFreq: 500, filterType: 'lowpass' });
  tone(120, now, 0.3, { type: 'sawtooth', gain: 0.2, dest: sfxGain, slideTo: 40 });
}
// ==================== End Audio Engine ====================
