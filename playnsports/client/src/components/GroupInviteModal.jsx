import { useState, useEffect } from 'react';
import API from '../api/axios';

const SPORT_EMOJI = {
  football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑',
  kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉',
  athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴',
  'box cricket': '🏏', 'box football': '⚽', esports: '🎮',
};

const LEVEL_COLOR = {
  beginner: '#eab308',
  intermediate: '#3b82f6',
  advanced: '#4ade80',
};

/**
 * GroupInviteModal
 * Props:
 *   group      — the Group object
 *   onClose    — fn to close modal
 *   onInvited  — fn called after successful invite(s)
 *   flash      — fn(msg, type) for toast
 */
const GroupInviteModal = ({ group, onClose, onInvited, flash }) => {
  const [players, setPlayers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState(new Set());
  const [sending, setSending]         = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [group._id]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/groups/${group._id}/invitable-players`);
      setPlayers(data);
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (playerId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleSendInvites = async () => {
    if (selected.size === 0) return;
    setSending(true);
    let successCount = 0;
    for (const userId of selected) {
      try {
        await API.post(`/groups/${group._id}/invite`, { userId });
        successCount++;
      } catch (err) {
        flash(err.response?.data?.message || 'Some invites failed', 'error');
      }
    }
    setSending(false);
    if (successCount > 0) {
      flash(`${successCount} invite${successCount > 1 ? 's' : ''} sent ✅`);
      onInvited();
      onClose();
    }
  };

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(q) ||
      p.sport?.toLowerCase().includes(q) ||
      p.skillLevel?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="g-overlay g-overlayIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="g-modal">

        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'Bebas Neue, cursive', fontSize: 24, letterSpacing: '0.05em', color: '#f1f5f9' }}>
              INVITE PLAYERS
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9ca3af', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
            {group.name} · {group.members?.length}/{group.maxMembers} members
          </p>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', fontSize: 15 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or sport..."
              className="g-search"
            />
          </div>

          {/* Selected count bar */}
          {selected.size > 0 && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
                {selected.size} player{selected.size > 1 ? 's' : ''} selected
              </span>
              <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Player list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="g-spin" style={{ width: 32, height: 32, border: '2px solid rgba(74,222,128,0.2)', borderTop: '2px solid #4ade80', borderRadius: '50%' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
              <p style={{ fontSize: 14 }}>{search ? 'No players match your search' : 'No players available to invite'}</p>
            </div>
          ) : (
            filtered.map((player, i) => {
              const isSelected = selected.has(player.user?._id);
              return (
                <div
                  key={player._id}
                  onClick={() => toggleSelect(player.user?._id)}
                  className={`g-player-item ${isSelected ? 'selected' : ''}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {player.user?.avatar ? (
                      <img src={player.user.avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(74,222,128,0.2)' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: 16 }}>
                        {player.user?.name?.charAt(0)}
                      </div>
                    )}
                    {/* Sport emoji badge */}
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#0d1117', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                      {SPORT_EMOJI[player.sport]}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {player.user?.name}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: LEVEL_COLOR[player.skillLevel] || '#9ca3af', background: `${LEVEL_COLOR[player.skillLevel]}18`, border: `1px solid ${LEVEL_COLOR[player.skillLevel]}30`, padding: '1px 7px', borderRadius: 100 }}>
                        {player.skillLevel}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 100, textTransform: 'capitalize' }}>
                        {player.sport}
                      </span>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.15)',
                    background: isSelected ? '#4ade80' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {isSelected && <span style={{ color: 'black', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="g-btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={handleSendInvites}
            disabled={selected.size === 0 || sending}
            className="g-btn-primary"
            style={{ flex: 2 }}
          >
            {sending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg className="g-spin" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Sending...
              </span>
            ) : `Invite ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInviteModal;