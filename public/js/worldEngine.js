// Wayang Kancil - Open World Engine (Harvest Moon style)
// Peta dunia, gerakan pemain, NPC bergerak bebas, kebun, siklus siang/malam
// Icon gambar asli + rumput 3D + tombol menu + modal konfirmasi tantangan

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
  CHALLENGE: 9, // zona tantangan
  LOCKED: 10,   // jalan terkunci (belum lolos tantangan)
};

const TILE_SIZE = 48;

export default class WorldEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.tileSize = TILE_SIZE;

    this.map = [];
    this.mapWidth = 0;
    this.mapHeight = 0;

    this.player = {
      x: 0, y: 0, speed: 3, direction: 'down',
      isMoving: false, frame: 0, frameTimer: 0,
    };

    this.camera = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 2.0;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.cameraStart = { x: 0, y: 0 };

    this.npcs = [];
    this.farmPlots = [];

    this.timeOfDay = 0.25;
    this.daySpeed = 0.00005;

    this.nearbyNpc = null;
    this.nearbyChallenge = null;
    this.dialogueBox = null;
    this.modalBox = null; // modal konfirmasi tantangan
    this.inventory = { timun: 0, hati: 0 };

    this.keys = {};
    this.lastTime = 0;
    this.animId = null;

    this.puppetImages = {};
    this.loadPuppetImages();

    this.menuButton = { x: 0, y: 0, w: 120, h: 36 };
    this.onMenuClick = null;
    this.onNpcTalk = null;
    this.onChallengeApprove = null;
    this.onChallengeCancel = null;

    this.completedChallenges = new Set();

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
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
      'pak-tani': '/assets/puppets/pak-tani.png',
      macan: '/assets/puppets/macan.png',
      siput: '/assets/puppets/siput.png',
      serigala: '/assets/puppets/serigala.png',
      elang: '/assets/puppets/elang.png',
      beruang: '/assets/puppets/beruang.png',
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
        if (r > 230 && g > 230 && b > 230) data[i + 3] = 0;
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
    const w = 60, h = 40;
    this.mapWidth = w;
    this.mapHeight = h;
    this.map = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        let tile = 0; // grass
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tile = 4; // tree border
        // Water pond (kolam)
        if (x >= 25 && x <= 32 && y >= 18 && y <= 24) tile = 2;
        // Path
        if (y === 28 && x >= 5 && x <= 55) tile = 3;
        if (x === 30 && y >= 28 && y <= 38) tile = 3;
        if (x === 15 && y >= 5 && y <= 28) tile = 3;
        if (x === 45 && y >= 5 && y <= 28) tile = 3;
        // Farm area
        if (x >= 3 && x <= 12 && y >= 3 && y <= 12) tile = 6;
        // House
        if (x >= 48 && x <= 52 && y >= 3 && y <= 7) tile = 7;
        // Challenge zones (zona tantangan)
        if (x >= 24 && x <= 27 && y >= 15 && y <= 17) tile = 9; // tantangan buaya (kolam)
        if (x >= 38 && x <= 42 && y >= 15 && y <= 17) tile = 9; // tantangan macan
        if (x >= 10 && x <= 14 && y >= 20 && y <= 22) tile = 9; // tantangan siput
        // Locked paths (jalan terkunci)
        if (x >= 28 && x <= 32 && y >= 10 && y <= 14) tile = 10; // jalan ke area berikutnya (terkunci sampai lolos tantangan)
        row.push(tile);
      }
      this.map.push(row);
    }

    this.player.x = 30 * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = 30 * TILE_SIZE + TILE_SIZE / 2;

    // NPC dengan area patrol (bergerak bebas dalam area)
    this.npcs = [
      {
        id: 'pak-tani', name: 'Pak Tani',
        x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 8 * TILE_SIZE + TILE_SIZE / 2,
        color: '#22c55e', image: 'pak-tani', dialogue: 'Selamat datang di kebunku! Tanam timun di sini.',
        patrol: { x1: 3, y1: 3, x2: 12, y2: 12 },
        vx: 0.5, vy: 0.5,
        episodeId: null,
      },
      {
        id: 'macan', name: 'Macan',
        x: 40 * TILE_SIZE + TILE_SIZE / 2, y: 16 * TILE_SIZE + TILE_SIZE / 2,
        color: '#ef4444', image: 'macan', dialogue: 'Grrr... Jangan ganggu aku!',
        patrol: { x1: 38, y1: 14, x2: 44, y2: 20 },
        vx: -0.8, vy: 0.3,
        episodeId: 'ep-2',
      },
      {
        id: 'buaya', name: 'Buaya',
        x: 28 * TILE_SIZE + TILE_SIZE / 2, y: 20 * TILE_SIZE + TILE_SIZE / 2,
        color: '#10b981', image: 'buaya', dialogue: 'Hati-hati di sungai! Aku bukan musuh.',
        patrol: { x1: 24, y1: 18, x2: 32, y2: 24 },
        vx: 0.6, vy: -0.4,
        episodeId: 'ep-1',
      },
      {
        id: 'siput', name: 'Siput',
        x: 12 * TILE_SIZE + TILE_SIZE / 2, y: 21 * TILE_SIZE + TILE_SIZE / 2,
        color: '#a3e635', image: 'siput', dialogue: 'Lomba lari? Ayo!',
        patrol: { x1: 10, y1: 20, x2: 14, y2: 22 },
        vx: 0.3, vy: 0.2,
        episodeId: 'ep-3',
      },
    ];

    for (let y = 3; y <= 12; y++) {
      for (let x = 3; x <= 12; x++) {
        this.farmPlots.push({ x, y, crop: null, stage: 0, plantedAt: null });
      }
    }

    // Challenge zones
    this.challenges = [
      { id: 'ch-buaya', tileX: 25, tileY: 16, episodeId: 'ep-1', name: 'Tantangan Buaya', completed: false, radius: 3 },
      { id: 'ch-macan', tileX: 40, tileY: 16, episodeId: 'ep-2', name: 'Tantangan Macan', completed: false, radius: 3 },
      { id: 'ch-siput', tileX: 12, tileY: 21, episodeId: 'ep-3', name: 'Tantangan Siput', completed: false, radius: 3 },
    ];
  }

  // ---------- Collision ----------
  isSolid(tile) {
    return tile === 4 || tile === 2 || tile === 5 || tile === 7 || tile === 10;
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

  // ---------- Mouse drag & zoom ----------
  handleMouseDown(e) {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.cameraStart = { x: this.camera.x, y: this.camera.y };
    this.canvas.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    const dx = (e.clientX - this.dragStart.x) / this.zoom;
    const dy = (e.clientY - this.dragStart.y) / this.zoom;
    this.camera.x = this.cameraStart.x - dx;
    this.camera.y = this.cameraStart.y - dy;
  }

  handleMouseUp(e) {
    if (this.isDragging && e) {
      const dx = Math.abs(e.clientX - this.dragStart.x);
      const dy = Math.abs(e.clientY - this.dragStart.y);
      if (dx < 5 && dy < 5) {
        // Cek modal buttons
        if (this.modalBox && this.modalButtons) {
          const ab = this.modalButtons.approve;
          const cb = this.modalButtons.cancel;
          if (e.clientX >= ab.x && e.clientX <= ab.x + ab.w &&
              e.clientY >= ab.y && e.clientY <= ab.y + ab.h) {
            const challenge = this.approveChallenge();
            if (challenge && this.onChallengeApprove) {
              this.onChallengeApprove(challenge);
            }
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            return;
          }
          if (e.clientX >= cb.x && e.clientX <= cb.x + cb.w &&
              e.clientY >= cb.y && e.clientY <= cb.y + cb.h) {
            this.cancelChallenge();
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            return;
          }
        }
        // Cek menu button
        const btn = this.menuButton;
        if (e.clientX >= btn.x && e.clientX <= btn.x + btn.w &&
            e.clientY >= btn.y && e.clientY <= btn.y + btn.h) {
          if (this.onMenuClick) this.onMenuClick();
        }
      }
    }
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const worldX = (mouseX / this.zoom) + this.camera.x;
    const worldY = (mouseY / this.zoom) + this.camera.y;
    this.zoom = newZoom;
    this.camera.x = worldX - (mouseX / this.zoom);
    this.camera.y = worldY - (mouseY / this.zoom);
  }

  // ---------- Interaksi ----------
  interact() {
    if (this.modalBox) {
      // Modal sedang tampil, jangan interaksi lagi
      return;
    }
    if (this.dialogueBox) {
      this.dialogueBox = null;
      return;
    }
    if (this.nearbyNpc) {
      // Jika ada callback AI dialogue, gunakan; jika tidak, pakai dialogue statis
      if (this.onNpcDialogue) {
        this.dialogueBox = { npc: this.nearbyNpc, text: '...' , loading: true };
        this.onNpcDialogue(this.nearbyNpc);
      } else {
        this.dialogueBox = { npc: this.nearbyNpc, text: this.nearbyNpc.dialogue };
      }
      return;
    }
    // Cek challenge zone terdekat
    const challenge = this.getNearbyChallenge();
    if (challenge && !challenge.completed) {
      this.modalBox = {
        title: challenge.name,
        text: `Apakah kamu ingin melanjutkan tantangan "${challenge.name}"?`,
        challenge: challenge,
      };
      return;
    }
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

  getNearbyFarmPlot() {
    const p = this.player;
    const tx = Math.floor(p.x / this.tileSize);
    const ty = Math.floor(p.y / this.tileSize);
    for (const plot of this.farmPlots) {
      if (Math.abs(plot.x - tx) <= 1 && Math.abs(plot.y - ty) <= 1) return plot;
    }
    return null;
  }

  getNearbyChallenge() {
    const p = this.player;
    const tx = Math.floor(p.x / this.tileSize);
    const ty = Math.floor(p.y / this.tileSize);
    for (const ch of this.challenges) {
      if (ch.completed) continue;
      if (Math.abs(ch.tileX - tx) <= ch.radius && Math.abs(ch.tileY - ty) <= ch.radius) {
        return ch;
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

  // Approve challenge (dipanggil dari main.js)
  approveChallenge() {
    if (!this.modalBox) return null;
    const challenge = this.modalBox.challenge;
    this.modalBox = null;
    return challenge;
  }

  cancelChallenge() {
    this.modalBox = null;
  }

  completeChallenge(challengeId) {
    const ch = this.challenges.find((c) => c.id === challengeId);
    if (ch) {
      ch.completed = true;
      this.completedChallenges.add(challengeId);
      // Buka jalan terkunci
      for (let y = 0; y < this.mapHeight; y++) {
        for (let x = 0; x < this.mapWidth; x++) {
          if (this.map[y][x] === 10) {
            this.map[y][x] = 3; // buka jalan
          }
        }
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

    const camX = p.x - (this.canvas.width / 2) / this.zoom;
    const camY = p.y - (this.canvas.height / 2) / this.zoom;
    this.camera.x += (camX - this.camera.x) * 0.1;
    this.camera.y += (camY - this.camera.y) * 0.1;

    this.updateFarmGrowth();

    // NPC bergerak bebas dalam area patrol
    for (const npc of this.npcs) {
      if (!npc.patrol) continue;
      const p1x = npc.patrol.x1 * this.tileSize;
      const p1y = npc.patrol.y1 * this.tileSize;
      const p2x = npc.patrol.x2 * this.tileSize;
      const p2y = npc.patrol.y2 * this.tileSize;

      npc.x += npc.vx;
      npc.y += npc.vy;

      // Bounce di batas area
      if (npc.x <= p1x || npc.x >= p2x) {
        npc.vx = -npc.vx;
        npc.x = Math.max(p1x, Math.min(p2x, npc.x));
      }
      if (npc.y <= p1y || npc.y >= p2y) {
        npc.vy = -npc.vy;
        npc.y = Math.max(p1y, Math.min(p2y, npc.y));
      }
    }

    this.nearbyNpc = null;
    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.x - p.x, npc.y - p.y);
      if (dist < this.tileSize * 1.5) {
        this.nearbyNpc = npc;
        break;
      }
    }

    this.nearbyChallenge = this.getNearbyChallenge();

    this.timeOfDay = (this.timeOfDay + this.daySpeed) % 1;
  }

  // ---------- Drawing ----------
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.scale(this.zoom, this.zoom);

    const startX = Math.floor(this.camera.x / this.tileSize);
    const startY = Math.floor(this.camera.y / this.tileSize);
    const endX = startX + Math.ceil(w / (this.tileSize * this.zoom)) + 2;
    const endY = startY + Math.ceil(h / (this.tileSize * this.zoom)) + 2;

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) continue;
        const tile = this.map[ty][tx];
        const px = tx * this.tileSize - this.camera.x;
        const py = ty * this.tileSize - this.camera.y;

        if (tile === 0) {
          const grad = ctx.createLinearGradient(px, py, px, py + this.tileSize);
          grad.addColorStop(0, '#4a7a3a');
          grad.addColorStop(0.5, '#3a6a2a');
          grad.addColorStop(1, '#2a5a1a');
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
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
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(px, py + this.tileSize - 4, this.tileSize, 4);
        } else {
          const colors = { 1: '#5d4037', 2: '#1a3a5a', 3: '#8b7355', 4: '#2d4a1a', 5: '#6b6b6b', 6: '#4a3a1a', 7: '#5a3a2a', 8: '#4a4a2a', 9: '#6a4a2a', 10: '#3a3a3a' };
          ctx.fillStyle = colors[tile] || '#3a5a2a';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          if (tile === 4) {
            ctx.fillStyle = '#1a3a0a';
            ctx.beginPath();
            ctx.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + this.tileSize / 2 - 3, py + this.tileSize / 2, 6, this.tileSize / 2);
          } else if (tile === 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            const shimmer = Math.sin(Date.now() * 0.003 + tx + ty) * 0.1 + 0.1;
            ctx.fillStyle = `rgba(100,180,255,${shimmer})`;
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          } else if (tile === 6) {
            const plot = this.farmPlots.find((pl) => pl.x === tx && pl.y === ty);
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            if (plot && plot.stage > 0) {
              const emojis = ['🌱', '🌿', '🥒'];
              ctx.font = '24px serif';
              ctx.textAlign = 'center';
              ctx.fillText(emojis[plot.stage - 1] || '🌱', px + this.tileSize / 2, py + this.tileSize / 2 + 8);
            }
          } else if (tile === 7) {
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏠', px + this.tileSize / 2, py + this.tileSize / 2 + 6);
          } else if (tile === 8) {
            ctx.fillStyle = 'rgba(255,213,79,0.12)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          } else if (tile === 3) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
          } else if (tile === 9) {
            // Challenge zone
            ctx.fillStyle = 'rgba(255,100,50,0.2)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.fillStyle = '#f97316';
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚔️', px + this.tileSize / 2, py + this.tileSize / 2 + 6);
          } else if (tile === 10) {
            // Locked path
            ctx.fillStyle = 'rgba(100,100,100,0.5)';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', px + this.tileSize / 2, py + this.tileSize / 2 + 6);
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
        // Animasi bobbing untuk NPC
        const bob = Math.sin(Date.now() * 0.003 + npc.x) * 2;
        ctx.drawImage(img, nx - 24, ny - 48 + bob, 48, 48);
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
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, nx, ny - 52);
    }

    // Gambar pemain (kancil)
    this.drawPlayer(ctx);

    ctx.restore();

    // Overlay siang/malam
    this.drawDayNightOverlay(ctx, w, h);

    // HUD
    this.drawHUD(ctx, w, h);

    // Dialogue box
    if (this.dialogueBox) {
      this.drawDialogue(ctx, w, h);
    }

    // Modal konfirmasi tantangan
    if (this.modalBox) {
      this.drawModal(ctx, w, h);
    }

    // Menu button
    this.drawMenuButton(ctx, w, h);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const px = p.x - this.camera.x;
    const py = p.y - this.camera.y;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = this.puppetImages['kancil'];
    if (img) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      const bob = p.isMoving ? Math.sin(p.frame * Math.PI / 2) * 3 : 0;
      const sway = p.isMoving ? Math.sin(p.frame * Math.PI / 2) * 0.08 : 0;
      ctx.translate(0, bob);
      ctx.rotate(sway);
      if (p.direction === 'left') ctx.scale(-1, 1);
      ctx.drawImage(img, px - 24, py - 48, 48, 48);
      ctx.restore();
    } else {
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
    ctx.fillRect(10, 10, 220, 90);
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
    ctx.fillText(`Zoom: ${this.zoom.toFixed(1)}x`, 20, 95);

    if (this.nearbyNpc) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[SPACE] Bicara dengan ${this.nearbyNpc.name}`, w / 2, h - 20);
      ctx.textAlign = 'left';
    } else if (this.nearbyChallenge && !this.nearbyChallenge.completed) {
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[SPACE] ${this.nearbyChallenge.name}`, w / 2, h - 20);
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
    if (this.dialogueBox.loading) {
      ctx.fillText('...', 40, boxY + 50);
      // Animasi loading dots
      const dots = '.'.repeat(Math.floor(Date.now() / 300) % 4);
      ctx.fillText('Memuat' + dots, 40, boxY + 70);
    } else {
      const lines = this.wrapText(ctx, this.dialogueBox.text, w - 80);
      let yy = boxY + 50;
      for (const line of lines) {
        ctx.fillText(line, 40, yy);
        yy += 20;
      }
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('Tekan SPACE/ENTER untuk menutup', 40, boxY + boxH - 10);
  }

  // Modal konfirmasi tantangan
  drawModal(ctx, w, h) {
    // Background overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    // Modal box
    const boxW = 400;
    const boxH = 180;
    const boxX = (w - boxW) / 2;
    const boxY = (h - boxH) / 2;

    ctx.fillStyle = 'rgba(20,15,10,0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Title
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.modalBox.title, w / 2, boxY + 35);

    // Text
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '13px monospace';
    const lines = this.wrapText(ctx, this.modalBox.text, boxW - 40);
    let yy = boxY + 65;
    for (const line of lines) {
      ctx.fillText(line, w / 2, yy);
      yy += 20;
    }

    // Buttons
    const btnY = boxY + boxH - 45;
    const btnW = 120;
    const btnH = 32;

    // Approve button
    const approveX = w / 2 - btnW - 10;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(approveX, btnY, btnW, btnH);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Lanjutkan', approveX + btnW / 2, btnY + btnH / 2 + 4);

    // Cancel button
    const cancelX = w / 2 + 10;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cancelX, btnY, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Batal', cancelX + btnW / 2, btnY + btnH / 2 + 4);

    ctx.textAlign = 'left';

    // Store button bounds for click detection
    this.modalButtons = {
      approve: { x: approveX, y: btnY, w: btnW, h: btnH },
      cancel: { x: cancelX, y: btnY, w: btnW, h: btnH },
    };
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
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }
}