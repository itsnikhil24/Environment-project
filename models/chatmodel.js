const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  content: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now }, // Track when the message was sent
});

const chatSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
  ], // Store both sender and receiver
  messages: [MessageSchema], // Array of message documents
  lastUpdated: { type: Date, default: Date.now }, // Track the last message sent
}, { timestamps: true });

module.exports = mongoose.model("chat", chatSchema);