const mongoose = require('mongoose');

const dailyChallengeAttemptSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    topicId: {
      type: String,
      required: true,
    },
    transcript: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
    },
    score: {
      type: Number,
    },
    strengths: {
      type: [String],
    },
    improvements: {
      type: [String],
    },
    feedback: {
      type: String, // Can store JSON string of extended feedback for Better Way to Say It and Motivation
    },
    streakDate: {
      type: String, // YYYY-MM-DD
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    id: false,
  }
);

module.exports = mongoose.model('DailyChallengeAttempt', dailyChallengeAttemptSchema);
