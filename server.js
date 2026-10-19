const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Room management ----------
// rooms: Map<roomId, { players: Map<socket.id, playerData>, createdAt, episodeId, votes }>
const rooms = new Map();

// ---------- Sistem Musim (Phase 8.7) ----------
const SEASONS = {
  hujan: {
    label: 'Musim Hujan',
    itemTypes: ['cucumber', 'mushroom'],
    spawnRateMultiplier: 1.2,
    itemValueMultiplier: 1.0,
    bgColor: '#1a2e2a',
    icon: '🌧️',
  },
  kemarau: {
    label: 'Musim Kemarau',
    itemTypes: ['cactus', 'berry'],
    spawnRateMultiplier: 0.8,
    itemValueMultiplier: 1.3,
    bgColor: '#5d4037',
    icon: '☀️',
  },
  panas: {
    label: 'Musim Panas',
    itemTypes: ['cucumber', 'melon'],
    spawnRateMultiplier: 1.0,
    itemValueMultiplier: 1.1,
    bgColor: '#4a2e18',
    icon: '🔥',
  },
  transition: {
    label: 'Pancaroba',
    itemTypes: ['cucumber', 'leaf'],
    spawnRateMultiplier: 0.9,
    itemValueMultiplier: 0.9,
    bgColor: '#3a4a2a',
    icon: '🍃',
  },
};

function getSeasonForRoom(room) {
  // Musim bergantian setiap 5 menit berdasarkan waktu pembuatan room
  const cycleMinutes = 5;
  const elapsedMinutes = (Date.now() - room.createdAt) / (1000 * 60);
  const cycleIndex = Math.floor(elapsedMinutes / cycleMinutes) % 4;
  const keys = Object.keys(SEASONS);
  return keys[cycleIndex];
}

function getSeasonInfo(seasonId) {
  return SEASONS[seasonId] || SEASONS.transition;
}

function generateRoomId() {
  return 'KNC' + Math.floor(1000 + Math.random() * 9000);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function addPlayerToRoom(roomId, socketId, playerData) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      createdAt: Date.now(),
      votes: {}, // episodeId -> count
    };
    rooms.set(roomId, room);
  }
  room.players.set(socketId, {
    ...playerData,
    socketId,
    isHost: room.players.size === 0, // first player is host
    joinedAt: Date.now(),
  });
  return room;
}

function removePlayerFromRoom(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.has(socketId)) {
      const leaving = room.players.get(socketId);
      room.players.delete(socketId);

      if (room.players.size === 0) {
        rooms.delete(roomId);
        return { roomId, room: null };
      }

      // Transfer host if leaving player was host
      if (leaving && leaving.isHost) {
        const first = room.players.values().next().value;
        if (first) first.isHost = true;
      }

      return { roomId, room };
    }
  }
  return null;
}

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId,
    episodeId: room.episodeId || null,
    votes: room.votes || {},
    playerCount: room.players.size,
    players: Array.from(room.players.entries()).map(([id, p]) => ({
      id,
      name: p.playerName || p.name,
      character: p.character,
      isHost: p.isHost,
      x: p.x,
      y: p.y,
      direction: p.direction,
      actionState: p.actionState,
    })),
  };
}

// ---------- Socket.io ----------
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', ({ playerName, character, episodeId }) => {
    const roomId = generateRoomId();
    const room = addPlayerToRoom(roomId, socket.id, {
      playerName,
      character,
      x: 0,
      y: 0,
      direction: 'right',
      actionState: 'idle',
    });

    // Simpan episode terpilih di room
    if (episodeId) {
      room.episodeId = episodeId;
    }

    socket.data.roomId = roomId;
    socket.data.playerName = playerName;
    socket.data.character = character;
    socket.data.isHost = true;
    socket.data.score = 0;

    socket.emit('roomCreated', {
      roomId,
      isHost: true,
      roomState: getRoomState(roomId),
    });

    console.log(`Room created: ${roomId} by ${playerName}${episodeId ? ` (episode: ${episodeId})` : ''}`);
  });

  socket.on('joinRoom', ({ roomId, playerName, character, episodeId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room tidak ditemukan.' });
      return;
    }

    // Jika room sudah punya episode, pakai episode room tersebut
    if (room.episodeId) {
      episodeId = room.episodeId;
    } else if (episodeId) {
      room.episodeId = episodeId;
    }

    addPlayerToRoom(roomId, socket.id, {
      playerName,
      character,
      x: 0,
      y: 0,
      direction: 'right',
      actionState: 'idle',
    });

    socket.data.roomId = roomId;
    socket.data.playerName = playerName;
    socket.data.character = character;
    socket.data.isHost = false;
    socket.data.score = 0;

    socket.emit('roomJoined', {
      roomId,
      isHost: false,
      roomState: getRoomState(roomId),
    });

    io.to(roomId).emit('roomState', getRoomState(roomId));
    console.log(`${playerName} joined room ${roomId}${episodeId ? ` (episode: ${episodeId})` : ''}`);
  });

  socket.on('voteEpisode', ({ episodeId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Hapus vote sebelumnya dari pemain ini (satu pemain satu vote)
    for (const ep of Object.keys(room.votes)) {
      room.votes[ep] = room.votes[ep].filter((id) => id !== socket.id);
      if (room.votes[ep] === 0) delete room.votes[ep];
    }

    // Tambah vote baru
    if (!room.votes[episodeId]) room.votes[episodeId] = [];
    if (!room.votes[episodeId].includes(socket.id)) {
      room.votes[episodeId].push(socket.id);
    }

    // Hitung jumlah vote per episode
    const voteCounts = {};
    for (const [ep, ids] of Object.entries(room.votes)) {
      voteCounts[ep] = ids.length;
    }

    io.to(roomId).emit('roomState', getRoomState(roomId));
    io.to(roomId).emit('voteUpdate', { votes: voteCounts });
    console.log(`${socket.data.playerName} voted for ${episodeId} in room ${roomId}`);
  });

  socket.on('playerMoved', ({ x, y, direction, actionState }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room && room.players.has(socket.id)) {
      const p = room.players.get(socket.id);
      p.x = x;
      p.y = y;
      p.direction = direction;
      p.actionState = actionState;
    }

    socket.to(roomId).emit('playerMoved', {
      playerId: socket.id,
      playerName: socket.data.playerName,
      character: socket.data.character,
      x,
      y,
      direction,
      actionState,
    });
  });

  socket.on('itemCollected', ({ itemId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.players.has(socket.id)) return;

    // Tambah skor pemain yang mengambil item
    const player = room.players.get(socket.id);
    player.score = (player.score || 0) + 10;

    // Broadcast ke seluruh room agar semua client hapus item & update skor
    io.to(roomId).emit('itemCollected', {
      playerId: socket.id,
      playerName: socket.data.playerName,
      itemId,
      score: player.score,
    });

    console.log(`${socket.data.playerName} collected item ${itemId} in room ${roomId}`);
  });

  socket.on('useAbility', ({ abilityId, targetPos }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    io.to(roomId).emit('useAbility', {
      playerId: socket.id,
      playerName: socket.data.playerName,
      character: socket.data.character,
      abilityId,
      targetPos,
    });
  });

  socket.on('startGame', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.players.get(socket.id)?.isHost) return;

    // Tentukan episode pemenang voting (banyak suara)
    let winningEpisode = room.episodeId || null;
    let maxVotes = 0;
    if (room.votes && Object.keys(room.votes).length > 0) {
      for (const [ep, ids] of Object.entries(room.votes)) {
        if (ids.length > maxVotes) {
          maxVotes = ids.length;
          winningEpisode = ep;
        }
      }
    }

    io.to(roomId).emit('gameStarted', {
      roomId,
      episodeId: winningEpisode,
    });
  });

  socket.on('disconnect', () => {
    const result = removePlayerFromRoom(socket.id);
    if (result && result.room) {
      io.to(result.roomId).emit('roomState', getRoomState(result.roomId));
      io.to(result.roomId).emit('playerLeft', { playerId: socket.id });
    } else if (result && result.room === null) {
      // room deleted, nothing to broadcast
    }
    console.log('Player disconnected:', socket.id);
  });
});

// Periodic world state sync (~30 FPS) for rooms that have started
const gameStateInterval = setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.size === 0) continue;

    const players = {};
    const scores = {};
    for (const [id, p] of room.players.entries()) {
      players[id] = {
        x: p.x,
        y: p.y,
        direction: p.direction,
        actionState: p.actionState,
      };
      scores[id] = {
        name: p.playerName || p.name || id.slice(-4),
        character: p.character,
        score: p.score || 0,
        isHost: p.isHost,
      };
    }

    const seasonId = getSeasonForRoom(room);
    const seasonInfo = getSeasonInfo(seasonId);

    io.to(roomId).emit('gameStateUpdate', {
      players,
      scores,
      season: seasonId,
      seasonInfo,
      timer: Math.floor((Date.now() - room.createdAt) / 1000),
    });
  }
}, 1000 / 30);
gameStateInterval.unref();

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
