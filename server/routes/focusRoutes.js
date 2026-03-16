// server/routes/focusRoutes.js
const express = require('express');
const Session = require('../models/Session');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/focus/start — start a new focus session
router.post('/start', auth, async (req, res) => {
  try {
    const { type } = req.body;

    const session = new Session({
      userId: req.user.id,
      type: type || 'focus',
      startTime: new Date(),
    });

    await session.save();

    res.status(201).json({
      message: `${session.type} session started.`,
      session,
    });
  } catch (err) {
    console.error('[Focus] Start error:', err.message);
    res.status(500).json({ message: 'Server error starting session.' });
  }
});

// PUT /api/focus/:id/end — end a focus session
router.put('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (session.endTime) {
      return res.status(400).json({ message: 'Session already ended.' });
    }

    session.endTime = new Date();
    session.completed = req.body.completed !== undefined ? req.body.completed : true;
    await session.save();

    // Update daily goal if it was a focus session
    if (session.type === 'focus' && session.completed) {
      const durationMs = session.endTime - session.startTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await Goal.findOneAndUpdate(
        { userId: req.user.id, date: today },
        {
          $inc: { actualFocusHours: parseFloat(durationHours.toFixed(2)) },
          $setOnInsert: { targetFocusHours: 4 },
        },
        { upsert: true, new: true }
      );
    }

    // Update breaks taken count
    if (session.type === 'break' && session.completed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await Goal.findOneAndUpdate(
        { userId: req.user.id, date: today },
        {
          $inc: { breaksTaken: 1 },
          $setOnInsert: { targetFocusHours: 4 },
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Session ended.', session });
  } catch (err) {
    console.error('[Focus] End error:', err.message);
    res.status(500).json({ message: 'Server error ending session.' });
  }
});

// GET /api/focus/streak — get focus session streak count
router.get('/streak', auth, async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user.id,
      type: 'focus',
      completed: true,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const sessionDates = new Set(
      sessions.map((s) => {
        const d = new Date(s.startTime);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })
    );

    // Count consecutive days with focus sessions
    while (sessionDates.has(currentDate.toISOString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    res.json({
      streak,
      totalCompletedSessions: sessions.length,
    });
  } catch (err) {
    console.error('[Focus] Streak error:', err.message);
    res.status(500).json({ message: 'Server error fetching streak.' });
  }
});

// GET /api/focus/sessions — get recent focus sessions
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ sessions });
  } catch (err) {
    console.error('[Focus] Sessions error:', err.message);
    res.status(500).json({ message: 'Server error fetching sessions.' });
  }
});

module.exports = router;
