import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import UserChip from './UserChip';

/* ─── ConfirmPopup ─── */
const ConfirmPopup = ({ member, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    animation: 'gip-fadein 0.2s ease forwards',
  }}>
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 20, padding: 28, maxWidth: 340, width: '100%',
      boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
      animation: 'gip-modalin 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
    }}>
      <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
      <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
        Remove Member?
      </h3>
      <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
        Are you sure you want to remove{' '}
        <strong style={{ color: '#f1f5f9' }}>{member?.name}</strong> from this group?
        <br />
        <span style={{ fontSize: 12, color: '#6b7280' }}>They will lose access to the group chat.</span>
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: '#9ca3af', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.04)'}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: '11px', borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.target.style.transform = 'none'}
        >
          Yes, Remove
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
/**
 * GroupInfoPanel
 * Props:
 *   conv       — active conversation object (type: 'group')
 *   currentUser — the logged-in user object
 *   onClose    — fn to close the panel
 *   onMemberRemoved — fn called after removing a member (to refresh)
 */
const GroupInfoPanel = ({ conv, currentUser, onClose, onMemberRemoved }) => {
  const [groupDetail, setGroupDetail]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [confirmTarget, setConfirmTarget] = useState(null); // member object to remove
  const [removing, setRemoving]         = useState(false);
  const navigate = useNavigate();

  const groupId = conv?.group?._id || conv?.group;
  const creatorId = groupDetail?.createdBy?._id?.toString() || groupDetail?.createdBy?.toString();
  const isCreator = creatorId === currentUser?._id;

  useEffect(() => {
    if (!groupId) return;
    fetchGroupDetail();
  }, [groupId]);

  const fetchGroupDetail = async () => {
    setLoading(true);
    try {
      // Use participants from conversation as fallback while loading
      const { data } = await API.get(`/groups/my`);
      const found = data.find(g => g._id === groupId || g._id?.toString() === groupId?.toString());
      setGroupDetail(found || null);
    } catch {
      setGroupDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmTarget) return;
    setRemoving(true);
    try {
      await API.patch(`/groups/${groupId}/remove-member`, { userId: confirmTarget._id });
      setConfirmTarget(null);
      await fetchGroupDetail();
      onMemberRemoved?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  // Use conv.participants as member list (already populated, no duplicate after backend fix)
  const members = [...new Map((conv?.participants || []).map(p => [p._id?.toString(), p])).values()];

  const SPORT_EMOJI = {
    football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑',
    kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉',
    athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴',
    'box cricket': '🏏', 'box football': '⚽', esports: '🎮',
  };

  return (
    <>
      <style>{`
        @keyframes gip-fadein { from{opacity:0} to{opacity:1} }
        @keyframes gip-modalin { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes gip-slidein { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
        @keyframes gip-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .gip-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 100%;
          max-width: 320px;
          background: rgba(10,12,18,0.97);
          border-left: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          z-index: 50;
          backdrop-filter: blur(20px);
          animation: gip-slidein 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .gip-spin { animation: gip-spin 1s linear infinite; }

        .gip-member-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid transparent;
          transition: all 0.2s;
          cursor: default;
        }
        .gip-member-row:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.05);
        }

        .gip-remove-btn {
          margin-left: auto;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          font-size: 11px;
          font-weight: 600;
          border-radius: 8px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .gip-remove-btn:hover {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }
        .gip-remove-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .gip-scrollarea {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }
        .gip-scrollarea::-webkit-scrollbar { width: 3px; }
        .gip-scrollarea::-webkit-scrollbar-track { background: transparent; }
        .gip-scrollarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .gip-overlay-backdrop {
          position: absolute;
          inset: 0;
          z-index: 49;
          background: rgba(0,0,0,0.4);
          animation: gip-fadein 0.2s ease forwards;
        }
      `}</style>

      {/* Confirm popup — outside panel so it overlays everything */}
      {confirmTarget && (
        <ConfirmPopup
          member={confirmTarget}
          onConfirm={handleRemove}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Backdrop */}
      <div className="gip-overlay-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="gip-panel">

        {/* Header */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Bebas Neue, cursive', fontSize: 20, letterSpacing: '0.05em', color: '#f1f5f9' }}>
              GROUP INFO
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: '#9ca3af', width: 30, height: 30, borderRadius: 8,
                cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'white'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = '#9ca3af'; }}
            >✕</button>
          </div>

          {/* Group icon + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {SPORT_EMOJI[conv?.group?.sport] || '🏆'}
            </div>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                {conv?.group?.name || 'Group Chat'}
              </p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>
                {members.length} member{members.length !== 1 ? 's' : ''}
                {conv?.group?.sport && ` · ${conv.group.sport}`}
              </p>
            </div>
          </div>

          {/* Stats row */}
          {groupDetail && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[
                { label: 'Members', value: `${groupDetail.members?.length}/${groupDetail.maxMembers}` },
                { label: 'Status', value: groupDetail.isOpen ? '🟢 Open' : '🔴 Closed' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                }}>
                  <p style={{ color: '#4ade80', fontFamily: 'Bebas Neue, cursive', fontSize: 18, letterSpacing: '0.05em' }}>{s.value}</p>
                  <p style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members section header */}
        <div style={{
          padding: '14px 16px 8px',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Members ({members.length})
          </p>
          {isCreator && (
            <p style={{ color: '#4ade80', fontSize: 10, fontWeight: 600 }}>
              Tap Remove to kick
            </p>
          )}
        </div>

        {/* Members list */}
        <div className="gip-scrollarea">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="gip-spin" style={{ width: 28, height: 28, border: '2px solid rgba(74,222,128,0.2)', borderTop: '2px solid #4ade80', borderRadius: '50%' }} />
            </div>
          ) : members.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '32px 0' }}>No members found</p>
          ) : (
            members.map((member) => {
              const memberId = member._id?.toString();
              const isThisCreator = memberId === creatorId;
              const isSelf = memberId === currentUser?._id;
              const canRemove = isCreator && !isThisCreator && !isSelf;

              return (
                <div key={memberId} className="gip-member-row">
                  {/* Avatar */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt=""
                      style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(74,222,128,0.2)', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'rgba(74,222,128,0.1)',
                      border: '2px solid rgba(74,222,128,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#4ade80', fontWeight: 700, fontSize: 15, flexShrink: 0,
                    }}>
                      {member.name?.charAt(0)}
                    </div>
                  )}

                  {/* Name + badges */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <UserChip user={member} size="sm" stopPropagation={true} style={{ color: 'inherit' }} />
                      {isThisCreator && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', padding: '1px 6px', borderRadius: 100, flexShrink: 0 }}>
                          CREATOR
                        </span>
                      )}
                      {isSelf && !isThisCreator && (
                        <span style={{ fontSize: 9, color: '#6b7280', flexShrink: 0 }}>you</span>
                      )}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 11, textTransform: 'capitalize', marginTop: 1 }}>
                      {member.role?.replace('_', ' ')}
                    </p>
                  </div>

                  {/* Remove button */}
                  {canRemove && (
                    <button
                      onClick={() => setConfirmTarget(member)}
                      disabled={removing}
                      className="gip-remove-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer note for non-creators */}
        {!isCreator && (
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center' }}>
              Only the group creator can remove members
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default GroupInfoPanel;