import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SPORT_EMOJI = {
  football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑',
  kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉',
  athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴',
  'box cricket': '🏏', 'box football': '⚽',
};

const formatCountdown = (ms) => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const LiveRequestCard = ({ request, onJoin, onCancel, joining, compact = false }) => {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = new Date(request.expiresAt).getTime();
  const remaining = expiresAt - now;
  const spotsLeft = Math.max(request.playersNeeded - (request.playersJoined?.length || 0), 0);
  const isOrganizer = request.user?._id === user?._id;
  const alreadyJoined = request.playersJoined?.some((p) => p._id === user?._id);
  const isFull = request.status === 'full' || spotsLeft === 0;

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm p-4 transition-all hover:border-green-400/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">{SPORT_EMOJI[request.sport] || '🏅'}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize truncate">{request.sport}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
              {request.user?.name}{isOrganizer ? ' (you)' : ''}
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 text-[11px] font-mono font-semibold bg-green-400/10 border border-green-400/20 text-green-500 dark:text-green-400 px-2 py-1 rounded-lg tabular-nums">
          ⏱ {formatCountdown(remaining)}
        </span>
      </div>

      {request.locationName && (
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1.5 truncate">📍 {request.locationName}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-[11px] bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
          🕒 {new Date(request.scheduledFor).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
        </span>
        <span className="text-[11px] bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
          🎯 {request.skillLevel}
        </span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isFull ? 'bg-gray-400/10 text-gray-500 border border-gray-400/20' : 'bg-green-400/10 text-green-500 dark:text-green-400 border border-green-400/20'}`}>
          👥 {isFull ? 'Game Full' : `Need ${spotsLeft} more`}
        </span>
      </div>

      {!compact && request.note && (
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-2 line-clamp-2">{request.note}</p>
      )}

      {!isOrganizer && !isFull && !alreadyJoined && remaining > 0 && (
        <button
          onClick={() => onJoin?.(request._id)}
          disabled={joining}
          className="w-full mt-1 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-xs rounded-xl py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
        >
          {joining ? 'Joining…' : 'Join Game'}
        </button>
      )}
      {alreadyJoined && !isOrganizer && (
        <p className="text-center text-green-500 dark:text-green-400 text-xs font-semibold mt-1">✅ You're in</p>
      )}
      {isOrganizer && request.status !== 'cancelled' && (
        <button
          onClick={() => onCancel?.(request._id)}
          className="w-full mt-1 bg-red-400/10 border border-red-400/20 text-red-500 dark:text-red-400 font-semibold text-xs rounded-xl py-2 transition-all hover:bg-red-400/15"
        >
          Cancel Request
        </button>
      )}
    </div>
  );
};

export default LiveRequestCard;
