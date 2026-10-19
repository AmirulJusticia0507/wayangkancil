// Wayang Kancil - Socket connection & UI handler

const socket = io();

// ---------- DOM ----------
const lobby = document.getElementById('lobby');
const waitingRoom = document.getElementById('waitingRoom');
const gameContainer = document.getElementById('gameContainer');
const gameOver = document.getElementById('gameOver');

const playerNameInput = document.getElementById('playerName');
const characterSelect = document.getElementById('characterSelect');
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
let isHost = false;

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
});

socket.on('playerLeft', ({ playerId }) => {
  showStatus('Satu pemain meninggalkan room.');
});

socket.on('error', ({ message }) => {
  showStatus(message);
});

socket.on('gameStarted', ({ roomId }) => {
  waitingRoom.classList.add('hidden');
  gameContainer.classList.remove('hidden');

  hudRoom.textContent = roomId;
  hudCharacter.textContent = myCharacter;

  initGame();
});

socket.on('playerMoved', (data) => {
  if (data.playerId === myPlayerId) return;
  updateRemotePlayer(data);
});

socket.on('useAbility', (data) => {
  triggerAbilityEffect(data);
});

socket.on('gameOver', ({ winner, finalScores: scores }) => {
  gameContainer.classList.add('hidden');
  gameOver.classList.remove('hidden');

  let html = '<h3 class="text-lg font-bold text-yellow-400 mb-2">Skor Akhir</h3><ul class="text-left list-disc list-inside mb-4">';
  for (const [id, score] of Object.entries(scores)) {
    html += `<li>${id}: ${score}</li>`;
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
  if (!playerName) {
    showStatus('Nama pemain wajib diisi.');
    return;
  }
  myCharacter = character;
  socket.emit('createRoom', { playerName, character });
});

joinRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const character = characterSelect.value;
  const roomId = roomIdInput.value.trim().toUpperCase();
  if (!playerName || !roomId) {
    showStatus('Nama dan Room ID wajib diisi.');
    return;
  }
  myCharacter = character;
  socket.emit('joinRoom', { roomId, playerName, character });
});

copyRoomIdBtn.addEventListener('click', () => {
  if (!roomIdInput.value) return;
  roomIdInput.select();
  document.execCommand('copy');
  showStatus('Room ID disalin.', false);
});

startGameBtn.addEventListener('click', () => {
  if (!isHost) return;
  socket.emit('startGame');
});

// ---------- Game loop (Phase 2 placeholder; full engine in Phase 3) ----------
function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const player = {
    id: myPlayerId,
    name: playerNameInput.value.trim(),
    character: myCharacter,
    x: canvas.width / 2,
    y: canvas.height / 2,
    direction: 'right',
    actionState: 'idle',
  };

  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  setInterval(() => {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { dx = -4; player.direction = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { dx = 4; player.direction = 'right'; }
    if (keys['ArrowUp'] || keys['KeyW']) dy = -4;
    if (keys['ArrowDown'] || keys['KeyS']) dy = 4;

    player.x += dx;
    player.y += dy;
    player.actionState = (dx !== 0 || dy !== 0) ? 'moving' : 'idle';

    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    socket.emit('playerMoved', {
      x: player.x,
      y: player.y,
      direction: player.direction,
      actionState: player.actionState,
    });

    draw(player, ctx);
  }, 1000 / 30);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function draw(player, ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const size = 40;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.direction === 'left') ctx.scale(-1, 1);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, player.x, player.y - size / 2 - 8);

  hudScore.textContent = Math.floor(player.x / 10);
}

function updateRemotePlayer(data) {
  // Remote player rendering handled fully in Phase 3 gameEngine.js
}

function triggerAbilityEffect(data) {
  // Placeholder for ability effects (Phase 4)
}

playAgainBtn.addEventListener('click', () => {
  gameOver.classList.add('hidden');
  lobby.classList.remove('hidden');
  location.reload();
});
