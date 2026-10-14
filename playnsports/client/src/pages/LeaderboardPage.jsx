import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';

// Leaderboard — ranked by Fit Points (the lifetime score), matches played as
// the tie-breaker. Weekly / Monthly / All-time tabs; my row is always shown.
const LeaderboardPage = () => {
  const [range, setRange] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get(`/leaderboard?range=${range}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">Leaderboard</h1>
            <p className="text-gray-500 mt-1">Fit Points decide the order — matches played break ties.</p>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'weekly', label: 'This Week' },
              { id: 'monthly', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((t) => (
              <button key={t.id} onClick={() => setRange(t.id)} className={`tab-btn ${range === t.id ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* My rank */}
        {data?.me && (
          <div className="mt-6 rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(74,222,128,0.02))', borderColor: 'rgba(74,222,128,0.3)' }}>
            <div className="flex items-center gap-4">
              <span className="font-bebas text-4xl text-green-400">{data.me.rank ? medal(data.me.rank) : '—'}</span>
              <div className="w-11 h-11 rounded-full bg-green-400/20 flex items-center justify-center font-bold overflow-hidden">
                {data.me.avatar ? <img src={data.me.avatar} alt="" className="w-full h-full object-cover" /> : (data.me.name || '?')[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold">You</p>
                <p className="text-xs text-gray-500">{data.me.city || 'LPU'}</p>
              </div>
              <div className="text-right">
                <p className="font-bebas text-3xl text-green-400">{Number(data.me.fitPoints || 0).toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Fit Points</p>
              </div>
            </div>
          </div>
        )}

        {/* Podium — top 3 get the stage, everyone else the table */}
        {!loading && (data?.rows || []).length >= 3 && (
          <div className="mt-6 grid grid-cols-3 gap-3 items-end">
            {[data.rows[1], data.rows[0], data.rows[2]].map((r, i) => {
              const place = [2, 1, 3][i];
              return (
                <div
                  key={r._id}
                  className={`rounded-2xl border text-center px-2 pb-4 ${place === 1 ? 'pt-6 border-yellow-400/40 bg-yellow-400/5' : 'pt-4 border-black/10 dark:border-white/10'}`}
                >
                  <div className={`mx-auto rounded-full bg-green-400/20 flex items-center justify-center font-bold overflow-hidden ${place === 1 ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}`}>
                    {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full object-cover" /> : (r.name || '?')[0]}
                  </div>
                  <p className="text-2xl mt-1">{medal(place)}</p>
                  <p className="font-bold text-sm truncate mt-1">{r.name}</p>
                  <p className={`font-bebas text-xl ${place === 1 ? 'text-yellow-500' : 'text-green-400'}`}>{Number(r.fitPoints || 0).toLocaleString('en-IN')}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Table */}
        <div className="glass-card mt-5">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading players…</p>
          ) : (data?.rows || []).length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl">🏆</span>
              <p className="text-gray-500 text-sm mt-2">Nobody on the board yet for this range — book a turf and take the top spot.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {(data.rows || []).map((r) => (
                <div key={r._id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.rank <= 3 ? 'bg-green-400/5' : ''}`}>
                  <span className="w-10 text-center font-bebas text-xl">{medal(r.rank)}</span>
                  <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                    {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full object-cover" /> : (r.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.matches} match{r.matches === 1 ? '' : 'es'} played</p>
                  </div>
                  <p className="font-bold text-green-400">{Number(r.fitPoints || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Fit Points come from every ₹1 you spend — <Link to="/wallet" className="text-green-400 hover:underline">see your wallet</Link>.
        </p>
      </div>
    </div>
  );
};

export default LeaderboardPage;
