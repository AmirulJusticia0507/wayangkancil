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

// Socket.io connection & room handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinRoom', ({ roomId, playerName, character }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;
    socket.data.character = character;

    io.to(roomId).emit('playerMoved', {
      playerId: socket.id,
      playerName,
      character,
      x: 0,
      y: 0,
      direction: 'right',
      actionState: 'idle',
    });

    console.log(`${playerName} (${character}) joined room ${roomId}`);
  });

  socket.on('playerMoved', ({ x, y, direction, actionState }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

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

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.to(roomId).emit('playerMoved', {
        playerId: socket.id,
        playerName: socket.data.playerName,
        character: socket.data.character,
        x: 0,
        y: 0,
        direction: 'right',
        actionState: 'disconnected',
      });
    }
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
