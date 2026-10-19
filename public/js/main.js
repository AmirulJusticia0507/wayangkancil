// Wayang Kancil - Socket connection & UI handler

const socket = io();

// DOM elements
const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('gameContainer');
const gameOver = document.getElementById('gameOver');

const playerNameInput = document.getElementById('playerName');
const characterSelect = document.getElementById('characterSelect');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const statusMsg = document.getElementById('statusMsg');

const hudRoom = document.getElementById('hudRoom');
const hudCharacter = document.getElementById('hudCharacter');
const hudScore = document.getElementById('hudScore');
const hudTimer = document.getElementById('hudTimer');

const finalScores = document.getElementById('finalScores');
const moralStory = document.getElementById('moralStory');
const playAgainBtn = document.getElementById('playAgainBtn');

// Game state
let myPlayerId = null;
let myRoom = null;
let myCharacter = null;

// Join room
joinBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const character = characterSelect.value;
  const roomId = roomIdInput.value.trim();

  if (!playerName || !roomId) {
    statusMsg.textContent = 'Nama dan Room ID wajib diisi.';
    statusMsg.classList.remove('hidden');
    return;
  }

  statusMsg.classList.add('hidden');

  socket.emit('joinRoom', { roomId, playerName, character });

  myRoom = roomId;
  myCharacter = character;

  // Switch to game view
  lobby.classList.add('hidden');
  gameContainer.classList.remove('hidden');

  hudRoom.textContent = roomId;
  hudCharacter.textContent = character;

  // Start game loop
  initGame();
});

// Listen for movement updates from server (other players)
socket.on('playerMoved', (data) => {
  if (data.playerId === myPlayerId) return; // skip self
  updateRemotePlayer(data);
});

// Listen for ability events
socket.on('useAbility', (data) => {
  triggerAbilityEffect(data);
});

// Listen for game over
socket.on('gameOver', ({ winner, finalScores: scores }) => {
  gameContainer.classList.add('hidden');
  gameOver.classList.remove('flex');

  let scoreHtml = '<h3 class="text-lg font-bold text-yellow-400 mb-2">Skor Akhir</h3><ul class="text-left list-disc list-inside mb-4">';
  for (const [id, score] of Object.entries(scores)) {
    scoreHtml += `<li>${id}: ${score}</li>`;
  }
  scoreHtml += '</ul>';
  finalScores.innerHTML = scoreHtml;

  // Traditional moral lesson (piwulang)
  moralStory.textContent =
    '"Kecerdikan lebih berharga dari kekuatan. Jangan simply percaya pada penampilan luar, dan selalu taat pada kebenaran."';
});

// Init canvas game loop
function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Simple player state
  const player = {
    id: myPlayerId || socket.id,
    name: playerNameInput.value.trim(),
    character: myCharacter,
    x: canvas.width / 2,
    y: canvas.height / 2,
    direction: 'right',
    actionState: 'idle',
  };

  // Notify server of our id
  myPlayerId = player.id;

  // Input handling
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Send movement to server at ~30 FPS
  setInterval(() => {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { dx = -4; player.direction = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { dx = 4; player.direction = 'right'; }
    if (keys['ArrowUp'] || keys['KeyW']) dy = -4;
    if (keys['ArrowDown'] || keys['KeyS']) dy = 4;

    player.x += dx;
    player.y += dy;
    player.actionState = (dx !== 0 || dy !== 0) ? 'moving' : 'idle';

    // Clamp to canvas
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

  // Simple silhouette (rectangle = placeholder until puppet assets added)
  const size = 40;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.direction === 'left') ctx.scale(-1, 1);
  ctx.fillStyle = '#1a1a1a'; // Wayang shadow color
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();

  // Name label
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(player.name, player.x, player.y - size / 2 - 8);

  // Score / timer HUD update (mock)
  hudScore.textContent = Math.floor(player.x / 10);
}

function updateRemotePlayer(data) {
  // Remote player rendering will be handled by gameEngine.js
  // Placeholder for now
}

function triggerAbilityEffect(data) {
  // Placeholder for ability effects
}

playAgainBtn.addEventListener('click', () => {
  gameOver.classList.add('hidden');
  lobby.classList.remove('hidden');
  location.reload();
});
