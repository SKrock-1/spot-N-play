import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import InviteShareButtons from '../components/InviteShareButtons';
import { useAuth } from '../context/AuthContext';

// Wallet — Fitcoin balance, Fit Points score, and the Invite & Earn panel.
// 1 unit of currency = 1 Fitcoin (₹1 = 1 FC). Fit Points ride along 1:1 for
// now and are the lifetime score behind the Leaderboard — never spendable.
const FIT_RULES = [
  ['Book anything', '1 Fitcoin + 1 Fit Point for every ₹1 you pay (advance or final, pool or arena)'],
  ['Friend joins with your code', 'they get 20 Fitcoin the moment they sign up'],
  ["Friend's first booking", 'you get 100 Fitcoin + 100 Fit Points — one reward per friend'],
  ['Fit Points', 'your score on the Leaderboard. Not money, not redeemable — yet.'],
];

const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

const WalletPage = () => {
  const [tab, setTab] = useState('overview');
  const [wallet, setWallet] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const [w, i] = await Promise.all([
          API.get('/users/fit/wallet'),
          API.get('/users/fit/invite'),
        ]);
        setWallet(w.data);
        setInvite(i.data);
      } catch (err) {
        flash(err.response?.data?.message || 'Could not load wallet');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied ✅`);
    } catch {
      flash('Copy failed — long-press to copy manually');
    }
  };

  const applyCode = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      const { data } = await API.post('/users/fit/apply-referral', { code: codeInput });
      flash(data.message);
      setCodeInput('');
      const w = await API.get('/users/fit/wallet');
      setWallet(w.data);
    } catch (err) {
      flash(err.response?.data?.message || 'Could not apply code');
    } finally {
      setApplying(false);
    }
  };

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-green-400/15 border border-green-400/25 text-green-400 text-sm font-medium shadow-2xl animate-slideIn">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">Your Wallet</h1>
        <p className="text-gray-500 mt-1">Fitcoin is your money. Fit Points are your score.</p>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.03))', borderColor: 'rgba(251,191,36,0.3)' }}>
            <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold">Fitcoin</p>
            <p className="font-bebas text-5xl mt-1">{loading ? '—' : fmtNum(wallet?.fitcoin)}</p>
            <p className="text-xs text-gray-500 mt-1">1 ₹ paid = 1 Fitcoin · ₹{loading ? '—' : fmtNum(wallet?.totalEarnedFitcoin)} earned all-time</p>
          </div>
          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.14), rgba(74,222,128,0.03))', borderColor: 'rgba(74,222,128,0.3)' }}>
            <p className="text-[11px] uppercase tracking-[0.25em] text-green-400 font-bold">Fit Points</p>
            <p className="font-bebas text-5xl mt-1">{loading ? '—' : fmtNum(wallet?.fitPoints)}</p>
            <p className="text-xs text-gray-500 mt-1">Your Leaderboard score · not redeemable (yet)</p>
          </div>
          <div className="glass-card">
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-bold">Rank</p>
            <p className="font-bebas text-4xl mt-1">🏆</p>
            <p className="text-xs text-gray-500 mt-2">See where Fit Points put you against every player on campus.</p>
            <a href="/leaderboard" className="inline-block mt-2 text-green-400 text-xs font-bold hover:underline">Open Leaderboard →</a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-8">
          {[
            { id: 'overview', label: 'How you earn' },
            { id: 'invite', label: '🎁 Invite & Earn' },
            { id: 'history', label: 'History' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="glass-card mt-4">
            <h3 className="font-bold mb-3">How you earn</h3>
            <div className="flex flex-col gap-3">
              {FIT_RULES.map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 border-b border-black/5 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                  <span className="text-green-400 font-bold">✓</span>
                  <div>
                    <p className="text-sm font-bold">{k}</p>
                    <p className="text-xs text-gray-500">{v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'invite' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="glass-card">
              <h3 className="font-bold mb-1">Your invite code</h3>
              <p className="text-xs text-gray-500 mb-4">Share it — friends get {invite?.rules?.signupBonus || 20} Fitcoin on signup, you get {invite?.rules?.firstBookingBonus || 100} Fitcoin when they make their first booking.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-green-400">
                  {invite?.referralCode || '—'}
                </code>
                <button onClick={() => copy(invite?.referralCode || '', 'Invite code')} className="bg-black/5 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold hover:bg-black/10">Copy</button>
              </div>
              <div className="mt-3">
                <InviteShareButtons
                  code={invite?.referralCode || ''}
                  link={invite?.inviteLink || ''}
                  inviterName={user?.name}
                  signupBonus={invite?.rules?.signupBonus || 20}
                  onShared={() => flash('Invite shared 🎁')}
                />
              </div>
              <div className="flex gap-4 mt-4 text-center">
                <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl py-3">
                  <p className="font-bebas text-3xl">{invite?.invitedCount ?? 0}</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Friends joined</p>
                </div>
                <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl py-3">
                  <p className="font-bebas text-3xl">{invite?.earnedFitcoin ?? 0}</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Fitcoin earned</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-card">
                <h3 className="font-bold mb-3">Have a friend's code?</h3>
                <form onSubmit={applyCode} className="flex gap-2">
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="XL2K9FQ"
                    className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-400/50 font-mono tracking-widest"
                  />
                  <button type="submit" disabled={applying || !codeInput.trim()} className="bg-green-400 hover:bg-green-300 disabled:opacity-40 text-black text-sm font-bold px-5 rounded-xl">
                    {applying ? '…' : 'Apply'}
                  </button>
                </form>
              </div>
              <div className="glass-card">
                <h3 className="font-bold mb-3">Friends who joined with your code</h3>
                {(invite?.invited || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No one yet — share your code above 🤝</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-auto">
                    {(invite?.invited || []).map((u) => (
                      <div key={u._id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-sm font-bold overflow-hidden">
                          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || '?')[0]}
                        </div>
                        <p className="text-sm font-semibold flex-1 truncate">{u.name}</p>
                        <span className="text-xs text-gray-500">{new Date(u.joinedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="glass-card mt-4">
            <h3 className="font-bold mb-3">Recent activity</h3>
            {(wallet?.history || []).length === 0 ? (
              <p className="text-sm text-gray-500">Nothing yet — book a turf and your first Fitcoin lands here.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(wallet.history || []).map((h) => (
                  <div key={h._id} className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-2 last:border-0">
                    <span className="text-lg">{h.type === 'earn_booking' ? '🏏' : h.type === 'earn_invite_booking' ? '🎁' : h.type === 'earn_welcome' ? '🎉' : '🤝'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize">{h.note || h.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">+{fmtNum(h.fitcoin)} FC</p>
                      <p className="text-xs text-green-400">+{fmtNum(h.fitPoints)} FP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">Fitcoin and Fit Points have no cash value yet — they're your balance and your score. Redemption rules come later.</p>
      </div>
    </div>
  );
};

export default WalletPage;
