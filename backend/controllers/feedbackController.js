const Feedback = require("../models/Feedback");
const Transcript = require("../models/Transcript");
const { generateFeedback } = require("../services/groqService");

const getRoomFeedback = async (req, res) => {
  try {
    // userId comes from the authenticated JWT (set by authMiddleware)
    const { roomId } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    console.log('[feedback] request roomId:', roomId, 'userId:', userId);

    // Return cached feedback for this specific user+room if it already exists
    const existingFeedback = await Feedback.find({ roomId, userId });
    if (existingFeedback.length > 0) {
      console.log('[feedback] returning cached feedback for userId:', userId);
      return res.json(existingFeedback);
    }

    // Fetch only this user's transcripts for the room
    const userTranscripts = await Transcript.find({ roomId, userId }).sort({ startTimestamp: 1 });

    console.log('[feedback] transcripts found for userId', userId, ':', userTranscripts.length);

    if (userTranscripts.length === 0) {
      return res.status(404).json({ error: "No transcripts found for this user in this room" });
    }

    // Generate AI feedback using only this user's transcripts
    const aiFeedbackArray = await generateFeedback(userTranscripts);

    if (!Array.isArray(aiFeedbackArray) || aiFeedbackArray.length === 0) {
      throw new Error("Groq did not return a valid feedback array");
    }

    // Use the first element — we sent one user's transcripts so expect one result.
    // Override userId/userName with the authenticated values to prevent AI hallucination.
    const aiFeedback = aiFeedbackArray[0];

    const feedbackDoc = {
      roomId,
      userId,
      userName: userName || aiFeedback.userName,
      communicationScore: aiFeedback.communicationScore,
      confidenceScore: aiFeedback.confidenceScore,
      grammarScore: aiFeedback.grammarScore,
      participationScore: aiFeedback.participationScore,
      strengths: aiFeedback.strengths,
      improvements: aiFeedback.improvements,
      summary: aiFeedback.summary,
    };

    console.log('[feedback] saving feedback for userId:', userId);
    const saved = await Feedback.create(feedbackDoc);

    return res.json([saved]);
  } catch (error) {
    console.error("[feedback] error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { getRoomFeedback };
