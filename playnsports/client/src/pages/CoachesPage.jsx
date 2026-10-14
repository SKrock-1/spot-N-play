import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';

const SPORTS = ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football'];
const SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽' };

const CoachesPage = () => {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('');

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
      @keyframes cardIn { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }
      .grid-dots { background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px); background-size: 28px 28px; }
      .coach-card {
        background: var(--glass-02, rgba(255,255,255,0.02)); border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 20px; padding: 20px; transition: all 0.3s ease; cursor: pointer;
      }
      .coach-card:hover { border-color: rgba(74,222,128,0.25); transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.3); background: var(--glass-04, rgba(255,255,255,0.04)); }
      .sport-pill {
        padding: 8px 18px; border-radius: 100px; font-size: 13px; font-weight: 600;
        transition: all 0.2s ease; cursor: pointer; border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        background: var(--glass-02, rgba(255,255,255,0.02)); color: var(--text-muted);
        font-family: 'DM Sans', sans-serif;
      }
      .sport-pill.active { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.3); color: #4ade80; }
      .sport-pill:hover { color: var(--text-main); border-color: var(--text-muted); }
      .level-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchCoaches();
  }, [selectedSport]);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/coaches${selectedSport ? `?sport=${selectedSport}` : ''}`);
      setCoaches(data);
    } catch { setCoaches([]); }
    finally { setLoading(false); }
  };

  const getLevelColor = (level) => {
    const map = {
      beginner: { bg: 'rgba(234,179,8,0.1)', color: '#eab308', border: 'rgba(234,179,8,0.2)' },
      intermediate: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
      advanced: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.2)' },
      professional: { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'rgba(168,85,247,0.2)' },
    };
    return map[level] || map.beginner;
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 text-center mb-10">
          <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-2">Expert Coaches</p>
          <h1 className="font-bebas text-6xl md:text-8xl tracking-wide shimmer-text mb-3">FIND A COACH</h1>
          <p className="text-gray-500 text-sm">Verified professional coaches ready to train you</p>
        </div>

        {/* Sport Filter */}
        <div className="animate-fadeUp-2 flex flex-wrap gap-2 justify-center mb-10">
          <button onClick={() => setSelectedSport('')} className={`sport-pill ${!selectedSport ? 'active' : ''}`}>
            🏆 All Sports
          </button>
          {SPORTS.map(s => (
            <button key={s} onClick={() => setSelectedSport(s)} className={`sport-pill ${selectedSport === s ? 'active' : ''}`}>
              {SPORT_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Coaches Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏋️</div>
            <p className="text-gray-500">No coaches available {selectedSport ? `for ${selectedSport}` : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coaches.map((coach, i) => {
              const level = getLevelColor(coach.coachingLevel);
              return (
                <div
                  key={coach._id}
                  className="coach-card animate-cardIn"
                  style={{ animationDelay: `${i * 0.08}s` }}
                  onClick={() => navigate(`/coaches/${coach._id}`)}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    {coach.user?.avatar ? (
                      <img src={coach.user.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-green-400/20" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 font-bold text-xl">
                        {coach.fullName?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-bold truncate">{coach.fullName}</p>
                      <p className="text-gray-600 text-xs">@{coach.username}</p>
                    </div>
                    <span className="text-xl">{SPORT_EMOJI[coach.sport] || '🏆'}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="level-badge" style={{ background: level.bg, color: level.color, border: `1px solid ${level.border}` }}>
                      {coach.coachingLevel}
                    </span>
                    <span className="text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full capitalize">
                      {coach.sport}
                    </span>
                    <span className="text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                      {coach.experience} yrs exp
                    </span>
                  </div>

                  {/* Bio */}
                  {coach.bio && (
                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">{coach.bio}</p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                    <div>
                      <p className="text-gray-600 text-xs">📍 {coach.city}, {coach.state}</p>
                    </div>
                    {coach.hourlyRate > 0 && (
                      <p className="text-green-400 font-bold text-sm">₹{coach.hourlyRate}/hr</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachesPage;