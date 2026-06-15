const express = require('express');
const router = express.Router();
const { createRoom, getRoom, getRecentRooms, generateRoomTopic } = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createRoom);
router.get('/recent', authMiddleware, getRecentRooms);
router.get('/:id', authMiddleware, getRoom);
router.post('/:id/topic', authMiddleware, generateRoomTopic);

module.exports = router;
