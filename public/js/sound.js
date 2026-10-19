// Wayang Kancil - Gamelan sound effects / audio manager
// Placeholder for Phase 5 audio integration

export default class SoundManager {
  constructor() {
    this.enabled = false;
    this.backgroundMusic = null;
  }

  enable() {
    this.enabled = true;
  }

  playBgm() {
    if (!this.enabled) return;
    // Gamelan ambient loop will be added in Phase 5
    console.log('[Sound] BGM placeholder');
  }

  playSfx(name) {
    if (!this.enabled) return;
    console.log(`[Sound] SFX: ${name}`);
  }

  stop() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }
}
