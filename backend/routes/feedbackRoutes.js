const express = require('express');
const router = express.Router();
const { getRoomFeedback } = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, getRoomFeedback);

module.exports = router;
