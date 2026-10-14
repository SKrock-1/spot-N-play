import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useEffect, useState } from 'react';
import API from '../api/axios';
import ProfileDropdown from './ProfileDropdown';
import SpotNPlayLogo from './SpotNPlayLogo';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [streakData, setStreakData] = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive; }
      .font-dm { font-family: 'DM Sans', sans-serif; }
      @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes menuSlide { from { opacity: 0; transform: translateY(-20px) scaleY(0.95); } to { opacity: 1; transform: translateY(0) scaleY(1); } }
      .nav-animate { animation: slideDown 0.4s ease forwards; }
      .menu-animate { animation: menuSlide 0.25s ease forwards; transform-origin: top; }
      .nav-link-active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px; background: #4ade80; border-radius: 2px; }
      .avatar-glow:hover { box-shadow: 0 0 0 3px rgba(74,222,128,0.4); }
      .hamburger span { display: block; width: 22px; height: 2px; background: currentColor; border-radius: 2px; transition: all 0.3s ease; }
      .hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
      .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      .hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    API.get('/users/streak')
      .then(({ data }) => setStreakData(data))
      .catch(() => { });
  }, [user]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      className={`relative text-sm font-medium transition-colors duration-200 ${isActive(to)
          ? 'text-emerald-600 dark:text-green-400 nav-link-active'
          : 'text-slate-600 dark:text-gray-400 hover:text-slate-950 dark:hover:text-white'
        }`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 font-dm nav-animate transition-all duration-300 ${scrolled
            ? 'bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-2xl dark:shadow-black/50'
            : 'bg-transparent'
          }`}
      >
        {/* Full-width, no max-width cap — logo hard left, profile hard right */}
        <div className="w-full px-6 xl:px-14 py-4 flex items-center justify-between gap-4">

          {/* ── LEFT: Logo ── */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="spotNplay Home">
            <SpotNPlayLogo size="md" />
          </Link>

          {/* ── CENTER: Nav links (desktop only) ── */}
          <div className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {user && (
              <>
                {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                {user.role === 'player' && <NavLink to="/player/dashboard">Dashboard</NavLink>}
                {user.role === 'coach' && <NavLink to="/coach/dashboard">Dashboard</NavLink>}
                {user.role === 'ground_owner' && <NavLink to="/owner/dashboard">Dashboard</NavLink>}
                {user.role === 'gym_owner' && <NavLink to="/gym/dashboard">Dashboard</NavLink>}
                {user.role === 'pool_owner' && <NavLink to="/pool/dashboard">Dashboard</NavLink>}
                <NavLink to="/map">Map</NavLink>
                <NavLink to="/venues">Venues</NavLink>
                <NavLink to="/groups">Groups</NavLink>
                <NavLink to="/coaches">Coaches</NavLink>
                <NavLink to="/chat">Chat</NavLink>
                <NavLink to="/events">Events</NavLink>
                <NavLink to="/esports/events">Esports</NavLink>
              </>
            )}
          </div>

          {/* ── RIGHT: Theme + Streak + Profile (desktop only) ── */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xl cursor-pointer focus:outline-none"
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Streak badge */}
            {user && streakData && (
              <div
                title={streakData.bookedToday ? 'Ground booked today! ⭐' : `${streakData.loginStreak} day streak 🔥`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '9px 7px',
                  borderRadius: 12,
                  background: streakData.bookedToday ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.06)',
                  border: `1px solid ${streakData.bookedToday ? 'rgba(251,191,36,0.25)' : 'rgba(74,222,128,0.15)'}`,
                  cursor: 'default',
                  transition: 'all 0.3s',
                }}
              >
                <span style={{ fontSize: 16 }}>{streakData.bookedToday ? '⭐' : '🔥'}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: streakData.bookedToday ? '#fbbf24' : '#4ade80' }}>
                  {streakData.loginStreak}
                </span>
              </div>
            )}

            {/* Profile / Auth */}
            {user ? (
              <ProfileDropdown />
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-700 dark:text-gray-400 hover:text-slate-950 dark:hover:text-white transition-colors duration-200">
                  Login
                </Link>
                <Link to="/register" className="text-sm bg-emerald-600 hover:bg-emerald-700 dark:bg-green-400 dark:hover:bg-green-300 text-white dark:text-black font-semibold px-5 py-2 rounded-xl transition-all duration-200 shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* ── Profile + Hamburger (mobile) ── */}
          <div className="md:hidden flex items-center gap-2">
            {user && <ProfileDropdown compact />}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`hamburger ${menuOpen ? 'open' : ''} flex flex-col gap-[5px] p-2 text-gray-800 dark:text-gray-200`}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className="fixed top-[65px] left-0 right-0 z-40 md:hidden menu-animate">
          <div className="mx-4 bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex flex-col p-4 gap-1">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all text-left mb-2 border border-black/5 dark:border-white/5 font-semibold focus:outline-none"
              >
                <span>{theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}</span>
              </button>

              {user ? (
                <>
                  <Link to="/map" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🗺️</span> Map</Link>
                  <Link to="/venues" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏢</span> Venues</Link>
                  <Link to="/groups" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>👥</span> Groups</Link>
                  <Link to="/coaches" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏋️</span> Coaches</Link>
                  <Link to="/chat" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>💬</span> Chat</Link>
                  <Link to="/events" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>📅</span> Events</Link>
                  <Link to="/esports/events" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🎮</span> Esports</Link>

                  {user.role === 'player' && <Link to="/player/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>⚡</span> Dashboard</Link>}
                  {user.role === 'coach' && <Link to="/coach/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏋️</span> Dashboard</Link>}
                  {user.role === 'ground_owner' && <Link to="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏟️</span> Dashboard</Link>}
                  {user.role === 'gym_owner' && <Link to="/gym/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏋️</span> Dashboard</Link>}
                  {user.role === 'pool_owner' && <Link to="/pool/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏊</span> Dashboard</Link>}
                  {user.role === 'admin' && <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-green-400 hover:text-green-300 transition-all"><span>🛡️</span> Admin Panel</Link>}

                  <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>👤</span> Profile</Link>
                  <Link to="/notifications" className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all">
                    <span className="flex items-center gap-3"><span>🔔</span> Notifications</span>
                    {unreadCount > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-green-400 text-black text-[11px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-600 dark:text-gray-400 hover:text-red-400 transition-all text-left"
                  >
                    <span>🚪</span> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/coaches" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🏋️</span> Coaches</Link>
                  <Link to="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"><span>🔑</span> Login</Link>
                  <Link to="/register" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-all"><span>🚀</span> Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-[65px]" />
    </>
  );
};

export default Navbar;