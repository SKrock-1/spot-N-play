import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, ChevronRight, Compass, Wallet, Users, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications, NOTIFICATION_ICONS } from '../context/NotificationContext';
import { useTour } from '../context/TourContext';
import API from '../api/axios';

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
};

// Trigger: avatar pill (matches the old profile pill exactly), with a
// green unread-count badge on top — replaces the standalone bell.
const ProfileDropdown = ({ compact = false }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { startTour } = useTour();
  const [open, setOpen] = useState(false);
  const [notifExpanded, setNotifExpanded] = useState(false);
  // Wallet balance + pending mate requests — fetched lazily when the menu
  // opens so the "my stuff" rows always show fresh numbers.
  const [fitcoin, setFitcoin] = useState(null);
  const [matesPending, setMatesPending] = useState(0);
  const [matesCount, setMatesCount] = useState(0);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !user) return;
    let live = true;
    API.get('/users/fit/wallet').then(({ data }) => { if (live) setFitcoin(data.fitcoin || 0); }).catch(() => {});
    API.get('/mates').then(({ data }) => {
      if (!live) return;
      setMatesPending((data.incoming || []).length);
      setMatesCount((data.mates || []).length);
    }).catch(() => {});
    return () => { live = false; };
  }, [open, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setNotifExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeAll = () => { setOpen(false); setNotifExpanded(false); };

  const handleLogout = () => { closeAll(); logout(); navigate('/login'); };

  const handleViewAll = () => { closeAll(); navigate('/notifications'); };

  const handleStartGuide = () => { closeAll(); startTour(); };

  const handleClickNotification = (n) => {
    if (!n.isRead) markAsRead(n._id);
    closeAll();
    if (n.link) navigate(n.link);
  };

  if (!user) return null;

  const top3 = notifications.slice(0, 3);

  return (
    <div ref={wrapperRef} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 hover:border-green-500/30 rounded-2xl px-3 py-2 transition-all duration-200 cursor-pointer focus:outline-none"
      >
        <span className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover border border-green-400/50 avatar-glow transition-all duration-200"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs text-green-400 font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
          {user.isEmailVerified && user.isPhoneVerified && (
            <span
              title="Verified profile"
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-green-400 text-black text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0a0a0a]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        {!compact && (
          <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {user.name}
            {user.isEmailVerified && user.isPhoneVerified && (
              <span title="Verified profile" className="text-green-500 text-xs">✅</span>
            )}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-[320px] bg-white/85 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-50"
          style={{ animation: 'slideDown 0.2s ease forwards' }}
        >
          {/* top accent glow — matches g-card's hover highlight line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />

          {/* Notifications row + accordion */}
          <div
            onMouseEnter={() => setNotifExpanded(true)}
            className="border-b border-black/5 dark:border-white/5"
          >
            <button
              onClick={() => setNotifExpanded(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="w-7 h-7 rounded-lg bg-green-400/15 border border-green-400/20 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                  <Bell size={14} />
                </span>
                Notifications
                {unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-400 text-black text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${notifExpanded ? 'rotate-90' : ''}`} />
            </button>

            {notifExpanded && (
              <div className="bg-black/[0.02] dark:bg-white/[0.02]">
                {top3.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-400 text-xs">No notifications yet</div>
                ) : (
                  top3.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleClickNotification(n)}
                      className={`flex items-start gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-black/5 dark:border-white/5 ${
                        !n.isRead ? 'bg-green-400/[0.06]' : ''
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-sm flex-shrink-0">
                        {NOTIFICATION_ICONS[n.type] || '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug truncate">{n.title}</p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(n.createdAt)}</span>
                      </div>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />}
                    </div>
                  ))
                )}
                <button
                  onClick={handleViewAll}
                  className="w-full text-center py-2.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors cursor-pointer border-t border-black/5 dark:border-white/5"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>

          {/* My Profile */}
          <button
            onClick={() => { closeAll(); navigate('/profile'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
          >
            <span className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
              <User size={14} />
            </span>
            My Profile
          </button>

          {/* Wallet — live Fitcoin balance */}
          <button
            onClick={() => { closeAll(); navigate('/wallet'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none border-t border-black/5 dark:border-white/5"
          >
            <span className="w-7 h-7 rounded-lg bg-yellow-400/15 border border-yellow-400/20 flex items-center justify-center text-yellow-500 flex-shrink-0">
              <Wallet size={14} />
            </span>
            <span className="flex-1 text-left">Wallet</span>
            <span className="text-xs font-bold text-yellow-500">🪙 {fitcoin === null ? '···' : Number(fitcoin).toLocaleString('en-IN')}</span>
          </button>

          {/* Mates — pending requests get a badge so invites are never missed */}
          <button
            onClick={() => { closeAll(); navigate('/mates'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none border-t border-black/5 dark:border-white/5"
          >
            <span className="w-7 h-7 rounded-lg bg-green-400/15 border border-green-400/20 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
              <Users size={14} />
            </span>
            <span className="flex-1 text-left">Mates{matesCount > 0 ? ` (${matesCount})` : ''}</span>
            {matesPending > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-400 text-black text-[10px] font-bold flex items-center justify-center">
                {matesPending > 9 ? '9+' : matesPending}
              </span>
            )}
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => { closeAll(); navigate('/leaderboard'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none border-t border-black/5 dark:border-white/5"
          >
            <span className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
              <Trophy size={14} />
            </span>
            Leaderboard
          </button>

          {/* Start Guide — walks through go-live, map, groups & events */}
          {user.role === 'player' && (
            <button
              onClick={handleStartGuide}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none border-t border-black/5 dark:border-white/5"
            >
              <span className="w-7 h-7 rounded-lg bg-green-400/15 border border-green-400/20 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                <Compass size={14} />
              </span>
              Start Guide
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer focus:outline-none border-t border-black/5 dark:border-white/5"
          >
            <span className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/70 flex-shrink-0">
              <LogOut size={14} />
            </span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
