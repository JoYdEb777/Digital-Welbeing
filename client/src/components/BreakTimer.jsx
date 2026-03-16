// client/src/components/BreakTimer.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const BREAK_REMINDER_INTERVAL = 45 * 60; // 45 minutes in seconds

const defaultSuggestions = [
  {
    type: 'stretch',
    title: 'Stretch Break',
    description: 'Stand up and do gentle stretches. Roll your shoulders, touch your toes, and twist your torso.',
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
    title: 'Eye Rest (20-20-20)',
    description: 'Look at something 20 feet away for 20 seconds. Blink 20 times slowly to prevent eye strain.',
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
    title: 'Deep Breathing',
    description: 'Practice 4-7-8 breathing: Inhale for 4s, hold for 7s, exhale for 8s. Repeat 4 times.',
    duration: '2 minutes',
    icon: '🌬️',
    benefits: ['Reduces stress', 'Lowers heart rate', 'Improves oxygen flow'],
  },
  {
    type: 'mindfulness',
    title: 'Mindful Moment',
    description: 'Close your eyes and focus on breathing for one minute. Notice sounds without judgment.',
    duration: '1-2 minutes',
    icon: '🧠',
    benefits: ['Reduces anxiety', 'Improves focus', 'Promotes calm'],
  },
];

export default function BreakTimer() {
  const { user } = useAuth();
  const { get } = useApi();
  const [countdown, setCountdown] = useState(BREAK_REMINDER_INTERVAL);
  const [isRunning, setIsRunning] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  const [currentSuggestion, setCurrentSuggestion] = useState(defaultSuggestions[0]);
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  // Socket.io connection
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      if (user?._id) {
        socket.emit('join', user._id);
      }
    });

    socket.on('breakReminder', (data) => {
      setShowAlert(true);
      if (data?.suggestions) {
        const randomIdx = Math.floor(Math.random() * data.suggestions.length);
        setCurrentSuggestion({
          ...defaultSuggestions.find((s) => s.type === data.suggestions[randomIdx]?.type) || defaultSuggestions[0],
        });
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch suggestions from API
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await get('/breaks/suggest');
        if (res?.allSuggestions) {
          setSuggestions(res.allSuggestions);
        }
        if (res?.recommendation) {
          setCurrentSuggestion(res.recommendation);
        }
      } catch {
        // Use default suggestions
      }
    };
    fetchSuggestions();
  }, [get]);

  const startCountdown = useCallback(() => {
    setIsRunning(true);
    setShowAlert(false);
    setCountdown(BREAK_REMINDER_INTERVAL);

    if (socketRef.current?.connected && user?._id) {
      socketRef.current.emit('startScreenTime', user._id);
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setShowAlert(true);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [user]);

  const stopCountdown = useCallback(() => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setCountdown(BREAK_REMINDER_INTERVAL);

    if (socketRef.current?.connected) {
      socketRef.current.emit('stopScreenTime');
    }
  }, []);

  const takeBreak = () => {
    setShowAlert(false);
    setBreaksTaken((prev) => prev + 1);
    const randomIdx = Math.floor(Math.random() * suggestions.length);
    setCurrentSuggestion(suggestions[randomIdx]);
  };

  const dismissAlert = () => {
    setShowAlert(false);
    startCountdown(); // Restart the countdown
  };

  const nextSuggestion = () => {
    const currentIdx = suggestions.findIndex((s) => s.type === currentSuggestion.type);
    const nextIdx = (currentIdx + 1) % suggestions.length;
    setCurrentSuggestion(suggestions[nextIdx]);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((BREAK_REMINDER_INTERVAL - countdown) / BREAK_REMINDER_INTERVAL) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Break Reminders</h1>
          <p className="text-surface-200/50 mt-1">Stay healthy with timely break alerts every 45 minutes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-surface-200/40">
            {socketConnected ? 'Live alerts active' : 'Offline mode'}
          </span>
        </div>
      </div>

      {/* Break Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-md w-full mx-4 break-alert border-2 border-yellow-500/30 glow-warning">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⏰</div>
              <h2 className="text-2xl font-bold text-white mb-2">Time for a Break!</h2>
              <p className="text-surface-200/60 mb-6">
                You've been using your screen for 45 minutes. Give your body and mind a rest.
              </p>

              <div className="glass-card p-5 mb-6 text-left !bg-surface-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{currentSuggestion.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{currentSuggestion.title}</p>
                    <p className="text-xs text-surface-200/40">{currentSuggestion.duration}</p>
                  </div>
                </div>
                <p className="text-sm text-surface-200/70 mb-3">{currentSuggestion.description}</p>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestion.benefits?.map((b, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-primary-500/10 text-primary-300 rounded-full border border-primary-500/20">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={takeBreak}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all btn-glow"
                >
                  ✅ Take Break
                </button>
                <button
                  onClick={dismissAlert}
                  className="flex-1 py-3 bg-surface-800/50 border border-surface-700/50 text-surface-200/70 font-semibold rounded-xl hover:bg-surface-800 transition-all"
                >
                  ⏭ Snooze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timer and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countdown Timer */}
        <div className="glass-card p-8 flex flex-col items-center" id="break-timer">
          <h2 className="text-lg font-semibold text-white mb-6">⏱️ Screen Time Countdown</h2>

          {/* Progress bar */}
          <div className="w-full h-3 bg-surface-800/50 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                progress > 80 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                progress > 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={`text-6xl font-bold font-mono mb-2 ${
            countdown <= 60 ? 'text-red-400 animate-pulse' :
            countdown <= 300 ? 'text-yellow-400' :
            'text-white'
          }`}>
            {formatTime(countdown)}
          </div>
          <p className="text-sm text-surface-200/40 mb-6">
            {isRunning ? 'Until next break reminder' : 'Press start to begin tracking'}
          </p>

          <div className="flex gap-3 w-full max-w-xs">
            {!isRunning ? (
              <button
                id="break-start-btn"
                onClick={startCountdown}
                className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all transform hover:scale-105 active:scale-95 btn-glow"
              >
                ▶ Start Timer
              </button>
            ) : (
              <button
                onClick={stopCountdown}
                className="flex-1 py-3 bg-surface-800/50 border border-surface-700/50 text-surface-200/70 font-semibold rounded-xl hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-all"
              >
                ⏹ Stop
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-surface-200/40">Breaks taken today</p>
            <p className="text-3xl font-bold text-green-400">{breaksTaken}</p>
          </div>
        </div>

        {/* Current Suggestion */}
        <div className="space-y-4">
          <div className="glass-card p-6" id="break-suggestion">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">💡 Break Suggestion</h2>
              <button
                onClick={nextSuggestion}
                className="text-xs px-3 py-1 bg-surface-800/50 text-surface-200/50 rounded-lg hover:text-primary-300 hover:bg-primary-500/10 transition-all"
              >
                Next →
              </button>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-xl bg-surface-800/30 border border-surface-700/30">
              <div className="text-4xl flex-shrink-0">{currentSuggestion.icon}</div>
              <div>
                <h3 className="font-semibold text-white text-lg">{currentSuggestion.title}</h3>
                <p className="text-xs text-primary-400 mb-2">{currentSuggestion.duration}</p>
                <p className="text-sm text-surface-200/60 mb-3">{currentSuggestion.description}</p>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestion.benefits?.map((b, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-green-500/10 text-green-300 rounded-full border border-green-500/20">
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* All Break Types */}
          <div className="glass-card p-6" id="break-types">
            <h2 className="text-lg font-semibold text-white mb-4">🎯 Break Types</h2>
            <div className="grid grid-cols-2 gap-3">
              {suggestions.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSuggestion(s)}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    currentSuggestion.type === s.type
                      ? 'border-primary-500/40 bg-primary-500/10'
                      : 'border-surface-700/30 bg-surface-800/20 hover:border-surface-700/60'
                  }`}
                >
                  <span className="text-2xl block mb-1">{s.icon}</span>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-surface-200/40">{s.duration}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
