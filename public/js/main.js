// Wayang Kancil - Socket connection & UI handler (Phase 3 + Phase 6)
import GameEngine from './gameEngine.js';
import SoundManager from './sound.js';
import { getAllEpisodes } from './episodes.js';
import { NarrativeEngine } from './narrativeEngine.js';
import WorldEngine from './worldEngine.js';

// Vercel WebSocket connections must skip Socket.io's polling handshake so the
// entire connection remains pinned to one function instance.
const socket = io({ transports: ['websocket'] });
const sound = new SoundManager();

// ---------- DOM ----------
const lobby = document.getElementById('lobby');
const waitingRoom = document.getElementById('waitingRoom');
const gameContainer = document.getElementById('gameContainer');
const gameOver = document.getElementById('gameOver');
const narrativeScene = document.getElementById('narrativeScene');
const narrativeContainer = document.getElementById('narrativeContainer');
const piwulangScreen = document.getElementById('piwulangScreen');

const votePanel = document.getElementById('votePanel');
const voteOptions = document.getElementById('voteOptions');
const voteResults = document.getElementById('voteResults');
const piwulangTitle = document.getElementById('piwulangTitle');
const piwulangStory = document.getElementById('piwulangStory');
const piwulangMoral = document.getElementById('piwulangMoral');
const piwulangEnding = document.getElementById('piwulangEnding');
const piwulangStartBtn = document.getElementById('piwulangStartBtn');

const playerNameInput = document.getElementById('playerName');
const characterSelect = document.getElementById('characterSelect');
const episodeSelect = document.getElementById('episodeSelect');
const roomIdInput = document.getElementById('roomId');
const displayRoomId = document.getElementById('displayRoomId');
const statusMsg = document.getElementById('statusMsg');

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');
const startGameBtn = document.getElementById('startGameBtn');
const storyModeBtn = document.getElementById('storyModeBtn');
const startGameBtn2 = document.getElementById('startGameBtn2');
const playersList = document.getElementById('playersList');

const hudRoom = document.getElementById('hudRoom');
const hudCharacter = document.getElementById('hudCharacter');
const hudScore = document.getElementById('hudScore');
const hudTimer = document.getElementById('hudTimer');

const leaderboard = document.getElementById('leaderboard');
const leaderboardList = document.getElementById('leaderboardList');

const hudSeason = document.getElementById('hudSeason');
const hudSeasonLabel = document.getElementById('hudSeasonLabel');

let currentSeason = null; // { id, label, itemTypes, ... }

const finalScores = document.getElementById('finalScores');
const moralStory = document.getElementById('moralStory');
const playAgainBtn = document.getElementById('playAgainBtn');

// ---------- State ----------
let myPlayerId = null;
let myRoom = null;
let myCharacter = null;
let myEpisode = null;
let isHost = false;
let engine = null;
let narrative = null;
let score = 0;
let boostUntil = 0;
let lastAbility = 0;
let playerChoices = []; // { scene, choice, effect }
let isSoloMode = false; // Cerita sendiri tanpa room/multiplayer
let soloStoryQueue = []; // antrean episode yang akan diputar berurutan
let soloStoryIndex = 0; // indeks episode saat ini dalam antrean
let worldEngine = null; // Open world engine (Harvest Moon style)
let isOpenWorldMode = false; // Mode open world aktif

// ---------- Story Progress (Phase 7.3) ----------
const STORAGE_KEY = 'wayangkancil_progress';
let storyProgress = {}; // { episodeId: { completed: boolean, completedAt: string, ending: string } }

function loadStoryProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) storyProgress = JSON.parse(raw);
  } catch (e) {
    storyProgress = {};
  }
}

function saveStoryProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storyProgress));
  } catch (e) {
    // silent
  }
}

function markEpisodeCompleted(episodeId, ending) {
  storyProgress[episodeId] = {
    completed: true,
    completedAt: new Date().toISOString(),
    ending: ending || 'neutral',
  };
  saveStoryProgress();
}

function isEpisodeCompleted(episodeId) {
  return !!storyProgress[episodeId]?.completed;
}

// ---------- Adaptive Episode Selection (Phase 8.8) ----------
// Episode 1 terbuka secara default; episode selanjutnya terbuka jika episode sebelumnya sudah selesai.
function isEpisodeUnlocked(episodeId) {
  const episodes = getAllEpisodes();
  const idx = episodes.findIndex((e) => e.id === episodeId);
  if (idx === -1) return false;
  if (idx === 0) return true; // ep-1 selalu terbuka
  const prev = episodes[idx - 1].id;
  return isEpisodeCompleted(prev);
}

function getEpisodeStatus(episodeId) {
  if (isEpisodeCompleted(episodeId)) return 'completed';
  if (isEpisodeUnlocked(episodeId)) return 'available';
  return 'locked';
}

loadStoryProgress();

// ---------- Heart / Hubungan NPC (Phase 8.5) ----------
const HEART_STORAGE_KEY = 'wayangkancil_hearts';
const HEART_CHARACTERS = ['kancil', 'pak-tani', 'macan', 'buaya', 'siput', 'serigala'];
let hearts = {}; // { character: 0-100 }

function defaultHearts() {
  const h = {};
  for (const c of HEART_CHARACTERS) h[c] = 50;
  return h;
}

function loadHearts() {
  try {
    const raw = localStorage.getItem(HEART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      hearts = { ...defaultHearts(), ...parsed };
    } else {
      hearts = defaultHearts();
    }
  } catch (e) {
    hearts = defaultHearts();
  }
}

function saveHearts() {
  try {
    localStorage.setItem(HEART_STORAGE_KEY, JSON.stringify(hearts));
  } catch (e) {
    // silent
  }
}

function modifyHeart(character, delta) {
  if (!HEART_CHARACTERS.includes(character)) return;
  hearts[character] = Math.max(0, Math.min(100, (hearts[character] || 50) + delta));
  saveHearts();
}

function getHeart(character) {
  return hearts[character] || 50;
}

function getHeartLabel(value) {
  if (value >= 80) return 'Sangat Dekat';
  if (value >= 60) return 'Dekat';
  if (value >= 40) return 'Netral';
  if (value >= 20) return 'Jauh';
  return 'Sangat Jauh';
}

loadHearts();

// ---------- Dark Mode Toggle (Phase 8.9) ----------
const THEME_STORAGE_KEY = 'wayangkancil_theme';
const themeToggleBtn = document.getElementById('themeToggleBtn');

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') {
      document.body.classList.add('theme-light');
      if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Mode Terang';
    } else {
      document.body.classList.remove('theme-light');
      if (themeToggleBtn) themeToggleBtn.textContent = '🌓 Mode Gelap';
    }
  } catch (e) {
    // silent
  }
}

function saveTheme(isLight) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
  } catch (e) {
    // silent
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isLight ? '☀️ Mode Terang' : '🌓 Mode Gelap';
  }
  saveTheme(isLight);
}

loadTheme();

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// ---------- Cerita Sendiri / Solo Story Mode (tambahan) ----------
function startSoloStory(episodeId) {
  let playerName = playerNameInput.value.trim();
  // Auto-fill nama jika kosong agar tombol langsung berfungsi
  if (!playerName) {
    playerName = 'Pemain';
    playerNameInput.value = playerName;
  }

  myCharacter = characterSelect.value;
  isSoloMode = true;

  // Bangun antrean episode dari episode yang dipilih (atau ep-1) sampai episode terakhir
  const allEpisodes = getAllEpisodes();
  const startIdx = episodeId ? allEpisodes.findIndex((e) => e.id === episodeId) : 0;
  soloStoryQueue = allEpisodes.slice(Math.max(0, startIdx === -1 ? 0 : startIdx)).map((e) => e.id);
  soloStoryIndex = 0;

  // Langsung ke narrative scene tanpa room / socket
  lobby.classList.add('hidden');
  waitingRoom.classList.add('hidden');
  gameContainer.classList.add('hidden');
  narrativeScene.classList.remove('hidden');

  playNextSoloEpisode();
}

function playNextSoloEpisode() {
  if (soloStoryIndex >= soloStoryQueue.length) {
    // Semua episode selesai — kembali ke lobby
    isSoloMode = false;
    soloStoryQueue = [];
    soloStoryIndex = 0;
    lobby.classList.remove('hidden');
    narrativeScene.classList.add('hidden');
    piwulangScreen.classList.add('hidden');
    myRoom = null;
    myEpisode = null;
    playerChoices = [];
    engine = null;
    narrative = null;
    showStatus('Semua episode cerita selesai. Kembali ke lobby.', false);
    return;
  }

  const epId = soloStoryQueue[soloStoryIndex];
  myEpisode = epId;
  soloStoryIndex++;
  playerChoices = [];
  startNarrative(epId);
  const ep = getEpisode(epId);
  if (ep) showStatus(`Memulai cerita: ${ep.title} (${soloStoryIndex}/${soloStoryQueue.length})`, false);
}

// Expose startSoloStory to window for inline onclick fallback
window.startSoloStory = startSoloStory;

// Attach event listener
const btn = document.getElementById('storyModeBtn');
if (btn) {
  btn.addEventListener('click', () => {
    try {
      startSoloStory(episodeSelect.value || null);
    } catch (e) {
      console.error('Error in startSoloStory:', e);
    }
  });
}

// ---------- Open World Mode (Harvest Moon style) ----------
function startOpenWorld() {
  const playerName = playerNameInput.value.trim() || 'Pemain';
  playerNameInput.value = playerName;

  myCharacter = 'kancil';
  isOpenWorldMode = true;

  // Sembunyikan lobby, tampilkan game canvas
  lobby.classList.add('hidden');
  waitingRoom.classList.add('hidden');
  narrativeScene.classList.add('hidden');
  piwulangScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');

  // Tambah tombol menu HTML overlay
  if (!document.getElementById('worldMenuBtn')) {
    const menuBtn = document.createElement('button');
    menuBtn.id = 'worldMenuBtn';
    menuBtn.textContent = '☰ Menu';
    menuBtn.className = 'absolute top-3 right-3 z-50 px-4 py-2 bg-black/70 text-yellow-400 border border-yellow-500/50 rounded font-bold text-xs hover:bg-yellow-500/20 transition';
    menuBtn.onclick = () => {
      if (confirm('Kembali ke halaman awal?')) {
        stopOpenWorld();
      }
    };
    gameContainer.appendChild(menuBtn);
  }

  // Inisialisasi world engine
  const canvas = document.getElementById('gameCanvas');
  canvas.style.cursor = 'grab';
  try {
    worldEngine = new WorldEngine(canvas, canvas.getContext('2d'));
    worldEngine.createDefaultMap();
  } catch (e) {
    console.error('Error initializing world engine:', e);
  }

  // Callback ketika bicara dengan NPC yang punya cerita
  worldEngine.onMenuClick = () => {
    if (confirm('Kembali ke halaman awal?')) {
      stopOpenWorld();
    }
  };

  worldEngine.onNpcTalk = (npc) => {
    // Pause world engine
    if (worldEngine) worldEngine.stop();
    window.removeEventListener('keydown', openWorldKeyDown);
    window.removeEventListener('keyup', openWorldKeyUp);

    // Sembunyikan canvas, tampilkan narrative
    gameContainer.classList.add('hidden');
    const menuBtn = document.getElementById('worldMenuBtn');
    if (menuBtn) menuBtn.style.display = 'none';
    narrativeScene.classList.remove('hidden');

    // Mulai narrative untuk episode NPC ini
    myEpisode = npc.episodeId;
    isSoloMode = true;
    soloStoryQueue = [npc.episodeId];
    soloStoryIndex = 0;
    playerChoices = [];
    startNarrative(npc.episodeId);
  };

  worldEngine.start();

  // Input keyboard untuk open world
  window.addEventListener('keydown', openWorldKeyDown);
  window.addEventListener('keyup', openWorldKeyUp);

  showStatus('Selamat datang di Dunia Wayang! Gunakan WASD/Arrow untuk bergerak, SPACE untuk interaksi, ESC untuk menu.', false);
}

function openWorldKeyDown(e) {
  if (!isOpenWorldMode || !worldEngine) return;
  // ESC untuk keluar dari open world
  if (e.code === 'Escape') {
    stopOpenWorld();
    e.preventDefault();
    return;
  }
  worldEngine.handleKeyDown(e.code);
  // Tutup dialogue dengan Space/Enter
  if ((e.code === 'Space' || e.code === 'Enter') && worldEngine.dialogueBox) {
    worldEngine.dialogueBox = null;
    e.preventDefault();
  }
}

function openWorldKeyUp(e) {
  if (!isOpenWorldMode || !worldEngine) return;
  worldEngine.handleKeyUp(e.code);
}

function stopOpenWorld() {
  if (worldEngine) {
    worldEngine.destroy();
    worldEngine = null;
  }
  isOpenWorldMode = false;
  window.removeEventListener('keydown', openWorldKeyDown);
  window.removeEventListener('keyup', openWorldKeyUp);
  const menuBtn = document.getElementById('worldMenuBtn');
  if (menuBtn) menuBtn.remove();
  gameContainer.classList.add('hidden');
  lobby.classList.remove('hidden');
}

// Expose startOpenWorld to window for inline onclick fallback
window.startOpenWorld = startOpenWorld;

if (startGameBtn2) {
  startGameBtn2.addEventListener('click', startOpenWorld);
}

// Tampilkan status hati di lobby (disetelah elemen DOM siap)
function renderHeartStatus() {
  const panel = document.querySelector('.lobby-panel');
  if (!panel || document.getElementById('heartStatus')) return;
  const box = document.createElement('div');
  box.id = 'heartStatus';
  box.className = 'mt-6 p-4 bg-black/40 border border-yellow-500/20 rounded-xl text-center';
  box.innerHTML = `
    <div class="text-xs text-yellow-400 font-bold font-mono mb-2 uppercase">Hubungan NPC (Hati)</div>
    <div class="flex justify-center gap-4 text-xs">
      ${HEART_CHARACTERS.map((c) => `
        <div class="flex flex-col items-center">
          <span class="text-gray-400 capitalize mb-1">${c}</span>
          <span class="font-mono text-yellow-300">${getHeart(c)}</span>
          <span class="text-[10px] text-gray-500">(${getHeartLabel(getHeart(c))})</span>
        </div>
      `).join('')}
    </div>
  `;
  panel.appendChild(box);
}

const heartRenderTimer = setInterval(() => {
  if (document.querySelector('.lobby-panel')) {
    clearInterval(heartRenderTimer);
    renderHeartStatus();
  }
}, 300);

// ---------- Kebun / Peternakan sederhana (Phase 8.6) ----------
const FARM_STORAGE_KEY = 'wayangkancil_farm';
const FARM_PLOT_COUNT = 4;
// Waktu pertumbuhan per stage (ms): benih->menumbuh, menumbuh->siap panen
const FARM_GROWTH_TIME = { 1: 30000, 2: 60000 }; // 30s, 60s
let farmData = { plots: [], lastHarvestBonus: 0, lastUpdated: Date.now() };

function defaultFarm() {
  const plots = [];
  for (let i = 0; i < FARM_PLOT_COUNT; i++) {
    plots.push({ id: i, crop: null, stage: 0, plantedAt: null, growthTime: 0 }); // stage: 0=kosong, 1=benih, 2=menumbuh, 3=siap panen
  }
  return { plots, lastHarvestBonus: 0, lastUpdated: Date.now() };
}

function loadFarm() {
  try {
    const raw = localStorage.getItem(FARM_STORAGE_KEY);
    if (raw) farmData = JSON.parse(raw);
    else farmData = defaultFarm();
    // Pastikan jumlah plot konsisten
    while (farmData.plots.length < FARM_PLOT_COUNT) {
      farmData.plots.push({ id: farmData.plots.length, crop: null, stage: 0, plantedAt: null, growthTime: 0 });
    }
    // Hitung pertumbuhan berdasarkan waktu yang telah berlalu sejak terakhir disimpan
    updateFarmGrowth();
  } catch (e) {
    farmData = defaultFarm();
  }
  farmData.lastUpdated = Date.now();
}

function saveFarm() {
  try {
    farmData.lastUpdated = Date.now();
    localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(farmData));
  } catch (e) {
    // silent
  }
}

// Hitung pertumbuhan plot berdasarkan waktu yang berlalu (real-time)
function updateFarmGrowth() {
  const now = Date.now();
  let changed = false;
  for (const plot of farmData.plots) {
    if (plot.stage === 0 || plot.stage === 3 || !plot.plantedAt) continue;
    const elapsed = now - plot.plantedAt;
    const needed = FARM_GROWTH_TIME[plot.stage] || 0;
    if (elapsed >= needed) {
      plot.stage += 1;
      changed = true;
      if (plot.stage === 3) {
        plot.plantedAt = now; // tandai siap panen sejak sekarang
      }
    }
  }
  if (changed) saveFarm();
}

function plantSeed(plotId) {
  const plot = farmData.plots.find((p) => p.id === plotId);
  if (!plot || plot.stage !== 0) return false;
  plot.crop = 'timun';
  plot.stage = 1; // benih
  plot.plantedAt = Date.now();
  plot.growthTime = FARM_GROWTH_TIME[1];
  saveFarm();
  return true;
}

function tendPlot(plotId) {
  const plot = farmData.plots.find((p) => p.id === plotId);
  if (!plot || plot.stage === 0 || plot.stage === 3) return false;
  plot.stage += 1;
  if (plot.stage === 3) plot.plantedAt = Date.now(); // tandai siap panen
  saveFarm();
  return true;
}

function harvestPlot(plotId) {
  const plot = farmData.plots.find((p) => p.id === plotId);
  if (!plot || plot.stage !== 3) return 0;
  const amount = 1;
  plot.crop = null;
  plot.stage = 0;
  plot.plantedAt = null;
  plot.growthTime = 0;
  farmData.lastHarvestBonus = amount;
  saveFarm();
  // Menambah hubungan dengan Pak Tani (pemilik kebun) setelah panen (Phase 8.5 + 8.6)
  modifyHeart('pak-tani', 10);
  showStatus('Panen berhasil! Hubungan dengan Pak Tani +10', false);
  return amount;
}

function getReadyPlots() {
  return farmData.plots.filter((p) => p.stage === 3);
}

function getFarmStageLabel(stage) {
  const labels = ['Kosong', 'Benih', 'Menumbuh', 'Siap Panen'];
  return labels[stage] || 'Kosong';
}

function getFarmProgress(plot) {
  if (plot.stage === 0) return 0;
  if (plot.stage === 3) return 100;
  const needed = FARM_GROWTH_TIME[plot.stage] || 1;
  const elapsed = Date.now() - plot.plantedAt;
  return Math.min(100, Math.round((elapsed / needed) * 100));
}

loadFarm();

// Update pertumbuhan kebun secara berkala (real-time)
setInterval(updateFarmGrowth, 5000);

// UI: tombol buka kebun di lobby
function renderFarmBtn() {
  const panel = document.querySelector('.lobby-panel');
  if (!panel || document.getElementById('farmBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'farmBtn';
  btn.type = 'button';
  btn.className = 'w-full py-3 mt-4 bg-green-600 hover:bg-green-500 text-black font-bold rounded shadow-[0_0_15px_rgba(34,197,94,0.3)] transition text-xs';
  btn.textContent = '🌿 Kebun Timun (Antar Lakon)';
  btn.onclick = () => toggleFarmPanel();
  panel.appendChild(btn);
}

const farmRenderTimer = setInterval(() => {
  if (document.querySelector('.lobby-panel')) {
    clearInterval(farmRenderTimer);
    renderFarmBtn();
  }
}, 300);

let farmPanelEl = null;

function toggleFarmPanel() {
  if (farmPanelEl) {
    farmPanelEl.remove();
    farmPanelEl = null;
    return;
  }

  farmPanelEl = document.createElement('div');
  farmPanelEl.id = 'farmPanel';
  farmPanelEl.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm';
  farmPanelEl.innerHTML = `
    <div class="bg-gray-900/90 backdrop-blur-md p-6 rounded-2xl border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.2)] w-full max-w-md text-center">
      <h2 class="text-2xl font-black text-green-300 mb-4">🌿 Kebun Timun Kancil</h2>
      <p class="text-xs text-gray-400 mb-6">Tanam timun di antar lakon. Panen untuk bonus item di game berikutnya.</p>
      
      <div class="grid grid-cols-2 gap-3 mb-6" id="farmPlots">
        <!-- diisi oleh JS -->
      </div>

      <div class="mb-4" id="farmMsg" class="text-xs text-green-400 min-h-[1.2em]"></div>

      <div class="flex justify-center gap-3">
        <button id="farmCloseBtn" class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold text-xs">Tutup</button>
      </div>
    </div>
  `;

  const closeBtn = farmPanelEl.querySelector('#farmCloseBtn');
  closeBtn.onclick = () => toggleFarmPanel();
  // Tutup jika klik di luar panel
  farmPanelEl.onclick = (e) => { if (e.target === farmPanelEl) toggleFarmPanel(); };

  document.body.appendChild(farmPanelEl);
  renderFarmPlots();
}

function renderFarmPlots() {
  const container = document.getElementById('farmPlots');
  const msg = document.getElementById('farmMsg');
  if (!container || !farmPanelEl) return;

  container.innerHTML = '';
  let readyCount = 0;

  for (const plot of farmData.plots) {
    const card = document.createElement('div');
    card.className = `p-3 rounded border ${plot.stage === 0 ? 'border-gray-700 bg-gray-800/50' : plot.stage === 3 ? 'border-green-500 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/5'}`;
    const stageLabel = getFarmStageLabel(plot.stage);
    const progress = getFarmProgress(plot);
    let actionHtml = '';
    if (plot.stage === 0) {
      actionHtml = `<button class="w-full py-1 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-bold rounded" onclick="plantSeed(${plot.id})">Tanam</button>`;
      readyCount++;
    } else if (plot.stage === 3) {
      actionHtml = `<button class="w-full py-1 bg-green-600 hover:bg-green-500 text-black text-[10px] font-bold rounded" onclick="harvestPlot(${plot.id})">Panen</button>`;
      readyCount++;
    } else {
      actionHtml = `
        <div class="w-full bg-gray-700 h-1 rounded mb-1">
          <div class="bg-green-500 h-1 rounded" style="width:${progress}%"></div>
        </div>
        <span class="text-[10px] text-gray-400">${progress}%</span>
      `;
    }

    card.innerHTML = `
      <div class="text-[10px] text-gray-400 mb-1">${stageLabel}</div>
      <div class="h-8 rounded bg-gray-700 mb-2 flex items-center justify-center text-[10px] text-gray-300">${plot.stage === 0 ? '—' : plot.stage === 1 ? '🌱' : plot.stage === 2 ? '🌿' : '🥒'}</div>
      ${actionHtml}
    `;
    container.appendChild(card);
  }

  if (msg) {
    msg.textContent = readyCount > 0 ? `${readyCount} plot siap diolah.` : 'Kosong — tanam benih timun untuk memulai.';
  }
}

// Expose ke window agar onclick HTML bisa memanggil
window.plantSeed = plantSeed;
window.harvestPlot = harvestPlot;
window.toggleFarmPanel = toggleFarmPanel;
window.renderFarmPlots = renderFarmPlots;

// Tambah bonus item awal ke game berdasarkan hasil panen terakhir
function getFarmHarvestBonus() {
  const bonus = farmData.lastHarvestBonus || 0;
  farmData.lastHarvestBonus = 0;
  saveFarm();
  return bonus;
}

// ---------- Episode selection (Phase 6) ----------
function populateEpisodes() {
  const episodes = getAllEpisodes();
  for (const ep of episodes) {
    const opt = document.createElement('option');
    opt.value = ep.id;
    opt.disabled = !isEpisodeUnlocked(ep.id);
    const done = isEpisodeCompleted(ep.id) ? ' ✅' : '';
    const locked = !isEpisodeUnlocked(ep.id) ? ' 🔒' : '';
    opt.textContent = `${ep.title} — ${ep.subtitle}${done}${locked}`;
    episodeSelect.appendChild(opt);
  }
  renderEpisodeCards();
}

function renderEpisodeCards() {
  const container = document.getElementById('episodeCards');
  const episodes = getAllEpisodes();
  const selected = episodeSelect.value || '';
  container.innerHTML = '';

  for (const ep of episodes) {
    const status = getEpisodeStatus(ep.id);
    const done = status === 'completed';
    const locked = status === 'locked';
    const card = document.createElement('div');
    card.className = `episode-card ${selected === ep.id ? 'selected' : ''} ${done ? 'episode-card-done-bg' : ''} ${locked ? 'episode-card-locked' : ''}`;
    card.dataset.episodeId = ep.id;
    card.innerHTML = `
      <div class="episode-card-thumb" style="background-color: ${ep.bgColor};"></div>
      <div class="episode-card-content">
        <div class="episode-card-title">${ep.title}</div>
        <div class="episode-card-subtitle">${ep.subtitle}</div>
      </div>
      ${done ? '<div class="absolute top-0.5rem right-0.5rem bg-emerald-500/90 text-black text-[0.65rem] font-black px-2 py-0.5 rounded uppercase">Selesai</div>' : ''}
      ${locked ? '<div class="absolute top-0.5rem right-0.5rem bg-gray-600/90 text-white text-[0.65rem] font-black px-2 py-0.5 rounded uppercase">Terunci</div>' : ''}
    `;
    if (!locked) {
      card.onclick = () => {
        episodeSelect.value = ep.id;
        myEpisode = ep.id;
        renderEpisodeCards();
        renderVoteOptions();
      };
    }
    container.appendChild(card);
  }
}

function renderVoteOptions() {
  const episodes = getAllEpisodes();
  voteOptions.innerHTML = '';
  for (const ep of episodes) {
    if (!isEpisodeUnlocked(ep.id)) continue; // skip episode terunci di panel voting
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `px-3 py-2 rounded text-sm font-medium border transition ${episodeSelect.value === ep.id ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'}`;
    btn.textContent = `${ep.title}`;
    btn.onclick = () => {
      episodeSelect.value = ep.id;
      myEpisode = ep.id;
      renderVoteOptions();
      socket.emit('voteEpisode', { episodeId: ep.id });
    };
    voteOptions.appendChild(btn);
  }
}

function renderVoteResults(votes) {
  if (!votes || Object.keys(votes).length === 0) {
    voteResults.textContent = 'Belum ada suara.';
    return;
  }
  const lines = Object.entries(votes)
    .map(([epId, count]) => {
      const ep = getAllEpisodes().find((e) => e.id === epId);
      return `${ep ? ep.title : epId}: ${count} suara`;
    })
    .join(' | ');
  voteResults.textContent = 'Suara: ' + lines;
}
populateEpisodes();
renderVoteOptions();

episodeSelect.addEventListener('change', () => {
  myEpisode = episodeSelect.value || null;
  renderEpisodeCards();
  renderVoteOptions();
});

// ---------- Helpers ----------
function showStatus(msg, isError = true) {
  statusMsg.textContent = msg;
  statusMsg.className = `text-xs text-center mb-4 ${isError ? 'text-red-400' : 'text-green-400'}`;
  statusMsg.classList.remove('hidden');
  setTimeout(() => statusMsg.classList.add('hidden'), 4000);
}

function renderPlayers(players) {
  playersList.innerHTML = '';
  for (const p of players) {
    const el = document.createElement('div');
    el.className = `flex justify-between items-center px-3 py-2 rounded bg-gray-800/50 border border-gray-700 ${p.isHost ? 'border-yellow-500/50 bg-yellow-500/10' : ''}`;
    el.innerHTML = `
      <span class="text-sm font-medium ${p.isHost ? 'text-yellow-400' : 'text-white'}">${p.name} ${p.isHost ? '(Tuan Rumah)' : ''}</span>
      <span class="text-xs text-gray-400 capitalize">${p.character}</span>
    `;
    playersList.appendChild(el);
  }
}

// ---------- Leaderboard (Phase 8.2) ----------
function renderLeaderboard(scores) {
  if (!leaderboard || !leaderboardList || !scores) return;

  leaderboard.classList.remove('hidden');

  const entries = Object.entries(scores)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.score - a.score);

  leaderboardList.innerHTML = entries
    .map((entry, index) => {
      const isMe = entry.id === myPlayerId;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `<div class="flex justify-between items-center ${isMe ? 'text-yellow-400 font-bold' : 'text-gray-300'}">
        <span>${medal} ${entry.name}</span>
        <span>${entry.score}</span>
      </div>`;
    })
    .join('');
}

// ---------- Socket events ----------
socket.on('connect', () => {
  myPlayerId = socket.id;
});

socket.on('roomCreated', ({ roomId, isHost: host, roomState }) => {
  myRoom = roomId;
  isHost = host;
  roomIdInput.value = roomId;
  displayRoomId.textContent = roomId;
  displayRoomId.classList.remove('hidden');

  showStatus(`Room ${roomId} dibuat. Tunggu pemain lain gabung.`, false);
  enterWaitingRoom(roomState);
});

socket.on('roomJoined', ({ roomId, isHost: host, roomState }) => {
  myRoom = roomId;
  isHost = host;
  displayRoomId.textContent = roomId;
  displayRoomId.classList.remove('hidden');

  showStatus(`Berhasil gabung ke room ${roomId}.`, false);
  enterWaitingRoom(roomState);
});

socket.on('roomState', (roomState) => {
  renderPlayers(roomState.players);
  startGameBtn.disabled = !isHost || roomState.playerCount < 1;

  // Tampilkan panel voting jika ada episode yang dipilih
  if (myEpisode) {
    votePanel.classList.remove('hidden');
    const counts = {};
    for (const [ep, ids] of Object.entries(roomState.votes || {})) {
      counts[ep] = ids.length;
    }
    renderVoteResults(counts);
  } else {
    votePanel.classList.add('hidden');
  }
});

socket.on('voteUpdate', ({ votes }) => {
  renderVoteResults(votes);
});

socket.on('playerLeft', ({ playerId }) => {
  showStatus('Satu pemain meninggalkan room.');
  if (engine) engine.removePlayer(playerId);
});

socket.on('error', ({ message }) => {
  showStatus(message);
});

socket.on('gameStarted', ({ roomId, episodeId }) => {
  waitingRoom.classList.add('hidden');
  myRoom = roomId;
  myEpisode = episodeId || null;

  hudRoom.textContent = roomId;
  hudCharacter.textContent = myCharacter;

  score = 0;
  hudScore.textContent = '0';
  hudTimer.textContent = '0';

  // Nyalakan audio (dengan interaksi pengguna) dan mainkan BGM Gamelan
  sound.enable();
  sound.playBgm();
  sound.playSfx('start');

  // Jika ada episode, tampilkan narrative scene terlebih dahulu
  if (myEpisode) {
    gameContainer.classList.add('hidden');
    narrativeScene.classList.remove('hidden');
    startNarrative(myEpisode);
  } else {
    gameContainer.classList.remove('hidden');
    initGameEngine(roomId);
  }
});

// ---------- Narrative Story Flow (Phase 6) ----------
function startNarrative(episodeId) {
  const ep = getEpisode(episodeId);
  if (!ep) {
    startGameAfterNarrative();
    return;
  }

  narrative = new NarrativeEngine('narrativeContainer');

  // Bangun adegan cerita berdasarkan episode
  const scenes = buildNarrativeScenes(ep);

  narrative.loadScenes(scenes);
  narrative.onChoice = (choice, scene) => {
    playerChoices.push({ scene: scene.id || scene.speaker, choice: choice.text, effect: choice.effect || choice.text });
  };
  narrative.onComplete = () => {
    showPiwulangScreen(ep, playerChoices);
  };
  narrative.start(0);
}

function getEpisode(episodeId) {
  const episodes = getAllEpisodes();
  return episodes.find((e) => e.id === episodeId) || null;
}

function buildNarrativeScenes(ep) {
  const sceneMeta = {
    episodeId: ep.id,
    episodeTitle: ep.title,
    episodeSubtitle: ep.subtitle,
  };

  // Adegan pembuka cerita
  const scenes = [
    {
      ...sceneMeta,
      kind: 'opening',
      speaker: 'Dalang',
      text: `Cerita ${ep.title}: ${ep.subtitle}`,
      bgColor: ep.bgColor,
      puppets: [
        { label: 'Si Kancil', x: 20, y: 60, flip: false },
      ],
    },
    {
      ...sceneMeta,
      kind: 'story',
      speaker: 'Narasi',
      text: ep.story,
      bgColor: ep.bgColor,
      puppets: [
        { label: 'Si Kancil', x: 20, y: 60, flip: false },
        { label: ep.enemyType ? ep.enemyType : 'Musuh', x: 75, y: 60, flip: true },
      ],
    },
    {
      ...sceneMeta,
      kind: 'mission',
      speaker: 'Tujuan',
      text: ep.objective,
      bgColor: ep.bgColor,
      puppets: [
        { label: 'Si Kancil', x: 50, y: 60, flip: false },
      ],
    },
  ];

  // Adegan pilihan untuk semua episode (Phase 7.2 Multiple Endings)
  const choiceScenes = {
    'ep-1': {
      speaker: 'Dalang',
      text: 'Kancil sudah di tepi seberang. Bagaimana caranya melewati para buaya?',
      puppets: [
        { label: 'Si Kancil', x: 30, y: 60, flip: false },
        { label: 'Buaya', x: 70, y: 60, flip: true },
      ],
      choices: [
        { text: 'Bohongi para buaya dengan cerita daging segar', effect: 'clever' },
        { text: 'Lompat langsung dan berusaha melarikan diri', effect: 'force' },
      ],
    },
    'ep-2': {
      speaker: 'Dalang',
      text: 'Harimau siap menyerang. Kancil harus memilih trik atau pertarungan?',
      puppets: [
        { label: 'Si Kancil', x: 30, y: 60, flip: false },
        { label: 'Macan', x: 70, y: 60, flip: true },
      ],
      choices: [
        { text: 'Gunakan ilusi gong dan sabuk Raja Sulaiman', effect: 'clever' },
        { text: 'Hadapi Harimau dengan bergegas menyerang', effect: 'force' },
      ],
    },
    'ep-3': {
      speaker: 'Dalang',
      text: 'Lomba lari dimulai. Kancil berlari kencang atau menunggu strategi?',
      puppets: [
        { label: 'Si Kancil', x: 30, y: 60, flip: false },
        { label: 'Siput', x: 70, y: 60, flip: true },
      ],
      choices: [
        { text: 'Berlari kencang secepat mungkin', effect: 'force' },
        { text: 'Terima ajakan kerja sama dari Siput', effect: 'peace' },
      ],
    },
    'ep-4': {
      speaker: 'Dalang',
      text: 'Serigala ingin memakan Kerbau. Kancil sebagai hakim, apa keputusannya?',
      puppets: [
        { label: 'Si Kancil', x: 30, y: 60, flip: false },
        { label: 'Serigala', x: 70, y: 60, flip: true },
      ],
      choices: [
        { text: 'Panggil rapat hakim dan ulang kejadian', effect: 'peace' },
        { text: 'Biarkan Serigala memakan Kerbau', effect: 'force' },
      ],
    },
    'ep-5': {
      speaker: 'Kancil (Hakim)',
      text: 'Harimau dan Gajah, kamu berdua berselisih tentang sumber air. Apa pilihan terbaik untuk hutan?',
      puppets: [
        { label: 'Si Kancil', x: 25, y: 60, flip: false },
        { label: 'Macan', x: 45, y: 60, flip: true },
        { label: 'Gajah', x: 70, y: 60, flip: false },
      ],
      choices: [
        { text: 'Berikan air lebih kepada Gajah karena ukurannya besar', effect: 'force' },
        { text: 'Bagi air sama rata untuk semua hewan', effect: 'peace' },
        { text: 'Biarkan yang kuat mengambil semua air', effect: 'force' },
      ],
    },
  };

  if (choiceScenes[ep.id]) {
    scenes.push({ ...sceneMeta, kind: 'decision', bgColor: ep.bgColor, ...choiceScenes[ep.id] });
  }

  // Adegan penutup dengan piwulang
  scenes.push({
    ...sceneMeta,
    kind: 'moral',
    speaker: 'Piwulang',
    text: ep.moral,
    bgColor: ep.bgColor,
    puppets: [
      { label: 'Si Kancil', x: 50, y: 60, flip: false },
    ],
  });

  return scenes;
}

// ---------- Piwulang Screen (Phase 7.1 + 7.2 Multiple Endings) ----------
function computeEnding(choices = []) {
  let clever = 0, force = 0, peace = 0;
  for (const c of choices) {
    const eff = (c.effect || '').toLowerCase();
    if (eff.includes('cerdik') || eff.includes('clever') || eff.includes('bluff') || eff.includes('illusion') || eff.includes('mediate') || eff.includes('negotiate') || eff.includes('damai')) {
      clever++;
      peace++;
    } else if (eff.includes('paksa') || eff.includes('force') || eff.includes('brave') || eff.includes('serang') || eff.includes('langsung')) {
      force++;
    } else if (eff.includes('damai') || eff.includes('peace') || eff.includes('berbicara') || eff.includes('negotiate')) {
      peace++;
    }
  }

  if (clever > force && clever >= peace) return 'clever';
  if (force >= 2 && clever === 0) return 'sad';
  if (force > clever && force >= peace) return 'force';
  if (peace > clever && peace > force) return 'peace';
  return 'neutral';
}

function showPiwulangScreen(ep, choices = []) {
  narrativeScene.classList.add('hidden');
  piwulangScreen.classList.remove('hidden');

  // Tandai episode selesai (Phase 7.3)
  const endingKey = computeEnding(choices);
  markEpisodeCompleted(ep.id, endingKey);

  // Hubungan NPC berubah berdasarkan ending (Phase 8.5)
  if (endingKey === 'clever' || endingKey === 'peace') {
    modifyHeart('kancil', 10);
    modifyHeart('pak-tani', 5);
  } else if (endingKey === 'force') {
    modifyHeart('kancil', -5);
    modifyHeart('macan', -10);
  } else if (endingKey === 'sad') {
    modifyHeart('kancil', -10);
    modifyHeart('buaya', -5);
  }

  piwulangTitle.textContent = `Piwulang — ${ep.title}`;
  piwulangStory.textContent = ep.story;
  piwulangMoral.textContent = ep.moral;

  const endings = {
    clever: 'Kancil menang melalui kecerdikan dan trik. Hutan menghormati akal di atas kekerasan.',
    force: 'Kancil berhasil melalui keberanian dan confrontasi langsung. Namun hutan masih penuh ancaman.',
    peace: 'Kancil menyelesaikan konflik melalui dialog dan perdamaian. Harmoni hutan terjaga.',
    sad: 'Kancil gagal bertahan. Akal yang diabaikan dan keberanian sembarangan hanya membawa hancuran. Hutan meratap kehilangan sang pendamping cerdik.',
    neutral: 'Kancil menemukan jalan tengah antara akal dan keberanian.',
  };

  const summaries = {
    'ep-1': {
      clever: 'Kancil menyeberangi sungai dengan membohongi para buaya. Akal mengalahkan kekuatan.',
      force: 'Kancil lolos tapi banyak buaya yang sakit. Hutan tak lagi nyaman.',
      peace: 'Kancil dan buaya berdamai di tepi sungai. Bersama-sama bagi buah.',
      sad: 'Kancil ditangkap buaya di tengah sungai. Akhirnya tidak pernah kembali ke hutan.',
      neutral: 'Kancil menyeberangi sungai. Beberapa buaya kalah, beberapa berhasil lari.',
    },
    'ep-2': {
      clever: 'Kancil mengakali Harimau dengan ilusi gong dan sabuk palsu. Akal menang.',
      force: 'Kancil lolos dari Harimau tapi cidera. Hutan masih ada ancaman.',
      peace: 'Harimau dan Kancil berdamai. Tidak ada lagi pertempuran di hutan.',
      sad: 'Kancil ditangkap Harimau. Ilusi gagal, dan hutan kehilangan pendamping cerdik.',
      neutral: 'Kancil dan Harimau saling menghindari. Hutan tenang tapi tidak damai.',
    },
    'ep-3': {
      clever: 'Kancil kalah dari Siput. Kerja sama tim mengalahkan kecepatan individual.',
      force: 'Kancil berlari kencang tapi kelelahan. Siput tetap ada di finish.',
      peace: 'Kancil dan Siput berdamai. Lomba berakhir seri.',
      sad: 'Kancil tersesat di tengah hutan setelah mengabaikan strategi Siput.',
      neutral: 'Kancil hampir mencapai finish tapi Siput sudah di sana.',
    },
    'ep-4': {
      clever: 'Kancil menjadi hakim dan membalikkan situasi. Kerbau selamat.',
      force: 'Kancil berusaha paksa tapi Serigala masih mengancam.',
      peace: 'Kerbau dan Serigala berdamai berkat mediasi Kancil.',
      sad: 'Serigala memakan Kerbau. Kancil gagal sebagai hakim dan pergi dari hutan.',
      neutral: 'Kerbau selamat tapi Serigala tetap di hutan.',
    },
    'ep-5': {
      clever: 'Kancil bagi air adil. Harimau dan Gajah setuju. Hutan damai.',
      force: 'Kancil memaksa pembagian air. Beberapa hewan tidak puas.',
      peace: 'Semua hewan setuju. Sumber air dibagi adil, hutan kembali damai.',
      sad: 'Harimau dan Gajah bertarung. Kancil tidak dapat menghentikan perang hutan.',
      neutral: 'Air dibagi tapi tidak semua hewan puas.',
    },
  };

  piwulangEnding.innerHTML = `<strong>Akhir (${endingKey}):</strong> ${endings[endingKey]}<br><br>${summaries[ep.id]?.[endingKey] || summaries[ep.id] || 'Cerita selesai.'}`;
}

piwulangStartBtn.addEventListener('click', () => {
  piwulangScreen.classList.add('hidden');
  if (isOpenWorldMode) {
    // Kembali ke open world setelah cerita selesai
    isSoloMode = false;
    narrativeScene.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    const menuBtn = document.getElementById('worldMenuBtn');
    if (menuBtn) menuBtn.style.display = '';
    if (worldEngine) {
      worldEngine.start();
      window.addEventListener('keydown', openWorldKeyDown);
      window.addEventListener('keyup', openWorldKeyUp);
    }
  } else if (isSoloMode) {
    // Lanjut ke episode berikutnya dalam antrean solo story
    playNextSoloEpisode();
  } else {
    gameContainer.classList.remove('hidden');
    if (!engine) initGameEngine(myRoom);
    else engine.startTransition({ type: 'fade', direction: 'out', duration: 700 });
  }
});

function startGameAfterNarrative() {
  narrativeScene.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initGameEngine(myRoom);
}

socket.on('gameStateUpdate', ({ players, scores, season, seasonInfo, timer }) => {
  if (!engine) return;

  hudTimer.textContent = timer;

  // Update musim saat ini (Phase 8.7)
  if (seasonInfo && season !== currentSeason?.id) {
    currentSeason = { id: season, ...seasonInfo };
    hudSeason.classList.remove('hidden');
    hudSeasonLabel.textContent = `${currentSeason.icon} ${currentSeason.label}`;
    if (engine) {
      engine.setSeason(currentSeason.id, currentSeason);
      engine.setItemType(currentSeason.itemTypes[0]);
    }
  }

  // Render leaderboard skor multiplayer (Phase 8.2)
  renderLeaderboard(scores);

  // Sinkronisasi posisi pemain dari server (interpolasi di engine)
  for (const [id, state] of Object.entries(players)) {
    if (!engine.players.has(id)) {
      engine.addPlayer(id, {
        name: id.slice(-4),
        character: myCharacter,
        x: state.x,
        y: state.y,
      });
    }
    engine.updatePlayer(id, {
      x: state.x,
      y: state.y,
      direction: state.direction,
      actionState: state.actionState,
    });
  }

  // Hapus pemain yang sudah tidak ada di state server
  for (const [id] of engine.players.entries()) {
    if (!(id in players)) {
      engine.removePlayer(id);
    }
  }

  // Skor sederhana berdasarkan jarak tempuh pemain lokal (dikalikan multiplier musim)
  const me = players[myPlayerId];
  if (me) {
    const seasonMult = currentSeason ? currentSeason.itemValueMultiplier : 1;
    score = Math.floor((me.x / 10) * seasonMult);
    hudScore.textContent = score;
  }
});

socket.on('playerMoved', (data) => {
  // Fallback jika gameStateUpdate belum sampai; langsung update target
  if (!engine) return;
  if (data.playerId === myPlayerId) return;

  if (!engine.players.has(data.playerId)) {
    engine.addPlayer(data.playerId, {
      name: data.playerName,
      character: data.character,
      x: data.x,
      y: data.y,
    });
  }
  engine.updatePlayer(data.playerId, {
    x: data.x,
    y: data.y,
    direction: data.direction,
    actionState: data.actionState,
  });
});

socket.on('itemCollected', ({ playerId, playerName, itemId, score }) => {
  if (!engine) return;

  // Hapus item dari semua client
  engine.items = engine.items.filter((i) => i.id !== itemId);

  // Re-spawn jika terlalu sedikit (mengikuti jenis item musim)
  const active = engine.items.filter((i) => !i.collected).length;
  const seasonItemType = currentSeason ? currentSeason.itemTypes[0] : 'cucumber';
  while (active < 4) {
    engine.spawnItems(1, seasonItemType);
    active++;
  }

  // Update skor pemain yang mengambil
  if (playerId === myPlayerId) {
    score = score || 0;
    hudScore.textContent = score;
    const seasonLabel = currentSeason ? ` (${currentSeason.icon} ${currentSeason.label})` : '';
    showStatus(`${playerName} mengambil item (+${points})${seasonLabel}`, false);
    sound.playSfx('collect');

    // Timun dibudidayakan Pak Tani -> hubungan lebih baik (Phase 8.5)
    modifyHeart('pak-tani', 5);
  } else {
    // Tampilkan informasi pemain lain juga bisa, tapi HUD utama milik lokal
    console.log(`${playerName} collected item ${itemId}`);
  }
});

socket.on('useAbility', (data) => {
  triggerAbilityEffect(data);
});

socket.on('gameOver', ({ winner, finalScores: scores }) => {
  if (engine) engine.stop();
  sound.stop();
  sound.playSfx('gameover');
  gameContainer.classList.add('hidden');
  gameOver.classList.remove('hidden');

  let html = '<h3 class="text-lg font-bold text-yellow-400 mb-2">Skor Akhir</h3><ul class="text-left list-disc list-inside mb-4">';
  for (const [id, scoreVal] of Object.entries(scores)) {
    html += `<li>${id}: ${scoreVal}</li>`;
  }
  html += '</ul>';
  finalScores.innerHTML = html;

  moralStory.textContent =
    '"Kecerdikan lebih berharga dari kekuatan. Jangan simply percaya pada penampilan luar, dan selalu taat pada kebenaran."';
});

// ---------- UI actions ----------
function enterWaitingRoom(roomState) {
  waitingRoom.classList.remove('hidden');
  renderPlayers(roomState.players);
  startGameBtn.disabled = !isHost;
}

if (createRoomBtn) {
  createRoomBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const character = characterSelect.value;
    const episodeId = episodeSelect.value || null;
    if (!playerName) {
      showStatus('Nama pemain wajib diisi.');
      return;
    }
    myCharacter = character;
    myEpisode = episodeId;
    socket.emit('createRoom', { playerName, character, episodeId });
  });
}

if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const character = characterSelect.value;
    const episodeId = episodeSelect.value || null;
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!playerName || !roomId) {
      showStatus('Nama dan Room ID wajib diisi.');
      return;
    }
    myCharacter = character;
    myEpisode = episodeId;
    socket.emit('joinRoom', { roomId, playerName, character, episodeId });
  });
}

if (copyRoomIdBtn) {
  copyRoomIdBtn.addEventListener('click', () => {
    if (!roomIdInput.value) return;
    roomIdInput.select();
    document.execCommand('copy');
    showStatus('Room ID disalin.', false);
  });
}

audioBtn.addEventListener('click', () => {
  sound.enable();
  sound.playSfx('start');
  audioBtn.textContent = sound.enabled ? '🔊 Audio ON' : '🔇 Audio gagal';
  audioBtn.classList.add('opacity-50');
  audioBtn.disabled = true;
});

startGameBtn.addEventListener('click', () => {
  if (!isHost) return;
  socket.emit('startGame');
});

// ---------- Game engine (Phase 3) ----------
function initGameEngine(roomId) {
  const canvas = document.getElementById('gameCanvas');
  engine = new GameEngine(canvas);
  engine.setRoom(roomId);

  // Tambahkan pemain lokal
  engine.addPlayer(myPlayerId, {
    name: playerNameInput.value.trim(),
    character: myCharacter,
    x: canvas.width / 2,
    y: canvas.height / 2,
  });

  // Item mock (timun) akan di-generate sepenuhnya di Phase 4
  const initialItemType = currentSeason ? currentSeason.itemTypes[0] : 'cucumber';
  engine.spawnMockItems(8, initialItemType);

  // Bonus item awal dari hasil panen kebun (Phase 8.6)
  const farmBonus = getFarmHarvestBonus();
  if (farmBonus > 0) {
    engine.spawnItems(farmBonus, initialItemType, true);
    showStatus(`Bonus dari kebun: +${farmBonus} item awal (bercahaya)`, false);
  }

  // Input lokal -> kirim playerMoved ke server
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Ability dengan tombol SPACE (cooldown 5 detik)
    if (e.code === 'Space') {
      const now = Date.now();
      if (now - lastAbility < 5000) return;
      lastAbility = now;

      const me = engine.players.get(myPlayerId);
      if (!me) return;

      let abilityId = 'sprint';
      if (myCharacter === 'macan') abilityId = 'teleport';
      if (myCharacter === 'buaya') abilityId = 'snap';
      if (myCharacter === 'pak-tani') abilityId = 'trap';
      if (myCharacter === 'siput') abilityId = 'echo';
      if (myCharacter === 'serigala') abilityId = 'howl';

      socket.emit('useAbility', { abilityId, targetPos: { x: me.targetX, y: me.targetY } });

      // Efek lokal segera (tidak perlu tunggu server balik)
      triggerAbilityEffect({ playerId: myPlayerId, character: myCharacter, abilityId, x: me.x, y: me.y, direction: me.direction });
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Loop input 30 FPS -> emit ke server, engine sendiri render via requestAnimationFrame
  setInterval(() => {
    const speed = Date.now() < boostUntil ? 10 : 5; // sprint ability = 2x cepat
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { dx = -speed; }
    if (keys['ArrowRight'] || keys['KeyD']) { dx = speed; }
    if (keys['ArrowUp'] || keys['KeyW']) dy = -speed;
    if (keys['ArrowDown'] || keys['KeyS']) dy = speed;

    const me = engine.players.get(myPlayerId);
    if (me) {
      me.targetX = Math.max(20, Math.min(canvas.width - 20, me.targetX + dx));
      me.targetY = Math.max(20, Math.min(canvas.height - 20, me.targetY + dy));
      me.direction = dx < 0 ? 'left' : dx > 0 ? 'right' : me.direction;
      me.actionState = (dx !== 0 || dy !== 0) ? 'moving' : 'idle';

      socket.emit('playerMoved', {
        x: me.targetX,
        y: me.targetY,
        direction: me.direction,
        actionState: me.actionState,
      });

      // Deteksi tabrakan item (cucumber/timun) untuk pemain lokal
      const collected = engine.checkCollisions(myPlayerId);
      if (collected.length > 0) {
        socket.emit('itemCollected', { itemId: collected[collected.length - 1] });
      }
    }
  }, 1000 / 30);

  engine.start();

  // Transisi fade-in saat game dimulai (Phase 8.4)
  engine.startTransition({ type: 'fade', direction: 'out', duration: 700 });
}

function triggerAbilityEffect(data) {
  if (!engine) return;

  const p = engine.players.get(data.playerId);
  const x = data.x ?? (p ? p.x : 0);
  const y = data.y ?? (p ? p.y : 0);

  // Efek visual untuk semua client yang menerima event
  engine.addEffect({ type: data.abilityId, x, y });

  // Gameplay hanya berlaku untuk pemain lokal
  if (data.playerId !== myPlayerId) return;

  const me = engine.players.get(myPlayerId);
  if (!me) return;

  // SFX ability untuk pemain lokal
  if (data.playerId === myPlayerId) {
    sound.playSfx('ability');
  }

  switch (data.abilityId) {
    case 'sprint': // Si Kancil: gerakan 2x lebih cepat selama 3 detik
      boostUntil = Date.now() + 3000;
      showStatus('Ability Kancil: Sprint! (3 detik)', false);
      break;

    case 'teleport': // Macan: lompat jauh ke arah yang dihadapkan
      const jump = me.direction === 'left' ? -150 : 150;
      me.targetX = Math.max(20, Math.min(canvas.width - 20, me.x + jump));
      me.x = me.targetX;
      showStatus('Ability Macan: Teleport!', false);
      break;

    case 'snap': // Buaya: efek area (visual saja di Phase 4)
      showStatus('Ability Buaya: Snap!', false);
      break;

    case 'trap': // Pak Tani: jala (visual saja di Phase 4)
      showStatus('Ability Pak Tani: Jala!', false);
      break;

    case 'echo': // Siput: suara tiruan, lawan bingung arah (visual saja)
      showStatus('Ability Siput: Echo! Suara tiruan menyesatkan.', false);
      break;

    case 'howl': // Serigala: serangan suara, area fear (visual saja)
      showStatus('Ability Serigala: Olololan! Area takutan.', false);
      break;
  }
}

playAgainBtn.addEventListener('click', () => {
  gameOver.classList.add('hidden');
  lobby.classList.remove('hidden');
  if (engine) engine.stop();
  location.reload();
});
