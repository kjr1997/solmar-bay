// All sound is synthesized with WebAudio: no audio files, no network.
// Engine hum, police siren, pickup chime, crash thud, punch thwack and a
// looping bassline. AudioContext starts on the first user gesture (browser
// autoplay rules); until then every call is a safe no-op.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) {
      this.ctx.suspend().catch(() => {});
      if (!muted) this.ctx.resume().catch(() => {});
    }
  }

  // A short tone: frequency slide, gain envelope, then stop.
  tone(freq0, freq1, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  // Filtered noise burst (crashes, punches).
  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t);
    } catch { /* ignore */ }
  }

  pickup() { this.tone(660, 990, 0.12, 'sine', 0.18); this.tone(990, 1320, 0.14, 'sine', 0.12); }
  cash() { this.tone(880, 880, 0.07, 'square', 0.08); this.tone(1174, 1174, 0.1, 'square', 0.08); }
  // Short two-note sting when the wanted level rises.
  wantedUp() { this.tone(311, 311, 0.12, 'square', 0.12); this.tone(233, 233, 0.18, 'square', 0.12); }
  punch() { this.noise(0.09, 0.3, 900); }
  crash() { this.noise(0.25, 0.4, 500); this.tone(90, 40, 0.2, 'sine', 0.3); }
  busted() { this.tone(440, 220, 0.5, 'sawtooth', 0.15); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, f, 0.16, 'triangle', 0.16), i * 110);
    });
  }

  // Engine hum follows the driven car's speed; call every frame.
  engine(speedRatio, driving) {
    if (!this.ctx || this.muted) { this.stopEngine(); return; }
    try {
      if (!driving) { this.stopEngine(); return; }
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        this.engineOsc.connect(filter).connect(this.engineGain).connect(this.ctx.destination);
        this.engineOsc.start();
      }
      const freq = 55 + speedRatio * 130;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(0.045 + speedRatio * 0.03, this.ctx.currentTime, 0.08);
    } catch { /* ignore */ }
  }

  stopEngine() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch { /* ignore */ }
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  // Two-tone siren while wanted >= 1; call every frame with the wanted level.
  siren(wanted) {
    if (!this.ctx || this.muted || wanted < 1) {
      if (this.sirenOsc) {
        try { this.sirenOsc.stop(); } catch { /* ignore */ }
        this.sirenOsc = null;
        this.sirenGain = null;
      }
      return;
    }
    try {
      if (!this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0.035;
        this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
        this.sirenOsc.start();
      }
      const t = this.ctx.currentTime;
      // Alternate 700 / 950 Hz every 0.4 s.
      const phase = Math.floor(t / 0.4) % 2;
      this.sirenOsc.frequency.setTargetAtTime(phase ? 950 : 700, t, 0.05);
    } catch { /* ignore */ }
  }

  // A quiet 8-step bassline loop, 132 bpm, minor key. Scheduled with timers
  // so it survives tab throttling well enough for a menu ambience.
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const notes = [110, 0, 130.8, 0, 98, 0, 146.8, 123.5];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = notes[this.musicStep % notes.length];
      this.musicStep++;
      if (f > 0) this.tone(f, f, 0.22, 'triangle', 0.05);
    }, 227);
  }
}
