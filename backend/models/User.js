const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true,
        id: false  // disable Mongoose virtual 'id' so our custom 'id' field is used directly
    }
);

module.exports = mongoose.model("User", userSchema);