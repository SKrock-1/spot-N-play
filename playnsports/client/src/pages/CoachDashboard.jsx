import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { dataStore } from '../utils/dataStore';

const SPORTS = ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football'];
const LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];
const STATES = ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal'];

const CoachDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [form, setForm] = useState({
    fullName: '', username: '', phone: '', dateOfBirth: '',
    gender: '', state: '', city: '', country: 'India',
    sport: '', experience: '', coachingLevel: '',
    certifications: '', bio: '', hourlyRate: '',
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
      @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }
      .grid-dots { background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px); background-size: 28px 28px; }
      .input-field {
        width: 100%; background: var(--glass-05); border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 12px; padding: 12px 14px; color: var(--text-main); font-size: 14px; outline: none;
        transition: all 0.3s ease; font-family: 'DM Sans', sans-serif;
      }
      .input-field:focus { border-color: rgba(74,222,128,0.4); background: var(--glass-05, rgba(255,255,255,0.05)); box-shadow: 0 0 0 3px rgba(74,222,128,0.06); }
      .input-field::placeholder { color: var(--text-muted); opacity: 0.5; }
      .input-field option { background: var(--bg-surface); }
      .label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; display: block; }
      .glass-card { background: var(--glass-02, rgba(255,255,255,0.02)); border: 1px solid var(--glass-06, rgba(255,255,255,0.06)); border-radius: 24px; padding: 24px; }
      .btn-primary {
        background: linear-gradient(135deg, #4ade80, #22c55e); color: black; font-weight: 700;
        border-radius: 12px; padding: 13px 28px; font-size: 15px; transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif; position: relative; overflow: hidden;
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(74,222,128,0.3); }
      .btn-primary:disabled { opacity: 0.5; transform: none; }
      .status-pending { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; }
      .status-approved { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.25); color: #4ade80; }
      .status-rejected { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const cached = dataStore.get('dashboard:coach:profile');
    if (cached.status === 'ready') {
      setCoach(cached.data);
      if (cached.data) {
        setForm({
          fullName: cached.data.fullName || '',
          username: cached.data.username || '',
          phone: cached.data.phone || '',
          dateOfBirth: cached.data.dateOfBirth ? cached.data.dateOfBirth.split('T')[0] : '',
          gender: cached.data.gender || '',
          state: cached.data.state || '',
          city: cached.data.city || '',
          country: cached.data.country || 'India',
          sport: cached.data.sport || '',
          experience: cached.data.experience || '',
          coachingLevel: cached.data.coachingLevel || '',
          certifications: cached.data.certifications || '',
          bio: cached.data.bio || '',
          hourlyRate: cached.data.hourlyRate || '',
        });
      }
      setLoading(false);
      return;
    }
    fetchCoachProfile();
  }, []);

  const fetchCoachProfile = async () => {
    try {
      const { data } = await API.get('/coaches/me');
      setCoach(data);
      dataStore.set('dashboard:coach:profile', data);
      if (data) {
        setForm({
          fullName: data.fullName || '',
          username: data.username || '',
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          gender: data.gender || '',
          state: data.state || '',
          city: data.city || '',
          country: data.country || 'India',
          sport: data.sport || '',
          experience: data.experience || '',
          coachingLevel: data.coachingLevel || '',
          certifications: data.certifications || '',
          bio: data.bio || '',
          hourlyRate: data.hourlyRate || '',
        });
      }
    } catch {}
    finally { setLoading(false); }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (coach) {
        await API.put('/coaches/me', form);
        showMessage('Profile updated! ✅');
      } else {
        await API.post('/coaches/apply', form);
        showMessage('Application submitted! Admin will review shortly 🎉');
      }
      fetchCoachProfile();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (loading) return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <Navbar />

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl whitespace-nowrap ${
          messageType === 'success' ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 mb-8">
          <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Coach Portal</p>
          <h1 className="font-bebas text-5xl tracking-wide shimmer-text">
            {coach ? 'COACH DASHBOARD' : 'BECOME A COACH'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {coach ? 'Manage your coaching profile' : 'Fill in your details to apply as a coach'}
          </p>
        </div>

        {/* Status Banner */}
        {coach && (
          <div className={`animate-fadeUp-1 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between flex-wrap gap-3 ${
            coach.status === 'approved' ? 'status-approved' :
            coach.status === 'rejected' ? 'status-rejected' : 'status-pending'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {coach.status === 'approved' ? '✅' : coach.status === 'rejected' ? '❌' : '⏳'}
              </span>
              <div>
                <p className="font-semibold text-sm capitalize">
                  {coach.status === 'approved' ? 'Application Approved!' :
                   coach.status === 'rejected' ? 'Application Rejected' : 'Under Review'}
                </p>
                <p className="text-xs opacity-70">
                  {coach.status === 'approved' ? 'You are now listed as an approved coach' :
                   coach.status === 'rejected' ? (coach.rejectionReason || 'Please update and reapply') :
                   'Admin will review your application shortly'}
                </p>
              </div>
            </div>
            {coach.status === 'approved' && (
              <button
                onClick={() => navigate(`/coaches/${coach._id}`)}
                className="text-xs font-semibold bg-green-400/20 px-4 py-2 rounded-xl hover:bg-green-400/30 transition-all"
              >
                View Public Profile →
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Personal Info */}
          <div className="animate-fadeUp-2 glass-card">
            <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">PERSONAL DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="John Doe" className="input-field" />
              </div>
              <div>
                <label className="label">Username *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                  <input name="username" value={form.username} onChange={handleChange} required placeholder="john_coach"
                    className="input-field" style={{ paddingLeft: '28px' }}
                    disabled={!!coach} />
                </div>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="9999999999" className="input-field" />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} required className="input-field" />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select name="gender" value={form.gender} onChange={handleChange} required className="input-field">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Country</label>
                <input name="country" value={form.country} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label">State *</label>
                <select name="state" value={form.state} onChange={handleChange} required className="input-field">
                  <option value="">Select State</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City *</label>
                <input name="city" value={form.city} onChange={handleChange} required placeholder="Enter city" className="input-field" />
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="animate-fadeUp-3 glass-card">
            <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">PROFESSIONAL DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Sport *</label>
                <select name="sport" value={form.sport} onChange={handleChange} required className="input-field">
                  <option value="">Select sport</option>
                  {SPORTS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Years of Experience *</label>
                <input name="experience" type="number" min="0" max="50" value={form.experience} onChange={handleChange} required placeholder="e.g. 5" className="input-field" />
              </div>
              <div>
                <label className="label">Coaching Level *</label>
                <select name="coachingLevel" value={form.coachingLevel} onChange={handleChange} required className="input-field">
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hourly Rate (₹)</label>
                <input name="hourlyRate" type="number" min="0" value={form.hourlyRate} onChange={handleChange} placeholder="e.g. 500" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Certifications</label>
                <input name="certifications" value={form.certifications} onChange={handleChange} placeholder="e.g. UEFA A License, NASM-CPT" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Professional Bio</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder="Tell us about your coaching experience and philosophy..." className="input-field" style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary flex items-center justify-center gap-2">
            {submitting ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Submitting...</>
            ) : coach ? '💾 Update Profile' : '🚀 Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CoachDashboard;