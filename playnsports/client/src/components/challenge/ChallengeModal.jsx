import { useState } from 'react';
import API from '../../api/axios';

const SPORTS = [
  { value: 'football', label: '⚽ Football' },
  { value: 'cricket', label: '🏏 Cricket' },
  { value: 'basketball', label: '🏀 Basketball' },
  { value: 'tennis', label: '🎾 Tennis' },
  { value: 'badminton', label: '🏸 Badminton' },
  { value: 'volleyball', label: '🏐 Volleyball' },
  { value: 'boxing', label: '🥊 Boxing' },
  { value: 'hockey', label: '🏑 Hockey' },
  { value: 'kabaddi', label: '🤼 Kabaddi' },
  { value: 'kho kho', label: '🏃 Kho Kho' },
  { value: 'pickleball', label: '🏓 Pickleball' },
  { value: 'table tennis', label: '🏓 Table Tennis' },
  { value: 'squash', label: '🎾 Squash' },
  { value: 'handball', label: '🤾 Handball' },
  { value: 'futsal', label: '⚽ Futsal' },
  { value: 'rugby', label: '🏉 Rugby' },
  { value: 'athletics', label: '🏃 Athletics' },
  { value: 'wrestling', label: '🤼 Wrestling' },
  { value: 'weightlifting', label: '🏋️ Weightlifting' },
  { value: 'yoga', label: '🧘 Yoga' },
  { value: 'skating', label: '⛸️ Skating' },
  { value: 'chess', label: '♟️ Chess' },
  { value: 'carrom', label: '🎯 Carrom' },
  { value: 'archery', label: '🏹 Archery' },
  { value: 'shooting', label: '🎯 Shooting' },
  { value: 'cycling', label: '🚴 Cycling' },
  { value: 'box cricket', label: '🏏 Box Cricket' },
  { value: 'box football', label: '⚽ Box Football' },
];

// Modal to challenge another player to a 1v1 match — opened from their
// profile via the "Challenge this player" button.
const ChallengeModal = ({ opponent, onClose, onChallenged }) => {
  const [form, setForm] = useState({ sport: 'football', proposedDate: '', proposedTime: '', venue: '', message: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await API.post('/player-challenges', { opponentId: opponent._id, ...form });
      onChallenged?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ch-fixed ch-inset-0 ch-z-[999] ch-flex ch-items-center ch-justify-center ch-p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="ch-w-full ch-max-w-md ch-rounded-3xl ch-p-6"
        style={{ background: 'var(--glass-bg, #101010)', border: '1px solid var(--glass-border, rgba(255,255,255,0.1))', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ch-flex ch-items-start ch-gap-3 ch-mb-5">
          <div className="ch-w-11 ch-h-11 ch-rounded-xl ch-flex ch-items-center ch-justify-center ch-text-xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>⚔️</div>
          <div className="ch-flex-1">
            <h2 className="ch-text-lg ch-font-bold" style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>
              CHALLENGE {opponent.name?.toUpperCase()}
            </h2>
            <p className="ch-text-xs" style={{ color: '#9ca3af' }}>Settle it on the field — they can accept or decline.</p>
          </div>
          <button onClick={onClose} className="ch-text-sm ch-font-bold ch-px-2" style={{ color: '#9ca3af' }}>✕</button>
        </div>

        {error && (
          <div className="ch-rounded-xl ch-px-3 ch-py-2 ch-mb-4 ch-text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>⚠️ {error}</div>
        )}

        <div className="ch-flex ch-flex-col ch-gap-3">
          <label className="ch-block">
            <span className="ch-text-[10px] ch-uppercase ch-tracking-widest" style={{ color: '#9ca3af' }}>Sport</span>
            <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="ch-input">
              {SPORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          <div className="ch-grid ch-grid-cols-2 ch-gap-3">
            <label className="ch-block">
              <span className="ch-text-[10px] ch-uppercase ch-tracking-widest" style={{ color: '#9ca3af' }}>Date (optional)</span>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={form.proposedDate} onChange={(e) => setForm({ ...form, proposedDate: e.target.value })} className="ch-input" />
            </label>
            <label className="ch-block">
              <span className="ch-text-[10px] ch-uppercase ch-tracking-widest" style={{ color: '#9ca3af' }}>Time (optional)</span>
              <input type="time" value={form.proposedTime} onChange={(e) => setForm({ ...form, proposedTime: e.target.value })} className="ch-input" />
            </label>
          </div>

          <label className="ch-block">
            <span className="ch-text-[10px] ch-uppercase ch-tracking-widest" style={{ color: '#9ca3af' }}>Venue (optional)</span>
            <input type="text" placeholder="Ground name, area, or 'online'" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="ch-input" />
          </label>

          <label className="ch-block">
            <span className="ch-text-[10px] ch-uppercase ch-tracking-widest" style={{ color: '#9ca3af' }}>Trash talk (optional)</span>
            <textarea rows={2} maxLength={500} placeholder="Loser buys the drinks 🥤" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="ch-input" />
          </label>

          <button onClick={submit} disabled={loading} className="ch-btn-send">
            {loading ? 'Sending…' : `Send Challenge ⚔️`}
          </button>
        </div>
      </div>

      <style>{`
        .ch-input {
          width: 100%; margin-top: 6px; padding: 10px 12px; border-radius: 12px; font-size: 13px;
          outline: none; color: inherit; font-family: 'DM Sans', sans-serif;
          background: rgba(127,127,127,0.08); border: 1px solid rgba(127,127,127,0.22);
        }
        .ch-input:focus { border-color: rgba(74,222,128,0.55); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }
        .ch-btn-send {
          width: 100%; margin-top: 6px; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 14px;
          background: linear-gradient(135deg, #4ade80, #16a34a); color: #052e12; font-family: 'DM Sans', sans-serif;
        }
        .ch-btn-send:disabled { opacity: 0.6; }
        .ch-flex { display: flex; } .ch-flex-col { flex-direction: column; } .ch-flex-1 { flex: 1; min-width: 0; }
        .ch-items-start { align-items: flex-start; } .ch-items-center { align-items: center; } .ch-justify-center { justify-content: center; }
        .ch-grid { display: grid; } .ch-grid-cols-2 { grid-template-columns: 1fr 1fr; } .ch-gap-3 { gap: 12px; }
        .ch-fixed { position: fixed; } .ch-inset-0 { inset: 0; } .ch-z-\[999\] { z-index: 999; } .ch-p-4 { padding: 16px; }
        .ch-w-full { width: 100%; } .ch-max-w-md { max-width: 28rem; } .ch-rounded-3xl { border-radius: 24px; } .ch-p-6 { padding: 24px; }
        .ch-mb-5 { margin-bottom: 20px; } .ch-mb-4 { margin-bottom: 16px; } .ch-gap-3 { gap: 12px; }
        .ch-w-11 { width: 44px; } .ch-h-11 { height: 44px; } .ch-rounded-xl { border-radius: 14px; } .ch-text-xl { font-size: 20px; }
        .ch-text-lg { font-size: 18px; } .ch-text-xs { font-size: 12px; } .ch-text-sm { font-size: 13px; }
        .ch-font-bold { font-weight: 700; } .ch-px-2 { padding-left: 8px; padding-right: 8px; } .ch-px-3 { padding-left: 12px; padding-right: 12px; }
        .ch-py-2 { padding-top: 8px; padding-bottom: 8px; } .ch-block { display: block; }
      `}</style>
    </div>
  );
};

export default ChallengeModal;
