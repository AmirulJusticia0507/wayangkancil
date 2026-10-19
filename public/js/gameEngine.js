// Wayang Kancil - Canvas renderer & game loop (Phase 3)
// Estetika wayang kulit: latar parchment Kelir, siluet hitam, drop shadow Blencong.

export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Interpolasi gerakan (smooth movement)
    this.players = new Map();      // id -> { id, name, character, x, y, targetX, targetY, direction, actionState, vx, vy }
    this.items = [];               // { x, y, type } (cucumber placeholders)
    this.effects = [];             // { type, x, y, ttl, maxTtl } (ability visual effects)
    this.roomId = null;
    this.parallaxOffset = 0; // untuk gerakan latar parallax

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

    // Parallax layers — layar bayangan Kelir yang bergerak bertingkat
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.07)';
    ctx.lineWidth = 2;
    for (let layer = 1; layer <= 3; layer++) {
      const offset = (this.parallaxOffset * layer * 0.25) % w;
      ctx.beginPath();
      ctx.moveTo(offset - w, 0);
      ctx.lineTo(offset - w, h);
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, h);
      ctx.moveTo(offset + w, 0);
      ctx.lineTo(offset + w, h);
      ctx.stroke();
    }

    // Blencong glow yang lebih dramatis dengan efek berkedip (lamp pulse)
    const lampPulse = 0.85 + Math.sin(time * 0.003) * 0.15;
    const glowGrad = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, 400);
    glowGrad.addColorStop(0, `rgba(255, 213, 79, ${0.4 * lampPulse})`);
    glowGrad.addColorStop(0.2, `rgba(255, 213, 79, ${0.18 * lampPulse})`);
    glowGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Bayangan Kelir lembut yang berkedip (shadow flicker)
    const flicker = 0.85 + Math.sin(time * 0.005) * 0.08;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * flicker})`;
    ctx.fillRect(0, 0, w, h);

    // Vignette bayangan di tepi (kedalaman wayang)
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  drawWayangSilhouette(ctx, p, now) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.direction === 'left') ctx.scale(-1, 1);

    const s = 34; // ukuran dasar wayang

    // 3D tilt berdasarkan arah gerakan (kedalaman wayang)
    const tiltY = p.direction === 'left' ? -8 : 8;
    ctx.transform(1, 0, Math.tan(tiltY * Math.PI / 180) * 0.1, 1, 0, 0);

    // Shadow drop (efek Bayangan di balik wayang)
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;

    const t = Math.sin(now * 0.004); // animasi joint halus
    const moving = p.actionState === 'moving';

    // Kepala wayang (lonjong ke atas) dengan nod saat bergerak
    ctx.save();
    ctx.translate(0, -s * 0.55);
    ctx.rotate(moving ? t * 0.1 : 0);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.45, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kiri (joint animation)
    ctx.save();
    ctx.translate(-s * 0.3, s * 0.2);
    ctx.rotate(moving ? t * 0.5 : t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kanan (joint animation, berseberangan dengan kiri)
    ctx.save();
    ctx.translate(s * 0.3, s * 0.2);
    ctx.rotate(moving ? -t * 0.5 : -t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tubuh wayang (taper ke bawah)
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.9);
    ctx.lineTo(-s * 0.5, s * 0.9);
    ctx.closePath();
    ctx.fill();

    // Tangan kanan saat moving (efek sentuhan)
    if (moving) {
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

  // ---------- Ability visual effects ----------
  addEffect({ type, x, y, ttl = 600 }) {
    this.effects.push({ type, x, y, ttl, maxTtl: ttl, createdAt: Date.now() });
  }

  drawEffects(ctx) {
    const now = Date.now();
    for (const e of this.effects) {
      const age = now - e.createdAt;
      const t = age / e.ttl;
      if (t >= 1) continue;

      const alpha = 1 - t;
      const scale = 1 + t * 2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y);

      if (e.type === 'sprint') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25 * scale, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'teleport') {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'snap') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 40 * scale, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'trap') {
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-14 * scale, -14 * scale, 28 * scale, 28 * scale);
      }

      ctx.restore();
    }

    // Hapus efek yang kadaluarsa
    this.effects = this.effects.filter((e) => {
      const age = Date.now() - e.createdAt;
      return age < e.ttl;
    });
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
    this.parallaxOffset += dt * 25;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    this.drawParchmentBackground(ctx, w, h, now);
    this.drawItems(ctx);
    this.drawEffects(ctx);
    this.drawHUD(ctx);

    for (const [id, p] of this.players.entries()) {
      this.interpolate(p, dt);
      this.drawWayangSilhouette(ctx, p, now);
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
