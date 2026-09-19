import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GroupInviteModal from '../components/GroupInviteModal';
import { GROUP_STYLES } from '../components/Groupstyles.js';

/* ─── constants ─── */
const SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', esports: '🎮' };

const SPORT_BG = {
  football: 'rgba(34,197,94,0.1)', cricket: 'rgba(59,130,246,0.1)',
  basketball: 'rgba(249,115,22,0.1)', tennis: 'rgba(234,179,8,0.1)',
  badminton: 'rgba(168,85,247,0.1)', volleyball: 'rgba(239,68,68,0.1)',
  'box cricket': 'rgba(59,130,246,0.1)', 'box football': 'rgba(34,197,94,0.1)',
};

/* ─── helpers ─── */
const getDeadlineStatus = (deadline) => {
  const diff = new Date(deadline) - new Date();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (diff < 0) return { text: 'Expired', color: '#ef4444' };
  if (hours < 2) return { text: `${hours}h left`, color: '#ef4444' };
  if (days < 1) return { text: `${hours}h left`, color: '#eab308' };
  return { text: `${days}d left`, color: '#4ade80' };
};

/* ─── MemberRow sub-component ─── */
const MemberRow = ({ member, isCreator, isSelf, canRemove, onRemove }) => (
  <div className="g-member-row">
    {member.avatar ? (
      <img src={member.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(74,222,128,0.2)', flexShrink: 0 }} />
    ) : (
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
        {member.name?.charAt(0)}
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        {member.name}
        {isCreator && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', padding: '1px 7px', borderRadius: 100 }}>CREATOR</span>}
        {isSelf && !isCreator && <span style={{ fontSize: 10, color: '#6b7280' }}>you</span>}
      </p>
    </div>
    {canRemove && !isCreator && (
      <button
        onClick={() => onRemove(member._id)}
        className="g-btn-danger"
        style={{ padding: '5px 10px', fontSize: 11 }}
      >
        Remove
      </button>
    )}
  </div>
);

/* ─── GroupCard sub-component ─── */
const GroupCard = ({ group, user, onGroupChat, onInvite, onLeave, onClose, onRemoveMember, animDelay }) => {
  const [expanded, setExpanded] = useState(false);
  const deadline = getDeadlineStatus(group.joiningDeadline);
  const fillPct = (group.members.length / group.maxMembers) * 100;
  const isCreator = group.createdBy?._id === user._id || group.createdBy === user._id;

  const handleRemoveMember = async (userId) => {
    try {
      await API.patch(`/groups/${group._id}/remove-member`, { userId });
      onRemoveMember();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="g-card g-cardIn" style={{ animationDelay: `${animDelay}s` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Sport Icon */}
        <div className="g-sport-icon" style={{ background: SPORT_BG[group.sport] || 'rgba(74,222,128,0.1)' }}>
          {SPORT_EMOJI[group.sport]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{group.name}</h3>
              <p style={{ color: '#6b7280', fontSize: 12 }}>
                Created by <span style={{ color: '#9ca3af' }}>{group.createdBy?.name}</span>
              </p>
            </div>
            {group.isOpen
              ? <span className="g-status-open"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />Open</span>
              : <span className="g-status-closed">Closed</span>
            }
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              { label: `${SPORT_EMOJI[group.sport]} ${group.sport}`, style: {} },
              { label: `⏰ ${deadline.text}`, style: { color: deadline.color } },
              { label: `👥 ${group.members.length}/${group.maxMembers}`, style: {} },
            ].map((tag, i) => (
              <span key={i} style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 100, color: tag.style.color || '#9ca3af', textTransform: 'capitalize', ...tag.style }}>
                {tag.label}
              </span>
            ))}
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 12 }}>
            <div className="g-progress-track">
              <div className="g-progress-fill" style={{ width: `${fillPct}%` }} />
            </div>
            <p style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{group.members.length} of {group.maxMembers} spots filled</p>
          </div>

          {/* Member avatars */}
          {group.members.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex' }}>
                {group.members.slice(0, 5).map((m, idx) => (
                  m.avatar
                    ? <img key={idx} src={m.avatar} alt="" className="g-member-avatar" style={{ zIndex: idx }} />
                    : <div key={idx} className="g-member-initial" style={{ zIndex: idx }}>{m.name?.charAt(0)}</div>
                ))}
              </div>
              {group.members.length > 5 && (
                <span style={{ fontSize: 11, color: '#6b7280' }}>+{group.members.length - 5} more</span>
              )}
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4ade80', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
              >
                {expanded ? 'Hide members ↑' : 'View members ↓'}
              </button>
            </div>
          )}

          {/* Expanded members list */}
          {expanded && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '8px 4px', marginBottom: 12 }}>
              {group.members.map((m) => {
                const mId = m._id?.toString() || m.toString();
                const creatorId = group.createdBy?._id?.toString() || group.createdBy?.toString();
                return (
                  <MemberRow
                    key={mId}
                    member={m}
                    isCreator={mId === creatorId}
                    isSelf={mId === user._id}
                    canRemove={isCreator && mId !== user._id}
                    onRemove={handleRemoveMember}
                  />
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* Group Chat */}
            <button onClick={() => onGroupChat(group._id)} className="g-btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}>
              💬 Group Chat
            </button>

            {/* Creator actions */}
            {isCreator && group.isOpen && (
              <>
                <button onClick={() => onInvite(group)} className="g-btn-secondary" style={{ fontSize: 12, padding: '8px 14px', color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)' }}>
                  👥 Invite Players
                </button>
                <button onClick={() => onClose(group._id)} className="g-btn-danger">
                  Close Group
                </button>
              </>
            )}

            {/* Non-creator */}
            {!isCreator && (
              <button onClick={() => onLeave(group._id)} className="g-btn-danger">
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const GroupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myGroups, setMyGroups]           = useState([]);
  const [invitations, setInvitations]     = useState([]);
  const [nearbyGroups, setNearbyGroups]   = useState([]);
  const [position, setPosition]           = useState(null);
  const [message, setMessage]             = useState('');
  const [msgType, setMsgType]             = useState('success');
  const [activeTab, setActiveTab]         = useState('my');
  const [creating, setCreating]           = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [inviteModal, setInviteModal]     = useState(null); // group object or null

  const createLock = useRef(false); // prevent double submit

  const [form, setForm] = useState({
    name: '', sport: 'cricket', maxMembers: 11,
    joiningDeadline: '', coordinates: [],
  });

  /* ── inject styles ── */
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = GROUP_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  /* ── initial load ── */
  useEffect(() => {
    fetchMyGroups();
    fetchInvitations();
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.longitude, pos.coords.latitude]);
    });
  }, []);

  /* ── fetchers ── */
  const fetchMyGroups = async () => {
    try {
      const { data } = await API.get('/groups/my');
      // Deduplicate by _id just in case
      const seen = new Set();
      setMyGroups(data.filter(g => { if (seen.has(g._id)) return false; seen.add(g._id); return true; }));
    } catch { setMyGroups([]); }
  };

  const fetchInvitations = async () => {
    try {
      const { data } = await API.get('/groups/invitations');
      setInvitations(data);
    } catch { setInvitations([]); }
  };

  const fetchNearbyGroups = async () => {
    if (!position) return;
    setNearbyLoading(true);
    try {
      const { data } = await API.get(`/groups/nearby?longitude=${position[0]}&latitude=${position[1]}&radius=5000`);
      setNearbyGroups(data);
    } catch { setNearbyGroups([]); }
    finally { setNearbyLoading(false); }
  };

  /* ── flash toast ── */
  const flash = (msg, type = 'success') => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  /* ── handlers ── */
  const handleDetectLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = [pos.coords.longitude, pos.coords.latitude];
      setPosition(coords);
      setForm(f => ({ ...f, coordinates: coords }));
      flash('Location detected ✅');
    });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (createLock.current || creating) return; // prevent double fire
    createLock.current = true;
    setCreating(true);
    try {
      await API.post('/groups', form);
      flash('Group created 🎉');
      setForm({ name: '', sport: 'cricket', maxMembers: 11, joiningDeadline: '', coordinates: position || [] });
      fetchMyGroups();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setCreating(false);
      createLock.current = false;
    }
  };

  const handleRespond = async (groupId, response) => {
    try {
      await API.patch(`/groups/${groupId}/respond`, { response });
      flash(`Invitation ${response} ✅`);
      fetchInvitations();
      fetchMyGroups();
    } catch { flash('Failed', 'error'); }
  };

  const handleJoin = async (groupId) => {
    try {
      await API.patch(`/groups/${groupId}/join`);
      flash('Joined group! 🎉');
      fetchNearbyGroups();
      fetchMyGroups();
    } catch (err) { flash(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleLeave = async (groupId) => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await API.patch(`/groups/${groupId}/leave`);
      flash('Left group');
      fetchMyGroups();
    } catch { flash('Failed', 'error'); }
  };

  const handleClose = async (groupId) => {
    if (!window.confirm('Close this group? Members can no longer join.')) return;
    try {
      await API.patch(`/groups/${groupId}/close`);
      flash('Group closed');
      fetchMyGroups();
    } catch { flash('Failed', 'error'); }
  };

  const handleGroupChat = async (groupId) => {
    try {
      const { data } = await API.get(`/chat/group/${groupId}`);
      navigate(`/chat/${data._id}`);
    } catch { flash('Could not open chat', 'error'); }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {/* Invite Modal */}
      {inviteModal && (
        <GroupInviteModal
          group={inviteModal}
          onClose={() => setInviteModal(null)}
          onInvited={fetchMyGroups}
          flash={flash}
        />
      )}

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 g-slideIn px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap ${
          msgType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {msgType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="g-anim-1 mb-8">
          <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Community</p>
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide shimmer-text">SPORTS GROUPS</h1>
        </div>

        {/* Create Group form */}
        <div data-tour="group-create-form" className="g-anim-2 g-card mb-8" style={{ borderRadius: 24, padding: 28 }}>
          <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-6">CREATE A GROUP</h2>
          <form onSubmit={handleCreateGroup}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="g-label">Group Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sunday Cricket Gang" required className="g-input" />
              </div>
              <div>
                <label className="g-label">Sport</label>
                <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))} className="g-input">
                  {Object.entries(SPORT_EMOJI).map(([val, emoji]) => (
                    <option key={val} value={val}>{emoji} {val.charAt(0).toUpperCase() + val.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="g-label">Max Members</label>
                <input type="number" value={form.maxMembers} onChange={e => setForm(f => ({ ...f, maxMembers: Number(e.target.value) }))} min={2} max={50} required className="g-input" />
              </div>
              <div>
                <label className="g-label">Joining Deadline</label>
                <input type="datetime-local" value={form.joiningDeadline} onChange={e => setForm(f => ({ ...f, joiningDeadline: e.target.value }))} required className="g-input" />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button type="button" onClick={handleDetectLocation} className="g-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                📍 {form.coordinates.length > 0 ? 'Location Set ✅' : 'Detect Location'}
              </button>
              <button type="submit" disabled={creating} className="g-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {creating ? (
                  <><svg className="g-spin" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Creating...</>
                ) : '👥 Create Group'}
              </button>
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div className="g-anim-3">
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { id: 'my', label: 'My Groups', count: myGroups.length },
              { id: 'invitations', label: 'Invitations', count: invitations.length },
              { id: 'nearby', label: 'Nearby', count: nearbyGroups.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'nearby') fetchNearbyGroups(); }}
                className={`g-tab ${activeTab === tab.id ? 'g-tab-active' : 'g-tab-inactive'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, background: activeTab === tab.id ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 100 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── MY GROUPS ── */}
          {activeTab === 'my' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {myGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>👥</p>
                  <p>No groups yet — create your first one above</p>
                </div>
              ) : myGroups.map((group, i) => (
                <GroupCard
                  key={group._id}
                  group={group}
                  user={user}
                  animDelay={i * 0.06}
                  onGroupChat={handleGroupChat}
                  onInvite={(g) => setInviteModal(g)}
                  onLeave={handleLeave}
                  onClose={handleClose}
                  onRemoveMember={fetchMyGroups}
                />
              ))}
            </div>
          )}

          {/* ── INVITATIONS ── */}
          {activeTab === 'invitations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {invitations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📬</p>
                  <p>No pending invitations</p>
                </div>
              ) : invitations.map((group, i) => {
                const deadline = getDeadlineStatus(group.joiningDeadline);
                return (
                  <div key={group._id} className="g-invite-card g-cardIn" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div className="g-sport-icon" style={{ background: SPORT_BG[group.sport] || 'rgba(74,222,128,0.1)' }}>
                        {SPORT_EMOJI[group.sport]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{group.name}</h3>
                        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 10 }}>
                          Invited by <span style={{ color: '#9ca3af' }}>{group.createdBy?.name}</span>
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                          {[
                            { label: `${SPORT_EMOJI[group.sport]} ${group.sport}` },
                            { label: `⏰ ${deadline.text}`, color: deadline.color },
                            { label: `👥 ${group.members?.length}/${group.maxMembers}` },
                          ].map((tag, ti) => (
                            <span key={ti} style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 100, color: tag.color || '#9ca3af', textTransform: 'capitalize' }}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleRespond(group._id, 'accepted')} className="g-accept-btn">✅ Accept</button>
                          <button onClick={() => handleRespond(group._id, 'declined')} className="g-decline-btn">✕ Decline</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── NEARBY ── */}
          {activeTab === 'nearby' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {nearbyLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 12, color: '#6b7280' }}>
                  <div className="g-spin" style={{ width: 32, height: 32, border: '2px solid rgba(74,222,128,0.2)', borderTop: '2px solid #4ade80', borderRadius: '50%' }} />
                  <p style={{ fontSize: 14 }}>Finding groups nearby...</p>
                </div>
              ) : nearbyGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#6b7280' }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
                  <p>No open groups found nearby</p>
                  <button onClick={fetchNearbyGroups} style={{ marginTop: 16, background: 'none', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                    🔄 Try Again
                  </button>
                </div>
              ) : nearbyGroups.map((group, i) => {
                const deadline = getDeadlineStatus(group.joiningDeadline);
                const fillPct = (group.members.length / group.maxMembers) * 100;
                return (
                  <div key={group._id} className="g-card g-cardIn" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div className="g-sport-icon" style={{ background: SPORT_BG[group.sport] || 'rgba(74,222,128,0.1)' }}>
                        {SPORT_EMOJI[group.sport]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17 }}>{group.name}</h3>
                            <p style={{ color: '#6b7280', fontSize: 12 }}>By {group.createdBy?.name}</p>
                          </div>
                          <span className="g-status-open"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />Open</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {[
                            { label: `${SPORT_EMOJI[group.sport]} ${group.sport}` },
                            { label: `⏰ ${deadline.text}`, color: deadline.color },
                            { label: `👥 ${group.members.length}/${group.maxMembers}` },
                          ].map((tag, ti) => (
                            <span key={ti} style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 100, color: tag.color || '#9ca3af', textTransform: 'capitalize' }}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div className="g-progress-track"><div className="g-progress-fill" style={{ width: `${fillPct}%` }} /></div>
                        </div>
                        <button onClick={() => handleJoin(group._id)} className="g-btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
                          Join Group 👥
                        </button>
                      </div>
                    </div>
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

export default GroupPage;