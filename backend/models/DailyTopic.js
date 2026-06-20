const mongoose = require('mongoose');

const dailyTopicSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    topic: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
    },
    date: {
      type: String,
      required: true,
      unique: true, // YYYY-MM-DD
    },
  },
  {
    timestamps: true,
    id: false,
  }
);

module.exports = mongoose.model('DailyTopic', dailyTopicSchema);
