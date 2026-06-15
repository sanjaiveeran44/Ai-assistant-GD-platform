const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            index: true
        },

        userId: {
            type: String,
            required: true
        },

        userName: {
            type: String,
            required: true,
            trim: true
        },

        communicationScore: {
            type: Number,
            required: true,
            min: 0,
            max: 10
        },

        confidenceScore: {
            type: Number,
            required: true,
            min: 0,
            max: 10
        },

        grammarScore: {
            type: Number,
            required: true,
            min: 0,
            max: 10
        },

        participationScore: {
            type: Number,
            required: true,
            min: 0,
            max: 10
        },

        strengths: {
            type: [String],
            default: []
        },

        improvements: {
            type: [String],
            default: []
        },

        summary: {
            type: String,
            default: ""
        },

        generatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false
    }
);

module.exports = mongoose.model("Feedback", feedbackSchema);