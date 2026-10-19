// Wayang Kancil - Open World Engine (Harvest Moon style)
// Peta dunia, gerakan pemain, NPC, kebun, siklus siang/malam

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

// Warna tile
const TILE_COLORS = {
  0: '#3a5a2a', // grass
  1: '#5d4037', // dirt
  2: '#1a3a5a', // water
  3: '#8b7355', // path
  4: '#2d4a1a', // tree
  5: '#6b6b6b', // rock
  6: '#4a3a1a', // farm plot
  7: '#5a3a2a', // house
  8: '#4a4a2a', // npc spot
};

// Ukuran tile
const TILE_SIZE = 48;

export default class WorldEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.tileSize = TILE_SIZE;

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
    this.timeOfDay = 0.25; // 0 = tengah malam, 0.25 = pagi, 0.5 = siang, 0.75 = sore
    this.daySpeed = 0.00005; // kecepatan waktu

    // Interaksi
    this.nearbyNpc = null;
    this.dialogueBox = null;
    this.inventory = { timun: 0, hati: 0 };

    // Input
    this.keys = {};

    // Loop
    this.lastTime = 0;
    this.animId = null;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  // ---------- Setup ----------
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Buat peta default (desa wayang)
  createDefaultMap() {
    const w = 40, h = 30;
    this.mapWidth = w;
    this.mapHeight = h;
    this.map = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        // Default grass
        let tile = TILE.GRASS;
        // Border trees
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tile = TILE.TREE;
        // Water pond di tengah
        if (x >= 15 && x <= 20 && y >= 12 && y <= 16) tile = TILE.WATER;
        // Path dari tengah ke bawah
        if (x === 20 && y >= 17 && y <= 28) tile = TILE.PATH;
        // Path horizontal
        if (y === 17 && x >= 10 && x <= 30) tile = TILE.PATH;
        // Farm plots di kiri
        if (x >= 3 && x <= 8 && y >= 3 && y <= 8) tile = TILE.FARM;
        // House di kanan atas
        if (x >= 30 && x <= 33 && y >= 3 && y <= 6) tile = TILE.HOUSE;
        // NPC spots
        if (x === 20 && y === 10) tile = TILE.NPC_SPOT;
        if (x === 5 && y === 15) tile = TILE.NPC_SPOT;
        if (x === 32 && y === 15) tile = TILE.NPC_SPOT;
        row.push(tile);
      }
      this.map.push(row);
    }

    // Posisi awal pemain
    this.player.x = 20 * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = 18 * TILE_SIZE + TILE_SIZE / 2;

    // NPC
    this.npcs = [
      { id: 'kancil', name: 'Si Kancil', x: 20 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE + TILE_SIZE / 2, color: '#fbbf24', dialogue: 'Halo! Aku Si Kancil. Mau bermain?' },
      { id: 'pak-tani', name: 'Pak Tani', x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 15 * TILE_SIZE + TILE_SIZE / 2, color: '#22c55e', dialogue: 'Selamat datang di kebunku! Tanam timun di sini.' },
      { id: 'macan', name: 'Macan', x: 32 * TILE_SIZE + TILE_SIZE / 2, y: 15 * TILE_SIZE + TILE_SIZE / 2, color: '#ef4444', dialogue: 'Grrr... Jangan ganggu aku!' },
    ];

    // Farm plots
    for (let y = 3; y <= 8; y++) {
      for (let x = 3; x <= 8; x++) {
        this.farmPlots.push({ x, y, crop: null, stage: 0, plantedAt: null });
      }
    }
  }

  // ---------- Collision ----------
  isSolid(tile) {
    return tile === TILE.TREE || tile === TILE.WATER || tile === TILE.ROCK || tile === TILE.HOUSE;
  }

  getTileAt(px, py) {
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return TILE.TREE;
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
      this.dialogueBox = { npc: this.nearbyNpc, text: this.nearbyNpc.dialogue };
    } else {
      // Cek farm plot terdekat
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
      if (Math.abs(plot.x - tx) <= 1 && Math.abs(plot.y - ty) <= 1) {
        return plot;
      }
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

    // Collision check
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

    // Clamp to map bounds
    p.x = Math.max(this.tileSize, Math.min((this.mapWidth - 1) * this.tileSize, p.x));
    p.y = Math.max(this.tileSize, Math.min((this.mapHeight - 1) * this.tileSize, p.y));

    // Animation frame
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

    // Kamera mengikuti pemain
    const camX = p.x - this.canvas.width / 2;
    const camY = p.y - this.canvas.height / 2;
    this.camera.x += (camX - this.camera.x) * 0.1;
    this.camera.y += (camY - this.camera.y) * 0.1;

    // Update farm growth
    this.updateFarmGrowth();

    // NPC proximity check
    this.nearbyNpc = null;
    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.x - p.x, npc.y - p.y);
      if (dist < this.tileSize * 1.5) {
        this.nearbyNpc = npc;
        break;
      }
    }

    // Siklus siang/malam
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

        // Tile background
        ctx.fillStyle = TILE_COLORS[tile] || '#3a5a2a';
        ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // Detail tile
        if (tile === TILE.TREE) {
          ctx.fillStyle = '#1a3a0a';
          ctx.beginPath();
          ctx.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TILE.WATER) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
        } else if (tile === TILE.FARM) {
          // Cek apakah ada plot
          const plot = this.farmPlots.find((pl) => pl.x === tx && pl.y === ty);
          if (plot && plot.stage > 0) {
            const emojis = ['🌱', '🌿', '🥒'];
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.fillText(emojis[plot.stage - 1] || '🌱', px + this.tileSize / 2, py + this.tileSize / 2 + 8);
          }
        } else if (tile === TILE.HOUSE) {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('🏠', px + this.tileSize / 2, py + this.tileSize / 2 + 4);
        } else if (tile === TILE.NPC_SPOT) {
          ctx.fillStyle = 'rgba(255,213,79,0.15)';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }
      }
    }

    // Gambar NPC
    for (const npc of this.npcs) {
      const nx = npc.x - this.camera.x;
      const ny = npc.y - this.camera.y;
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(nx, ny - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.ellipse(nx, ny + 4, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nama
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, nx, ny - 24);
    }

    // Gambar pemain
    this.drawPlayer(ctx);

    // Overlay siang/malam
    this.drawDayNightOverlay(ctx, w, h);

    // HUD
    this.drawHUD(ctx, w, h);

    // Dialogue box
    if (this.dialogueBox) {
      this.drawDialogue(ctx, w, h);
    }
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

    // Body
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px, py - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    ctx.fillStyle = '#141414';
    const dirOffsets = { up: [0, -16], down: [0, 4], left: [-8, -4], right: [8, -4] };
    const [ox, oy] = dirOffsets[p.direction] || [0, -16];
    ctx.beginPath();
    ctx.arc(px + ox, py + oy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Walking animation (bobbing)
    if (p.isMoving) {
      const bob = Math.sin(p.frame * Math.PI / 2) * 2;
      ctx.translate(0, bob);
    }
  }

  drawDayNightOverlay(ctx, w, h) {
    const t = this.timeOfDay;
    // t=0: midnight (dark), t=0.25: morning, t=0.5: noon, t=0.75: evening
    let alpha = 0;
    let color = '0,0,0';
    if (t < 0.25) {
      // Midnight to morning: fade out darkness
      alpha = 0.5 * (1 - t / 0.25);
      color = '0,0,0';
    } else if (t > 0.75) {
      // Evening to midnight: fade in darkness
      alpha = 0.5 * ((t - 0.75) / 0.25);
      color = '0,0,0';
    } else if (t > 0.5 && t <= 0.75) {
      // Afternoon to evening: warm tint
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

    // Waktu
    const hour = Math.floor(this.timeOfDay * 24);
    const minute = Math.floor((this.timeOfDay * 24 - hour) * 60);
    ctx.fillText(`Waktu: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, 20, 80);

    // Interaksi hint
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

    // ESC hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC] Kembali ke Lobby', w - 10, h - 10);
    ctx.textAlign = 'left';
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