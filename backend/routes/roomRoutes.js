const express = require('express');
const router = express.Router();
const { createRoom, getRoom, getRecentRooms } = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createRoom);
router.get('/recent', authMiddleware, getRecentRooms);
router.get('/:id', authMiddleware, getRoom);

module.exports = router;
