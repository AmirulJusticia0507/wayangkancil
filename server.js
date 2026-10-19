const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Room management ----------
// rooms: Map<roomId, { players: Map<socket.id, playerData>, createdAt }>
const rooms = new Map();

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

  socket.on('createRoom', ({ playerName, character }) => {
    const roomId = generateRoomId();
    const room = addPlayerToRoom(roomId, socket.id, {
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
    socket.data.isHost = true;

    socket.emit('roomCreated', {
      roomId,
      isHost: true,
      roomState: getRoomState(roomId),
    });

    console.log(`Room created: ${roomId} by ${playerName}`);
  });

  socket.on('joinRoom', ({ roomId, playerName, character }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room tidak ditemukan.' });
      return;
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

    socket.emit('roomJoined', {
      roomId,
      isHost: false,
      roomState: getRoomState(roomId),
    });

    io.to(roomId).emit('roomState', getRoomState(roomId));
    console.log(`${playerName} joined room ${roomId}`);
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

    io.to(roomId).emit('gameStarted', { roomId });
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
setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.size === 0) continue;

    const players = {};
    for (const [id, p] of room.players.entries()) {
      players[id] = {
        x: p.x,
        y: p.y,
        direction: p.direction,
        actionState: p.actionState,
      };
    }

    io.to(roomId).emit('gameStateUpdate', {
      players,
      timer: Math.floor((Date.now() - room.createdAt) / 1000),
    });
  }
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
