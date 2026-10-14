import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

// One glanceable economy entry point for the navbar: live Fitcoin balance,
// links to /wallet. Refreshes on every navigation so a just-completed
// booking shows the new balance without a reload.
export default function FitcoinPill() {
  const { user } = useAuth();
  const location = useLocation();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    API.get('/users/fit/wallet')
      .then(({ data }) => { if (live) setBalance(data.fitcoin || 0); })
      .catch(() => { if (live) setBalance(null); });
    return () => { live = false; };
  }, [user, location.pathname]);

  if (!user) return null;

  return (
    <Link
      to="/wallet"
      title="Your Fitcoin wallet"
      className="flex items-center gap-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/25 rounded-full pl-2.5 pr-3 py-1.5 text-sm font-bold text-yellow-500 transition-colors"
    >
      <span>🪙</span>
      {balance === null ? '···' : Number(balance).toLocaleString('en-IN')}
    </Link>
  );
}
