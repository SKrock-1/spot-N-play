import { useState, useRef, useEffect, useMemo } from 'react';
import { SPORTS, SPORT_EMOJI, sportLabel } from '../utils/sports';

// Reusable searchable sport selector — type to filter, keeps All Sports pinned.
// Props: value (string '' = All), onChange(sport), placeholder, includeAll=true, compactPills=false
export default function SearchableSportSelect({ value = '', onChange, placeholder = '🔍 Search sports… e.g. pickleball', includeAll = true, compactPills = false, popularSports = null, className = '' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SPORTS;
    return SPORTS.filter((s) => s.toLowerCase().includes(needle) || (SPORT_EMOJI[s] || '').includes(q));
  }, [q]);

  // popular few for compact mode — caller can override (CoachesPage wants football/volleyball/basketball)
  const popular = useMemo(() => popularSports || ['football','cricket','basketball','badminton','pickleball','kabaddi'], [popularSports]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    // sync input display to selected value
    if (value) setQ(value);
    else if (!open) setQ('');
  }, [value, open]);

  const pick = (sport) => {
    onChange(sport);
    setQ(sport);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:border-green-400/50"
        />
        {(q || value) && (
          <button onClick={() => { setQ(''); onChange(''); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white text-xs">✕</button>
        )}
      </div>

      {compactPills && !open && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {popular.map((s) => (
            <button key={s} onClick={() => pick(s)} className={`text-xs px-2.5 py-1 rounded-full border ${value===s?'bg-green-500 text-white border-green-500':'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-green-400/30'}`}>
              {SPORT_EMOJI[s]} {sportLabel(s)}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl max-h-72 overflow-auto z-20">
          {includeAll && (
            <button onClick={() => pick('')} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-white/5 ${!value?'bg-green-400/10 text-green-400':''}`}>
              <span>🏆</span> All Sports { !value && <span className="ml-auto text-green-400">✓</span>}
            </button>
          )}
          {filtered.map((s) => (
            <button key={s} onClick={() => pick(s)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-white/5 ${value===s?'bg-green-400/10 text-green-400':''}`}>
              <span>{SPORT_EMOJI[s] || '🏅'}</span> {sportLabel(s)} {value===s && <span className="ml-auto text-green-400">✓</span>}
            </button>
          ))}
          {filtered.length===0 && <p className="text-center py-6 text-gray-500 text-sm">No sport found for “{q}”</p>}
        </div>
      )}

      {value && !open && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-400/10 border border-green-400/20 text-green-400">{SPORT_EMOJI[value]||'🏅'} {sportLabel(value)}</span>
          <button onClick={() => pick('')} className="text-xs text-gray-500 hover:text-white">Clear</button>
        </div>
      )}
    </div>
  );
}
