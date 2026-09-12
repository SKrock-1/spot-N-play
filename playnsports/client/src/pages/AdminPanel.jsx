import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import EventApprovals from '../components/admin/EventApprovals.jsx';
import AdminGrowthTools from '../components/admin/AdminGrowthTools.jsx';

const SPORT_EMOJI = {
  football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾',
  badminton: '🏸', volleyball: '🏐', boxing: '🥊',
  'box cricket': '🏏', 'box football': '⚽',
};

const TABS = [
  { id: 'overview',  label: '📊 Overview' },
  { id: 'grounds',   label: '🏟️ Grounds' },
  { id: 'social',    label: '✨ Social Approvals' },
  { id: 'coaches',   label: '🎓 Coaches' },
  { id: 'events',    label: '🏆 Events' },
  { id: 'users',     label: '👥 Users' },
  { id: 'bookings',  label: '📅 Bookings' },
  { id: 'messages',  label: '✉️ Messages' },
  { id: 'growth',    label: '🚀 Growth CMS' },
];

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]   = useState('overview');
  const [message,   setMessage]     = useState('');
  const [msgType,   setMsgType]     = useState('success');
  const [loading,   setLoading]     = useState(false);

  const [stats, setStats] = useState(null);

  // Coaches
  const [coaches,      setCoaches]      = useState([]);
  const [coachFilter,  setCoachFilter]  = useState('pending');
  const [rejectModal,  setRejectModal]  = useState(null);   // id
  const [rejectReason, setRejectReason] = useState('');

  // Grounds
  const [grounds,       setGrounds]       = useState([]);
  const [groundFilter,  setGroundFilter]  = useState('pending');
  const [groundRejectModal, setGroundRejectModal] = useState(null); // id
  const [groundRejectReason, setGroundRejectReason] = useState('');

  // Social bookings
  const [socialBookings, setSocialBookings] = useState([]);

  // Users
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [ownerEmail, setOwnerEmail] = useState({});

  // Bookings
  const [allBookings,   setAllBookings]   = useState([]);
  const [bookingFilter, setBookingFilter] = useState('');

  // Contact / "Get in touch" messages
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'coaches')  fetchCoaches();
    if (activeTab === 'grounds')  fetchGrounds();
    if (activeTab === 'social')   fetchSocialBookings();
    if (activeTab === 'users')    fetchUsers();
    if (activeTab === 'bookings') fetchAllBookings();
    if (activeTab === 'messages') fetchContacts();
    if (activeTab === 'growth')   fetchStats();
  }, [activeTab, coachFilter, groundFilter, bookingFilter]);

  const fetchStats = async () => {
    try { const { data } = await API.get('/admin/stats'); setStats(data); } catch {}
  };

  const fetchCoaches = async () => {
    setLoading(true);
    try { const { data } = await API.get(`/admin/coaches?status=${coachFilter}`); setCoaches(data); }
    catch { setCoaches([]); } finally { setLoading(false); }
  };

  const fetchGrounds = async () => {
    setLoading(true);
    try { const { data } = await API.get(`/admin/grounds?status=${groundFilter}`); setGrounds(data); }
    catch { setGrounds([]); } finally { setLoading(false); }
  };

  const fetchSocialBookings = async () => {
    setLoading(true);
    try { const { data } = await API.get('/admin/social-bookings/pending'); setSocialBookings(data); }
    catch { setSocialBookings([]); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try { const { data } = await API.get('/admin/users'); setUsers(data); }
    catch { setUsers([]); } finally { setLoading(false); }
  };

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.role?.replace('_', ' ').toLowerCase().includes(term)
    ));
  }, [users, userSearch]);

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const q = bookingFilter ? `?status=${bookingFilter}` : '';
      const { data } = await API.get(`/admin/bookings${q}`);
      setAllBookings(data);
    } catch { setAllBookings([]); } finally { setLoading(false); }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try { const { data } = await API.get('/admin/contact'); setContacts(data); }
    catch { setContacts([]); } finally { setLoading(false); }
  };

  const handleMarkContactRead = async (id) => {
    setContacts(prev => prev.map(c => (c._id === id ? { ...c, status: 'read' } : c)));
    try { await API.patch(`/admin/contact/${id}/read`); }
    catch { fetchContacts(); }
  };

  const flash = (msg, type = 'success') => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // Coach actions
  const handleApproveCoach = async (id) => {
    try { await API.patch(`/admin/coaches/${id}/approve`); flash('Coach approved ✅'); fetchCoaches(); fetchStats(); }
    catch { flash('Failed', 'error'); }
  };
  const handleRejectCoach = async () => {
    try {
      await API.patch(`/admin/coaches/${rejectModal}/reject`, { reason: rejectReason });
      flash('Coach rejected'); setRejectModal(null); setRejectReason('');
      fetchCoaches(); fetchStats();
    } catch { flash('Failed', 'error'); }
  };

  // Ground actions
  const handleApproveGround = async (id) => {
    try { await API.patch(`/admin/grounds/${id}/approve`); flash('Ground approved ✅'); fetchGrounds(); fetchStats(); }
    catch { flash('Failed', 'error'); }
  };
  const handleRejectGround = async () => {
    try {
      await API.patch(`/admin/grounds/${groundRejectModal}/reject`, { reason: groundRejectReason });
      flash('Ground rejected'); setGroundRejectModal(null); setGroundRejectReason('');
      fetchGrounds(); fetchStats();
    } catch { flash('Failed', 'error'); }
  };
  const handleSetCommission = async (id, commissionPercent) => {
    try {
      await API.patch(`/admin/grounds/${id}/commission`, { commissionPercent });
      flash(`Commission set to ${commissionPercent}% ✅`);
      fetchGrounds();
    } catch (err) { flash(err.response?.data?.message || 'Failed', 'error'); }
  };
  const handleSetVenueMode = async (id, venueMode) => {
    try {
      await API.patch(`/admin/grounds/${id}/venue-mode`, { venueMode });
      const label = venueMode === 'live' ? 'Venue is now live 🎉' : venueMode === 'interest' ? 'Venue set to interest-only mode' : 'Venue set to trial mode';
      flash(label);
      fetchGrounds();
    } catch (err) { flash(err.response?.data?.message || 'Failed', 'error'); }
  };
  const handleAssignOwner = async (id) => {
    const email = (ownerEmail[id] || '').trim();
    if (!email) { flash('Type the manager’s login email first', 'error'); return; }
    if (!window.confirm(`Hand this venue to ${email}? They'll become its owner and manage bookings/scanning from their normal login.`)) return;
    try {
      const { data } = await API.patch(`/admin/grounds/${id}/owner`, { email });
      flash(data.message);
      setOwnerEmail((prev) => ({ ...prev, [id]: '' }));
      fetchGrounds();
    } catch (err) { flash(err.response?.data?.message || 'Failed to assign owner', 'error'); }
  };
  const handleDeleteGround = async (id, name) => {
    if (!confirm(`Delete "${name}"? This also removes its bookings, payments, and leads. This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/grounds/${id}`);
      flash('Venue deleted ✅'); fetchGrounds(); fetchStats();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete';
      if (msg.includes('force=true') && confirm(`${msg}\n\nDelete anyway and force-remove those bookings/payments too?`)) {
        try {
          await API.delete(`/admin/grounds/${id}?force=true`);
          flash('Venue force-deleted ✅'); fetchGrounds(); fetchStats();
        } catch (e2) { flash(e2.response?.data?.message || 'Failed', 'error'); }
      } else {
        flash(msg, 'error');
      }
    }
  };

  // Social booking actions
  const handleApproveSocial = async (id) => {
    try { await API.patch(`/admin/social-bookings/${id}/approve`); flash('Booking approved ✅'); fetchSocialBookings(); fetchStats(); }
    catch { flash('Failed', 'error'); }
  };
  const handleRejectSocial = async (id) => {
    try { await API.patch(`/admin/social-bookings/${id}/reject`); flash('Booking rejected'); fetchSocialBookings(); fetchStats(); }
    catch { flash('Failed', 'error'); }
  };

  // User actions — now properly await and surface errors
  const handleToggleUser = async (id) => {
    // Optimistic update for instant feedback
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
    try {
      const { data } = await API.patch(`/admin/users/${id}/toggle-active`);
      flash(data.message);
      await fetchUsers();
      fetchStats();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to toggle user', 'error');
      await fetchUsers();
    }
  };

  const handleRoleChange = async (id, role) => {
    const prevUsers = [...users];
    // Optimistic update
    setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
    try {
      const { data } = await API.patch(`/admin/users/${id}/role`, { role });
      flash(data.message);
      await fetchUsers();
      fetchStats();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to update role', 'error');
      setUsers(prevUsers);
      await fetchUsers();
    }
  };

  // Helpers
  const statusColor = (s) => {
    const map = {
      pending_approval: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
      advance_pending:  'bg-orange-400/10 text-orange-400 border-orange-400/20',
      advance_paid:     'bg-blue-400/10 text-blue-400 border-blue-400/20',
      completed:        'bg-green-400/10 text-green-400 border-green-400/20',
      cancelled:        'bg-red-400/10 text-red-400 border-red-400/20',
      refunded:         'bg-gray-400/10 text-gray-400 border-gray-400/20',
    };
    return map[s] || 'bg-white/5 text-gray-400 border-white/10';
  };

  const roleColor = (r) => {
    const map = {
      admin:        'bg-purple-400/10 text-purple-400 border-purple-400/20',
      coach:        'bg-blue-400/10 text-blue-400 border-blue-400/20',
      ground_owner: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
      gym_owner:    'bg-pink-400/10 text-pink-400 border-pink-400/20',
      pool_owner:   'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
      player:       'bg-green-400/10 text-green-400 border-green-400/20',
    };
    return map[r] || 'bg-white/5 text-gray-400';
  };

  const approvalColor = (s) => {
    if (s === 'approved') return 'bg-green-400/10 text-green-400 border-green-400/20';
    if (s === 'rejected') return 'bg-red-400/10 text-red-400 border-red-400/20';
    return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .font-bebas { font-family: 'Bebas Neue', cursive !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(12px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .anim-fadeUp { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        .anim-slideIn { animation: slideIn 0.3s ease forwards; }
        .anim-cardIn  { animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
        .tab-active { background:rgba(74,222,128,0.12); color:#4ade80; border:1px solid rgba(74,222,128,0.22); }
        .tab-inactive { background:transparent; color:#6b7280; border:1px solid transparent; }
        .tab-inactive:hover { border-color:rgba(255,255,255,0.08); color:#9ca3af; }
        .card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:16px; }
        .stat-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:20px; transition:all 0.3s; position:relative; overflow:hidden; }
        .stat-card:hover { transform:translateY(-2px); border-color:rgba(74,222,128,0.15); }
        .badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:100px; border:1px solid; }
        .select-field { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:8px 12px; color:inherit; font-size:13px; outline:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .select-field option { background:#111; }
        .grid-dots { background-image:radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px); background-size:28px 28px; }
        @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
        .shimmer-text { background:linear-gradient(90deg,#4ade80,#22c55e,#86efac,#4ade80); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 3s linear infinite; }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <Navbar />

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 anim-slideIn px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap ${
          msgType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>{msgType === 'success' ? '✅' : '⚠️'} {message}</div>
      )}

      {/* Coach reject modal */}
      {rejectModal && (
        <RejectModal
          title="Reject Coach Application"
          value={rejectReason}
          onChange={setRejectReason}
          onCancel={() => { setRejectModal(null); setRejectReason(''); }}
          onConfirm={handleRejectCoach}
        />
      )}

      {/* Ground reject modal */}
      {groundRejectModal && (
        <RejectModal
          title="Reject Ground Application"
          value={groundRejectReason}
          onChange={setGroundRejectReason}
          onCancel={() => { setGroundRejectModal(null); setGroundRejectReason(''); }}
          onConfirm={handleRejectGround}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="anim-fadeUp mb-8">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide shimmer-text">ADMIN DASHBOARD</h1>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8 anim-fadeUp">
            {[
              { label: 'Total Users',      value: stats.totalUsers,       color: '#4ade80', icon: '👥' },
              { label: 'Players',          value: stats.playerCount,      color: '#4ade80', icon: '🏃' },
              { label: 'Ground Owners',    value: stats.groundOwnerCount, color: '#60a5fa', icon: '🏟️' },
              { label: 'Total Grounds',    value: stats.totalGrounds,     color: '#a78bfa', icon: '📍' },
              { label: 'Pending Grounds',  value: stats.pendingGrounds,   color: '#f97316', icon: '⏳' },
              { label: 'Social Grounds',   value: stats.socialGrounds,    color: '#fbbf24', icon: '✨' },
              { label: 'Total Bookings',   value: stats.totalBookings,    color: '#34d399', icon: '📅' },
              { label: 'Social Pending',   value: stats.pendingApprovals, color: '#f97316', icon: '🕐' },
              { label: 'Completed',        value: stats.completedBookings,color: '#4ade80', icon: '✅' },
              { label: 'Cancelled',        value: stats.cancelledBookings,color: '#f87171', icon: '❌' },
              { label: 'Pending Coaches',  value: stats.pendingCoaches,   color: '#fbbf24', icon: '🎓' },
              { label: 'Total Coaches',    value: stats.totalCoaches,     color: '#a78bfa', icon: '👨‍🏫' },
              { label: 'Total Events',     value: stats.totalEvents,      color: '#60a5fa', icon: '🏆' },
              { label: 'Pending Events',   value: stats.pendingEvents,    color: '#f97316', icon: '⏳' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-bebas text-3xl" style={{ color: s.color }}>{s.value ?? 0}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 anim-fadeUp">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'tab-active' : 'tab-inactive'}`}
            >
              {t.label}
              {t.id === 'grounds' && stats?.pendingGrounds > 0 && (
                <span className="ml-2 bg-orange-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingGrounds}</span>
              )}
              {t.id === 'social' && stats?.pendingApprovals > 0 && (
                <span className="ml-2 bg-orange-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingApprovals}</span>
              )}
              {t.id === 'coaches' && stats?.pendingCoaches > 0 && (
                <span className="ml-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingCoaches}</span>
              )}
              {t.id === 'events' && stats?.pendingEvents > 0 && (
                <span className="ml-2 bg-orange-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingEvents}</span>
              )}
              {t.id === 'growth' && ((stats?.pendingChallenges || 0) + (stats?.careerApplications || 0) + (stats?.collaborationInquiries || 0) > 0) && (
                <span className="ml-2 bg-green-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{(stats?.pendingChallenges || 0) + (stats?.careerApplications || 0) + (stats?.collaborationInquiries || 0)}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="anim-cardIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Ground Approvals',         count: stats?.pendingGrounds,   color: '#f97316', icon: '🏟️', tab: 'grounds', desc: 'grounds awaiting review' },
                { label: 'Social Booking Approvals', count: stats?.pendingApprovals, color: '#f97316', icon: '✨', tab: 'social',  desc: 'pending approval requests' },
                { label: 'Coach Applications',       count: stats?.pendingCoaches,   color: '#fbbf24', icon: '🎓', tab: 'coaches', desc: 'waiting for review' },
                { label: 'Event Approvals',           count: stats?.pendingEvents,    color: '#f97316', icon: '🏆', tab: 'events',  desc: 'events awaiting review' },
              ].map((item, i) => (
                <button key={i} onClick={() => setActiveTab(item.tab)} className="card text-left hover:border-green-400/20 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${item.color}18` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold group-hover:text-green-400 transition-colors">{item.label}</p>
                      <p className="text-sm" style={{ color: item.color }}><span className="font-bebas text-2xl mr-1">{item.count ?? 0}</span>{item.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── GROUNDS TAB ── */}
        {activeTab === 'grounds' && (
          <div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">GROUND APPLICATIONS</h2>
              <div className="flex gap-2 ml-auto">
                {['pending', 'approved', 'rejected'].map(f => (
                  <button
                    key={f}
                    onClick={() => setGroundFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${groundFilter === f ? 'tab-active' : 'tab-inactive'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={fetchGrounds} className="text-xs text-gray-500 hover:text-green-400 transition-colors">↻</button>
            </div>

            {loading ? <Spinner /> : grounds.length === 0 ? (
              <EmptyState icon="🏟️" text={`No ${groundFilter} ground applications`} />
            ) : (
              <div className="flex flex-col gap-3">
                {grounds.map((ground, i) => (
                  <div key={ground._id} className="card anim-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Sport icon */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                        {SPORT_EMOJI[ground.sport] || '🏆'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-gray-900 dark:text-white font-semibold">{ground.name}</p>
                          {ground.isSocial && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">SOCIAL</span>}
                          {ground.venueType === 'gym' && <span className="text-[10px] bg-pink-400 text-black px-1.5 py-0.5 rounded font-bold">GYM</span>}
                          {ground.venueType === 'pool' && <span className="text-[10px] bg-cyan-400 text-black px-1.5 py-0.5 rounded font-bold">POOL</span>}
                          <span className={`badge ${approvalColor(ground.approvalStatus)} capitalize`}>{ground.approvalStatus}</span>
                        </div>
                        <p className="text-gray-500 text-xs mb-1">📍 {ground.address}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {ground.venueType !== 'gym' && ground.venueType !== 'pool' && <span className="capitalize">{ground.sport}</span>}
                          <span>{ground.venueMode === 'trial' ? '🎟️ Trial mode' : ground.venueMode === 'interest' ? '👀 Interest only' : ground.isSocial ? 'Free (Social)' : `₹${ground.sports?.[0]?.pricePerHour ?? ground.pricePerHour}/hr`}</span>
                          {ground.amenities?.length > 0 && <span>{ground.amenities.slice(0, 3).join(', ')}{ground.amenities.length > 3 ? ` +${ground.amenities.length - 3}` : ''}</span>}
                        </div>
                        {/* Owner */}
                        <div className="flex items-center gap-2 mt-2">
                          {ground.owner?.avatar
                            ? <img src={ground.owner.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            : <div className="w-6 h-6 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 text-xs font-bold">{ground.owner?.name?.charAt(0)}</div>
                          }
                          <p className="text-gray-500 text-xs">{ground.owner?.name} · {ground.owner?.email}</p>
                        </div>
                        {ground.rejectionReason && (
                          <p className="text-red-400 text-xs mt-1.5">Rejection reason: {ground.rejectionReason}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-1">Submitted {new Date(ground.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>

                      {/* Actions */}
                      {groundFilter === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApproveGround(ground._id)}
                            className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all"
                          >✅ Approve</button>
                          <button
                            onClick={() => setGroundRejectModal(ground._id)}
                            className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all"
                          >❌ Reject</button>
                        </div>
                      )}
                      {groundFilter === 'rejected' && (
                        <button
                          onClick={() => handleApproveGround(ground._id)}
                          className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all flex-shrink-0"
                        >↩ Re-approve</button>
                      )}
                      {groundFilter !== 'pending' && (
                        <button
                          onClick={() => handleDeleteGround(ground._id, ground.name)}
                          className="bg-red-400/10 border border-red-400/20 text-red-400 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all flex-shrink-0"
                          title="Delete venue"
                        >🗑️</button>
                      )}
                    </div>

                    {/* Hand venue to a manager + commission & trial→live controls — only relevant once a venue is approved */}
                    {groundFilter === 'approved' && (
                      <div className="mt-4 pt-4 border-t border-black/8 dark:border-white/8 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Manager email</label>
                          <input
                            type="email"
                            value={ownerEmail[ground._id] || ''}
                            onChange={(e) => setOwnerEmail((prev) => ({ ...prev, [ground._id]: e.target.value }))}
                            placeholder={ground.owner?.email || 'manager@email.com'}
                            className="w-48 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-green-400"
                          />
                          <button
                            onClick={() => handleAssignOwner(ground._id)}
                            className="bg-green-400/15 border border-green-400/25 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-400/25 transition-all whitespace-nowrap"
                            title="Make this login the venue owner — they keep using normal login and get Manage + Scanner on the venue page"
                          >🤝 Hand over</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Commission %</label>
                          <input
                            type="number" min="0" max="100" defaultValue={ground.commissionPercent ?? 15}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (!Number.isNaN(val) && val !== ground.commissionPercent) handleSetCommission(ground._id, val);
                            }}
                            className="w-16 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-green-400"
                          />
                          <span className="text-gray-500 text-[11px]">stays with platform · rest goes to owner</span>
                        </div>

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                          {ground.venueType === 'pool' && ground.venueMode === 'live' && (
                            <Link
                              to={`/admin/pools/${ground._id}`}
                              className="bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-cyan-400/25 transition-all"
                            >Manage Pool</Link>
                          )}
                          {ground.venueMode !== 'live' && (
                            <span className="text-[11px] text-gray-500">
                              {ground.venueMode === 'trial'
                                ? `🎟️ ${ground.trialLeadCount || 0} trial claim${ground.trialLeadCount === 1 ? '' : 's'}`
                                : `👀 ${ground.interestLeadCount || 0} interested`}
                            </span>
                          )}
                          <select
                            value={ground.venueMode || 'live'}
                            onChange={(e) => handleSetVenueMode(ground._id, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer ${
                              ground.venueMode === 'live'
                                ? 'bg-green-400/15 border-green-400/25 text-green-400'
                                : ground.venueMode === 'interest'
                                ? 'bg-blue-400/15 border-blue-400/25 text-blue-400'
                                : 'bg-orange-400/15 border-orange-400/25 text-orange-400'
                            }`}
                          >
                            <option value="trial">🎟️ Trial (2-day free)</option>
                            <option value="interest">👀 Interest only</option>
                            <option value="live">🎉 Live (real booking)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SOCIAL APPROVALS ── */}
        {activeTab === 'social' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">
                SOCIAL GROUND BOOKING REQUESTS
                {socialBookings.length > 0 && (
                  <span className="ml-3 text-sm font-sans bg-orange-400/10 text-orange-400 border border-orange-400/20 px-2 py-0.5 rounded-full">{socialBookings.length} pending</span>
                )}
              </h2>
              <button onClick={fetchSocialBookings} className="text-xs text-gray-500 hover:text-green-400 transition-colors">↻ Refresh</button>
            </div>

            {loading ? <Spinner /> : socialBookings.length === 0 ? (
              <EmptyState icon="✨" text="No pending social ground bookings" sub="All caught up!" />
            ) : (
              <div className="flex flex-col gap-3">
                {socialBookings.map((b, i) => (
                  <div key={b._id} className="card anim-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold flex-shrink-0">
                          {b.player?.avatar
                            ? <img src={b.player.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                            : b.player?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{b.player?.name}</p>
                          <p className="text-gray-500 text-xs">{b.player?.email} · {b.player?.phone}</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm flex items-center gap-2">
                          {b.ground?.name}
                          <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">SOCIAL</span>
                        </p>
                        <p className="text-gray-500 text-xs">📍 {b.ground?.address}</p>
                        <p className="text-gray-400 text-xs mt-0.5">📅 {b.date} · ⏰ {b.startTime} — {b.endTime}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-gray-500 text-xs">Requested</p>
                        <p className="text-gray-400 text-xs">{new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleApproveSocial(b._id)} className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all">✅ Approve</button>
                        <button onClick={() => handleRejectSocial(b._id)} className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all">❌ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COACHES ── */}
        {activeTab === 'coaches' && (
          <div>
            <div className="flex gap-2 mb-5">
              {['pending', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setCoachFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${coachFilter === f ? 'tab-active' : 'tab-inactive'}`}>
                  {f} Coaches
                </button>
              ))}
            </div>
            {loading ? <Spinner /> : coaches.length === 0 ? (
              <EmptyState icon="🎓" text={`No ${coachFilter} coaches`} />
            ) : (
              <div className="flex flex-col gap-3">
                {coaches.map((coach, i) => (
                  <div key={coach._id} className="card anim-cardIn flex flex-col md:flex-row items-start md:items-center gap-4" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {coach.user?.avatar
                        ? <img src={coach.user.avatar} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        : <div className="w-12 h-12 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0">{coach.fullName?.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-semibold truncate">{coach.fullName}</p>
                        <p className="text-gray-500 text-xs">@{coach.username} · {coach.user?.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="badge bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 capitalize">{SPORT_EMOJI[coach.sport]} {coach.sport}</span>
                          <span className="badge bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 capitalize">{coach.coachingLevel}</span>
                          <span className="badge bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400">{coach.experience} yrs · 📍 {coach.city}</span>
                        </div>
                        {coach.bio && <p className="text-gray-500 text-xs mt-1 line-clamp-1">{coach.bio}</p>}
                        {coach.rejectionReason && <p className="text-red-400 text-xs mt-1">Reason: {coach.rejectionReason}</p>}
                      </div>
                    </div>
                    {coachFilter === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleApproveCoach(coach._id)} className="bg-green-400/15 border border-green-400/25 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-400/25 transition-all">✅ Approve</button>
                        <button onClick={() => setRejectModal(coach._id)} className="bg-red-400/10 border border-red-400/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all">❌ Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EVENTS TAB ── */}
        {activeTab === 'events' && (
          <EventApprovals flash={flash} fetchStats={fetchStats} />
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">ALL USERS <span className="text-gray-500 text-base font-sans ml-2">({filteredUsers.length}{userSearch ? ` of ${users.length}` : ''})</span></h2>
              <div className="flex items-center gap-3 flex-1 sm:flex-initial sm:min-w-[280px]">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, phone, or role..."
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-green-400 transition-colors"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 text-sm"
                      title="Clear search"
                    >✕</button>
                  )}
                </div>
                <button onClick={fetchUsers} className="text-xs text-gray-500 hover:text-green-400 transition-colors flex-shrink-0">↻ Refresh</button>
              </div>
            </div>
            {loading ? <Spinner /> : users.length === 0 ? (
              <EmptyState icon="👥" text="No users found" />
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon="🔍" text={`No users match "${userSearch}"`} />
            ) : (
              <div className="flex flex-col gap-2">
                {filteredUsers.map((u, i) => (
                  <div key={u._id} className={`card anim-cardIn flex items-center gap-3 ${!u.isActive ? 'opacity-50' : ''}`} style={{ animationDelay: `${i * 0.03}s` }}>
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0 text-sm">{u.name?.charAt(0)}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">{u.name}</p>
                        <span className={`badge ${roleColor(u.role)} capitalize`}>{u.role?.replace('_', ' ')}</span>
                        {!u.isActive && <span className="badge bg-red-400/10 text-red-400 border-red-400/20">Banned</span>}
                      </div>
                      <p className="text-gray-500 text-xs">{u.email} · {u.phone || 'No phone'}</p>
                      <p className="text-gray-600 text-xs">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                    {u.role !== 'admin' && (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="flex-shrink-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs px-2 py-1.5 text-gray-700 dark:text-gray-300 capitalize outline-none"
                      >
                        <option value="player">player</option>
                        <option value="ground_owner">ground owner</option>
                        <option value="gym_owner">gym owner</option>
                        <option value="pool_owner">pool owner</option>
                        <option value="coach">coach</option>
                      </select>
                    )}
                    {u.role !== 'admin' && (
                      <button onClick={() => handleToggleUser(u._id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          u.isActive
                            ? 'bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/20'
                            : 'bg-green-400/10 border border-green-400/20 text-green-400 hover:bg-green-400/20'
                        }`}>
                        {u.isActive ? '🚫 Ban' : '✅ Unban'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {activeTab === 'bookings' && (
          <div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">ALL BOOKINGS</h2>
              <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)} className="select-field ml-auto">
                <option value="">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="advance_pending">Advance Pending</option>
                <option value="advance_paid">Advance Paid</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
              <button onClick={fetchAllBookings} className="text-xs text-gray-500 hover:text-green-400 transition-colors">↻ Refresh</button>
            </div>
            {loading ? <Spinner /> : allBookings.length === 0 ? (
              <EmptyState icon="📅" text="No bookings found" />
            ) : (
              <div className="flex flex-col gap-2">
                {allBookings.map((b, i) => (
                  <div key={b._id} className="card anim-cardIn" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">{b.ground?.name || 'Unknown Ground'}</p>
                          <span className={`badge ${statusColor(b.status)} capitalize`}>{b.status?.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-gray-500 text-xs">📍 {b.ground?.address}</p>
                        <p className="text-gray-400 text-xs mt-0.5">👤 {b.player?.name} · {b.player?.email}</p>
                        <p className="text-gray-400 text-xs">📅 {b.date} · ⏰ {b.startTime} — {b.endTime}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {b.totalPrice > 0 && (
                          <div className="text-right">
                            <p className="text-gray-500 text-xs">Total</p>
                            <p className="text-green-400 font-bold text-sm">₹{b.totalPrice}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-gray-500 text-xs">Booked</p>
                          <p className="text-gray-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">GET IN TOUCH — MESSAGES</h2>
              <button onClick={fetchContacts} className="text-xs text-gray-500 hover:text-green-400 transition-colors ml-auto">↻ Refresh</button>
            </div>
            {loading ? <Spinner /> : contacts.length === 0 ? (
              <EmptyState icon="✉️" text="No messages yet" />
            ) : (
              <div className="flex flex-col gap-2">
                {contacts.map((c, i) => (
                  <div
                    key={c._id}
                    className="card anim-cardIn cursor-pointer"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => c.status === 'new' && handleMarkContactRead(c._id)}
                  >
                    <div className="flex items-start gap-3">
                      {c.user?.avatar ? (
                        <img src={c.user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 font-bold text-sm flex-shrink-0">
                          {c.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">{c.user?.name || 'Unknown user'}</p>
                          {c.status === 'new' && <span className="badge bg-green-400/15 text-green-400 border-green-400/25">New</span>}
                          <span className="text-gray-500 text-xs ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap break-words">{c.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <AdminGrowthTools flash={flash} />
        )}

      </div>
    </div>
  );
};

/* ── Shared Reject Modal ── */
const RejectModal = ({ title, value, onChange, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-white font-bold text-lg mb-4">{title}</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Reason for rejection..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none resize-none mb-4 focus:border-red-400/40"
      />
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 bg-white/5 border border-white/10 text-gray-400 rounded-xl py-3 text-sm font-semibold hover:bg-white/10 transition-all">Cancel</button>
        <button onClick={onConfirm} className="flex-1 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl py-3 text-sm font-semibold hover:bg-red-400/25 transition-all">Reject</button>
      </div>
    </div>
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
  </div>
);

const EmptyState = ({ icon, text, sub }) => (
  <div className="flex flex-col items-center py-16 gap-3 text-center">
    <span className="text-5xl">{icon}</span>
    <p className="text-gray-500 text-sm">{text}</p>
    {sub && <p className="text-gray-600 text-xs">{sub}</p>}
  </div>
);

export default AdminPanel;
