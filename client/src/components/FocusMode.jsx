// client/src/components/FocusMode.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

export default function FocusMode() {
  const { post, put, get } = useApi();
  const [mode, setMode] = useState('idle'); // idle | focus | break | done
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [sessionId, setSessionId] = useState(null);
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streakRes, sessionsRes] = await Promise.all([
          get('/focus/streak'),
          get('/focus/sessions'),
        ]);
        if (streakRes) {
          setStreak(streakRes.streak || 0);
          setTotalSessions(streakRes.totalCompletedSessions || 0);
        }
        if (sessionsRes?.sessions) {
          setSessionHistory(sessionsRes.sessions.slice(0, 5));
          const today = new Date().toDateString();
          const todayCompleted = sessionsRes.sessions.filter(
            (s) => s.completed && s.type === 'focus' && new Date(s.startTime).toDateString() === today
          ).length;
          setCompletedToday(todayCompleted);
        }
      } catch {
        // Use defaults
      }
    };
    fetchData();
  }, [get]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ---- Define callbacks BEFORE the useEffect that references them ----

  const handleFocusComplete = useCallback(async () => {
    clearInterval(timerRef.current);
    setMode('done');

    // Save session completion
    if (sessionId) {
      try {
        await put(`/focus/${sessionId}/end`, { completed: true });
      } catch {
        // Silent fail
      }
    }

    setCompletedToday((prev) => prev + 1);
    setTotalSessions((prev) => prev + 1);
    setStreak((prev) => prev + 1);
  }, [sessionId, put]);

  const handleBreakComplete = useCallback(async () => {
    clearInterval(timerRef.current);
    setMode('idle');
    setTimeLeft(FOCUS_DURATION);

    if (sessionId) {
      try {
        await put(`/focus/${sessionId}/end`, { completed: true });
      } catch {
        // Silent
      }
    }
  }, [sessionId, put]);

  // ---- useEffect that depends on the callbacks (now defined above) ----

  useEffect(() => {
    if (timeLeft === 0) {
      if (mode === 'focus') {
        handleFocusComplete();
      } else if (mode === 'break') {
        handleBreakComplete();
      }
    }
  }, [timeLeft, mode, handleFocusComplete, handleBreakComplete]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startFocus = async () => {
    setMode('focus');
    setTimeLeft(FOCUS_DURATION);
    startTimer();

    try {
      const res = await post('/focus/start', { type: 'focus' });
      if (res?.session?._id) {
        setSessionId(res.session._id);
      }
    } catch {
      // Continue without DB
    }
  };

  const startBreak = async () => {
    setMode('break');
    setTimeLeft(BREAK_DURATION);
    startTimer();

    try {
      const res = await post('/focus/start', { type: 'break' });
      if (res?.session?._id) {
        setSessionId(res.session._id);
      }
    } catch {
      // Continue silently
    }
  };

  const cancelSession = async () => {
    clearInterval(timerRef.current);

    if (sessionId) {
      try {
        await put(`/focus/${sessionId}/end`, { completed: false });
      } catch {
        // Silent
      }
    }

    setMode('idle');
    setTimeLeft(FOCUS_DURATION);
    setSessionId(null);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Focus Mode</h1>
        <p className="text-surface-200/50 mt-1">Pomodoro technique — 25 min focus, 5 min break</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="focus-stats">
        <div className="glass-card p-5 text-center">
          <div className="text-3xl mb-2">🔥</div>
          <p className="text-2xl font-bold text-white">{streak}</p>
          <p className="text-xs text-surface-200/40">Day Streak</p>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-2xl font-bold text-white">{completedToday}</p>
          <p className="text-xs text-surface-200/40">Sessions Today</p>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-2xl font-bold text-white">{totalSessions}</p>
          <p className="text-xs text-surface-200/40">Total Completed</p>
        </div>
      </div>

      {/* Timer */}
      <div className="glass-card p-8 flex flex-col items-center" id="focus-timer">
        {/* Circular progress */}
        <div className="relative w-64 h-64 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
            {/* Background circle */}
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke="rgba(51, 65, 85, 0.5)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke={mode === 'break' ? '#34d399' : '#818cf8'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
              style={{
                filter: `drop-shadow(0 0 8px ${mode === 'break' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(129, 140, 248, 0.4)'})`,
              }}
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-bold font-mono text-white ${mode !== 'idle' && timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </span>
            <span className={`text-sm mt-2 font-medium ${
              mode === 'focus' ? 'text-primary-400' :
              mode === 'break' ? 'text-green-400' :
              mode === 'done' ? 'text-yellow-400' :
              'text-surface-200/40'
            }`}>
              {mode === 'focus' ? '🧠 Stay Focused' :
               mode === 'break' ? '☕ Taking a Break' :
               mode === 'done' ? '🎉 Great Work!' :
               'Ready to Focus'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          {mode === 'idle' && (
            <button
              id="focus-start-btn"
              onClick={startFocus}
              className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all transform hover:scale-105 active:scale-95 btn-glow"
            >
              ▶ Start Focus
            </button>
          )}

          {mode === 'focus' && (
            <button
              onClick={cancelSession}
              className="flex-1 py-3 bg-surface-800/50 border border-surface-700/50 text-surface-200/70 font-semibold rounded-xl hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-all"
            >
              ✕ Cancel
            </button>
          )}

          {mode === 'done' && (
            <>
              <button
                onClick={startBreak}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all btn-glow"
              >
                ☕ Take Break
              </button>
              <button
                onClick={startFocus}
                className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all btn-glow"
              >
                ▶ New Focus
              </button>
            </>
          )}

          {mode === 'break' && (
            <button
              onClick={cancelSession}
              className="flex-1 py-3 bg-surface-800/50 border border-surface-700/50 text-surface-200/70 font-semibold rounded-xl hover:bg-surface-800 transition-all"
            >
              Skip Break
            </button>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="glass-card p-6" id="focus-info">
        <h2 className="text-lg font-semibold text-white mb-4">🍅 How Pomodoro Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Focus', desc: 'Work for 25 uninterrupted minutes', icon: '🧠', color: 'from-primary-500 to-purple-500' },
            { step: '2', title: 'Break', desc: 'Take a refreshing 5-minute break', icon: '☕', color: 'from-green-500 to-emerald-500' },
            { step: '3', title: 'Repeat', desc: 'Build your streak with consistency', icon: '🔄', color: 'from-orange-500 to-red-500' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-surface-800/30">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-surface-200/40 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
