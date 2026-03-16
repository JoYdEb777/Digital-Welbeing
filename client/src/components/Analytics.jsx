// client/src/components/Analytics.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApi } from '../hooks/useApi';

const categoryColorMap = {
  study: '#818cf8',
  social: '#f472b6',
  entertainment: '#34d399',
};

const categoryLabelMap = {
  study: 'Study',
  social: 'Social',
  entertainment: 'Entertainment',
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 !border-primary-500/30 text-sm">
      {label && <p className="font-medium text-white mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.stroke || entry.fill }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.stroke || entry.fill }} />
          {entry.name}: {entry.value} min
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { get } = useApi();
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [topApps, setTopApps] = useState([]);
  const [mostUsedApp, setMostUsedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        get('/usage/daily'),
        get('/usage/weekly'),
      ]);

      // Build category distribution from daily data
      if (dailyRes?.categories?.length > 0) {
        const catData = dailyRes.categories.map((c) => ({
          name: categoryLabelMap[c.category] || c.category,
          value: c.totalDuration,
          color: categoryColorMap[c.category] || '#818cf8',
        }));
        setCategoryData(catData);

        // Build top apps list from daily data
        const allApps = dailyRes.categories.flatMap((c) =>
          c.apps.map((a) => ({
            name: a.appName,
            category: categoryLabelMap[c.category] || c.category,
            duration: a.duration,
            icon: c.category === 'study' ? '💻' : c.category === 'social' ? '💬' : '🎮',
          }))
        );
        allApps.sort((a, b) => b.duration - a.duration);
        setTopApps(allApps.slice(0, 5));
      }

      // Build weekly trend from weekly data
      if (weeklyRes?.mostUsedApp) {
        setMostUsedApp({
          name: weeklyRes.mostUsedApp._id,
          category: categoryLabelMap[weeklyRes.mostUsedApp.category] || weeklyRes.mostUsedApp.category,
          duration: weeklyRes.mostUsedApp.totalDuration,
        });
      }

      if (weeklyRes?.dailyBreakdown?.length > 0) {
        const dayMap = {};
        weeklyRes.dailyBreakdown.forEach((item) => {
          const day = item._id.date;
          if (!dayMap[day]) {
            dayMap[day] = {
              day: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
              study: 0,
              social: 0,
              entertainment: 0,
            };
          }
          dayMap[day][item._id.category] = item.totalDuration;
        });
        const transformed = Object.values(dayMap);
        if (transformed.length > 0) setWeeklyTrend(transformed);
      }
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const totalTime = categoryData.reduce((s, d) => s + d.value, 0);
  const studyValue = categoryData.find((d) => d.name === 'Study')?.value || 0;

  const hasData = categoryData.length > 0 || weeklyTrend.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">App Usage Analytics</h1>
        <p className="text-surface-200/50 mt-1">Weekly trends and usage insights • Auto-updates every 30s</p>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="analytics-insights">
        {/* Most Used App Card */}
        <div className="glass-card p-5 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏆</span>
            <span className="text-xs text-surface-200/40 uppercase tracking-wide font-medium">Most Used App</span>
          </div>
          {mostUsedApp ? (
            <>
              <p className="text-xl font-bold text-white">{mostUsedApp.name}</p>
              <p className="text-sm text-surface-200/50">
                {mostUsedApp.duration} min · {mostUsedApp.category}
              </p>
            </>
          ) : (
            <p className="text-sm text-surface-200/40">No data yet — start tracking!</p>
          )}
        </div>

        <div className="glass-card p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-surface-200/40 uppercase tracking-wide font-medium">Total This Week</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totalTime > 0 ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}m` : '0h 0m'}
          </p>
          <p className="text-sm text-surface-200/50">Across all categories</p>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-pink-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-xs text-surface-200/40 uppercase tracking-wide font-medium">Study Ratio</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totalTime > 0 ? Math.round((studyValue / totalTime) * 100) : 0}%
          </p>
          <p className="text-sm text-surface-200/50">Of total screen time</p>
        </div>
      </div>

      {!hasData ? (
        <div className="glass-card p-12 text-center">
          <span className="text-5xl mb-4 block">📊</span>
          <h3 className="text-xl font-semibold text-white mb-2">No Usage Data Yet</h3>
          <p className="text-surface-200/50 max-w-md mx-auto">
            Start tracking your app usage on the Screen Time page, and your analytics will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-card p-6 chart-container" id="analytics-pie">
              <h2 className="text-lg font-semibold text-white mb-4">Category Distribution</h2>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      labelLine={false}
                      label={CustomPieLabel}
                      stroke="none"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-surface-200/70 text-sm">{value}</span>}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-surface-200/40 text-sm">
                  No category data today
                </div>
              )}
            </div>

            {/* Line Chart */}
            <div className="glass-card p-6 chart-container" id="analytics-line">
              <h2 className="text-lg font-semibold text-white mb-4">Weekly Trends</h2>
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-surface-200/70 text-sm capitalize">{value}</span>}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Line type="monotone" dataKey="study" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 4, fill: '#818cf8' }} activeDot={{ r: 6 }} name="Study" />
                    <Line type="monotone" dataKey="social" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 4, fill: '#f472b6' }} activeDot={{ r: 6 }} name="Social" />
                    <Line type="monotone" dataKey="entertainment" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4, fill: '#34d399' }} activeDot={{ r: 6 }} name="Entertainment" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-surface-200/40 text-sm">
                  No weekly trend data yet
                </div>
              )}
            </div>
          </div>

          {/* Top Apps List */}
          {topApps.length > 0 && (
            <div className="glass-card p-6" id="analytics-top-apps">
              <h2 className="text-lg font-semibold text-white mb-4">🏅 Top Apps Today</h2>
              <div className="space-y-3">
                {topApps.map((app, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/50 transition-all"
                  >
                    <span className="text-sm font-bold text-surface-200/40 w-6">#{i + 1}</span>
                    <span className="text-xl">{app.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{app.name}</p>
                      <p className="text-xs text-surface-200/40">{app.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-300">{app.duration} min</p>
                      <p className="text-xs text-surface-200/40">{Math.floor(app.duration / 60)}h {app.duration % 60}m</p>
                    </div>
                    <div className="w-24 h-2 bg-surface-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500"
                        style={{ width: `${topApps[0].duration > 0 ? (app.duration / topApps[0].duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
