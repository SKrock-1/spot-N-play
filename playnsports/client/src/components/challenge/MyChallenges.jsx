import { useState, useEffect, useCallback } from 'react';
import API from '../../api/axios';

const SPORT_EMOJI = {
  football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸',
  volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓',
  'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉',
  athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️',
  chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴',
  'box cricket': '🏏', 'box football': '⚽',
};

const fmtWhen = (c) => {
  if (!c.proposedDate) return '';
  const d = c.proposedDate;
  const t = c.proposedTime || '';
  return t ? `${d} · ${t}` : d;
};

// Player-dashboard section for 1v1 challenges: incoming requests to
// accept/decline, outgoing ones you can cancel, accepted matches awaiting a
// result, and finished history.
const MyChallenges = ({ showMessage }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [resultFor, setResultFor] = useState(null); // challenge currently reporting a result for

  const load = useCallback(async () => {
    try {
      const { data: d } = await API.get('/player-challenges/mine');
      setData(d);
    } catch {
      setData({ incoming: [], outgoing: [], active: [], history: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, url, body, okMsg) => {
    setBusy(id + url);
    try {
      await API.patch(`/player-challenges/${id}/${url}`, body || {});
      showMessage?.(okMsg);
      await load();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy('');
    }
  };

  const reportResult = async (challenge, pick) => {
    // pick: { draw: true } or { winnerId }
    const body = pick.draw ? { draw: true } : { winnerId: pick.winnerId };
    await act(challenge._id, 'result', body, 'Result saved 🏁');
    setResultFor(null);
  };

  const Avatar = ({ u }) => u?.avatar
    ? <img src={u.avatar} alt={u.name} className="pc-avatar" />
    : <div className="pc-avatar pc-avatar-letter">{u?.name?.charAt(0) || '?'}</div>;

  const Card = ({ c, children, badge, badgeClass }) => (
    <div className="pc-card">
      <div className="pc-row">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar u={c.opponent} />
          <div className="min-w-0">
            <p className="pc-name">
              {c.challenger?.name || 'Someone'} <span className="pc-vs">vs</span> {c.opponent?.name || 'Someone'}
            </p>
            <p className="pc-meta">
              {SPORT_EMOJI[c.sport] || '🏅'} <span style={{ textTransform: 'capitalize' }}>{c.sport}</span>
              {fmtWhen(c) && <> · 📅 {fmtWhen(c)}</>}
              {c.venue && <> · 📍 {c.venue}</>}
            </p>
            {c.message && <p className="pc-msg">"{c.message}"</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && <span className={`pc-badge ${badgeClass || ''}`}>{badge}</span>}
          {children}
        </div>
      </div>

      {/* Result picker */}
      {resultFor === c._id && (
        <div className="pc-result">
          <p className="pc-result-title">Who won?</p>
          <div className="flex gap-2 flex-wrap">
            <button className="pc-btn pc-btn-solid" disabled={busy === c._id + 'result'} onClick={() => reportResult(c, { winnerId: c.challenger?._id || c.challenger })}>
              🏆 {c.challenger?.name}
            </button>
            <button className="pc-btn pc-btn-solid" disabled={busy === c._id + 'result'} onClick={() => reportResult(c, { winnerId: c.opponent?._id || c.opponent })}>
              🏆 {c.opponent?.name}
            </button>
            <button className="pc-btn" disabled={busy === c._id + 'result'} onClick={() => reportResult(c, { draw: true })}>🤝 Draw</button>
            <button className="pc-btn" onClick={() => setResultFor(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="pc-empty">Loading challenges…</div>;
  if (!data) return null;

  const totalPending = data.incoming.length + data.outgoing.length;
  const nothing = totalPending === 0 && data.active.length === 0 && data.history.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {nothing && (
        <div className="glass-card animate-cardIn pc-empty-card">
          <div className="text-3xl mb-2">⚔️</div>
          <p className="text-gray-900 dark:text-white font-semibold">No challenges yet</p>
          <p className="text-gray-500 text-xs mt-1">Open any player's profile and hit "Challenge this player" to start a duel.</p>
        </div>
      )}

      {data.incoming.length > 0 && (
        <section>
          <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-3">INCOMING ({data.incoming.length})</h2>
          <div className="flex flex-col gap-3">
            {data.incoming.map((c) => (
              <Card key={c._id} c={c} badge="WANTS TO FIGHT" badgeClass="pc-badge-hot">
                <button className="pc-btn pc-btn-solid" disabled={busy === c._id + 'respond'} onClick={() => act(c._id, 'respond', { action: 'accept' }, 'Challenge accepted 🔥')}>Accept</button>
                <button className="pc-btn" disabled={busy === c._id + 'respond'} onClick={() => act(c._id, 'respond', { action: 'decline' }, 'Challenge declined')}>Decline</button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.active.length > 0 && (
        <section>
          <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-3">ACCEPTED — PLAY IT 🎮</h2>
          <div className="flex flex-col gap-3">
            {data.active.map((c) => (
              <Card key={c._id} c={c}>
                {resultFor !== c._id && (
                  <button className="pc-btn pc-btn-solid" onClick={() => setResultFor(c._id)}>Report Result</button>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.outgoing.length > 0 && (
        <section>
          <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-3">SENT BY YOU ({data.outgoing.length})</h2>
          <div className="flex flex-col gap-3">
            {data.outgoing.map((c) => (
              <Card key={c._id} c={c} badge="AWAITING REPLY">
                <button className="pc-btn" disabled={busy === c._id + 'cancel'} onClick={() => act(c._id, 'cancel', {}, 'Challenge cancelled')}>Cancel</button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.history.length > 0 && (
        <section>
          <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-3">HISTORY</h2>
          <div className="flex flex-col gap-3">
            {data.history.map((c) => {
              const label = c.status === 'completed'
                ? (c.winner ? `🏆 ${c.winner.name}` : '🤝 Draw')
                : c.status === 'declined' ? 'Declined' : 'Cancelled';
              return <Card key={c._id} c={c} badge={label} badgeClass={c.status === 'completed' ? 'pc-badge-win' : ''} />;
            })}
          </div>
        </section>
      )}

      <style>{`
        .pc-card { background: var(--dash-glass, rgba(127,127,127,0.06)); border: 1px solid rgba(127,127,127,0.18); border-radius: 16px; padding: 14px 16px; }
        .pc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .pc-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .pc-avatar-letter { display: flex; align-items: center; justify-content: center; font-weight: 700; color: #4ade80; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.25); font-family: 'Bebas Neue', cursive; font-size: 18px; }
        .pc-name { font-weight: 600; font-size: 14px; color: inherit; }
        .pc-vs { color: #4ade80; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 0 4px; }
        .pc-meta { font-size: 11px; opacity: 0.65; margin-top: 2px; }
        .pc-msg { font-size: 11px; opacity: 0.55; font-style: italic; margin-top: 3px; }
        .pc-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 100px; background: rgba(127,127,127,0.15); white-space: nowrap; }
        .pc-badge-hot { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
        .pc-badge-win { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
        .pc-btn { padding: 8px 14px; border-radius: 11px; font-size: 12px; font-weight: 700; border: 1px solid rgba(127,127,127,0.3); color: inherit; background: transparent; cursor: pointer; transition: all .15s ease; font-family: 'DM Sans', sans-serif; }
        .pc-btn:hover { border-color: rgba(74,222,128,0.5); }
        .pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pc-btn-solid { background: linear-gradient(135deg, #4ade80, #16a34a); color: #052e12; border: none; }
        .pc-result { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(127,127,127,0.25); }
        .pc-result-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
        .pc-empty { opacity: 0.5; font-size: 13px; }
        .pc-empty-card { text-align: center; padding: 32px 20px; }
      `}</style>
    </div>
  );
};

export default MyChallenges;
