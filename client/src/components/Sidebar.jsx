// client/src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', id: 'nav-dashboard' },
  { path: '/screen-time', label: 'Screen Time', icon: '📱', id: 'nav-screentime' },
  { path: '/analytics', label: 'Analytics', icon: '📈', id: 'nav-analytics' },
  { path: '/focus', label: 'Focus Mode', icon: '🎯', id: 'nav-focus' },
  { path: '/breaks', label: 'Break Timer', icon: '☕', id: 'nav-breaks' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface-900/80 backdrop-blur-xl border-r border-surface-700/30 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center glow-primary">
            <span className="text-xl">🧠</span>
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">Wellbeing</h1>
            <p className="text-xs text-surface-200/40">Digital Health Tracker</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            id={item.id}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'active bg-primary-500/10 text-primary-300'
                  : 'text-surface-200/60 hover:text-white hover:bg-surface-800/50'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-surface-700/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Student'}</p>
            <p className="text-xs text-surface-200/40 truncate">{user?.email || 'user@email.com'}</p>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="w-full py-2 text-sm text-surface-200/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
