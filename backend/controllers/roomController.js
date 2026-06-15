const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');
const { generateTopic } = require('../services/groqService');

const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const newRoom = await Room.create({
      id: uuidv4(),
      name,
      hostId: req.user.id,
      status: 'waiting',
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ id: req.params.id });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRecentRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 }).limit(10);
    res.json(rooms);
  } catch (error) {
    console.error('Get recent rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/rooms/:id/topic — host only
const generateRoomTopic = async (req, res) => {
  try {
    const room = await Room.findOne({ id: req.params.id });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only the host can generate a topic' });
    }

    const topic = await generateTopic();

    // Store in description field — no schema change
    room.description = topic;
    await room.save();

    res.json({ topic });
  } catch (error) {
    console.error('Generate topic error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

module.exports = { createRoom, getRoom, getRecentRooms, generateRoomTopic };
