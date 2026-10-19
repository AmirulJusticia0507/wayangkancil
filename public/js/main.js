// Wayang Kancil - Socket connection & UI handler (Phase 3 + Phase 6)
import GameEngine from './gameEngine.js';
import SoundManager from './sound.js';
import { getAllEpisodes } from './episodes.js';
import { NarrativeEngine } from './narrativeEngine.js';

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
const playersList = document.getElementById('playersList');

const hudRoom = document.getElementById('hudRoom');
const hudCharacter = document.getElementById('hudCharacter');
const hudScore = document.getElementById('hudScore');
const hudTimer = document.getElementById('hudTimer');

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

loadStoryProgress();

// ---------- Episode selection (Phase 6) ----------
function populateEpisodes() {
  const episodes = getAllEpisodes();
  for (const ep of episodes) {
    const opt = document.createElement('option');
    opt.value = ep.id;
    const done = isEpisodeCompleted(ep.id) ? ' ✅' : '';
    opt.textContent = `${ep.title} — ${ep.subtitle}${done}`;
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
    const done = isEpisodeCompleted(ep.id);
    const card = document.createElement('div');
    card.className = `episode-card ${selected === ep.id ? 'selected' : ''} ${done ? 'episode-card-done-bg' : ''}`;
    card.dataset.episodeId = ep.id;
    card.innerHTML = `
      <div class="episode-card-thumb" style="background-color: ${ep.bgColor};"></div>
      <div class="episode-card-content">
        <div class="episode-card-title">${ep.title}</div>
        <div class="episode-card-subtitle">${ep.subtitle}</div>
      </div>
      ${done ? '<div class="absolute top-0.5rem right-0.5rem bg-emerald-500/90 text-black text-[0.65rem] font-black px-2 py-0.5 rounded uppercase">Selesai</div>' : ''}
    `;
    card.onclick = () => {
      episodeSelect.value = ep.id;
      myEpisode = ep.id;
      renderEpisodeCards();
      renderVoteOptions();
    };
    container.appendChild(card);
  }
}

function renderVoteOptions() {
  const episodes = getAllEpisodes();
  voteOptions.innerHTML = '';
  for (const ep of episodes) {
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
      text: 'Kancil sudah di tepi seberang. Bagaimana caranya melampi para buaya?',
      puppets: [
        { label: 'Si Kancil', x: 30, y: 60, flip: false },
        { label: 'Buaya', x: 70, y: 60, flip: true },
      ],
      choices: [
        { text: 'Boorkan para buaya dengan cerita daging segar', effect: 'clever' },
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

  piwulangTitle.textContent = `Piwulang — ${ep.title}`;
  piwulangStory.textContent = ep.story;
  piwulangMoral.textContent = ep.moral;

  const endings = {
    clever: 'Kancil menang melalui kecerdikan dan trik. Hutan menghormati akal di atas kekerasan.',
    force: 'Kancil berhasil melalui keberanian dan confrontasi langsung. Namun hutan tetap penamakan ancaman.',
    peace: 'Kancil menyelesaikan konflik melalui dialog dan perdamaian. Harmoni hutan terjaga.',
    neutral: 'Kancil menemukan jalan tengah antara akal dan keberanian.',
  };

  const summaries = {
    'ep-1': 'Kancil berhasil menyeberangi sungai dengan membohongi para buaya. Buah-buahan di seberang tercapai melalui kecerdikan, bukan kekerasan.',
    'ep-2': 'Kancil mengakali Harimau dua kali dengan ilusi gong dan sabuk palsu. Penampilan boleh menipu, tetapi akal menyelamatkan.',
    'ep-3': 'Kancil kalah dari Siput dalam lomba lari. Kecepatan sendirian tidak cukup — kerja sama dan strategi lebih kuat.',
    'ep-4': 'Kancil menjadi hakim dan membalas kebaikan Kerbau dengan menindih Serigala yang tidak berterima kasih. Pilih siapa yang dipercaya.',
    'ep-5': 'Kancil menyelesaikan sengketa Harimau dan Gajah melalui dialog damai. Tanpa pertumpahan darah, hutan tetap harmonis.',
  };

  piwulangEnding.innerHTML = `<strong>Akhir (${endingKey}):</strong> ${endings[endingKey]}<br><br>${summaries[ep.id] || 'Cerita selesai.'}`;
}

piwulangStartBtn.addEventListener('click', () => {
  piwulangScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initGameEngine(myRoom);
});

function startGameAfterNarrative() {
  narrativeScene.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initGameEngine(myRoom);
}

socket.on('gameStateUpdate', ({ players, timer }) => {
  if (!engine) return;

  hudTimer.textContent = timer;

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

  // Skor sederhana berdasarkan jarak tempuh pemain lokal
  const me = players[myPlayerId];
  if (me) {
    score = Math.floor(me.x / 10);
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

  // Re-spawn jika terlalu sedikit
  const active = engine.items.filter((i) => !i.collected).length;
  while (active < 4) {
    engine.spawnItems(1);
  }

  // Update skor pemain yang mengambil
  if (playerId === myPlayerId) {
    score = score || 0;
    hudScore.textContent = score;
    showStatus(`${playerName} mengambil timun (+10)`, false);
    sound.playSfx('collect');
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

copyRoomIdBtn.addEventListener('click', () => {
  if (!roomIdInput.value) return;
  roomIdInput.select();
  document.execCommand('copy');
  showStatus('Room ID disalin.', false);
});

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
  engine.spawnMockItems(8);

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
  }
}

playAgainBtn.addEventListener('click', () => {
  gameOver.classList.add('hidden');
  lobby.classList.remove('hidden');
  if (engine) engine.stop();
  location.reload();
});
