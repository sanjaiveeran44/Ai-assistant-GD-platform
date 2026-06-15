const Room = require('../models/Room');
const Transcript = require('../models/Transcript');

module.exports = (io) => {
  // { roomId: { participants: [...], buzzerStatus: {...} } }
  const activeRooms = {};

  io.on('connection', (socket) => {

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on('join-room', ({ roomId, userId, userName }) => {
      socket.join(roomId);

      if (!activeRooms[roomId]) {
        activeRooms[roomId] = {
          participants: [],
          buzzerStatus: { occupied: false, userId: null, userName: null },
        };
      }

      const room = activeRooms[roomId];
      const existing = room.participants.find(p => p.userId === userId);

      if (!existing) {
        room.participants.push({ userId, userName, status: 'online', joinedAt: new Date().toISOString(), socketId: socket.id });
      } else {
        existing.status = 'online';
        existing.socketId = socket.id;
      }

      socket.emit('buzzer-update', room.buzzerStatus);
      io.to(roomId).emit('participant-update', room.participants);
    });

    // ── GD Start / End ───────────────────────────────────────────────────────
    socket.on('gd-start', async ({ roomId }) => {
      try {
        await Room.findOneAndUpdate({ id: roomId }, { status: 'active' });
        io.to(roomId).emit('gd-start');
      } catch (err) {
        console.error('gd-start error:', err);
      }
    });

    socket.on('gd-end', async ({ roomId }) => {
      try {
        await Room.findOneAndUpdate({ id: roomId }, { status: 'ended' });
        io.to(roomId).emit('gd-end');
      } catch (err) {
        console.error('gd-end error:', err);
      }
    });

    // ── Topic Update (broadcast after host generates via API) ────────────────
    socket.on('topic-generated', ({ roomId, topic }) => {
      // Relay to all participants in the room
      io.to(roomId).emit('topic-update', { topic });
    });

    // ── Buzzer ───────────────────────────────────────────────────────────────
    socket.on('buzzer-request', ({ roomId, userId, userName }) => {
      const room = activeRooms[roomId];
      if (room && !room.buzzerStatus.occupied) {
        room.buzzerStatus = { occupied: true, userId, userName };
        io.to(roomId).emit('buzzer-update', room.buzzerStatus);
      }
    });

    socket.on('buzzer-release', ({ roomId, userId }) => {
      const room = activeRooms[roomId];
      if (room && room.buzzerStatus.occupied && room.buzzerStatus.userId === userId) {
        room.buzzerStatus = { occupied: false, userId: null, userName: null };
        io.to(roomId).emit('buzzer-update', room.buzzerStatus);
      }
    });

    // ── Transcript ───────────────────────────────────────────────────────────
    socket.on('transcript-update', async ({ roomId, userId, userName, startTimestamp, endTimestamp, transcript }) => {
      const duration = endTimestamp - startTimestamp;
      const doc = { roomId, userId, userName, startTimestamp, endTimestamp, duration, transcript };

      io.to(roomId).emit('transcript-received', { ...doc, createdAt: new Date().toISOString() });

      try {
        await Transcript.create(doc);
      } catch (err) {
        console.error('[transcript] DB save error:', err.message);
      }
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const roomId in activeRooms) {
        const room = activeRooms[roomId];
        const participant = room.participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.status = 'offline';
          if (room.buzzerStatus.userId === participant.userId) {
            room.buzzerStatus = { occupied: false, userId: null, userName: null };
            io.to(roomId).emit('buzzer-update', room.buzzerStatus);
          }
          io.to(roomId).emit('participant-update', room.participants);
        }
      }
    });

    socket.on('leave-room', ({ roomId, userId }) => {
      socket.leave(roomId);
      const room = activeRooms[roomId];
      if (room) {
        const p = room.participants.find(p => p.userId === userId);
        if (p) {
          p.status = 'offline';
          io.to(roomId).emit('participant-update', room.participants);
        }
      }
    });
  });
};
