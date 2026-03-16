// server/routes/breakRoutes.js
const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

const breakSuggestions = [
  {
    type: 'stretch',
    title: 'Stretch Break',
    description: 'Stand up and do some gentle stretches. Roll your shoulders, touch your toes, and twist your torso.',
    duration: '2-3 minutes',
    icon: '🧘',
    benefits: ['Reduces muscle tension', 'Improves circulation', 'Boosts energy'],
  },
  {
    type: 'hydrate',
    title: 'Hydration Break',
    description: 'Drink a full glass of water. Staying hydrated improves focus and reduces headaches.',
    duration: '1-2 minutes',
    icon: '💧',
    benefits: ['Improves concentration', 'Prevents headaches', 'Boosts metabolism'],
  },
  {
    type: 'eyeRest',
    title: 'Eye Rest (20-20-20 Rule)',
    description: 'Look at something 20 feet away for 20 seconds. Blink 20 times slowly. This prevents eye strain.',
    duration: '1 minute',
    icon: '👁️',
    benefits: ['Reduces eye strain', 'Prevents dry eyes', 'Helps refocus vision'],
  },
  {
    type: 'walk',
    title: 'Quick Walk',
    description: 'Take a short walk around your room or outside. Move your body and get some fresh air.',
    duration: '3-5 minutes',
    icon: '🚶',
    benefits: ['Clears the mind', 'Improves mood', 'Increases blood flow'],
  },
  {
    type: 'breathing',
    title: 'Deep Breathing Exercise',
    description: 'Practice 4-7-8 breathing: Inhale for 4 seconds, hold for 7, exhale for 8. Repeat 4 times.',
    duration: '2 minutes',
    icon: '🌬️',
    benefits: ['Reduces stress', 'Lowers heart rate', 'Improves oxygen flow'],
  },
  {
    type: 'mindfulness',
    title: 'Mindful Moment',
    description: 'Close your eyes and focus on your breathing for one minute. Notice the sounds around you without judgment.',
    duration: '1-2 minutes',
    icon: '🧠',
    benefits: ['Reduces anxiety', 'Improves focus', 'Promotes calm'],
  },
];

// GET /api/breaks/suggest — return a break recommendation
router.get('/suggest', auth, (req, res) => {
  try {
    const randomIndex = Math.floor(Math.random() * breakSuggestions.length);
    const suggestion = breakSuggestions[randomIndex];

    // Also return all suggestions for the UI to cycle through
    res.json({
      recommendation: suggestion,
      allSuggestions: breakSuggestions,
    });
  } catch (err) {
    console.error('[Breaks] Suggest error:', err.message);
    res.status(500).json({ message: 'Server error fetching break suggestion.' });
  }
});

module.exports = router;
