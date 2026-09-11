import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { dataStore } from '../utils/dataStore';
import { useSocket } from '../context/SocketContext';
import FindPlayersModal from '../components/FindPlayersModal';
import LiveRequestCard from '../components/LiveRequestCard';
import MyChallenges from '../components/challenge/MyChallenges';
import PoolQr from '../components/PoolQr';

const PlayerDashboard = () => {
  const { user } = useAuth();
  const { socket, activeRequests } = useSocket();
  const [availability, setAvailability] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showFindPlayers, setShowFindPlayers] = useState(false);
  const [joiningRequestId, setJoiningRequestId] = useState(null);
  const [form, setForm] = useState({
    sport: 'cricket',
    skillLevel: 'beginner',
    bio: '',
  });
  const [poolQrMap, setPoolQrMap] = useState({});

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ping {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }

      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-spin { animation: spin 1s linear infinite; }
      .animate-ping { animation: ping 1.5s ease-out infinite; }

      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .grid-dots {
        background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      .glass-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 24px;
        padding: 24px;
      }

      .stat-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { border-color: rgba(74,222,128,0.15); transform: translateY(-3px); }
      .stat-green::before { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
      .stat-blue::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }
      .stat-orange::before { background: linear-gradient(90deg, transparent, #fb923c, transparent); }
      .stat-purple::before { background: linear-gradient(90deg, transparent, #a78bfa, transparent); }

      .tab-btn {
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
      }
      .tab-active {
        background: rgba(74,222,128,0.12);
        color: #4ade80;
        border: 1px solid rgba(74,222,128,0.2);
      }
      .tab-inactive {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid transparent;
      }
      .tab-inactive:hover { color: var(--text-muted); }

      .input-field {
        width: 100%;
        background: var(--glass-05);
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 12px 14px;
        color: var(--text-main);
        font-size: 14px;
        outline: none;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .input-field:focus {
        border-color: rgba(74,222,128,0.4);
        background: var(--glass-05, rgba(255,255,255,0.05));
        box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
      }
      .input-field::placeholder { color: var(--text-muted); opacity: 0.5; }
      .input-field option { background: var(--bg-surface); }

      .label {
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 6px;
        display: block;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 14px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transition: left 0.4s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
      .btn-primary:disabled { opacity: 0.5; transform: none; }

      .btn-danger {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.15);
        color: rgba(239,68,68,0.7);
        font-weight: 600;
        border-radius: 12px;
        padding: 10px 20px;
        font-size: 13px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .btn-danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

      .booking-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .booking-card:hover { border-color: rgba(74,222,128,0.15); }

      .payment-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .payment-card:hover { border-color: rgba(74,222,128,0.15); }

      .price-breakdown {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.1);
        border-radius: 12px;
        padding: 12px;
      }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 100px;
      }

      .live-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(74,222,128,0.1);
        border: 1px solid rgba(74,222,128,0.2);
        color: #4ade80;
        font-size: 12px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 100px;
      }

      .availability-active {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.15);
        border-radius: 16px;
        padding: 16px;
      }

      .progress-ring {
        transform: rotate(-90deg);
        transform-origin: center;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const avail = dataStore.get('dashboard:player:availability');
    const book = dataStore.get('dashboard:player:bookings');
    const pay = dataStore.get('dashboard:player:payments');
    if (avail.status === 'ready' && book.status === 'ready' && pay.status === 'ready') {
      setAvailability(avail.data);
      setBookings(book.data);
      setPayments(pay.data);
      if (avail.data) {
        setForm({
          sport: avail.data.sport || 'cricket',
          skillLevel: avail.data.skillLevel || 'beginner',
          bio: avail.data.bio || '',
        });
      }
      return;
    }
    fetchAll();
  }, []);

  const fetchPoolQrs = async () => {
    try {
      const { data } = await API.get('/pools/my/qrs');
      const m = {};
      data.forEach((r) => { m[r._id] = r.qrPayload; });
      setPoolQrMap(m);
    } catch { setPoolQrMap({}); }
  };

  const fetchAll = async () => {
    try {
      const [availRes, bookRes, payRes] = await Promise.all([
        API.get('/players/me').catch(() => ({ data: null })),
        API.get('/bookings/my').catch(() => ({ data: [] })),
        API.get('/payments/my').catch(() => ({ data: [] })),
      ]);
      setAvailability(availRes.data);
      setBookings(bookRes.data);
      setPayments(payRes.data);
      dataStore.set('dashboard:player:availability', availRes.data);
      dataStore.set('dashboard:player:bookings', bookRes.data);
      dataStore.set('dashboard:player:payments', payRes.data);
      fetchPoolQrs();
      if (availRes.data) {
        setForm({
          sport: availRes.data.sport || 'cricket',
          skillLevel: availRes.data.skillLevel || 'beginner',
          bio: availRes.data.bio || '',
        });
      }
    } catch {}
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (b) => {
      setBookings((prev) => prev.map((x) => String(x._id) === String(b._id) ? { ...x, ...b } : x));
      if (b.checkedIn) showMessage(`Checked in for ${b.poolName || 'pool'} — ${b.date} ${b.startTime} ✅`);
      fetchPoolQrs();
    };
    socket.on('pool:booking-updated', handler);
    return () => socket.off('pool:booking-updated', handler);
  }, [socket]);

  const handleJoinRequest = async (id) => {
    setJoiningRequestId(id);
    try {
      await API.post(`/looking/${id}/join`);
      showMessage("You're in! 🎉");
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Could not join', 'error');
    } finally {
      setJoiningRequestId(null);
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await API.post(`/looking/${id}/cancel`);
      showMessage('Request cancelled');
    } catch {
      showMessage('Could not cancel', 'error');
    }
  };

  const handleGoLive = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      ).then(async (pos) => {
        await API.post('/players/availability', {
          ...form,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        showMessage('You are now LIVE on the map! 🟢');
        fetchAll();
      });
    } catch {
      showMessage('Failed to go live', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoOffline = async () => {
    try {
      await API.patch('/players/offline');
      showMessage('You are now offline');
      setAvailability(null);
    } catch {
      showMessage('Failed', 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setLoading(true);
    try {
      await API.patch(`/bookings/${bookingId}/cancel`);
      showMessage('Booking cancelled successfully');
      fetchAll();
    } catch {
      showMessage('Cancellation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      advance_pending: { label: 'Advance Pending', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
      advance_paid: { label: 'Advance Paid ✅', color: 'bg-blue-400/10 text-blue-400 border border-blue-400/20' },
      completed: { label: 'Completed 🎉', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      refunded: { label: 'Refunded', color: 'bg-gray-400/10 text-gray-600 dark:text-gray-400 border border-gray-400/20' },
      cancelled: { label: 'Cancelled', color: 'bg-red-400/10 text-red-400 border border-red-400/20' },
      pending_approval: { label: 'Pending Approval ⏳', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
    };
    return map[status] || { label: status, color: 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white' };
  };

  const getSportEmoji = (sport) => {
    const map = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', 'box cricket': '🏏', 'box football': '⚽' };
    return map[sport] || '🏆';
  };

  const totalSpent = payments.reduce((sum, p) => {
    const adv = p.advancePayment?.status === 'paid' ? p.advanceAmount : 0;
    const fin = p.finalPayment?.status === 'paid' ? p.remainingAmount : 0;
    return sum + adv + fin;
  }, 0);

  const pendingPayments = payments.filter((p) => p.status === 'advance_paid').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Player</p>
            <h1 className="font-bebas text-5xl tracking-wide shimmer-text">
              {user?.name?.split(' ')[0]}'S DASHBOARD
            </h1>
            <p className="text-gray-600 text-sm mt-1">Welcome back — ready to play? ⚽</p>
          </div>
          <div className="flex items-center gap-3">
            {availability ? (
              <span className="live-badge">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                LIVE on Map
              </span>
            ) : (
              <span className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-500 px-3 py-2 rounded-full">
                ⚫ Offline On Map
              </span>
            )}
            <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:border-green-400/30 transition-colors flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-green-400/10 flex items-center justify-center text-green-400 font-bold text-sm">
                  {user?.name?.charAt(0)}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fadeUp-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: bookings.length, icon: '📅', color: 'stat-green' },
            { label: 'Completed', value: completedBookings, icon: '🏆', color: 'stat-blue' },
            { label: 'Pending Payment', value: pendingPayments, icon: '💳', color: 'stat-orange' },
            { label: 'Total Spent', value: `₹${totalSpent}`, icon: '💰', color: 'stat-purple' },
          ].map((stat, i) => (
            <div key={i} className={`stat-card ${stat.color}`}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-bebas text-3xl text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Find Players CTA */}
        <div className="animate-fadeUp-2 mb-8 rounded-3xl border border-green-400/20 bg-gradient-to-r from-green-400/10 via-green-400/5 to-transparent p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">🏸 Ready to Play?</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Start a game in under a minute — nearby players get notified instantly.</p>
          </div>
          <button
            onClick={() => setShowFindPlayers(true)}
            className="bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl px-6 py-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 flex-shrink-0"
          >
            Find Players
          </button>
        </div>

        {activeRequests.length > 0 && (
          <div className="animate-fadeUp-2 mb-8">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-[0.2em] mb-3">🔥 Active Requests Near You</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {activeRequests.slice(0, 8).map((req) => (
                <div key={req._id} className="w-72 flex-shrink-0">
                  <LiveRequestCard
                    request={req}
                    onJoin={handleJoinRequest}
                    onCancel={handleCancelRequest}
                    joining={joiningRequestId === req._id}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {showFindPlayers && (
          <FindPlayersModal
            onClose={() => setShowFindPlayers(false)}
            onCreated={() => showMessage('Your request is live! 🏸')}
          />
        )}

        {/* Tabs */}
        <div className="animate-fadeUp-3">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { id: 'overview', label: '📍 Availability' },
              { id: 'challenges', label: '⚔️ Challenges' },
              { id: 'bookings', label: `📅 Bookings (${bookings.length})` },
              { id: 'payments', label: `💳 Payments (${payments.length})` },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* AVAILABILITY TAB */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              {availability && (
                <div className="availability-active animate-cardIn">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-400/10 border border-green-400/20 rounded-xl flex items-center justify-center text-xl">
                        {getSportEmoji(availability.sport)}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold capitalize">{availability.sport} · {availability.skillLevel}</p>
                        {availability.bio && <p className="text-gray-500 text-xs">{availability.bio}</p>}
                      </div>
                    </div>
                    <button onClick={handleGoOffline} className="btn-danger">
                      Go Offline
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-card animate-cardIn">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">
                  {availability ? 'UPDATE AVAILABILITY' : 'GO LIVE ON MAP'}
                </h2>
                <form onSubmit={handleGoLive} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Sport</label>
                      <select data-tour="dash-sport" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="input-field">
                        <option value="football">⚽ Football</option>
                        <option value="cricket">🏏 Cricket</option>
                        <option value="boxing">🥊 Boxing</option>
                        <option value="box cricket">🏏 Box Cricket</option>
                        <option value="box football">⚽ Box Football</option>
                        <option value="basketball">🏀 Basketball</option>
                        <option value="tennis">🎾 Tennis</option>
                        <option value="badminton">🏸 Badminton</option>
                        <option value="volleyball">🏐 Volleyball</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Skill Level</label>
                      <select data-tour="dash-skill" value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })} className="input-field">
                        <option value="beginner">🟡 Beginner</option>
                        <option value="intermediate">🔵 Intermediate</option>
                        <option value="advanced">🟢 Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Bio (optional)</label>
                    <input
                      type="text"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="e.g. Looking for a weekend cricket match!"
                      className="input-field"
                    />
                  </div>
                  <button data-tour="dash-golive" type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Getting Location...</>
                    ) : availability ? '📍 Update My Location' : '🟢 Go Live on Map'}
                  </button>
                </form>
              </div>

              {/* <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-4">QUICK LINKS</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { to: '/map', icon: '🗺️', label: 'Open Live Map', sub: 'Find players nearby' },
                    { to: '/groups', icon: '👥', label: 'My Groups', sub: 'Manage sport groups' },
                    { to: '/profile', icon: '👤', label: 'My Profile', sub: 'Update avatar & info' },
                  ].map((link, i) => (
                    <Link key={i} to={link.to} className="bg-black/2 dark:bg-white/2 border border-black/6 dark:border-white/6 rounded-2xl p-4 hover:border-green-400/2 hover:bg-green-400/3 transition-all duration-300 group">
                      <div className="text-2xl mb-2">{link.icon}</div>
                      <p className="text-gray-900 dark:text-white text-sm font-semibold group-hover:text-green-400 transition-colors">{link.label}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{link.sub}</p>
                    </Link>
                  ))}
                </div>
              </div> */}
            </div>
          )}

          {/* CHALLENGES TAB */}
          {activeTab === 'challenges' && (
            <div className="animate-cardIn">
              <MyChallenges showMessage={(m) => showMessage(m)} />
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="flex flex-col gap-4">
              {bookings.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <span className="text-5xl">📅</span>
                  <p className="text-gray-500">No bookings yet</p>
                  <Link to="/map" className="btn-primary text-sm px-6 py-2.5">Find a Ground 🗺️</Link>
                </div>
              ) : bookings.map((booking, i) => {
                const badge = getStatusBadge(booking.status);
                return (
                  <div key={booking._id} className="booking-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold">
                          {booking.ground?.name || 'Ground'}
                          {booking.poolName && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full align-middle ${booking.slotCategory === 'girls_only' ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
                              {booking.poolName}{booking.slotCategory === 'girls_only' ? ' · Girls Only' : ''}
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">📍 {booking.ground?.address}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">📅 {booking.date} · 🕐 {booking.startTime} — {booking.endTime}</p>
                        {booking.ticketId && <p className="text-gray-600 text-xs mt-1">Ticket {booking.ticketId} {booking.partySize > 1 ? `· ${booking.partySize} people` : ''}</p>}
                        {booking.poolId && booking.status === 'completed' && (
                          <div className="mt-3">
                            {booking.checkedIn ? (
                              <p className="text-green-400 text-xs font-semibold">✅ Checked in {booking.checkedInAt ? `at ${new Date(booking.checkedInAt).toLocaleTimeString()}` : ''} — one scan only</p>
                            ) : (
                              <PoolQr payload={poolQrMap[booking._id]} ticketId={booking.ticketId} checkedIn={!!booking.checkedIn} isExpired={false} />
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-gray-600 text-xs">Total</p>
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">₹{booking.totalPrice}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Advance</p>
                          <p className="text-green-400 font-semibold text-sm">₹{booking.advancePrice}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Remaining</p>
                          <p className="text-orange-400 font-semibold text-sm">₹{booking.remainingPrice}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {booking.status !== 'cancelled' && booking.status !== 'refunded' && (
                          booking.ground?.venueType === 'pool' ? (
                            <span className="text-gray-500 text-[11px] whitespace-nowrap" title="Pool bookings are only cancelled by support in case of a payment issue">
                              Contact admin to cancel
                            </span>
                          ) : (
                            <button onClick={() => handleCancelBooking(booking._id)} className="text-red-400 text-xs hover:text-red-300 transition-colors bg-red-400/10 px-3 py-1 rounded-full whitespace-nowrap">
                              ✕ Cancel
                            </button>
                          )
                        )}
                        <Link to={`/grounds/${booking.ground?._id}`} className="text-green-400 text-xs hover:text-green-300 transition-colors">
                          View Ground →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="flex flex-col gap-4">
              {pendingPayments > 0 && (
                <div className="animate-slideIn bg-orange-400/8 border border-orange-400/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-orange-400 font-semibold text-sm">Final Payment Pending</p>
                      <p className="text-gray-500 text-xs">You have {pendingPayments} booking(s) with remaining amount due</p>
                    </div>
                  </div>
                </div>
              )}

              {payments.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <span className="text-5xl">💳</span>
                  <p className="text-gray-500">No payments yet</p>
                  <Link to="/map" className="btn-primary text-sm px-6 py-2.5">Book a Ground 🏟️</Link>
                </div>
              ) : payments.map((payment, i) => {
                const badge = getStatusBadge(payment.status);
                return (
                  <div key={payment._id} className="payment-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold">{payment.ground?.name}</p>
                        <p className="text-gray-500 text-xs">📍 {payment.ground?.address}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          📅 {payment.booking?.date} · {payment.booking?.startTime} — {payment.booking?.endTime}
                        </p>
                      </div>
                      <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                    </div>

                    <div className="price-breakdown mb-3">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-500">Total Amount</span>
                        <span className="text-gray-900 dark:text-white font-semibold">₹{payment.totalAmount}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-500">Advance Paid (30%)</span>
                        <span className={`font-semibold ${payment.advancePayment?.status === 'paid' ? 'text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {payment.advancePayment?.status === 'paid' ? `✅ ₹${payment.advanceAmount}` : 'Pending'}
                        </span>
                      </div>
                      <div className="w-full h-px bg-black/5 dark:bg-white/5 my-1.5" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Remaining (70%)</span>
                        <span className={`font-semibold ${payment.finalPayment?.status === 'paid' ? 'text-green-400' : 'text-orange-400'}`}>
                          {payment.finalPayment?.status === 'paid' ? `✅ ₹${payment.remainingAmount}` : `⏳ ₹${payment.remainingAmount} due`}
                        </span>
                      </div>
                    </div>

                    {payment.status === 'advance_paid' && (
                      <Link to={`/grounds/${payment.ground?._id}`} className="inline-block bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-400/20 transition-colors">
                        💳 Pay Remaining ₹{payment.remainingAmount} →
                      </Link>
                    )}

                    {payment.status === 'refunded' && payment.refund?.amount && (
                      <p className="text-gray-500 text-xs">
                        🔄 Refunded ₹{payment.refund.amount} · {new Date(payment.refund.processedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;