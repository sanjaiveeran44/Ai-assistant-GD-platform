const Feedback = require("../models/Feedback");
const Transcript = require("../models/Transcript");
const { generateFeedback } = require("../services/groqService");

const getRoomFeedback = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    // Return cached feedback if it already exists
    const existingFeedbacks = await Feedback.find({ roomId });
    if (existingFeedbacks.length > 0) {
      return res.json(existingFeedbacks);
    }

    // Fetch transcripts for this room
    const roomTranscripts = await Transcript.find({ roomId }).sort({ startTimestamp: 1 });

    if (roomTranscripts.length === 0) {
      return res.status(404).json({ error: "No transcripts found for this room" });
    }

    // Generate AI feedback
    const aiFeedbackArray = await generateFeedback(roomTranscripts);

    if (!Array.isArray(aiFeedbackArray)) {
      throw new Error("Groq did not return an array");
    }

    // Build and save feedback documents
    const feedbackDocs = aiFeedbackArray.map((feedback) => ({
      roomId,
      userId: feedback.userId,
      userName: feedback.userName,
      communicationScore: feedback.communicationScore,
      confidenceScore: feedback.confidenceScore,
      grammarScore: feedback.grammarScore,
      participationScore: feedback.participationScore,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      summary: feedback.summary,
    }));

    const savedFeedbacks = await Feedback.insertMany(feedbackDocs);

    return res.json(savedFeedbacks);
  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { getRoomFeedback };
