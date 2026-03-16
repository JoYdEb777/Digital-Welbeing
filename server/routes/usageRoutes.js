// server/routes/usageRoutes.js
const express = require('express');
const AppLog = require('../models/AppLog');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/usage/log — log an app usage entry
router.post('/log', auth, async (req, res) => {
  try {
    const { appName, category, duration, date } = req.body;

    if (!appName || !category || duration === undefined) {
      return res.status(400).json({ message: 'appName, category, and duration are required.' });
    }

    const log = new AppLog({
      userId: req.user.id,
      appName,
      category,
      duration,
      date: date || new Date(),
    });

    await log.save();

    res.status(201).json({ message: 'Usage logged successfully.', log });
  } catch (err) {
    console.error('[Usage] Log error:', err.message);
    res.status(500).json({ message: 'Server error logging usage.' });
  }
});

// GET /api/usage/daily — fetch today's usage stats
router.get('/daily', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await AppLog.aggregate([
      {
        $match: {
          userId: req.user.id.constructor === String
            ? require('mongoose').Types.ObjectId.createFromHexString(req.user.id)
            : req.user.id,
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: '$category',
          totalDuration: { $sum: '$duration' },
          apps: {
            $push: {
              appName: '$appName',
              duration: '$duration',
            },
          },
        },
      },
      { $sort: { totalDuration: -1 } },
    ]);

    const totalScreenTime = logs.reduce((sum, l) => sum + l.totalDuration, 0);

    res.json({
      date: today.toISOString().split('T')[0],
      totalScreenTime,
      categories: logs.map((l) => ({
        category: l._id,
        totalDuration: l.totalDuration,
        apps: l.apps,
      })),
    });
  } catch (err) {
    console.error('[Usage] Daily error:', err.message);
    res.status(500).json({ message: 'Server error fetching daily usage.' });
  }
});

// GET /api/usage/weekly — fetch last 7 days usage stats
router.get('/weekly', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const logs = await AppLog.aggregate([
      {
        $match: {
          userId: req.user.id.constructor === String
            ? require('mongoose').Types.ObjectId.createFromHexString(req.user.id)
            : req.user.id,
          date: { $gte: weekAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            category: '$category',
          },
          totalDuration: { $sum: '$duration' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Find the most used app
    const mostUsedApp = await AppLog.aggregate([
      {
        $match: {
          userId: req.user.id.constructor === String
            ? require('mongoose').Types.ObjectId.createFromHexString(req.user.id)
            : req.user.id,
          date: { $gte: weekAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: '$appName',
          totalDuration: { $sum: '$duration' },
          category: { $first: '$category' },
        },
      },
      { $sort: { totalDuration: -1 } },
      { $limit: 1 },
    ]);

    res.json({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      dailyBreakdown: logs,
      mostUsedApp: mostUsedApp[0] || null,
    });
  } catch (err) {
    console.error('[Usage] Weekly error:', err.message);
    res.status(500).json({ message: 'Server error fetching weekly usage.' });
  }
});

module.exports = router;
