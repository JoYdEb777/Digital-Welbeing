// client/src/components/ScreenTime.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApi } from '../hooks/useApi';

const categoryColors = {
  study: '#818cf8',
  social: '#f472b6',
  entertainment: '#34d399',
};

const categoryLabels = {
  study: { icon: '📚', label: 'Study' },
  social: { icon: '💬', label: 'Social' },
  entertainment: { icon: '🎮', label: 'Entertainment' },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="glass-card p-3 !border-primary-500/30 text-sm">
      <p className="font-medium text-white">{data.appName}</p>
      <p className="text-surface-200/60">
        {categoryLabels[data.category]?.icon} {categoryLabels[data.category]?.label}
      </p>
      <p className="text-primary-300 font-semibold">{data.duration} min</p>
    </div>
  );
};

export default function ScreenTime() {
  const { post, get } = useApi();
  const [todayData, setTodayData] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingApp, setTrackingApp] = useState('');
  const [trackingCategory, setTrackingCategory] = useState('study');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const autoSaveRef = useRef(null);
  const refreshRef = useRef(null);
  const lastSavedMinuteRef = useRef(0);

  // Form state for manual log
  const [logForm, setLogForm] = useState({
    appName: '',
    category: 'study',
    duration: '',
  });
  const [logMessage, setLogMessage] = useState('');

  // Fetch daily data
  const fetchDaily = useCallback(async () => {
    try {
      const res = await get('/usage/daily');
      if (res?.categories?.length > 0) {
        const flatApps = res.categories.flatMap((c) =>
          c.apps.map((a) => ({ ...a, category: c.category }))
        );
        if (flatApps.length > 0) {
          setTodayData(flatApps);
          setHasLoaded(true);
          return;
        }
      }
      // If no data from API, only set hasLoaded
      setHasLoaded(true);
    } catch {
      setHasLoaded(true);
    }
  }, [get]);

  // Initial fetch
  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  // Auto-refresh usage data every 30 seconds
  useEffect(() => {
    refreshRef.current = setInterval(() => {
      fetchDaily();
    }, 30000);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchDaily]);

  const startTracking = () => {
    if (!trackingApp.trim()) return;
    setIsTracking(true);
    setElapsedTime(0);
    lastSavedMinuteRef.current = 0;
    startTimeRef.current = Date.now();

    // Timer to update elapsed time every second
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Auto-save every 60 seconds — log 1 minute of usage
    autoSaveRef.current = setInterval(async () => {
      const currentMinute = Math.floor((Date.now() - startTimeRef.current) / 60000);
      if (currentMinute > lastSavedMinuteRef.current) {
        const minutesToLog = currentMinute - lastSavedMinuteRef.current;
        lastSavedMinuteRef.current = currentMinute;
        try {
          await post('/usage/log', {
            appName: trackingApp,
            category: trackingCategory,
            duration: minutesToLog,
          });
        } catch {
          // Continue even if save fails
        }
        // Refresh chart data
        fetchDaily();
      }
    }, 60000);
  };

  const stopTracking = async () => {
    clearInterval(timerRef.current);
    clearInterval(autoSaveRef.current);
    setIsTracking(false);

    // Calculate remaining unsaved time
    const totalMinutes = Math.floor(elapsedTime / 60);
    const unsavedMinutes = totalMinutes - lastSavedMinuteRef.current;
    const durationMin = Math.max(1, unsavedMinutes > 0 ? unsavedMinutes : (totalMinutes > 0 ? 0 : 1));

    // Only log if there's unsaved time
    if (durationMin > 0) {
      try {
        await post('/usage/log', {
          appName: trackingApp,
          category: trackingCategory,
          duration: durationMin,
        });
      } catch {
        // Still add to local state
      }

      // Update local data immediately
      setTodayData((prev) => {
        const existing = prev.findIndex(
          (d) => d.appName === trackingApp && d.category === trackingCategory
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], duration: updated[existing].duration + durationMin };
          return updated;
        }
        return [...prev, { appName: trackingApp, category: trackingCategory, duration: durationMin }];
      });
    }

    // Refresh from server
    setTimeout(() => fetchDaily(), 500);

    setTrackingApp('');
    setElapsedTime(0);
    lastSavedMinuteRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  const handleManualLog = async (e) => {
    e.preventDefault();
    if (!logForm.appName || !logForm.duration) return;

    try {
      await post('/usage/log', {
        appName: logForm.appName,
        category: logForm.category,
        duration: parseInt(logForm.duration),
      });
      setLogMessage('Usage logged successfully!');
    } catch {
      setLogMessage('Logged locally.');
    }

    setTodayData((prev) => {
      const existing = prev.findIndex(
        (d) => d.appName === logForm.appName && d.category === logForm.category
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], duration: updated[existing].duration + parseInt(logForm.duration) };
        return updated;
      }
      return [...prev, { appName: logForm.appName, category: logForm.category, duration: parseInt(logForm.duration) }];
    });
    setLogForm({ appName: '', category: 'study', duration: '' });
    setTimeout(() => setLogMessage(''), 3000);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add real-time elapsed minutes for the currently tracked app
  const displayData = [...todayData];
  if (isTracking && elapsedTime > 0) {
    const trackingMinutes = Math.floor(elapsedTime / 60);
    if (trackingMinutes > 0) {
      const existingIdx = displayData.findIndex(
        (d) => d.appName === trackingApp && d.category === trackingCategory
      );
      if (existingIdx >= 0) {
        displayData[existingIdx] = {
          ...displayData[existingIdx],
          duration: displayData[existingIdx].duration + trackingMinutes - lastSavedMinuteRef.current,
        };
      } else {
        displayData.push({
          appName: trackingApp,
          category: trackingCategory,
          duration: trackingMinutes,
        });
      }
    }
  }

  const totalMinutes = displayData.reduce((sum, d) => sum + d.duration, 0);
  const categoryTotals = Object.entries(
    displayData.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + d.duration;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Screen Time</h1>
        <p className="text-surface-200/50 mt-1">Track and monitor your daily app usage</p>
      </div>

      {/* Live Tracker + Category Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Tracker */}
        <div className="glass-card p-6" id="screen-time-tracker">
          <h2 className="text-lg font-semibold text-white mb-4">⏱️ Live Tracker</h2>

          {isTracking ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-primary-300">Tracking: {trackingApp}</span>
              </div>
              <div className="text-5xl font-bold text-white font-mono timer-pulse inline-block p-6 rounded-2xl">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-xs text-surface-200/40">
                Auto-saves every minute • Updates chart in real-time
              </div>
              <button
                onClick={stopTracking}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-pink-500 transition-all btn-glow"
              >
                ⏹ Stop Tracking
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={trackingApp}
                onChange={(e) => setTrackingApp(e.target.value)}
                placeholder="App name (e.g., VS Code)"
                className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-white placeholder-surface-200/30 focus:outline-none focus:border-primary-500 transition-all"
              />
              <div className="flex gap-2">
                {Object.entries(categoryLabels).map(([key, { icon, label }]) => (
                  <button
                    key={key}
                    onClick={() => setTrackingCategory(key)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border ${
                      trackingCategory === key
                        ? 'border-primary-500 bg-primary-500/20 text-primary-300'
                        : 'border-surface-700/50 bg-surface-800/30 text-surface-200/50 hover:border-surface-700'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              <button
                onClick={startTracking}
                disabled={!trackingApp.trim()}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed btn-glow"
              >
                ▶ Start Tracking
              </button>
            </div>
          )}
        </div>

        {/* Category Summary */}
        <div className="glass-card p-6" id="screen-time-summary">
          <h2 className="text-lg font-semibold text-white mb-4">📊 Today's Summary</h2>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-white">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
            <p className="text-sm text-surface-200/40 mt-1">Total screen time today</p>
          </div>
          {categoryTotals.length > 0 ? (
            <div className="space-y-4">
              {categoryTotals.map(([cat, mins]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-200/70">
                      {categoryLabels[cat]?.icon} {categoryLabels[cat]?.label}
                    </span>
                    <span style={{ color: categoryColors[cat] }}>{mins} min</span>
                  </div>
                  <div className="h-2 bg-surface-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0}%`,
                        backgroundColor: categoryColors[cat],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-surface-200/40 text-sm py-6">
              <p>No usage tracked yet today.</p>
              <p className="mt-1">Use the Live Tracker or Manual Log to start!</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Usage Bar Chart */}
      {displayData.length > 0 && (
        <div className="glass-card p-6 chart-container" id="screen-time-chart">
          <h2 className="text-lg font-semibold text-white mb-4">📱 App Usage Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={12} unit="m" tickLine={false} />
              <YAxis type="category" dataKey="appName" stroke="#64748b" fontSize={12} width={80} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
              <Bar dataKey="duration" radius={[0, 6, 6, 0]} name="Duration">
                {displayData.map((entry, i) => (
                  <Cell key={i} fill={categoryColors[entry.category] || '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Manual Log Form */}
      <div className="glass-card p-6" id="screen-time-log">
        <h2 className="text-lg font-semibold text-white mb-4">📝 Manual Log</h2>
        {logMessage && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-2 rounded-xl mb-4 text-sm">
            {logMessage}
          </div>
        )}
        <form onSubmit={handleManualLog} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={logForm.appName}
            onChange={(e) => setLogForm({ ...logForm, appName: e.target.value })}
            placeholder="App name"
            className="px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-white placeholder-surface-200/30 focus:outline-none focus:border-primary-500 transition-all"
            required
          />
          <select
            value={logForm.category}
            onChange={(e) => setLogForm({ ...logForm, category: e.target.value })}
            className="px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
          >
            <option value="study">📚 Study</option>
            <option value="social">💬 Social</option>
            <option value="entertainment">🎮 Entertainment</option>
          </select>
          <input
            type="number"
            value={logForm.duration}
            onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })}
            placeholder="Minutes"
            min="1"
            className="px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl text-white placeholder-surface-200/30 focus:outline-none focus:border-primary-500 transition-all"
            required
          />
          <button
            type="submit"
            className="py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all btn-glow"
          >
            Log Usage
          </button>
        </form>
      </div>
    </div>
  );
}
