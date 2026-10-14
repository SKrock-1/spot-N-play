import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';

// Mates — the friends whose requests you accepted (or who accepted yours).
// Requests tab shows incoming with Accept / Decline and outgoing as pending.
const MatesPage = () => {
  const [tab, setTab] = useState('mates');
  const [data, setData] = useState({ mates: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    try {
      const { data } = await API.get('/mates');
      setData(data);
    } catch {
      flash('Could not load mates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accept = async (id) => {
    try {
      await API.post(`/mates/accept/${id}`);
      flash("You're mates now 🤝");
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Could not accept');
    }
  };
  const decline = async (id) => {
    try {
      await API.post(`/mates/decline/${id}`);
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Could not decline');
    }
  };
  const cancel = async (id) => {
    try {
      await API.post(`/mates/cancel/${id}`);
      flash('Request cancelled');
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Could not cancel');
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this mate?')) return;
    try {
      await API.delete(`/mates/${id}`);
      flash('Mate removed');
      load();
    } catch {
      flash('Could not remove');
    }
  };

  const Avatar = ({ u, size = 'w-9 h-9' }) => (
    <div className={`${size} rounded-full bg-green-400/20 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0`}>
      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || '?')[0]}
    </div>
  );

  const incoming = data.incoming || [];
  const outgoing = data.outgoing || [];

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-green-400/15 border border-green-400/25 text-green-400 text-sm font-medium shadow-2xl">{toast}</div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">Mates</h1>
        <p className="text-gray-500 mt-1">Your crew — players whose requests you accepted. Find new ones from the Map or Find Players.</p>

        <div className="flex gap-2 mt-6">
          {[
            { id: 'mates', label: `Mates (${(data.mates || []).length})` },
            { id: 'requests', label: `Requests (${incoming.length + outgoing.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'mates' && (
          <div className="glass-card mt-4">
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading…</p>
            ) : (data.mates || []).length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl">🤝</span>
                <p className="text-gray-500 text-sm mt-2">No mates yet — find players on the map or from chat, open their profile, and send a request.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <a href="/map" className="text-xs bg-green-400 text-black rounded-lg px-4 py-2 font-bold">🗺️ Find Players on Map</a>
                  <a href="/chat" className="text-xs bg-black/5 dark:bg-white/10 rounded-lg px-4 py-2 font-bold">💬 Open Chat</a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(data.mates || []).map((m) => (
                  <div key={m._id} className="flex items-center gap-3 border border-black/5 dark:border-white/5 rounded-xl p-3">
                    <Avatar u={m} />
                    <div className="flex-1 min-w-0">
                      <a href={`/users/${m._id}/profile`} className="font-semibold text-sm hover:text-green-400 truncate block">{m.name}</a>
                      <p className="text-xs text-gray-500 truncate">{[m.city, m.state].filter(Boolean).join(', ') || 'Campus player'}</p>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/users/${m._id}/profile`} className="text-xs bg-black/5 dark:bg-white/10 rounded-lg px-2.5 py-1.5 font-bold hover:bg-black/10">Profile</a>
                      <button onClick={() => remove(m._id)} className="text-xs text-red-400 px-2 py-1.5 font-bold hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="glass-card">
              <h3 className="font-bold mb-3">Incoming ({incoming.length})</h3>
              {incoming.length === 0 ? (
                <p className="text-sm text-gray-500">No pending requests.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {incoming.map((r) => (
                    <div key={r._id} className="flex items-center gap-3 border border-black/5 dark:border-white/5 rounded-xl p-3">
                      <Avatar u={r.from} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{r.from?.name}</p>
                        <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <button onClick={() => accept(r._id)} className="text-xs bg-green-400 text-black rounded-lg px-3 py-1.5 font-bold">Accept</button>
                      <button onClick={() => decline(r._id)} className="text-xs bg-black/5 dark:bg-white/10 rounded-lg px-3 py-1.5 font-bold">Decline</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-card">
              <h3 className="font-bold mb-3">Sent ({outgoing.length})</h3>
              {outgoing.length === 0 ? (
                <p className="text-sm text-gray-500">No requests waiting.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {outgoing.map((r) => (
                    <div key={r._id} className="flex items-center gap-3 border border-black/5 dark:border-white/5 rounded-xl p-3">
                      <Avatar u={r.to} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{r.to?.name}</p>
                        <p className="text-xs text-gray-500">Request pending</p>
                      </div>
                      <button onClick={() => cancel(r._id)} className="text-xs text-gray-500 font-bold hover:underline">Cancel</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatesPage;
