// server/models/AppLog.js
const mongoose = require('mongoose');

const appLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appName: {
      type: String,
      required: [true, 'App name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: ['study', 'social', 'entertainment'],
        message: 'Category must be study, social, or entertainment',
      },
      required: [true, 'Category is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [0, 'Duration cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying
appLogSchema.index({ userId: 1, date: -1 });
appLogSchema.index({ userId: 1, category: 1, date: -1 });

module.exports = mongoose.model('AppLog', appLogSchema);
