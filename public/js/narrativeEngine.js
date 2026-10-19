// Wayang Kancil — cinematic narrative scene engine.

export class NarrativeEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scenes = [];
    this.sceneIndex = 0;
    this.onComplete = null;
    this.onChoice = null;
    this.isAnimating = false;
    this.typewriterTimer = null;
  }

  loadScenes(scenes) { this.scenes = scenes; this.sceneIndex = 0; }
  start(startIndex = 0) { this.sceneIndex = startIndex; this.isAnimating = false; this.renderScene(this.sceneIndex); }

  next() {
    if (this.isAnimating) return;
    this.sceneIndex++;
    if (this.sceneIndex >= this.scenes.length) {
      if (this.onComplete) this.onComplete();
      return;
    }
    this.renderScene(this.sceneIndex);
  }

  choose(choiceIndex) {
    if (this.isAnimating) return;
    const scene = this.scenes[this.sceneIndex];
    const choice = scene.choices && scene.choices[choiceIndex];
    if (!choice) return;
    if (this.onChoice) this.onChoice(choice, scene);
    this.sceneIndex = choice.nextScene !== undefined ? choice.nextScene : this.sceneIndex + 1;
    this.renderScene(this.sceneIndex);
  }

  // Pemetaan label puppet ke gambar PNG (Phase 8.12)
  puppetImageSrc(label = '') {
    const normalized = label.toLowerCase();
    if (normalized.includes('kancil')) return '/assets/puppets/kancil.png';
    if (normalized.includes('buaya')) return '/assets/puppets/buaya.png';
    if (normalized.includes('pak tani') || normalized.includes('pak-tani')) return '/assets/puppets/pak-tani.png';
    if (normalized.includes('macan') || normalized.includes('harimau')) return '/assets/puppets/macan.png';
    if (normalized.includes('siput')) return '/assets/puppets/siput.png';
    if (normalized.includes('serigala')) return '/assets/puppets/serigala.png';
    if (normalized.includes('elang')) return '/assets/puppets/elang.png';
    if (normalized.includes('beruang')) return '/assets/puppets/beruang.png';
    return null;
  }

  renderScene(index) {
    if (!this.container) return;
    if (index < 0 || index >= this.scenes.length) {
      if (this.onComplete) this.onComplete();
      return;
    }

    const scene = this.scenes[index];
    this.isAnimating = true;
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    const episodeId = scene.episodeId || 'ep-1';
    const episodeNumber = episodeId.replace('ep-', '').padStart(2, '0');
    const progress = Math.round(((index + 1) / this.scenes.length) * 100);
    const sceneType = scene.kind || (scene.choices ? 'decision' : 'story');
    const safeSpeaker = this.escapeHtml(scene.speaker || 'Dalang');
    const safeTitle = this.escapeHtml(scene.episodeTitle || 'Wayang Kancil');
    const safeSubtitle = this.escapeHtml(scene.episodeSubtitle || 'Lakon Nusantara');

    let html = `
      <article class="narrative-stage theme-${episodeId} scene-${sceneType}" style="--scene-color:${scene.bgColor || '#2d1b10'}">
        <div class="narrative-bg" aria-hidden="true"><div class="scene-glow"></div><div class="scene-landscape scene-landscape-back"></div><div class="scene-landscape scene-landscape-front"></div><div class="scene-motif"></div></div>
        <header class="narrative-header">
          <div class="narrative-brand"><span>WK</span><p><small>Wayang Kancil</small>${safeTitle}</p></div>
          <div class="narrative-chapter"><span>LAKON ${episodeNumber}</span><small>${safeSubtitle}</small></div>
        </header>
        <div class="narrative-progress" aria-label="Scene ${index + 1} dari ${this.scenes.length}"><i style="width:${progress}%"></i></div>
        <div class="scene-index"><span>${String(index + 1).padStart(2, '0')}</span><small>/ ${String(this.scenes.length).padStart(2, '0')}</small></div>
    `;

    if (scene.puppets && scene.puppets.length > 0) {
      html += '<div class="narrative-puppets">';
      for (const [puppetIndex, puppet] of scene.puppets.entries()) {
        const imgSrc = this.puppetImageSrc(puppet.label);
        const puppetBody = imgSrc
          ? `<img src="${imgSrc}" alt="${this.escapeHtml(puppet.label)}" class="narrative-puppet-img" />`
          : `<div class="puppet-silhouette ${this.puppetClass(puppet.label)}"><i></i><b></b></div>`;
        html += `<div class="narrative-puppet ${puppet.flip ? 'is-flipped' : ''}" style="--puppet-x:${puppet.x}%; --puppet-delay:${puppetIndex * 120}ms"><div class="puppet-shadow"></div>${puppetBody}<div class="puppet-label"><span></span>${this.escapeHtml(puppet.label)}</div></div>`;
      }
      html += '</div>';
    }

    html += `<section class="narrative-content"><div class="narrative-kicker"><span>${safeSpeaker}</span><small>${sceneType === 'decision' ? 'Tentukan jalan cerita' : 'Kisah dari sang dalang'}</small></div><div class="narrative-dialog"><div class="quote-mark">“</div><div class="narrative-text" id="narrative-text" aria-live="polite"></div></div>`;

    if (scene.choices && scene.choices.length > 0) {
      html += '<div class="narrative-choices">';
      for (const [choiceIndex, choice] of scene.choices.entries()) {
        html += `<button class="narrative-choice" data-index="${choiceIndex}"><span>0${choiceIndex + 1}</span><strong>${this.escapeHtml(choice.text)}</strong><b>↗</b></button>`;
      }
      html += '</div>';
    } else {
      html += '<button class="narrative-next" id="narrative-next"><span>Lanjutkan kisah</span><b>→</b></button>';
    }

    html += '</section><div class="narrative-footnote"><span>MENANG TANPA NGASORAKE</span><small>Akal budi • Eling lan waspada</small></div></article>';
    this.container.innerHTML = html;
    this.container.classList.remove('hidden');
    this.typewriteText(scene.text || '');

    const nextButton = document.getElementById('narrative-next');
    if (nextButton) nextButton.addEventListener('click', () => this.next());
    this.container.querySelectorAll('.narrative-choice').forEach((button, choiceIndex) => button.addEventListener('click', () => this.choose(choiceIndex)));
    this.isAnimating = false;
  }

  typewriteText(text) {
    const element = document.getElementById('narrative-text');
    if (!element) return;
    element.textContent = '';
    let characterIndex = 0;
    this.typewriterTimer = setInterval(() => {
      element.textContent += text.charAt(characterIndex);
      characterIndex++;
      if (characterIndex >= text.length) { clearInterval(this.typewriterTimer); this.typewriterTimer = null; }
    }, 12);
  }

  puppetClass(label = '') {
    const normalized = label.toLowerCase();
    if (normalized.includes('kancil')) return 'puppet-kancil';
    if (normalized.includes('buaya')) return 'puppet-buaya';
    if (normalized.includes('macan') || normalized.includes('harimau')) return 'puppet-macan';
    if (normalized.includes('siput')) return 'puppet-siput';
    if (normalized.includes('serigala')) return 'puppet-serigala';
    if (normalized.includes('gajah')) return 'puppet-gajah';
    return 'puppet-generic';
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  hide() { if (this.container) this.container.classList.add('hidden'); }
  show() { if (this.container) this.container.classList.remove('hidden'); }
}
