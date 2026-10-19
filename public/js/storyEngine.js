// Wayang Kancil - Story Mode / Dalang Engine (Phase 6)
// Mengelola adegan narasi, dialog, pilihan, dan wayang pada canvas.

import { getEpisode, getAllEpisodes } from './episodes.js';

export class StoryEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.episode = null;
    this.sceneIndex = 0;
    this.scenes = [];
    this.choices = [];
    this.playerChoices = {}; // sceneId -> choiceId
    this.isActive = false;
    this.onComplete = null;

    // Puppet positions (dalang style)
    this.puppets = []; // { id, x, y, character, visible }
  }

  // ---------- Setup ----------
  loadEpisode(episodeId) {
    this.episode = getEpisode(episodeId);
    if (!this.episode) return false;

    this.scenes = this.buildScenes(this.episode);
    this.sceneIndex = 0;
    this.playerChoices = {};
    this.puppets = [];
    this.isActive = true;
    return true;
  }

  buildScenes(episode) {
    const scenes = [];

    // Scene 0: Intro / opening
    scenes.push({
      id: 'intro',
      type: 'dialogue',
      speaker: 'Dalang',
      text: `Lakon: ${episode.title} — ${episode.subtitle}`,
      detail: episode.story,
      bgColor: episode.bgColor,
      puppet: null,
      choices: null,
    });

    // Scene 1: Story summary
    scenes.push({
      id: 'summary',
      type: 'dialogue',
      speaker: 'Dalang',
      text: episode.title,
      detail: episode.objective,
      bgColor: episode.bgColor,
      puppet: episode.enemyType || 'kancil',
      choices: [
        { id: 'start', text: 'Mulai Lakon', nextScene: 2 },
        { id: 'skip', text: 'Langsung ke Moral', nextScene: 'moral' },
      ],
    });

    // Scene 2: Main story (varies by episode)
    scenes.push({
      id: 'main',
      type: 'narrative',
      speaker: 'Kancil',
      text: episode.story,
      detail: null,
      bgColor: episode.bgColor,
      puppet: 'kancil',
      choices: this.getMainChoices(episode),
    });

    // Scene 3: Decision point
    scenes.push({
      id: 'decision',
      type: 'choice',
      speaker: 'Dalang',
      text: 'Apa pilihan Kancil?',
      detail: 'Pilihan Anda akan menentukan akhir lakon.',
      bgColor: episode.bgColor,
      puppet: null,
      choices: this.getDecisionChoices(episode),
    });

    // Scene 4: Moral
    scenes.push({
      id: 'moral',
      type: 'moral',
      speaker: 'Piwulang',
      text: episode.moral,
      detail: null,
      bgColor: episode.bgColor,
      puppet: null,
      choices: [
        { id: 'menu', text: 'Kembali ke Menu', nextScene: null },
        { id: 'replay', text: 'Main Lagi', nextScene: 0 },
      ],
    });

    return scenes;
  }

  getMainChoices(episode) {
    const choices = [
      { id: 'clever', text: 'Gunakan kecerdikan', nextScene: 3, effect: 'clever' },
      { id: 'brave', text: 'Hadapi langsung', nextScene: 3, effect: 'brave' },
    ];
    if (episode.id === 'ep-5') {
      choices.push({ id: 'mediate', text: 'Ajak berbicara damai', nextScene: 3, effect: 'mediate' });
    }
    return choices;
  }

  getDecisionChoices(episode) {
    const base = [
      { id: 'clever', text: 'Pilihan Cerdik', nextScene: 4, effect: 'clever' },
      { id: 'force', text: 'Pilihan Paksa', nextScene: 4, effect: 'force' },
    ];
    if (episode.id === 'ep-5') {
      base.push({ id: 'peace', text: 'Pilihan Perdamaian', nextScene: 4, effect: 'peace' });
    }
    return base;
  }

  // ---------- Navigation ----------
  currentScene() {
    return this.scenes[this.sceneIndex];
  }

  nextScene(choiceId) {
    const scene = this.currentScene();
    if (!scene) return false;

    this.playerChoices[scene.id] = choiceId;

    const choice = scene.choices ? scene.choices.find((c) => c.id === choiceId) : null;
    if (!choice) return false;

    if (choice.nextScene === null) {
      this.isActive = false;
      if (this.onComplete) this.onComplete(this.getResult());
      return false;
    }

    if (typeof choice.nextScene === 'number') {
      this.sceneIndex = choice.nextScene;
    } else {
      // named scene
      const idx = this.scenes.findIndex((s) => s.id === choice.nextScene);
      if (idx === -1) return false;
      this.sceneIndex = idx;
    }
    return true;
  }

  // ---------- Result / Ending ----------
  getResult() {
    const cleverCount = Object.values(this.playerChoices).filter(
      (c) => c === 'clever' || c === 'mediate' || c === 'peace'
    ).length;
    const forceCount = Object.values(this.playerChoices).filter(
      (c) => c === 'force' || c === 'brave'
    ).length;

    let ending = 'neutral';
    let endingText = '';

    if (cleverCount > forceCount) {
      ending = 'clever';
      endingText = 'Kancil menang dengan kecerdikan. Hutan tetap damai.';
    } else if (forceCount > cleverCount) {
      ending = 'force';
      endingText = 'Kancil berhasil tetapi melalui kekerasan. Hutan menjadi kegelisahan.';
    } else {
      ending = 'neutral';
      endingText = 'Kancil menemukan jalan tengah. Seimbang antara akal dan keberanian.';
    }

    return {
      episode: this.episode,
      ending,
      endingText,
      choices: this.playerChoices,
      moral: this.episode.moral,
    };
  }

  // ---------- Render ----------
  render() {
    if (!this.isActive || !this.ctx) return;

    const scene = this.currentScene();
    if (!scene) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Background
    ctx.fillStyle = scene.bgColor || '#2d1b10';
    ctx.fillRect(0, 0, w, h);

    // Kelir shadow overlay
    const shadowGrad = ctx.createLinearGradient(0, 0, 0, h);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, w, h);

    // Puppet (wayang silhouette)
    if (scene.puppet) {
      this.drawPuppet(ctx, scene.puppet, w * 0.5, h * 0.55);
    }

    // Dialogue box
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(40, h - 220, w - 80, 180);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, h - 220, w - 80, 180);

    // Speaker name
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(scene.speaker || 'Dalang', 60, h - 190);

    // Dialogue text
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = this.wrapText(ctx, scene.text, w - 120);
    let yy = h - 160;
    for (const line of lines) {
      ctx.fillText(line, 60, yy);
      yy += 24;
    }

    // Detail (objective / story)
    if (scene.detail) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px monospace';
      const detailLines = this.wrapText(ctx, scene.detail, w - 120);
      for (const line of detailLines) {
        ctx.fillText(line, 60, yy);
        yy += 22;
      }
    }

    // Choices
    if (scene.choices && scene.choices.length > 0) {
      yy += 10;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('Pilihan:', 60, yy);
      yy += 28;

      scene.choices.forEach((c, i) => {
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`${i + 1}. ${c.text}`, 80, yy);
        yy += 26;
      });
    }

    // Controls hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('Tekan angka 1-9 untuk pilih. Tekan SPACE untuk lanjut.', 60, h - 30);
  }

  drawPuppet(ctx, character, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#1a1a1a';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 12;

    const s = 50;
    if (character === 'kancil') {
      // Kancil: kecil, lompat
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.4, s * 0.4, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, s * 0.1);
      ctx.lineTo(s * 0.35, s * 0.1);
      ctx.lineTo(s * 0.55, s * 0.9);
      ctx.lineTo(-s * 0.55, s * 0.9);
      ctx.closePath();
      ctx.fill();
    } else if (character === 'macan' || character === 'buaya' || character === 'serigala') {
      // Musuh: besar, mengancam
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.35, s * 0.55, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.2);
      ctx.lineTo(s * 0.5, s * 0.2);
      ctx.lineTo(s * 0.75, s * 1.1);
      ctx.lineTo(-s * 0.75, s * 1.1);
      ctx.closePath();
      ctx.fill();
    } else if (character === 'siput') {
      // Siput: kecil, lingkar
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, s * 0.4, s * 0.4, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      const metrics = ctx.measureText(test);
      if (metrics.width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  stop() {
    this.isActive = false;
  }
}
