const Room = require('../models/Room');
const Transcript = require('../models/Transcript');

module.exports = (io) => {
  const activeRooms = {}; // Format: { roomId: { participants: [{userId, userName, status, joinedAt}], buzzerStatus: { occupied: false, userId: null, userName: null } } }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, userId, userName }) => {
      socket.join(roomId);

      if (!activeRooms[roomId]) {
        activeRooms[roomId] = {
          participants: [],
          buzzerStatus: { occupied: false, userId: null, userName: null }
        };
      }

      const room = activeRooms[roomId];
      const existingParticipant = room.participants.find(p => p.userId === userId);

      if (!existingParticipant) {
        room.participants.push({
          userId,
          userName,
          status: 'online',
          joinedAt: new Date().toISOString(),
          socketId: socket.id
        });
      } else {
        existingParticipant.status = 'online';
        existingParticipant.socketId = socket.id;
      }

      // Send current state to the joining user
      socket.emit('buzzer-update', room.buzzerStatus);

      // Notify everyone in the room
      io.to(roomId).emit('participant-update', room.participants);
    });

    socket.on('gd-start', async ({ roomId }) => {
      try {
        await Room.findOneAndUpdate({ id: roomId }, { status: 'active' });
        io.to(roomId).emit('gd-start');
      } catch (error) {
        console.error('Socket gd-start error:', error);
      }
    });

    socket.on('gd-end', async ({ roomId }) => {
      try {
        await Room.findOneAndUpdate({ id: roomId }, { status: 'ended' });
        io.to(roomId).emit('gd-end');
      } catch (error) {
        console.error('Socket gd-end error:', error);
      }
    });

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

    socket.on('transcript-update', async ({ roomId, userId, userName, startTimestamp, endTimestamp, transcript }) => {
      console.log('[transcript-update] received payload:', { roomId, userId, userName, startTimestamp, endTimestamp, transcript: transcript?.slice(0, 60) });

      const duration = endTimestamp - startTimestamp;
      const newTranscriptObj = {
        roomId,
        userId,
        userName,
        startTimestamp,
        endTimestamp,
        duration,
        transcript,
        createdAt: new Date().toISOString()
      };

      // Broadcast to room instantly
      io.to(roomId).emit('transcript-received', newTranscriptObj);

      // Save to MongoDB
      try {
        await Transcript.create(newTranscriptObj);
        console.log('[transcript-update] saved to DB for userId:', userId);
      } catch (error) {
        console.error('[transcript-update] DB save error:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find and update the user in their active room
      for (const roomId in activeRooms) {
        const room = activeRooms[roomId];
        const participant = room.participants.find(p => p.socketId === socket.id);
        
        if (participant) {
          participant.status = 'offline';
          
          // Auto release buzzer if holding it
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
        const pIndex = room.participants.findIndex(p => p.userId === userId);
        if (pIndex !== -1) {
          room.participants[pIndex].status = 'offline';
          io.to(roomId).emit('participant-update', room.participants);
        }
      }
    });
  });
};
