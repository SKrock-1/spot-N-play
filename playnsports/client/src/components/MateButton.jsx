import { useState, useEffect } from 'react';
import API from '../api/axios';

// One self-contained Mate button for player cards — knows the four states
// (mates / requested / incoming you can accept / none) and mutates itself.
export default function MateButton({ userId, size = 'sm', labelOnly = false }) {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (!userId) return;
    API.get(`/mates/status/${userId}`)
      .then(({ data }) => { if (live) setStatus(data.status); })
      .catch(() => { if (live) setStatus('none'); });
    return () => { live = false; };
  }, [userId]);

  const send = async () => {
    setBusy(true);
    try {
      await API.post(`/mates/request/${userId}`);
      setStatus('requested');
    } catch {
      /* keep old state on failure */
    } finally {
      setBusy(false);
    }
  };
  const accept = async (id) => {
    setBusy(true);
    // incoming rows carry their request id in the status payload
    try {
      const { data } = await API.get(`/mates/status/${userId}`);
      await API.post(`/mates/accept/${data.requestId}`);
      setStatus('mates');
    } catch { /* noop */ } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return null;

  const pad = size === 'lg' ? 'px-4 py-2 text-sm' : 'px-2.5 py-1.5 text-xs';
  const base = `${pad} rounded-lg font-bold transition-colors disabled:opacity-50`;

  if (status === 'mates') return <span className={`${base} bg-green-400/15 text-green-400 border border-green-400/25`}>✓ Mates</span>;
  if (status === 'requested') return <span className={`${base} bg-black/5 dark:bg-white/10 text-gray-500 border border-black/10 dark:border-white/10`}>Requested</span>;
  if (status === 'incoming') return <button disabled={busy} onClick={accept} className={`${base} bg-green-400 hover:bg-green-300 text-black`}>Accept</button>;
  return (
    <button disabled={busy} onClick={send} className={`${base} border border-black/10 dark:border-white/10 hover:border-green-400/40 hover:text-green-400`}>
      {labelOnly ? '🤝 Add Mate' : '🤝 Add Mate'}
    </button>
  );
}
