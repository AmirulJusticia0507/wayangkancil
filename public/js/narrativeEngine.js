// Wayang Kancil - Narrative Scene Engine (Phase 6, Task 2)
// Mengelola adegan cerita: dialog, pilihan, dan tampilan wayang siluet.

export class NarrativeEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scenes = [];
    this.sceneIndex = 0;
    this.onComplete = null;
    this.onChoice = null;
    this.isAnimating = false;
  }

  // Muat daftar adegan cerita
  loadScenes(scenes) {
    this.scenes = scenes;
    this.sceneIndex = 0;
  }

  // Mulai menampilkan adegan dari index tertentu
  start(startIndex = 0) {
    this.sceneIndex = startIndex;
    this.isAnimating = false;
    this.renderScene(this.sceneIndex);
  }

  // Pindah ke adegan berikutnya
  next() {
    if (this.isAnimating) return;
    this.sceneIndex++;
    if (this.sceneIndex >= this.scenes.length) {
      if (this.onComplete) this.onComplete();
      return;
    }
    this.renderScene(this.sceneIndex);
  }

  // Pemilihan pilihan (choice) oleh pemain
  choose(choiceIndex) {
    if (this.isAnimating) return;
    const scene = this.scenes[this.sceneIndex];
    const choice = scene.choices && scene.choices[choiceIndex];
    if (!choice) return;

    if (this.onChoice) this.onChoice(choice, scene);

    if (choice.nextScene !== undefined) {
      this.sceneIndex = choice.nextScene;
    } else {
      this.sceneIndex++;
    }
    this.renderScene(this.sceneIndex);
  }

  renderScene(index) {
    if (!this.container) return;
    if (index < 0 || index >= this.scenes.length) {
      if (this.onComplete) this.onComplete();
      return;
    }

    const scene = this.scenes[index];
    this.isAnimating = true;

    // Bangun HTML adegan
    let html = '';

    // Latar adegan (warna berdasarkan episode)
    if (scene.bgColor) {
      html += `<div class="narrative-bg" style="background-color: ${scene.bgColor};"></div>`;
    }

    // Tampilkan wayang siluet (jika ada)
    if (scene.puppets && scene.puppets.length > 0) {
      html += '<div class="narrative-puppets">';
      for (const p of scene.puppets) {
        html += `
          <div class="narrative-puppet" style="left: ${p.x}%; top: ${p.y}%; transform: scaleX(${p.flip ? '-1' : '1'});">
            <div class="puppet-silhouette"></div>
            <div class="puppet-label">${p.label}</div>
          </div>
        `;
      }
      html += '</div>';
    }

    // Dialog box
    html += `
      <div class="narrative-dialog">
        <div class="narrative-speaker">${scene.speaker || ''}</div>
        <div class="narrative-text" id="narrative-text">${scene.text || ''}</div>
      </div>
    `;

    // Tombol pilihan (jika ada)
    if (scene.choices && scene.choices.length > 0) {
      html += '<div class="narrative-choices">';
      for (const [i, c] of scene.choices.entries()) {
        html += `<button class="narrative-choice" data-index="${i}">${c.text}</button>`;
      }
      html += '</div>';
    } else {
      // Tombol lanjut jika tidak ada pilihan
      html += '<button class="narrative-next" id="narrative-next">Lanjut &gt;</button>';
    }

    this.container.innerHTML = html;
    this.container.classList.remove('hidden');

    // Typewriter effect untuk teks dialog
    this.typewriteText(scene.text || '');

    // Event listener tombol lanjut
    const nextBtn = document.getElementById('narrative-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.isAnimating) return;
        this.next();
      });
    }

    // Event listener tombol pilihan
    const choiceBtns = this.container.querySelectorAll('.narrative-choice');
    choiceBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.choose(i);
      });
    });

    this.isAnimating = false;
  }

  // Efek mengetik (typewriter) pada teks dialog
  typewriteText(text) {
    const el = document.getElementById('narrative-text');
    if (!el) return;
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 25);
  }

  // Sembunyikan engine narasi
  hide() {
    if (this.container) this.container.classList.add('hidden');
  }

  // Tampilkan engine narasi
  show() {
    if (this.container) this.container.classList.remove('hidden');
  }
}
