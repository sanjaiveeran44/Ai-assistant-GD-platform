const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
{
    id: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    hostId: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["waiting", "active", "ended"],
        default: "waiting"
    },

    participants: {
        type: Array,
        default: []
    }
},
{
    timestamps: true,
    id: false  // disable Mongoose virtual 'id' so our custom 'id' field is used directly
});

module.exports = mongoose.model("Room", roomSchema);