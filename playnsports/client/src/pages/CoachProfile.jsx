import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', esports: '🎮' };

const CoachProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }
      .grid-dots { background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px); background-size: 28px 28px; }
      .glass-card { background: var(--glass-02, rgba(255,255,255,0.02)); border: 1px solid var(--glass-06, rgba(255,255,255,0.06)); border-radius: 24px; padding: 24px; }
      .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--glass-05, rgba(255,255,255,0.05)); }
      .info-row:last-child { border-bottom: none; }
      .hire-btn {
        width: 100%; background: linear-gradient(135deg, #4ade80, #22c55e); color: black;
        font-weight: 700; border-radius: 14px; padding: 15px; font-size: 16px;
        transition: all 0.3s ease; font-family: 'DM Sans', sans-serif;
      }
      .hire-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74,222,128,0.3); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const fetchCoach = async () => {
      try {
        const { data } = await API.get(`/coaches/${id}`);
        setCoach(data);
      } catch { navigate('/coaches'); }
      finally { setLoading(false); }
    };
    fetchCoach();
  }, [id]);

  const handleHire = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await API.post('/chat/direct', { userId: coach.user._id });
      navigate(`/chat/${data._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
    </div>
  );

  if (!coach) return null;

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="animate-fadeUp-1 glass-card mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {coach.user?.avatar ? (
              <img src={coach.user.avatar} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-green-400/30" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-green-400/10 border-2 border-green-400/20 flex items-center justify-center text-green-400 font-bold text-3xl">
                {coach.fullName?.charAt(0)}
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                <h1 className="font-bebas text-4xl shimmer-text">{coach.fullName}</h1>
                <span className="text-2xl">{SPORT_EMOJI[coach.sport]}</span>
              </div>
              <p className="text-gray-500 text-sm mb-3">@{coach.username} · 📍 {coach.city}, {coach.state}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="text-xs bg-green-400/10 border border-green-400/20 text-green-400 px-3 py-1 rounded-full capitalize">{coach.sport}</span>
                <span className="text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full capitalize">{coach.coachingLevel}</span>
                <span className="text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full">{coach.experience} yrs experience</span>
                {coach.hourlyRate > 0 && (
                  <span className="text-xs bg-green-400/10 border border-green-400/20 text-green-400 px-3 py-1 rounded-full font-bold">₹{coach.hourlyRate}/hr</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 flex flex-col gap-5">

            {/* Bio */}
            {coach.bio && (
              <div className="animate-fadeUp-2 glass-card">
                <h2 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-3">ABOUT</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{coach.bio}</p>
              </div>
            )}

            {/* Details */}
            <div className="animate-fadeUp-2 glass-card">
              <h2 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-3">DETAILS</h2>
              <div>
                <div className="info-row">
                  <span className="text-gray-600 text-sm">Sport</span>
                  <span className="text-gray-900 dark:text-white text-sm capitalize">{SPORT_EMOJI[coach.sport]} {coach.sport}</span>
                </div>
                <div className="info-row">
                  <span className="text-gray-600 text-sm">Experience</span>
                  <span className="text-gray-900 dark:text-white text-sm">{coach.experience} years</span>
                </div>
                <div className="info-row">
                  <span className="text-gray-600 text-sm">Coaching Level</span>
                  <span className="text-gray-900 dark:text-white text-sm capitalize">{coach.coachingLevel}</span>
                </div>
                <div className="info-row">
                  <span className="text-gray-600 text-sm">Location</span>
                  <span className="text-gray-900 dark:text-white text-sm">{coach.city}, {coach.state}</span>
                </div>
                {coach.certifications && (
                  <div className="info-row">
                    <span className="text-gray-600 text-sm">Certifications</span>
                    <span className="text-gray-900 dark:text-white text-sm text-right max-w-xs">{coach.certifications}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar — Hire */}
          <div className="animate-fadeUp-3 flex flex-col gap-4">
            <div className="glass-card">
              <h2 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-4">HIRE COACH</h2>
              {coach.hourlyRate > 0 && (
                <div className="text-center mb-4">
                  <p className="text-green-400 font-bebas text-4xl">₹{coach.hourlyRate}</p>
                  <p className="text-gray-600 text-xs">per hour</p>
                </div>
              )}
              <button onClick={handleHire} className="hire-btn">
                💬 Message Coach
              </button>
              <p className="text-gray-700 text-xs text-center mt-3">
                Send a message to discuss training sessions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachProfile;