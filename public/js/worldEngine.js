// Wayang Kancil - Open World Engine (Harvest Moon style)
// Peta dunia, gerakan pemain, NPC, kebun, siklus siang/malam
// Icon gambar asli + rumput 3D + tombol menu

// Tile types
const TILE = {
  GRASS: 0,
  DIRT: 1,
  WATER: 2,
  PATH: 3,
  TREE: 4,
  ROCK: 5,
  FARM: 6,
  HOUSE: 7,
  NPC_SPOT: 8,
};

// Ukuran tile
const TILE_SIZE = 48;

export default class WorldEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.tileSize = TILE_SIZE;
    this.onNpcTalk = null; // callback when talking to NPC

    // Peta dunia (2D array)
    this.map = [];
    this.mapWidth = 0;
    this.mapHeight = 0;

    // Pemain
    this.player = {
      x: 0,
      y: 0,
      speed: 3,
      direction: 'down',
      isMoving: false,
      frame: 0,
      frameTimer: 0,
    };

    // Kamera
    this.camera = { x: 0, y: 0 };

    // NPC
    this.npcs = [];

    // Kebun (plots di dunia)
    this.farmPlots = [];

    // Siklus siang/malam
    this.timeOfDay = 0.25;
    this.daySpeed = 0.00005;

    // Interaksi
    this.nearbyNpc = null;
    this.dialogueBox = null;
    this.inventory = { timun: 0, hati: 0 };

    // Input
    this.keys = {};

    // Loop
    this.lastTime = 0;
    this.animId = null;

    // Gambar wayang (PNG asli)
    this.puppetImages = {};
    this.loadPuppetImages();

    // Menu button area
    this.menuButton = { x: 0, y: 0, w: 120, h: 36 };

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // ---------- Load gambar wayang (PNG) ----------
  loadPuppetImages() {
    const sources = {
      kancil: '/assets/puppets/kancil.png',
      buaya: '/assets/puppets/buaya.png',
    };
    for (const [name, src] of Object.entries(sources)) {
      const img = new Image();
      img.onload = () => {
        const processed = this.removeWhiteBackground(img);
        this.puppetImages[name] = processed || img;
      };
      img.onerror = () => { console.warn('Gagal load gambar wayang:', name, src); };
      img.src = src;
    }
  }

  removeWhiteBackground(img) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 230 && g > 230 && b > 230) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const newImg = new Image();
      newImg.src = canvas.toDataURL('image/png');
      return newImg;
    } catch (e) {
      console.warn('Gagal proses background:', e);
      return null;
    }
  }

  // ---------- Setup peta ----------
  createDefaultMap() {
    const w = 50, h = 35;
    this.mapWidth = w;
    this.mapHeight = h;
    this.map = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        let tile = 0; // grass
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tile = 4; // tree border
        // Water pond
        if (x >= 20 && x <= 26 && y >= 14 && y <= 19) tile = 2;
        // Path
        if (y === 20 && x >= 5 && x <= 45) tile = 3;
        if (x === 25 && y >= 20 && y <= 32) tile = 3;
        // Farm area
        if (x >= 3 && x <= 10 && y >= 3 && y <= 10) tile = 6;
        // House
        if (x >= 38 && x <= 42 && y >= 3 && y <= 7) tile = 7;
        // NPC spots
        if (x === 25 && y === 12) tile = 8;
        if (x === 8 && y === 18) tile = 8;
        if (x === 40 && y === 18) tile = 8;
        row.push(tile);
      }
      this.map.push(row);
    }

    this.player.x = 25 * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = 22 * TILE_SIZE + TILE_SIZE / 2;

    this.npcs = [
      { id: 'kancil', name: 'Si Kancil', x: 25 * TILE_SIZE + TILE_SIZE / 2, y: 12 * TILE_SIZE + TILE_SIZE / 2, color: '#fbbf24', image: 'kancil', dialogue: 'Halo! Aku Si Kancil. Mau bermain?', episodeId: null },
      { id: 'pak-tani', name: 'Pak Tani', x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 18 * TILE_SIZE + TILE_SIZE / 2, color: '#22c55e', image: null, dialogue: 'Selamat datang di kebunku! Tanam timun di sini.', episodeId: null },
      { id: 'macan', name: 'Macan', x: 40 * TILE_SIZE + TILE_SIZE / 2, y: 18 * TILE_SIZE + TILE_SIZE / 2, color: '#ef4444', image: null, dialogue: 'Grrr... Jangan ganggu aku!', episodeId: 'ep-2' },
      { id: 'buaya', name: 'Buaya', x: 22 * TILE_SIZE + TILE_SIZE / 2, y: 16 * TILE_SIZE + TILE_SIZE / 2, color: '#10b981', image: 'buaya', dialogue: 'Hati-hati di sungai! Aku bukan musuh.', episodeId: 'ep-1' },
    ];

    for (let y = 3; y <= 10; y++) {
      for (let x = 3; x <= 10; x++) {
        this.farmPlots.push({ x, y, crop: null, stage: 0, plantedAt: null });
      }
    }
  }

  // ---------- Collision ----------
  isSolid(tile) {
    return tile === 4 || tile === 2 || tile === 5 || tile === 7;
  }

  getTileAt(px, py) {
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return 4;
    return this.map[ty][tx];
  }

  // ---------- Input ----------
  handleKeyDown(code) {
    this.keys[code] = true;
    if (code === 'Space' || code === 'Enter') {
      this.interact();
    }
  }

  handleKeyUp(code) {
    this.keys[code] = false;
  }

  // ---------- Interaksi ----------
  interact() {
    if (this.nearbyNpc) {
      // Trigger story mode if NPC has a story episode
      if (this.onNpcTalk && this.nearbyNpc.episodeId) {
        this.onNpcTalk(this.nearbyNpc);
        return;
      }
      this.dialogueBox = { npc: this.nearbyNpc, text: this.nearbyNpc.dialogue };
    } else {
      const plot = this.getNearbyFarmPlot();
      if (plot) {
        if (plot.stage === 0) {
          plot.crop = 'timun';
          plot.stage = 1;
          plot.plantedAt = Date.now();
          this.dialogueBox = { npc: { name: 'Kebun' }, text: 'Benih timun ditanam! Tunggu hingga siap panen.' };
        } else if (plot.stage === 3) {
          plot.crop = null;
          plot.stage = 0;
          plot.plantedAt = null;
          this.inventory.timun++;
          this.dialogueBox = { npc: { name: 'Kebun' }, text: 'Timun dipanen! (+1 timun)' };
        } else {
          this.dialogueBox = { npc: { name: 'Kebun' }, text: `Timun sedang tumbuh... (${this.getFarmProgress(plot)}%)` };
        }
      }
    }
  }

  getNearbyFarmPlot() {
    const p = this.player;
    const tx = Math.floor(p.x / this.tileSize);
    const ty = Math.floor(p.y / this.tileSize);
    for (const plot of this.farmPlots) {
      if (Math.abs(plot.x - tx) <= 1 && Math.abs(plot.y - ty) <= 1) return plot;
    }
    return null;
  }

  getFarmProgress(plot) {
    if (plot.stage === 0 || plot.stage === 3) return plot.stage === 3 ? 100 : 0;
    const elapsed = Date.now() - plot.plantedAt;
    const needed = plot.stage === 1 ? 30000 : 60000;
    return Math.min(100, Math.round((elapsed / needed) * 100));
  }

  updateFarmGrowth() {
    const now = Date.now();
    for (const plot of this.farmPlots) {
      if (plot.stage === 0 || plot.stage === 3 || !plot.plantedAt) continue;
      const elapsed = now - plot.plantedAt;
      const needed = plot.stage === 1 ? 30000 : 60000;
      if (elapsed >= needed) {
        plot.stage += 1;
        if (plot.stage === 3) plot.plantedAt = now;
      }
    }
  }

  // ---------- Update ----------
  update(dt) {
    const p = this.player;
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) { dx -= p.speed; p.direction = 'left'; }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx += p.speed; p.direction = 'right'; }
    if (this.keys['ArrowUp'] || this.keys['KeyW']) { dy -= p.speed; p.direction = 'up'; }
    if (this.keys['ArrowDown'] || this.keys['KeyS']) { dy += p.speed; p.direction = 'down'; }

    p.isMoving = dx !== 0 || dy !== 0;

    if (dx !== 0) {
      const newX = p.x + dx;
      const tile = this.getTileAt(newX + (dx > 0 ? 12 : -12), p.y);
      if (!this.isSolid(tile)) p.x = newX;
    }
    if (dy !== 0) {
      const newY = p.y + dy;
      const tile = this.getTileAt(p.x, newY + (dy > 0 ? 12 : -12));
      if (!this.isSolid(tile)) p.y = newY;
    }

    p.x = Math.max(this.tileSize, Math.min((this.mapWidth - 1) * this.tileSize, p.x));
    p.y = Math.max(this.tileSize, Math.min((this.mapHeight - 1) * this.tileSize, p.y));

    if (p.isMoving) {
      p.frameTimer += dt;
      if (p.frameTimer > 0.15) {
        p.frame = (p.frame + 1) % 4;
        p.frameTimer = 0;
      }
    } else {
      p.frame = 0;
      p.frameTimer = 0;
    }

    const camX = p.x - this.canvas.width / 2;
    const camY = p.y - this.canvas.height / 2;
    this.camera.x += (camX - this.camera.x) * 0.1;
    this.camera.y += (camY - this.camera.y) * 0.1;

    this.updateFarmGrowth();

    this.nearbyNpc = null;
    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.x - p.x, npc.y - p.y);
      if (dist < this.tileSize * 1.5) {
        this.nearbyNpc = npc;
        break;
      }
    }

    this.timeOfDay = (this.timeOfDay + this.daySpeed) % 1;
  }

  // ---------- Drawing ----------
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, w, h);

    // Gambar tile
    const startX = Math.floor(this.camera.x / this.tileSize);
    const startY = Math.floor(this.camera.y / this.tileSize);
    const endX = startX + Math.ceil(w / this.tileSize) + 1;
    const endY = startY + Math.ceil(h / this.tileSize) + 1;

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) continue;
        const tile = this.map[ty][tx];
        const px = tx * this.tileSize - this.camera.x;
        const py = ty * this.tileSize - this.camera.y;

        // Grass 3D effect
        if (tile === 0) {
          // Base grass
          const grad = ctx.createLinearGradient(px, py, px, py + this.tileSize);
          grad.addColorStop(0, '#4a7a3a');
          grad.addColorStop(0.5, '#3a6a2a');
          grad.addColorStop(1, '#2a5a1a');
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, this.tileSize, this.tileSize);

          // Grass texture (blades)
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 5; i++) {
            const bx = px + 4 + i * 8;
            const by = py + this.tileSize - 4;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + 2, by - 6 - Math.random() * 4);
            ctx.stroke();
          }

          // Shadow at bottom
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(px, py + this.tileSize - 4, this.tileSize, 4);
        } else {
          // Other tiles
          const colors = { 1: '#5d4037', 2: '#1a3a5a', 3: '#8b7355', 4: '#2d4a1a', 5: '#6b6b6b', 6: '#4a3a1a', 7: '#5a3a2a', 8: '#4a4a2a' };
          ctx.fillStyle = colors[tile] || '#3a5a2a';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);

          // Tile details
          if (tile === 4) { // tree
            ctx.fillStyle = '#1a3a0a';
            ctx.beginPath();
            ctx.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + this.tileSize / 2 - 3, py + this.tileSize / 2, 6, this.tileSize / 2);
          } else if (tile === 2) { // water
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            // Water shimmer
            const shimmer = Math.sin(Date.now() * 0.003 + tx + ty) * 0.1 + 0.1;
            ctx.fillStyle = `rgba(100,180,255,${shimmer})`;
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          } else if (tile === 6) { // farm
            const plot = this.farmPlots.find((pl) => pl.x === tx && pl.y === ty);
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            if (plot && plot.stage > 0) {
              const emojis = ['🌱', '🌿', '🥒'];
              ctx.font = '24px serif';
              ctx.textAlign = 'center';
              ctx.fillText(emojis[plot.stage - 1] || '🌱', px + this.tileSize / 2, py + this.tileSize / 2 + 8);
            }
          } else if (tile === 7) { // house
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏠', px + this.tileSize / 2, py + this.tileSize / 2 + 6);
          } else if (tile === 8) { // npc spot
            ctx.fillStyle = 'rgba(255,213,79,0.12)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          } else if (tile === 3) { // path
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          }
        }
      }
    }

    // Gambar NPC dengan gambar asli
    for (const npc of this.npcs) {
      const nx = npc.x - this.camera.x;
      const ny = npc.y - this.camera.y;
      const img = npc.image ? this.puppetImages[npc.image] : null;
      if (img) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.drawImage(img, nx - 24, ny - 48, 48, 48);
        ctx.restore();
      } else {
        ctx.fillStyle = npc.color;
        ctx.beginPath();
        ctx.arc(nx, ny - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.ellipse(nx, ny + 4, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Nama
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, nx, ny - 52);
    }

    // Gambar pemain (kancil)
    this.drawPlayer(ctx);

    // Overlay siang/malam
    this.drawDayNightOverlay(ctx, w, h);

    // HUD
    this.drawHUD(ctx, w, h);

    // Dialogue box
    if (this.dialogueBox) {
      this.drawDialogue(ctx, w, h);
    }

    // Menu button
    this.drawMenuButton(ctx, w, h);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const px = p.x - this.camera.x;
    const py = p.y - this.camera.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = this.puppetImages['kancil'];
    if (img) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      // Animasi bobbing
      const bob = p.isMoving ? Math.sin(p.frame * Math.PI / 2) * 3 : 0;
      const sway = p.isMoving ? Math.sin(p.frame * Math.PI / 2) * 0.08 : 0;
      ctx.translate(0, bob);
      ctx.rotate(sway);
      if (p.direction === 'left') ctx.scale(-1, 1);
      ctx.drawImage(img, px - 24, py - 48, 48, 48);
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py - 8, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDayNightOverlay(ctx, w, h) {
    const t = this.timeOfDay;
    let alpha = 0;
    let color = '0,0,0';
    if (t < 0.25) {
      alpha = 0.5 * (1 - t / 0.25);
      color = '0,0,0';
    } else if (t > 0.75) {
      alpha = 0.5 * ((t - 0.75) / 0.25);
      color = '0,0,0';
    } else if (t > 0.5 && t <= 0.75) {
      alpha = 0.15 * ((t - 0.5) / 0.25);
      color = '100,50,0';
    }
    if (alpha > 0) {
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawHUD(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, 10, 200, 80);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('WAYANG KANCIL', 20, 30);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px monospace';
    ctx.fillText(`Timun: ${this.inventory.timun}`, 20, 50);
    ctx.fillText(`Hati: ${this.inventory.hati}`, 20, 65);
    const hour = Math.floor(this.timeOfDay * 24);
    const minute = Math.floor((this.timeOfDay * 24 - hour) * 60);
    ctx.fillText(`Waktu: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, 20, 80);

    if (this.nearbyNpc) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[SPACE] Bicara dengan ${this.nearbyNpc.name}`, w / 2, h - 20);
      ctx.textAlign = 'left';
    } else {
      const plot = this.getNearbyFarmPlot();
      if (plot) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[SPACE] Interaksi Kebun', w / 2, h - 20);
        ctx.textAlign = 'left';
      }
    }
  }

  drawMenuButton(ctx, w, h) {
    // Tombol menu di pojok kanan atas
    const btnX = w - 130;
    const btnY = 10;
    const btnW = 120;
    const btnH = 36;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('☰ Menu', btnX + btnW / 2, btnY + btnH / 2 + 4);
    ctx.textAlign = 'left';

    // Store button bounds for click detection
    this.menuButton = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  drawDialogue(ctx, w, h) {
    const boxH = 120;
    const boxY = h - boxH - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(20, boxY, w - 40, boxH);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, boxY, w - 40, boxH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(this.dialogueBox.npc.name || 'NPC', 40, boxY + 25);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '13px monospace';
    const lines = this.wrapText(ctx, this.dialogueBox.text, w - 80);
    let yy = boxY + 50;
    for (const line of lines) {
      ctx.fillText(line, 40, yy);
      yy += 20;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('Tekan SPACE/ENTER untuk menutup', 40, boxY + boxH - 10);
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

  // ---------- Loop ----------
  start() {
    if (this.animId) return;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  loop(now) {
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(dt);
    this.draw();

    this.animId = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }
}