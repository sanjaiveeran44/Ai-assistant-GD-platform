const { v4: uuidv4 } = require('uuid');
const DailyTopic = require('../models/DailyTopic');
const DailyChallengeAttempt = require('../models/DailyChallengeAttempt');
const { generateDailyTopic, evaluateDailyChallenge } = require('../services/groqService');

// Helper to get today's date string in YYYY-MM-DD
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTodayTopic = async (req, res) => {
  try {
    const today = getTodayString();
    let topic = await DailyTopic.findOne({ date: today });

    if (!topic) {
      // Generate a new topic
      const aiResponse = await generateDailyTopic();
      topic = await DailyTopic.create({
        id: uuidv4(),
        topic: aiResponse.topic,
        category: aiResponse.category || 'General',
        difficulty: aiResponse.difficulty || 'Medium',
        date: today,
      });
    }

    return res.json(topic);
  } catch (error) {
    console.error('[dailyChallenge] getTodayTopic error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

const submitChallenge = async (req, res) => {
  try {
    const { topicId, transcript, duration } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!topicId || !transcript) {
      return res.status(400).json({ error: 'topicId and transcript are required' });
    }

    // Call Groq to evaluate
    const evaluation = await evaluateDailyChallenge(transcript, duration || 120);

    // Save attempt
    const today = getTodayString();
    
    // Convert complex feedback into JSON string to store in `feedback` field
    const feedbackData = JSON.stringify({
      betterExpression: evaluation.betterExpression,
      motivation: evaluation.motivation,
    });

    const attempt = await DailyChallengeAttempt.create({
      id: uuidv4(),
      userId,
      userName,
      topicId,
      transcript,
      duration: duration || 120,
      score: evaluation.overallScore,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      feedback: feedbackData,
      streakDate: today,
      completed: true,
    });

    return res.json(attempt);
  } catch (error) {
    console.error('[dailyChallenge] submitChallenge error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Only allow users to fetch their own history or admin
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this history' });
    }

    const attempts = await DailyChallengeAttempt.find({ userId }).sort({ createdAt: -1 });
    return res.json(attempts);
  } catch (error) {
    console.error('[dailyChallenge] getHistory error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

const getStreak = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this streak' });
    }

    const attempts = await DailyChallengeAttempt.find({ userId, completed: true }).sort({ streakDate: -1 });
    if (attempts.length === 0) return res.json({ streak: 0 });

    // Extract unique dates sorted descending
    const dates = [...new Set(attempts.map(a => a.streakDate))];
    
    let streak = 0;
    const today = getTodayString();
    const d = new Date();
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate() - 1).padStart(2, '0')}`;
    
    // Start tracking streak from today or yesterday
    let currentDateObj = new Date(dates[0]);
    
    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDateObj = new Date(dates[i]);
        // Difference in days
        const diffTime = Math.abs(currentDateObj - prevDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
          currentDateObj = prevDateObj;
        } else {
          break;
        }
      }
    } else {
      // Latest attempt is older than yesterday, streak is broken
      streak = 0;
    }

    return res.json({ streak });
  } catch (error) {
    console.error('[dailyChallenge] getStreak error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTodayTopic,
  submitChallenge,
  getHistory,
  getStreak,
};
