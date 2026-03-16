// server/models/Goal.js
const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    targetFocusHours: {
      type: Number,
      default: 4,
      min: 0,
    },
    actualFocusHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    breaksTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    screenTimeUsed: {
      type: Number, // in minutes
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('Goal', goalSchema);
