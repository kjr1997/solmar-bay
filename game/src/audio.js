// Synthesised sound: WebAudio only, no audio files.
// Engine hum, siren, pickup blips, impacts and a light music loop.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (err) {
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch (err) { /* audio is best-effort */ }
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    try {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch (err) { /* ignore */ }
  }

  function setEngine(speedRatio, driving) {
    if (!engineOsc || !engineGain) return;
    const target = driving ? 0.05 + 0.09 * speedRatio : 0.0;
    engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(52 + 130 * speedRatio, ctx.currentTime, 0.08);
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    try {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      lfo.start();
      sirenOsc._lfo = lfo;
    } catch (err) { /* ignore */ }
  }

  function setSiren(on) {
    if (!sirenGain) return;
    sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0.0, ctx.currentTime, 0.2);
  }

  const MELODY = [262, 330, 392, 494, 392, 330, 294, 330, 262, 0, 330, 392, 440, 392, 330, 294];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = MELODY[musicStep % MELODY.length];
      musicStep += 1;
      if (note) tone(note, 0.32, 'triangle', 0.05);
      if (musicStep % 4 === 0) tone(131, 0.5, 'sine', 0.06);
    }, 300);
  }

  return {
    unlock, startEngine, setEngine, startSiren, setSiren, startMusic,
    pickup() { tone(880, 0.12, 'sine', 0.25, 1320); },
    cash() { tone(660, 0.08, 'square', 0.12); tone(990, 0.14, 'square', 0.12); },
    punch() { tone(140, 0.12, 'square', 0.3, 70); },
    crash() { tone(90, 0.3, 'sawtooth', 0.35, 40); },
    horn() { tone(370, 0.25, 'square', 0.15); },
    mission() { tone(523, 0.15, 'sine', 0.25); tone(784, 0.25, 'sine', 0.25); },
    busted() { tone(220, 0.6, 'sawtooth', 0.25, 110); },
    door() { tone(300, 0.1, 'triangle', 0.18, 180); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
  };
}
