// Wayang Kancil - Gamelan sound effects / audio manager (Phase 5)
// Sintesis suara dengan Web Audio API (tidak butuh file audio eksternal).
// Nada slendro (pentatonic 5 nada): 1, 2, 3, 5, 6 ≈ C4, D4, E4, G4, A4

export default class SoundManager {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.bgmInterval = null;
    this.masterGain = null;

    // Skala Slendro (approx Western): C4 D4 E4 G4 A4
    this.slendro = [261.63, 293.66, 329.63, 392.00, 440.00];
  }

  _initCtx() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);
  }

  enable() {
    this._initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.stopBgm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }

  // ---------- BGM Gamelan (loop nada acak slendro) ----------
  playBgm() {
    if (!this.enabled || !this.ctx) return;
    this.stopBgm();

    this.bgmInterval = setInterval(() => {
      if (!this.enabled) return;
      const freq = this.slendro[Math.floor(Math.random() * this.slendro.length)];
      this.playTone(freq, 0.6, 'sine', 0.15);
    }, 900);
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  // ---------- SFX ----------
  playSfx(name) {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;

    if (name === 'collect') {
      // Nada naik cepat (kecut/kancil)
      this.playTone(660, 0.15, 'square', 0.1, now);
      setTimeout(() => this.playTone(880, 0.15, 'square', 0.1, now + 0.1), 100);
    } else if (name === 'ability') {
      // Nada glitch naik-turun
      this.playTone(400, 0.2, 'sawtooth', 0.1, now);
      setTimeout(() => this.playTone(700, 0.2, 'sawtooth', 0.1, now + 0.1), 150);
    } else if (name === 'gameover') {
      // Nada turun panjang
      this.playTone(220, 1.0, 'sawtooth', 0.2, now);
      setTimeout(() => this.playTone(150, 1.5, 'sawtooth', 0.2, now + 0.5), 500);
    } else if (name === 'start') {
      this.playTone(523, 0.2, 'sine', 0.1, now);
      setTimeout(() => this.playTone(659, 0.2, 'sine', 0.1, now + 0.15), 150);
      setTimeout(() => this.playTone(784, 0.4, 'sine', 0.15, now + 0.3), 300);
    }
  }

  playTone(freq, duration, type = 'sine', gain = 0.2, when = null) {
    if (!this.ctx) return;
    const startTime = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  stop() {
    this.stopBgm();
  }
}
