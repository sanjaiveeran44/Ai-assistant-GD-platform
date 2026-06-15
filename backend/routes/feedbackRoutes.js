const express = require('express');
const router = express.Router();
const { getRoomFeedback, getRoomLeaderboard } = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, getRoomFeedback);
router.get('/leaderboard', authMiddleware, getRoomLeaderboard);

module.exports = router;
