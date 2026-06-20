const Feedback = require('../models/FeedBack');
const Transcript = require('../models/Transcript');
const { generateFeedback } = require('../services/groqService');

const getRoomFeedback = async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    // Return cached feedback for this user+room
    const cached = await Feedback.find({ roomId, userId });
    if (cached.length > 0) return res.json(cached);

    // Fetch only this user's transcripts
    const userTranscripts = await Transcript.find({ roomId, userId }).sort({ startTimestamp: 1 });
    if (userTranscripts.length === 0) {
      return res.status(404).json({ error: 'No transcripts found for this user in this room' });
    }

    const aiFeedbackArray = await generateFeedback(userTranscripts);
    if (!Array.isArray(aiFeedbackArray) || aiFeedbackArray.length === 0) {
      throw new Error('Groq did not return a valid feedback array');
    }

    const ai = aiFeedbackArray[0];

    // Pack extended fields into summary as JSON so no schema change is needed.
    // The frontend will parse this to get the rich data.
    const extendedData = {
      text: ai.summary,
      fluencyScore: ai.fluencyScore ?? null,
      vocabularyScore: ai.vocabularyScore ?? null,
      logicalThinkingScore: ai.logicalThinkingScore ?? null,
      overallScore: ai.overallScore ?? null,
      betterExpressions: ai.betterExpressions ?? [],
      vocabularySuggestions: ai.vocabularySuggestions ?? [],
      communicationTips: ai.communicationTips ?? [],
      motivation: ai.motivation ?? '',
    };

    const saved = await Feedback.create({
      roomId,
      userId,
      userName: userName || ai.userName,
      communicationScore: ai.communicationScore ?? 5,
      confidenceScore: ai.confidenceScore ?? 5,
      grammarScore: ai.grammarScore ?? 5,
      participationScore: ai.participationScore ?? 5,
      strengths: ai.strengths ?? [],
      improvements: ai.improvements ?? [],
      // Store extended data as JSON string in summary field
      summary: JSON.stringify(extendedData),
    });

    return res.json([saved]);
  } catch (error) {
    console.error('[feedback] error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/feedback/leaderboard?roomId=xxx
const getRoomLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const feedbacks = await Feedback.find({ roomId });
    if (feedbacks.length === 0) return res.json([]);

    const leaderboard = feedbacks.map(fb => {
      let overallScore = null;
      try {
        const ext = JSON.parse(fb.summary);
        overallScore = ext.overallScore;
      } catch (_) {}

      // Composite rank score weighted across available dimensions
      const composite = overallScore ??
        Math.round(
          (fb.communicationScore + fb.confidenceScore + fb.grammarScore + fb.participationScore) / 4
        );

      return {
        userId: fb.userId,
        userName: fb.userName,
        communicationScore: fb.communicationScore,
        confidenceScore: fb.confidenceScore,
        grammarScore: fb.grammarScore,
        participationScore: fb.participationScore,
        overallScore: composite,
      };
    });

    leaderboard.sort((a, b) => b.overallScore - a.overallScore);
    res.json(leaderboard);
  } catch (error) {
    console.error('[leaderboard] error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getRoomFeedback, getRoomLeaderboard };
