const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema(
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

        transcript: {
            type: String,
            required: true,
            trim: true
        },

        startTimestamp: {
            type: Number,
            required: true
        },

        endTimestamp: {
            type: Number,
            required: true
        },

        duration: {
            type: Number,
            required: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        versionKey: false
    }
);

module.exports = mongoose.model("Transcript", transcriptSchema);