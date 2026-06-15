const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const roomId = uuidv4();

    const newRoom = await Room.create({
      id: roomId,
      name,
      hostId: req.user.id,
      status: 'waiting'
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const room = await Room.findOne({ id });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRecentRooms = async (req, res) => {
  try {
    // Return top 10 recent rooms sorted by createdAt descending
    const roomsArray = await Room.find().sort({ createdAt: -1 }).limit(10);
    res.json(roomsArray);
  } catch (error) {
    console.error('Get recent rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createRoom,
  getRoom,
  getRecentRooms
};
