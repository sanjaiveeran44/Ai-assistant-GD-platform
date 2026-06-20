const express = require('express');
const {
  getTodayTopic,
  submitChallenge,
  getHistory,
  getStreak,
} = require('../controllers/dailyChallengeController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/topic', getTodayTopic);
router.post('/start', getTodayTopic); // Currently just returns the topic
router.post('/submit', submitChallenge);
router.get('/history/:userId', getHistory);
router.get('/streak/:userId', getStreak);

module.exports = router;
