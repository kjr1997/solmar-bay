// Sound, synthesized live with WebAudio — no audio files, no network. A tiny
// synth: short blips and noise bursts for pickups, punches and crashes, a
// two-tone siren while the police are close, and a low engine hum that follows
// the car's speed. Everything starts on the first key press (browsers block
// audio before a gesture) and M mutes it.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type = 'sine', gain = 0.2, slideTo = 0) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, gain = 0.25, low = 400) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  let sirenHigh = false;
  let sirenTimer = 0;

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
    play(name) {
      if (!ensure()) return;
      if (muted) return;
      if (name === 'pickup') { blip(660, 0.09); setTimeout(() => blip(880, 0.12), 70); }
      else if (name === 'cash') { blip(880, 0.08); setTimeout(() => blip(1174, 0.1), 60); setTimeout(() => blip(1568, 0.14), 120); }
      else if (name === 'punch') noise(0.12, 0.3, 900);
      else if (name === 'crash') noise(0.25, 0.3, 500);
      else if (name === 'explosion') { noise(0.7, 0.5, 300); blip(90, 0.6, 'sine', 0.35, 40); }
      else if (name === 'door') blip(220, 0.08, 'square', 0.12, 140);
      else if (name === 'mission') { blip(523, 0.12); setTimeout(() => blip(659, 0.12), 110); setTimeout(() => blip(784, 0.2), 220); }
      else if (name === 'complete') { blip(523, 0.1); setTimeout(() => blip(659, 0.1), 90); setTimeout(() => blip(784, 0.1), 180); setTimeout(() => blip(1046, 0.25), 270); }
      else if (name === 'fail') { blip(330, 0.2, 'sawtooth', 0.15, 220); setTimeout(() => blip(220, 0.3, 'sawtooth', 0.15, 160), 180); }
      else if (name === 'crime') blip(440, 0.15, 'square', 0.1, 660);
      else if (name === 'siren') { blip(700, 0.3, 'square', 0.12, 950); }
      else if (name === 'spray') { noise(0.5, 0.12, 2000); setTimeout(() => blip(880, 0.15), 350); }
      else if (name === 'wasted') { blip(392, 0.3, 'sine', 0.2, 196); setTimeout(() => blip(311, 0.5, 'sine', 0.2, 155), 280); }
      else if (name === 'busted') { blip(330, 0.25, 'square', 0.12, 262); setTimeout(() => blip(262, 0.4, 'square', 0.12, 196), 220); }
    },
    /** Called every frame: engine hum follows speed, siren wails near police. */
    update(dt, speed, policeNear) {
      if (!ctx || muted) return;
      sirenTimer += dt;
      if (engineGain) {
        engineGain.gain.value = speed > 20 ? 0.045 + Math.min(0.05, Math.abs(speed) / 9000) : 0;
        engineOsc.frequency.value = 46 + Math.abs(speed) * 0.22;
      }
      if (sirenGain) {
        if (policeNear) {
          sirenGain.gain.value = 0.035;
          if (sirenTimer > 0.45) {
            sirenTimer = 0;
            sirenHigh = !sirenHigh;
            sirenOsc.frequency.value = sirenHigh ? 950 : 700;
          }
        } else {
          sirenGain.gain.value = 0;
        }
      }
    },
  };
}
