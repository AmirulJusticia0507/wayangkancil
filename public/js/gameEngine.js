// Wayang Kancil - Canvas renderer & game loop (Phase 3)
// Estetika wayang kulit: latar parchment Kelir, siluet hitam, drop shadow Blencong.

export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Interpolasi gerakan (smooth movement)
    this.players = new Map();      // id -> { id, name, character, x, y, targetX, targetY, direction, actionState, vx, vy }
    this.items = [];               // { x, y, type } (cucumber placeholders)
    this.roomId = null;

    // Loop
    this.lastTime = 0;
    this.animId = null;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setRoom(roomId) {
    this.roomId = roomId;
  }

  addPlayer(id, { name, character, x, y }) {
    this.players.set(id, {
      id,
      name,
      character,
      x,
      y,
      targetX: x,
      targetY: y,
      direction: 'right',
      actionState: 'idle',
      vx: 0,
      vy: 0,
    });
  }

  updatePlayer(id, { x, y, direction, actionState }) {
    const p = this.players.get(id);
    if (!p) return;
    // Set target untuk interpolasi; posisi lama dipertahankan agar gerakan halus
    p.targetX = x;
    p.targetY = y;
    p.direction = direction;
    p.actionState = actionState;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  // ---------- Drawing helpers ----------
  drawParchmentBackground(ctx, w, h, time) {
    // Latar Kelir / parchment wayang (cokelat keemunan)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2d1b10');
    grad.addColorStop(0.5, '#4a2e18');
    grad.addColorStop(1, '#2d1b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Blencong glow di pojok kanan atas (cahaya pelita)
    const glowGrad = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, 300);
    glowGrad.addColorStop(0, 'rgba(255, 213, 79, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Bayangan Kelir lembut yang berkedip (shadow flicker)
    const flicker = 0.85 + Math.sin(time * 0.005) * 0.08;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * flicker})`;
    ctx.fillRect(0, 0, w, h);
  }

  drawWayangSilhouette(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.direction === 'left') ctx.scale(-1, 1);

    const s = 34; // ukuran dasar wayang

    // Shadow drop (efek Bayangan di balik wayang)
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;

    // Kepala wayang (lonjong ke atas)
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.55, s * 0.45, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tubuh wayang (taper ke bawah)
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.9);
    ctx.lineTo(-s * 0.5, s * 0.9);
    ctx.closePath();
    ctx.fill();

    // Tangan kanan (tergantung karakter / action)
    if (p.actionState === 'moving') {
      ctx.beginPath();
      ctx.arc(s * 0.45, s * 0.35, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Nama pemain di bawah siluet
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - s * 1.1 - 6);
  }

  drawItems(ctx) {
    ctx.fillStyle = '#c0a000';
    for (const item of this.items) {
      ctx.beginPath();
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d040';
      ctx.beginPath();
      ctx.arc(item.x, item.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c0a000';
    }
  }

  drawHUD(ctx) {
    // HUD minimalis di canvas
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(16, 16, 220, 64);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('WAYANG KANCIL', 32, 40);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px monospace';
    ctx.fillText(`Room: ${this.roomId || '-'}`, 32, 62);
  }

  // ---------- Interpolasi (lerp) ----------
  interpolate(p, dt) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const t = Math.min(dt * 12, 1); // kecepatan peredaman
    p.x = lerp(p.x, p.targetX, t);
    p.y = lerp(p.y, p.targetY, t);
    p.vx = p.targetX - p.x;
    p.vy = p.targetY - p.y;
  }

  // ---------- Main loop ----------
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

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    this.drawParchmentBackground(ctx, w, h, now);
    this.drawItems(ctx);
    this.drawHUD(ctx);

    for (const [id, p] of this.players.entries()) {
      this.interpolate(p, dt);
      this.drawWayangSilhouette(ctx, p);
    }

    this.animId = requestAnimationFrame(this.loop);
  }

  // ---------- Items (cucumber / timun) ----------
  spawnItems(count = 8) {
    this.items = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < count; i++) {
      this.items.push({
        id: `item-${Date.now()}-${i}`,
        x: 100 + Math.random() * (w - 200),
        y: 100 + Math.random() * (h - 200),
        type: 'cucumber',
        collected: false,
      });
    }
  }

  // Deteksi tabrakan pemain dengan item. Mengembalikan daftar item id yang diambil.
  checkCollisions(playerId) {
    const p = this.players.get(playerId);
    if (!p) return [];

    const collected = [];
    const radius = 40; // jarak tabrakan (siluet wayang + item)

    for (const item of this.items) {
      if (item.collected) continue;
      const dx = p.x - item.x;
      const dy = p.y - item.y;
      if (dx * dx + dy * dy < radius * radius) {
        item.collected = true;
        collected.push(item.id);
      }
    }

    // Bersihkan item yang sudah diambil
    this.items = this.items.filter((i) => !i.collected);

    // Re-spawn agar jumlah item aktif tetap minimal 4
    while (this.items.filter((i) => !i.collected).length < 4) {
      this.spawnItems(1);
    }

    return collected;
  }

  // Compat dengan pemanggilan lama dari main.js
  spawnMockItems(count = 6) {
    this.spawnItems(count);
  }
}
