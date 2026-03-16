// server/models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['focus', 'break'],
        message: 'Type must be focus or break',
      },
      required: [true, 'Session type is required'],
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
