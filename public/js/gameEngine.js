// Wayang Kancil - Canvas renderer & game loop (Phase 3)
// Estetika wayang kulit: latar parchment Kelir, siluet hitam, drop shadow Blencong.

// Gaya item berdasarkan jenis (dipengaruhi oleh musim, Phase 8.7)
const ITEM_STYLES = {
  cucumber: { color: '#c0a000', highlight: '#e8d040' },
  mushroom: { color: '#9333ea', highlight: '#c084fc' },
  cactus:   { color: '#22c55e', highlight: '#4ade80' },
  berry:    { color: '#ef4444', highlight: '#fca5a5' },
  melon:    { color: '#10b981', highlight: '#34d399' },
  leaf:     { color: '#84cc16', highlight: '#a3e635' },
};

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
    this.defaultItemType = 'cucumber'; // jenis item default, diatur oleh musim (Phase 8.7)
    this.currentSeason = null; // { id, label, itemTypes, spawnRateMultiplier, itemValueMultiplier, bgColor, icon }

    // Loop
    this.lastTime = 0;
    this.animId = null;

    // Transisi scene (Phase 8.4)
    this.transition = null; // { type: 'fade'|'wipe', progress: 0->1, direction: 'in'|'out', onComplete }

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

  setItemType(itemType) {
    this.defaultItemType = itemType;
  }

  setSeason(seasonId, seasonInfo) {
    this.currentSeason = { id: seasonId, ...seasonInfo };
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

    // Overlay warna musim (Phase 8.7 — perbaikan dari prototype)
    if (this.currentSeason && this.currentSeason.bgColor) {
      const seasonOverlay = 0.12 + Math.sin(time * 0.002) * 0.04;
      ctx.fillStyle = `${this.currentSeason.bgColor}${'0A'.repeat(Math.round(seasonOverlay * 255) / 255)}`;
      // Use rgba for proper alpha
      const rgb = this.hexToRgba(this.currentSeason.bgColor, seasonOverlay);
      ctx.fillStyle = rgb;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Helper: konversi hex ke rgba
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
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

    // Karakter wayang berbeda — siluet disesuaikan (Phase 8.3)
    if (p.character === 'siput') {
      this.drawSiputSilhouette(ctx, s, t, moving);
    } else if (p.character === 'serigala') {
      this.drawSerigalaSilhouette(ctx, s, t, moving);
    } else {
      this.drawStandardSilhouette(ctx, s, t, moving);
    }

    ctx.restore();

    // Nama pemain di bawah siluet
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    const charScale = p.character === 'siput' ? 0.7 : p.character === 'serigala' ? 1.3 : 1;
    ctx.fillText(p.name, p.x, p.y - s * 1.1 * charScale - 6);
  }

  // ---------- Siluet wayang standar (Kancil, Pak Tani, Macan, Buaya) ----------
  drawStandardSilhouette(ctx, s, t, moving) {
    // Kepala
    ctx.save();
    ctx.translate(0, -s * 0.55);
    ctx.rotate(moving ? t * 0.1 : 0);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.45, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kiri
    ctx.save();
    ctx.translate(-s * 0.3, s * 0.2);
    ctx.rotate(moving ? t * 0.5 : t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kanan
    ctx.save();
    ctx.translate(s * 0.3, s * 0.2);
    ctx.rotate(moving ? -t * 0.5 : -t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.15, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tubuh
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.35, s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.9);
    ctx.lineTo(-s * 0.5, s * 0.9);
    ctx.closePath();
    ctx.fill();

    // Tangan kanan saat moving
    if (moving) {
      ctx.beginPath();
      ctx.arc(s * 0.45, s * 0.35, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Siluet Siput (kecil, lingkar, rahang di bawah) ----------
  drawSiputSilhouette(ctx, s, t, moving) {
    const ss = s * 0.65; // lebih kecil
    // Kepala kecil
    ctx.save();
    ctx.translate(0, -ss * 0.5);
    ctx.rotate(moving ? t * 0.05 : 0);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.4, ss * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Badan/lengan (simpel, melengkung)
    ctx.save();
    ctx.translate(-ss * 0.25, ss * 0.15);
    ctx.rotate(moving ? t * 0.3 : t * 0.05);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.12, ss * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(ss * 0.25, ss * 0.15);
    ctx.rotate(moving ? -t * 0.3 : -t * 0.05);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.12, ss * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tubuh kerongkong (lingkar di bawah)
    ctx.beginPath();
    ctx.ellipse(0, ss * 0.55, ss * 0.5, ss * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- Siluet Serigala (biasa, tubuh lonjong, tekad) ----------
  drawSerigalaSilhouette(ctx, s, t, moving) {
    const ss = s * 1.15; // lebih besar
    // Kepala lonjong ke depan
    ctx.save();
    ctx.translate(0, -ss * 0.5);
    ctx.rotate(moving ? t * 0.15 : 0);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.5, ss * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kiri (tegang)
    ctx.save();
    ctx.translate(-ss * 0.35, ss * 0.2);
    ctx.rotate(moving ? t * 0.6 : t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.18, ss * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lengan kanan
    ctx.save();
    ctx.translate(ss * 0.35, ss * 0.2);
    ctx.rotate(moving ? -t * 0.6 : -t * 0.1);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.ellipse(0, 0, ss * 0.18, ss * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tubuh lebar dan tegak
    ctx.beginPath();
    ctx.moveTo(-ss * 0.4, ss * 0.05);
    ctx.lineTo(ss * 0.4, ss * 0.05);
    ctx.lineTo(ss * 0.55, ss * 1.0);
    ctx.lineTo(-ss * 0.55, ss * 1.0);
    ctx.closePath();
    ctx.fill();

    // Ekor serigala (mengunci di belakang)
    if (moving) {
      ctx.beginPath();
      ctx.arc(-ss * 0.45, ss * 0.4, ss * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawItems(ctx) {
    for (const item of this.items) {
      const type = item.type || 'cucumber';
      // Warna & bentuk bervariasi berdasarkan jenis item & musim (Phase 8.7)
      const style = ITEM_STYLES[type] || ITEM_STYLES.cucumber;

      // Efek glow untuk item bonus hasil panen kebun (Phase 8.6)
      if (item.farmBonus) {
        const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.save();
        ctx.shadowColor = style.highlight;
        ctx.shadowBlur = 12 * pulse;
        ctx.globalAlpha = 0.9;
      }

      ctx.fillStyle = style.color;
      ctx.beginPath();
      if (type === 'cactus' || type === 'berry') {
        ctx.rect(item.x - 6, item.y - 6, 12, 12);
      } else if (type === 'leaf') {
        ctx.ellipse(item.x, item.y, 7, 9, Math.PI / 4, 0, Math.PI * 2);
      } else if (type === 'mushroom') {
        ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
      } else {
        ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      }
      ctx.fill();

      // Highlight kecil di atas item
      ctx.fillStyle = style.highlight;
      ctx.beginPath();
      ctx.arc(item.x - 2, item.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      if (item.farmBonus) {
        ctx.restore();
      }
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

    // Indikator musim di canvas (Phase 8.7)
    if (this.currentSeason) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${this.currentSeason.icon} ${this.currentSeason.label}`, 32, 82);
    }
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

  // ---------- Transisi scene (Phase 8.4) ----------
  startTransition({ type = 'fade', direction = 'in', duration = 500, onComplete = null } = {}) {
    this.transition = {
      type,
      direction,
      duration,
      progress: 0,
      startTime: performance.now(),
      onComplete,
    };
  }

  updateTransition(now) {
    if (!this.transition) return;
    const elapsed = now - this.transition.startTime;
    this.transition.progress = Math.min(elapsed / this.transition.duration, 1);

    if (this.transition.progress >= 1) {
      const cb = this.transition.onComplete;
      this.transition = null;
      if (cb) cb();
    }
  }

  drawTransition(ctx, w, h) {
    if (!this.transition) return;
    const { type, direction, progress } = this.transition;
    // progress 0 -> 1; for 'out' we invert visual
    const t = direction === 'out' ? 1 - progress : progress;

    ctx.save();
    ctx.globalAlpha = t;

    if (type === 'fade') {
      ctx.fillStyle = '#0b0b09';
      ctx.fillRect(0, 0, w, h);
    } else if (type === 'wipe') {
      // Wipe horizontal dari kiri ke kanan
      const cut = w * t;
      ctx.fillStyle = '#0b0b09';
      ctx.fillRect(0, 0, cut, h);
      // Cahaya blencong di tepi potong
      const glow = ctx.createLinearGradient(cut - 40, 0, cut + 40, 0);
      glow.addColorStop(0, 'rgba(255,213,79,0)');
      glow.addColorStop(0.5, 'rgba(255,213,79,0.35)');
      glow.addColorStop(1, 'rgba(255,213,79,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(Math.max(0, cut - 40), 0, 80, h);
    }

    ctx.restore();
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

    this.updateTransition(now);
    this.drawTransition(ctx, w, h);

    this.animId = requestAnimationFrame(this.loop);
  }

  // ---------- Items (cucumber / timun) ----------
  spawnItems(count = 8, itemType = 'cucumber', farmBonus = false) {
    this.items = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < count; i++) {
      this.items.push({
        id: `item-${Date.now()}-${i}`,
        x: 100 + Math.random() * (w - 200),
        y: 100 + Math.random() * (h - 200),
        type: itemType,
        collected: false,
        farmBonus, // item dari hasil panen kebun — diberi efek visual (Phase 8.6)
      });
    }
  }

  spawnSingleItem(itemType = 'cucumber', farmBonus = false) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.items.push({
      id: `item-${Date.now()}-${Math.random()}`,
      x: 100 + Math.random() * (w - 200),
      y: 100 + Math.random() * (h - 200),
      type: itemType,
      collected: false,
      farmBonus,
    });
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

    // Re-spawn agar jumlah item aktif tetap minimal 4 (mengikuti jenis item musim)
    while (this.items.filter((i) => !i.collected).length < 4) {
      this.spawnItems(1, this.defaultItemType);
    }

    return collected;
  }

  // Compat dengan pemanggilan lama dari main.js
  spawnMockItems(count = 6) {
    this.spawnItems(count);
  }
}
