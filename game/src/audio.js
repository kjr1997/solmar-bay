// Solmar Bay — all sound is synthesised with WebAudio. No audio files.
// Engine hum, police siren, pickup chime, crash thud and a light music loop.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startEngineLoop();
      this.startSirenLoop();
    } catch (err) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) {
      if (m) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    }
  }

  startEngineLoop() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  startSirenLoop() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();
  }

  // Called every frame: engine pitch follows speed, siren wails when wanted.
  update(dt, speedRatio, wanted) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(52 + speedRatio * 130, t, 0.08);
      this.engineGain.gain.setTargetAtTime(speedRatio > 0.02 ? 0.028 + speedRatio * 0.03 : 0, t, 0.1);
    }
    if (this.sirenOsc) {
      if (wanted > 0) {
        const phase = (t % 1.1) < 0.55 ? 660 : 920;
        this.sirenOsc.frequency.setTargetAtTime(phase, t, 0.05);
        this.sirenGain.gain.setTargetAtTime(0.016, t, 0.2);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, t, 0.2);
      }
    }
    // Simple bass-and-pluck music loop, one step every 0.21 s.
    this.musicTimer += dt;
    if (this.musicTimer >= 0.21) {
      this.musicTimer -= 0.21;
      this.playMusicStep(this.musicStep);
      this.musicStep = (this.musicStep + 1) % 32;
    }
  }

  playMusicStep(step) {
    if (!this.ctx || this.muted) return;
    const bass = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 146.8, 0, 130.8, 0,
      110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 164.8, 0, 146.8, 0, 130.8, 0][step];
    if (bass) this.blip(bass, 0.19, 'sine', 0.035);
    if (step % 4 === 2) this.blip(440 + (step % 8) * 22, 0.08, 'square', 0.012);
    if (step % 8 === 4) this.blip(660, 0.1, 'triangle', 0.02);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (err) { /* audio is best-effort */ }
  }

  pickup() { this.blip(880, 0.12, 'sine', 0.06); setTimeout(() => this.blip(1320, 0.16, 'sine', 0.06), 90); }
  cash() { this.blip(1046, 0.1, 'triangle', 0.05); setTimeout(() => this.blip(1568, 0.14, 'triangle', 0.05), 80); }
  door() { this.blip(300, 0.08, 'square', 0.03); setTimeout(() => this.blip(210, 0.07, 'square', 0.03), 70); }
  crash() { this.blip(70, 0.22, 'sawtooth', 0.09); this.blip(45, 0.3, 'square', 0.06); }
  punch() { this.blip(180, 0.08, 'square', 0.07); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.06), i * 110));
  }
  busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'sawtooth', 0.05), i * 160)); }
}
