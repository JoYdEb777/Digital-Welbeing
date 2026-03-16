// client/src/components/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 !border-primary-500/30 text-sm">
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.fill }} />
          {entry.name}: {entry.value} min
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { get } = useApi();
  const [stats, setStats] = useState({
    totalScreenTime: 0,
    focusStreak: 0,
    breaksTaken: 0,
    focusHoursToday: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllStats = useCallback(async () => {
    try {
      const [dailyRes, streakRes, weeklyRes] = await Promise.all([
        get('/usage/daily'),
        get('/focus/streak'),
        get('/usage/weekly'),
      ]);

      // Update screen time from daily usage
      if (dailyRes && dailyRes.totalScreenTime !== undefined) {
        setStats((prev) => ({
          ...prev,
          totalScreenTime: dailyRes.totalScreenTime,
        }));
      }

      // Update focus streak and total sessions
      if (streakRes) {
        setStats((prev) => ({
          ...prev,
          focusStreak: streakRes.streak || 0,
        }));
      }

      // Build weekly chart data from the weekly API response
      if (weeklyRes?.dailyBreakdown?.length > 0) {
        const dayMap = {};
        weeklyRes.dailyBreakdown.forEach((item) => {
          const day = item._id.date;
          if (!dayMap[day]) {
            dayMap[day] = {
              name: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
              study: 0,
              social: 0,
              entertainment: 0,
            };
          }
          dayMap[day][item._id.category] = item.totalDuration;
        });
        const transformed = Object.values(dayMap);
        if (transformed.length > 0) setWeeklyData(transformed);
      }
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Fetch focus sessions to calculate today's hours and breaks taken
  const fetchFocusStats = useCallback(async () => {
    try {
      const sessionsRes = await get('/focus/sessions');
      if (sessionsRes?.sessions) {
        const today = new Date().toDateString();
        let focusMinutesToday = 0;
        let breaksTakenToday = 0;

        sessionsRes.sessions.forEach((s) => {
          if (!s.completed) return;
          const sessionDate = new Date(s.startTime).toDateString();
          if (sessionDate !== today) return;

          if (s.type === 'focus' && s.endTime) {
            const durationMs = new Date(s.endTime) - new Date(s.startTime);
            focusMinutesToday += durationMs / 60000;
          }
          if (s.type === 'break') {
            breaksTakenToday++;
          }
        });

        setStats((prev) => ({
          ...prev,
          focusHoursToday: parseFloat((focusMinutesToday / 60).toFixed(1)),
          breaksTaken: breaksTakenToday,
        }));
      }
    } catch {
      // Keep defaults
    }
  }, [get]);

  // Initial fetch
  useEffect(() => {
    fetchAllStats();
    fetchFocusStats();
  }, [fetchAllStats, fetchFocusStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllStats();
      fetchFocusStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAllStats, fetchFocusStats]);

  const statCards = [
    {
      label: 'Screen Time Today',
      value: `${Math.floor(stats.totalScreenTime / 60)}h ${stats.totalScreenTime % 60}m`,
      icon: '📱',
      color: 'from-blue-500 to-cyan-500',
      glow: 'glow-primary',
    },
    {
      label: 'Focus Streak',
      value: `${stats.focusStreak} days`,
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      glow: 'glow-warning',
    },
    {
      label: 'Breaks Taken',
      value: stats.breaksTaken.toString(),
      icon: '☕',
      color: 'from-green-500 to-emerald-500',
      glow: 'glow-accent',
    },
    {
      label: 'Focus Hours',
      value: `${stats.focusHoursToday}h`,
      icon: '🎯',
      color: 'from-purple-500 to-pink-500',
      glow: 'glow-primary',
    },
  ];

  const quickActions = [
    { label: 'Start Focus', path: '/focus', icon: '🎯', desc: 'Begin a Pomodoro session' },
    { label: 'Log Usage', path: '/screen-time', icon: '📱', desc: 'Record app usage' },
    { label: 'Take a Break', path: '/breaks', icon: '☕', desc: 'Start break timer' },
    { label: 'View Analytics', path: '/analytics', icon: '📈', desc: 'See weekly trends' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Student'}</span>
          </h1>
          <p className="text-surface-200/50 mt-1">Here's your digital wellbeing overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-surface-200/40">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-xs text-green-400/60 mt-1">● Live — updates every 30s</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="glass-card p-5 group cursor-default"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">{card.icon}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
            </div>
            <p className="text-2xl font-bold text-white stat-number">{card.value}</p>
            <p className="text-xs text-surface-200/50 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Overview Chart */}
        <div className="lg:col-span-2 glass-card p-6 chart-container" id="dashboard-chart">
          <h2 className="text-lg font-semibold text-white mb-4">Weekly Overview</h2>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                <Bar dataKey="study" fill="#818cf8" radius={[4, 4, 0, 0]} name="Study" />
                <Bar dataKey="social" fill="#f472b6" radius={[4, 4, 0, 0]} name="Social" />
                <Bar dataKey="entertainment" fill="#34d399" radius={[4, 4, 0, 0]} name="Entertainment" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-surface-200/40">
              <span className="text-4xl mb-3">📊</span>
              <p className="text-sm">No usage data yet this week</p>
              <p className="text-xs mt-1">Start tracking your apps to see trends here</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6" id="dashboard-actions">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/60 border border-transparent hover:border-primary-500/20 transition-all group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <p className="text-xs text-surface-200/40">{action.desc}</p>
                </div>
                <svg className="w-4 h-4 text-surface-200/30 ml-auto group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="glass-card p-6" id="dashboard-goals">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-200/60">Screen Time Limit</span>
              <span className="text-primary-400">{Math.floor(stats.totalScreenTime / 60)}h / {Math.floor((user?.dailyGoals?.screenTimeLimit || 480) / 60)}h</span>
            </div>
            <div className="h-3 bg-surface-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((stats.totalScreenTime / (user?.dailyGoals?.screenTimeLimit || 480)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-200/60">Focus Hours</span>
              <span className="text-accent-400">{stats.focusHoursToday}h / {user?.dailyGoals?.focusHours || 4}h</span>
            </div>
            <div className="h-3 bg-surface-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((stats.focusHoursToday / (user?.dailyGoals?.focusHours || 4)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
