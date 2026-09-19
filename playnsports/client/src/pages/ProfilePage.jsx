import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import StreakCalendar from "../components/StreakCalendar";
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const SPORTS = [
  { value: 'football',     label: '⚽ Football' },
  { value: 'cricket',      label: '🏏 Cricket' },
  { value: 'basketball',   label: '🏀 Basketball' },
  { value: 'tennis',       label: '🎾 Tennis' },
  { value: 'badminton',    label: '🏸 Badminton' },
  { value: 'volleyball',   label: '🏐 Volleyball' },
  { value: 'boxing',       label: '🥊 Boxing' },
  { value: 'hockey',       label: '🏑 Hockey' },
  { value: 'kabaddi',      label: '🤼 Kabaddi' },
  { value: 'kho kho',      label: '🏃 Kho Kho' },
  { value: 'pickleball',   label: '🏓 Pickleball' },
  { value: 'table tennis', label: '🏓 Table Tennis' },
  { value: 'squash',       label: '🎾 Squash' },
  { value: 'handball',     label: '🤾 Handball' },
  { value: 'futsal',       label: '⚽ Futsal' },
  { value: 'rugby',        label: '🏉 Rugby' },
  { value: 'athletics',    label: '🏃 Athletics' },
  { value: 'wrestling',    label: '🤼 Wrestling' },
  { value: 'weightlifting',label: '🏋️ Weightlifting' },
  { value: 'yoga',         label: '🧘 Yoga' },
  { value: 'skating',      label: '⛸️ Skating' },
  { value: 'chess',        label: '♟️ Chess' },
  { value: 'carrom',       label: '🎯 Carrom' },
  { value: 'archery',      label: '🏹 Archery' },
  { value: 'shooting',     label: '🎯 Shooting' },
  { value: 'cycling',      label: '🚴 Cycling' },
  { value: 'box cricket',  label: '🏏 Box Cricket' },
  { value: 'box football', label: '⚽ Box Football' },
];

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const LEVEL_COLOR = {
  beginner:     'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  intermediate: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  advanced:     'bg-green-400/10 text-green-400 border-green-400/20',
};

const SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', 'box cricket': '🏏', 'box football': '⚽' };

const TABS_PLAYER = [
  { id: 'basic',    label: '👤 Basic Info' },
  { id: 'sports',   label: '🏆 Sports Profile' },
  { id: 'certs',    label: '📜 Certificates' },
  { id: 'streak',   label: '🔥 Streak' },
  { id: 'security', label: '🔒 Security' },
];

const TABS_COACH = [
  { id: 'basic',    label: '👤 Basic Info' },
  { id: 'coaching', label: '🎓 Coaching Profile' },
  { id: 'certs',    label: '📜 Certificates' },
  { id: 'security', label: '🔒 Security' },
];

const TABS_OTHER = [
  { id: 'basic',    label: '👤 Basic Info' },
  { id: 'security', label: '🔒 Security' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ─────────────────────────────────────────────
   Custom Date Picker Component
───────────────────────────────────────────── */
const DatePicker = ({ value, onChange, placeholder = 'Select date' }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(null);
  const [viewMonth, setViewMonth] = useState(null);
  const [mode, setMode] = useState('day'); // 'day' | 'month' | 'year'
  const ref = useRef();

  const parsed = value ? new Date(value) : null;

  useEffect(() => {
    const now = parsed || new Date(2000, 0, 1);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = parsed
    ? `${parsed.getDate()} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`
    : '';

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay(); // 0=Sun

  const handleDayClick = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const yearRange = () => {
    const base = Math.floor(viewYear / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => base + i);
  };

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const blanks = Array(firstDay).fill(null);
  const dayNums = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setMode('day'); }}
        className="input-field"
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <span style={{ color: displayValue ? 'inherit' : '#4b5563' }}>{displayValue || placeholder}</span>
        <span style={{ fontSize: '14px', opacity: 0.6 }}>📅</span>
      </button>

      {open && viewYear !== null && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          background: '#0d1117', border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '16px', padding: '16px', width: '280px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'fadeUp 0.2s ease forwards',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            {mode === 'day' && (
              <button type="button" onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>‹</button>
            )}
            {mode !== 'day' && <div style={{ width: 28 }} />}

            <div style={{ display: 'flex', gap: 6 }}>
              {mode === 'day' && (
                <>
                  <button type="button" onClick={() => setMode('month')}
                    style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {MONTHS[viewMonth].slice(0,3)}
                  </button>
                  <button type="button" onClick={() => setMode('year')}
                    style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {viewYear}
                  </button>
                </>
              )}
              {mode === 'month' && (
                <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14 }}>Select Month</span>
              )}
              {mode === 'year' && (
                <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14 }}>Select Year</span>
              )}
            </div>

            {mode === 'day' && (
              <button type="button" onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>›</button>
            )}
            {mode !== 'day' && (
              <button type="button" onClick={() => setMode('day')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>✕</button>
            )}
          </div>

          {/* Day view */}
          {mode === 'day' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#6b7280', padding: '4px 0', fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {dayNums.map(d => {
                  const isSelected = parsed && parsed.getDate() === d && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;
                  const isToday = new Date().getDate() === d && new Date().getMonth() === viewMonth && new Date().getFullYear() === viewYear;
                  return (
                    <button key={d} type="button" onClick={() => handleDayClick(d)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 700 : 400,
                        background: isSelected ? '#4ade80' : isToday ? 'rgba(74,222,128,0.1)' : 'transparent',
                        color: isSelected ? '#000' : isToday ? '#4ade80' : '#d1d5db',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.target.style.background = 'rgba(74,222,128,0.12)'; }}
                      onMouseLeave={e => { if (!isSelected) e.target.style.background = isToday ? 'rgba(74,222,128,0.1)' : 'transparent'; }}
                    >{d}</button>
                  );
                })}
              </div>
            </>
          )}

          {/* Month view */}
          {mode === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {MONTHS.map((m, i) => {
                const isSel = i === viewMonth;
                return (
                  <button key={m} type="button" onClick={() => { setViewMonth(i); setMode('day'); }}
                    style={{
                      padding: '8px 4px', borderRadius: 10, border: isSel ? '1px solid rgba(74,222,128,0.4)' : '1px solid transparent',
                      background: isSel ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                      color: isSel ? '#4ade80' : '#d1d5db', fontSize: 12, fontWeight: isSel ? 700 : 400, cursor: 'pointer',
                    }}>
                    {m.slice(0,3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Year view */}
          {mode === 'year' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <button type="button" onClick={() => setViewYear(y => y - 12)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}>‹‹</button>
                <button type="button" onClick={() => setViewYear(y => y + 12)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}>››</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {yearRange().map(y => {
                  const isSel = y === viewYear;
                  return (
                    <button key={y} type="button" onClick={() => { setViewYear(y); setMode('day'); }}
                      style={{
                        padding: '8px 4px', borderRadius: 10, border: isSel ? '1px solid rgba(74,222,128,0.4)' : '1px solid transparent',
                        background: isSel ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                        color: isSel ? '#4ade80' : '#d1d5db', fontSize: 12, fontWeight: isSel ? 700 : 400, cursor: 'pointer',
                      }}>
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Delete Confirm Popup
───────────────────────────────────────────── */
const DeleteConfirm = ({ sport, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeUp 0.2s ease forwards',
  }}>
    <div style={{
      background: '#0d1117', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 20, padding: 28, maxWidth: 360, width: '90%',
      boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
      animation: 'cardIn 0.25s ease forwards',
    }}>
      <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
      <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>Remove Sport?</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
        Are you sure you want to remove <strong style={{ color: '#f1f5f9' }}>{SPORT_EMOJI[sport?.name]} {sport?.name}</strong> from your profile?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={onConfirm}
          style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Yes, Remove
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Height converter helpers
───────────────────────────────────────────── */
const cmToFtIn = (cm) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  return { ft, inch };
};
const ftInToCm = (ft, inch) => Math.round((ft * 12 + inch) * 2.54);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const role = user?.role;

  const TABS = role === 'player' ? TABS_PLAYER : role === 'coach' ? TABS_COACH : TABS_OTHER;

  /* ── state ── */
  const [activeTab,   setActiveTab]   = useState('basic');
  const [message,     setMessage]     = useState('');
  const [msgType,     setMsgType]     = useState('success');
  const [loading,     setLoading]     = useState(false);
  const [avatarFile,  setAvatarFile]  = useState(null);
  const [avatarPrev,  setAvatarPrev]  = useState(user?.avatar || null);

  /* ── basic info form ── */
  const [basicForm, setBasicForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    hidePhoneNumber: user?.hidePhoneNumber !== false, // default true (hidden) until we know otherwise
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || 'India',
    bio: user?.bio || '',
  });

  /* ── verification status + OTP flow ── */
  const [verification, setVerification] = useState({
    isEmailVerified: !!user?.isEmailVerified,
    isPhoneVerified: !!user?.isPhoneVerified,
  });
  const [emailOtpStage, setEmailOtpStage] = useState('idle'); // idle | sent
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [phoneOtpStage, setPhoneOtpStage] = useState('idle'); // idle | sent
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  /* ── security & password ── */
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState('');

  /* ── player profile ── */
  const [playerData, setPlayerData] = useState(null);
  const [sportsArr, setSportsArr] = useState([]);
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  /* ── add sport form ── */
  const [addSportForm, setAddSportForm] = useState({ name: 'cricket', level: 'beginner' });
  const [deletingIdx, setDeletingIdx] = useState(null); // index of sport to confirm delete

  /* ── coach profile ── */
  const [coachData, setCoachData] = useState(null);
  const [coachForm, setCoachForm] = useState({});

  /* ── certificates ── */
  const [certs, setCerts] = useState([]);
  const [certTitle, setCertTitle] = useState('');
  const [certFile, setCertFile] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const certInputRef = useRef();
  const avatarMenuRef = useRef();

  /* ─────────────────────────────────────────────
     Load data
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (role === 'player') fetchPlayerProfile();
    if (role === 'coach')  fetchCoachProfile();
    fetchAccountMeta();
  }, [role]);

  const fetchAccountMeta = async () => {
    try {
      const { data } = await API.get('/auth/me');
      if (!data) return;
      setBasicForm(prev => ({ ...prev, hidePhoneNumber: data.hidePhoneNumber !== false }));
      setVerification({ isEmailVerified: !!data.isEmailVerified, isPhoneVerified: !!data.isPhoneVerified });
      updateUser({ isEmailVerified: !!data.isEmailVerified, isPhoneVerified: !!data.isPhoneVerified });
    } catch {}
  };

    useEffect(() => {
    const handler = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPlayerProfile = async () => {
    try {
      const { data } = await API.get('/players/me');
      if (data) {
        setPlayerData(data);
        setSportsArr(data.sports || []);
        const cm = data.height || '';
        setHeightCm(cm);
        if (cm) {
          const { ft, inch } = cmToFtIn(Number(cm));
          setHeightFt(ft);
          setHeightIn(inch);
        }
        setWeight(data.weight || '');
        setAchievements(data.achievements || []);
        setInstagram(data.instagram || '');
        setTwitter(data.twitter || '');
        setCerts(data.certificates || []);
        if (data.user) {
          setBasicForm(prev => ({
            ...prev,
            name: data.user.name || prev.name,
            phone: data.user.phone || prev.phone,
            hidePhoneNumber: data.user.hidePhoneNumber !== false,
            city: data.user.city || prev.city,
            state: data.user.state || prev.state,
            bio: data.user.bio || prev.bio,
            gender: data.user.gender || prev.gender,
            dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.split('T')[0] : prev.dateOfBirth,
            country: data.user.country || prev.country,
          }));
          setVerification({
            isEmailVerified: !!data.user.isEmailVerified,
            isPhoneVerified: !!data.user.isPhoneVerified,
          });
        }
      }
    } catch {}
  };

  const fetchCoachProfile = async () => {
    try {
      const { data } = await API.get('/coaches/my');
      if (data) {
        setCoachData(data);
        setCoachForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          gender: data.gender || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          city: data.city || '',
          state: data.state || '',
          bio: data.bio || '',
          certifications: data.certifications || '',
          hourlyRate: data.hourlyRate || '',
          experience: data.experience || '',
          coachingLevel: data.coachingLevel || '',
        });
      }
    } catch {}
  };

  /* ─────────────────────────────────────────────
     Helpers
  ───────────────────────────────────────────── */
  const flash = (msg, type = 'success') => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  /* ─────────────────────────────────────────────
     Height sync handlers
  ───────────────────────────────────────────── */
  const handleCmChange = (val) => {
    setHeightCm(val);
    if (val && !isNaN(val)) {
      const { ft, inch } = cmToFtIn(Number(val));
      setHeightFt(ft);
      setHeightIn(inch);
    }
  };

  const handleFtInChange = (ft, inch) => {
    setHeightFt(ft);
    setHeightIn(inch);
    const cm = ftInToCm(Number(ft) || 0, Number(inch) || 0);
    if (cm > 0) setHeightCm(cm);
  };

  /* ─────────────────────────────────────────────
     Handlers
  ───────────────────────────────────────────── */

  // Avatar
  const handleAvatarChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPrev(URL.createObjectURL(f));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const { data } = await API.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar: data.avatar });
      setAvatarFile(null);
      flash('Avatar updated ✅');
    } catch { flash('Upload failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleAvatarRemove = async () => {
    setLoading(true);
    try {
      await API.delete('/upload/avatar');
      updateUser({ avatar: '' });
      setAvatarPrev(null);
      setAvatarFile(null);
      flash('Avatar removed ✅');
    } catch { flash('Failed to remove', 'error'); }
    finally { setLoading(false); }
  };

  // Basic Info
  const handleBasicSave = async () => {
    setLoading(true);
    const phoneChanged = basicForm.phone !== (user?.phone || '');
    try {
      if (role === 'player') {
        await API.patch('/players/profile', basicForm);
      } else {
        await API.patch('/users/profile', basicForm);
      }
      updateUser({ ...basicForm });
      if (phoneChanged) {
        setVerification(prev => ({ ...prev, isPhoneVerified: false }));
        updateUser({ isPhoneVerified: false });
      }
      flash('Profile updated ✅');
    } catch { flash('Failed to save', 'error'); }
    finally { setLoading(false); }
  };

  // ── Verification: email ──
  const handleSendEmailOtp = async () => {
    setVerifyLoading(true); setVerifyMsg('');
    try {
      await API.post('/otp/send', { email: user.email });
      setEmailOtpStage('sent');
    } catch (err) { setVerifyMsg(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setVerifyLoading(false); }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtpCode.length !== 6) return setVerifyMsg('Enter the 6-digit code');
    setVerifyLoading(true); setVerifyMsg('');
    try {
      await API.post('/otp/verify', { email: user.email, otp: emailOtpCode });
      setVerification(prev => ({ ...prev, isEmailVerified: true }));
      updateUser({ isEmailVerified: true });
      setEmailOtpStage('idle'); setEmailOtpCode('');
      flash('Email verified ✅');
    } catch (err) { setVerifyMsg(err.response?.data?.message || 'Invalid code'); }
    finally { setVerifyLoading(false); }
  };

  // ── Verification: phone ──
  const handleSendPhoneOtp = async () => {
    if (!basicForm.phone) return setVerifyMsg('Add a phone number first');
    setVerifyLoading(true); setVerifyMsg('');
    try {
      await API.post('/otp/send-phone', { phone: basicForm.phone });
      setPhoneOtpStage('sent');
    } catch (err) { setVerifyMsg(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setVerifyLoading(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtpCode.length !== 6) return setVerifyMsg('Enter the 6-digit code');
    setVerifyLoading(true); setVerifyMsg('');
    try {
      await API.post('/otp/verify-phone', { phone: basicForm.phone, otp: phoneOtpCode });
      setVerification(prev => ({ ...prev, isPhoneVerified: true }));
      updateUser({ isPhoneVerified: true });
      setPhoneOtpStage('idle'); setPhoneOtpCode('');
      flash('Phone number verified ✅');
    } catch (err) { setVerifyMsg(err.response?.data?.message || 'Invalid code'); }
    finally { setVerifyLoading(false); }
  };

  // ── Password change handler ──
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (user?.hasPassword !== false && !securityForm.currentPassword) {
      setSecurityError('Please enter your current password');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityError('Passwords do not match');
      return;
    }

    setSecurityLoading(true);
    setSecurityError('');
    try {
      await API.patch('/auth/change-password', {
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });
      flash('Password updated successfully! ✅');
      updateUser({ hasPassword: true });
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password';
      setSecurityError(msg);
      flash(msg, 'error');
    } finally {
      setSecurityLoading(false);
    }
  };

  // Sports — Add from form
  const handleAddSport = () => {
    const already = sportsArr.find(s => s.name === addSportForm.name);
    if (already) { flash('This sport is already added', 'error'); return; }
    setSportsArr(prev => [...prev, { name: addSportForm.name, level: addSportForm.level, yearsPlayed: 0 }]);
    // reset to next available
    const taken = [...sportsArr.map(s => s.name), addSportForm.name];
    const next = SPORTS.find(s => !taken.includes(s.value));
    setAddSportForm({ name: next?.value || 'football', level: 'beginner' });
  };

  // Sports — confirm delete flow
  const confirmRemoveSport = (idx) => setDeletingIdx(idx);
  const doRemoveSport = () => {
    setSportsArr(prev => prev.filter((_, i) => i !== deletingIdx));
    setDeletingIdx(null);
  };
  const cancelRemoveSport = () => setDeletingIdx(null);

  const handleSportsSave = async () => {
    setLoading(true);
    try {
      await API.patch('/players/profile', {
        sports: sportsArr,
        height: heightCm || null,
        weight: weight || null,
        achievements,
        instagram,
        twitter,
      });
      flash('Sports profile saved ✅');
    } catch { flash('Failed to save', 'error'); }
    finally { setLoading(false); }
  };

  // Achievements
  const addAchievement = () => {
    if (!newAchievement.trim()) return;
    setAchievements(prev => [...prev, newAchievement.trim()]);
    setNewAchievement('');
  };

  // Certificate upload
  const handleCertUpload = async () => {
    if (!certTitle.trim() || !certFile) { flash('Add title and select a file', 'error'); return; }
    setCertLoading(true);
    try {
      const fd = new FormData();
      fd.append('certificate', certFile);
      const { data: uploadData } = await API.post('/upload/certificate', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { data } = await API.post('/players/certificates', { title: certTitle.trim(), fileUrl: uploadData.fileUrl });
      setCerts(data);
      setCertTitle('');
      setCertFile(null);
      if (certInputRef.current) certInputRef.current.value = '';
      flash('Certificate added ✅');
    } catch { flash('Upload failed', 'error'); }
    finally { setCertLoading(false); }
  };

  const handleCertDelete = async (certId) => {
    try {
      const { data } = await API.delete(`/players/certificates/${certId}`);
      setCerts(data);
      flash('Certificate removed');
    } catch { flash('Failed', 'error'); }
  };

  // Coach profile update
  const handleCoachSave = async () => {
    setLoading(true);
    try {
      await API.patch('/coaches/profile', coachForm);
      flash('Coach profile updated ✅');
    } catch { flash('Failed to save', 'error'); }
    finally { setLoading(false); }
  };

  /* ─────────────────────────────────────────────
     Render helpers
  ───────────────────────────────────────────── */
  const completionPct = () => {
    const fields = [basicForm.name, basicForm.phone, basicForm.gender, basicForm.city, basicForm.bio, avatarPrev];
    if (role === 'player') {
      fields.push(...sportsArr.map(s => s.name));
      fields.push(heightCm, weight);
    }
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const pct = completionPct();

  /* ─────────────────────────────────────────────
     JSX
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .font-bebas { font-family: 'Bebas Neue', cursive !important; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
        @keyframes blob { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-50px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ping { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2);opacity:0} }
        @keyframes cardIn { from{opacity:0;transform:translateY(14px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }

        .anim-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity:0; }
        .anim-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity:0; }
        .anim-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity:0; }
        .anim-cardIn { animation: cardIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
        .animate-blob { animation: blob 7s infinite; }
        .animate-spin-slow { animation: spin-slow 14s linear infinite; }
        .animate-ping { animation: ping 1.5s ease-out infinite; }

        .shimmer-text {
          background: linear-gradient(90deg,#4ade80,#22c55e,#86efac,#4ade80);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation: shimmer 3s linear infinite;
        }
        .grid-dots {
          background-image: radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);
          background-size: 28px 28px;
        }

        .tab-btn {
          padding: 9px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.25s;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
          border: 1px solid transparent;
        }
        .tab-active { background:rgba(74,222,128,0.12); color:#4ade80; border-color:rgba(74,222,128,0.22); }
        .tab-inactive { color:#6b7280; }
        .tab-inactive:hover { color:#9ca3af; border-color:rgba(255,255,255,0.08); }

        .field-group { display:flex; flex-direction:column; gap:6px; }
        .field-label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; }

        .input-field {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 11px 14px;
          color: inherit;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
        }
        .input-field:focus { border-color:rgba(74,222,128,0.4); background:rgba(74,222,128,0.03); box-shadow:0 0 0 3px rgba(74,222,128,0.06); }
        .input-field::placeholder { color:#4b5563; }
        .input-field option { background:#111; }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 22px;
        }

        .btn-primary {
          background: linear-gradient(135deg,#4ade80,#22c55e);
          color: black;
          font-weight: 700;
          border-radius: 12px;
          padding: 11px 24px;
          font-size: 14px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent); transition:left 0.4s; }
        .btn-primary:hover::before { left:100%; }
        .btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(74,222,128,0.3); }
        .btn-primary:disabled { opacity:0.5; transform:none; box-shadow:none; }

        .btn-danger {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          color: #f87171;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          padding: 5px 10px;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-danger:hover { background:rgba(239,68,68,0.15); }

        .sport-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 14px 16px;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sport-card:hover { border-color:rgba(74,222,128,0.2); background: rgba(74,222,128,0.02); }

        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          border: 1px solid;
        }

        .cert-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: border-color 0.2s;
        }
        .cert-card:hover { border-color:rgba(74,222,128,0.2); }

        .upload-zone {
          border: 2px dashed rgba(74,222,128,0.25);
          background: rgba(74,222,128,0.02);
          border-radius: 16px;
          transition: all 0.3s;
        }
        .upload-zone:hover { border-color:rgba(74,222,128,0.5); background:rgba(74,222,128,0.05); }

        .progress-bar-track {
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: linear-gradient(90deg, #4ade80, #22c55e);
          transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
        }

        .height-divider {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4b5563;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
        }
        .height-divider::before, .height-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        .add-sport-form {
          background: rgba(74,222,128,0.04);
          border: 1px solid rgba(74,222,128,0.12);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
      `}</style>

      {/* Delete confirmation popup */}
      {deletingIdx !== null && (
        <DeleteConfirm
          sport={sportsArr[deletingIdx]}
          onConfirm={doRemoveSport}
          onCancel={cancelRemoveSport}
        />
      )}

      {/* Background */}
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bg-green-500/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-blue-500/8 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '3s' }} />
      </div>

      <Navbar />

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap transition-all ${
          msgType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`} style={{ animation: 'fadeUp 0.3s ease forwards' }}>
          {msgType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* ════════════ LEFT SIDEBAR ════════════ */}
          <div className="flex flex-col gap-4">

            {/* Avatar card */}
            <div className="anim-1 card text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/8 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative inline-block mb-4">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 rounded-full animate-spin-slow opacity-50"
                    style={{ background: 'conic-gradient(from 0deg, transparent, #4ade80 50%, transparent)', borderRadius: '50%' }} />
                  <div className="absolute inset-[2px] rounded-full overflow-hidden">
                    {avatarPrev
                      ? <img src={avatarPrev} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-green-400/10 flex items-center justify-center">
                          <span className="font-bebas text-4xl text-green-400">{user?.name?.charAt(0)}</span>
                        </div>
                    }
                  </div>
                  {verification.isEmailVerified && verification.isPhoneVerified && (
                    <span
                      title="Verified profile — email & phone confirmed"
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-green-400 border-[3px] border-white dark:border-[#0a0e0a] flex items-center justify-center shadow-lg"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  </div>
                </div>
                <input id="avatarInput" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

              <div className="relative inline-block" ref={avatarMenuRef}>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(o => !o)}
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 mx-auto"
                  style={{
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.2)',
                    color: '#4ade80',
                  }}
                >
                  📷 Photo Options
                  <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: avatarMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </button>

                {avatarMenuOpen && (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                      zIndex: 50, background: '#0d1117', border: '1px solid rgba(74,222,128,0.2)',
                      borderRadius: 14, padding: 6, width: 170,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                      animation: 'fadeUp 0.15s ease forwards',
                    }}
                  >
                    {avatarPrev && (
                      
                      <a  href={avatarPrev}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 transition-colors"
                        style={{ color: '#d1d5db' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        👁️ View Photo
                      </a>
                    )}
                    <label
                      htmlFor="avatarInput"
                      onClick={() => setAvatarMenuOpen(false)}
                      className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer transition-colors"
                      style={{ color: '#4ade80' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      📤 Upload Photo
                    </label>
                    {avatarPrev && (
                      <button
                        type="button"
                        onClick={() => { setAvatarMenuOpen(false); handleAvatarRemove(); }}
                        className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 w-full text-left transition-colors"
                        style={{ color: '#f87171' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        🗑️ Remove Photo
                      </button>
                    )}
                  </div>
                )}
              </div>

              <h2 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center justify-center gap-1.5">
                {user?.name}
                {verification.isEmailVerified && verification.isPhoneVerified && (
                  <span title="Verified profile" className="text-green-500 text-sm">✅</span>
                )}
              </h2>
              <p className="text-gray-500 text-sm mb-1">{user?.email}</p>
              {!(verification.isEmailVerified && verification.isPhoneVerified) ? (
                <button
                  onClick={() => setActiveTab('basic')}
                  className="text-amber-500 text-xs font-medium mb-3 hover:underline"
                >
                  ⚠️ Profile incomplete — verify email & phone
                </button>
              ) : (
                <div className="mb-3" />
              )}

              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <span className={`badge ${
                  role === 'player' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                  role === 'coach'  ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                  'bg-purple-400/10 text-purple-400 border-purple-400/20'
                } capitalize`}>
                  {role === 'player' ? '⚽' : role === 'coach' ? '🎓' : '🏟️'} {role?.replace('_', ' ')}
                </span>
              </div>

              <div className="text-left">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Profile completion</span>
                  <span className="text-green-400 font-semibold">{pct}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {avatarFile && (
                <button onClick={handleAvatarUpload} disabled={loading} className="btn-primary w-full mt-4 text-sm">
                  {loading ? 'Uploading...' : '💾 Save Photo'}
                </button>
              )}
            </div>

            {/* Quick info */}
            <div className="anim-2 card">
              <h3 className="font-bebas text-lg tracking-wide text-gray-900 dark:text-white mb-3">QUICK INFO</h3>
              <div className="flex flex-col gap-2">
                {[
                  { icon: '📞', label: basicForm.phone || 'Add phone' },
                  { icon: '📍', label: [basicForm.city, basicForm.state].filter(Boolean).join(', ') || 'Add location' },
                  { icon: '🌏', label: basicForm.country || 'India' },
                  ...(role === 'player' && sportsArr.length > 0 ? [{ icon: '🏆', label: `${sportsArr.length} sport${sportsArr.length > 1 ? 's' : ''}` }] : []),
                  ...(role === 'player' && certs.length > 0 ? [{ icon: '📜', label: `${certs.length} certificate${certs.length > 1 ? 's' : ''}` }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-base">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social links (player) */}
            {role === 'player' && (
              <div className="anim-3 card">
                <h3 className="font-bebas text-lg tracking-wide text-gray-900 dark:text-white mb-3">SOCIALS</h3>
                <div className="flex flex-col gap-2">
                  <div className="field-group">
                    <label className="field-label">Instagram</label>
                    <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username" className="input-field" style={{ padding: '9px 12px', fontSize: '13px' }} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Twitter / X</label>
                    <input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@username" className="input-field" style={{ padding: '9px 12px', fontSize: '13px' }} />
                  </div>
                  <button onClick={handleSportsSave} disabled={loading} className="btn-primary text-sm mt-1">
                    Save Socials
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ════════════ RIGHT MAIN CONTENT ════════════ */}
          <div className="flex flex-col gap-4">

            {/* Page header */}
            <div className="anim-1">
              <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-0.5">Account</p>
              <h1 className="font-bebas text-5xl tracking-wide shimmer-text">MY PROFILE</h1>
            </div>

            {/* Tabs */}
            <div className="anim-2 flex gap-2 overflow-x-auto pb-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`tab-btn ${activeTab === t.id ? 'tab-active' : 'tab-inactive'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Basic Info ── */}
            {activeTab === 'basic' && (
              <div className="anim-cardIn card">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">BASIC INFORMATION</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="field-group">
                    <label className="field-label">Full Name</label>
                    <input value={basicForm.name} onChange={e => setBasicForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Your name" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Phone</label>
                    <input value={basicForm.phone} onChange={e => setBasicForm(p => ({ ...p, phone: e.target.value }))} className="input-field" placeholder="+91 XXXXX XXXXX" />
                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={basicForm.hidePhoneNumber}
                        onChange={e => setBasicForm(p => ({ ...p, hidePhoneNumber: e.target.checked }))}
                        className="accent-green-500 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">🔒 Hide my phone number from other users</span>
                    </label>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Gender</label>
                    <select value={basicForm.gender} onChange={e => setBasicForm(p => ({ ...p, gender: e.target.value }))} className="input-field">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Date of Birth</label>
                    <DatePicker
                      value={basicForm.dateOfBirth}
                      onChange={val => setBasicForm(p => ({ ...p, dateOfBirth: val }))}
                      placeholder="Select your birth date"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">City</label>
                    <input value={basicForm.city} onChange={e => setBasicForm(p => ({ ...p, city: e.target.value }))} className="input-field" placeholder="Your city" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">State</label>
                    <input value={basicForm.state} onChange={e => setBasicForm(p => ({ ...p, state: e.target.value }))} className="input-field" placeholder="Your state" />
                  </div>
                  <div className="field-group sm:col-span-2">
                    <label className="field-label">Bio</label>
                    <textarea value={basicForm.bio} onChange={e => setBasicForm(p => ({ ...p, bio: e.target.value }))} className="input-field resize-none" rows={3} placeholder="Tell people about yourself..." />
                  </div>
                </div>
                <button onClick={handleBasicSave} disabled={loading} className="btn-primary mt-5">
                  {loading ? 'Saving...' : '💾 Save Basic Info'}
                </button>
              </div>
            )}

            {/* ── TAB: Basic Info — Verification ── */}
            {activeTab === 'basic' && (
              <div className="anim-cardIn card mt-6">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-1">VERIFICATION</h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-5">Verify your contact details to build trust with other players.</p>

                {verifyMsg && <p className="text-red-400 text-xs mb-3">⚠️ {verifyMsg}</p>}

                {/* Email row */}
                <div className="flex items-center justify-between gap-3 py-3 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-base flex-shrink-0">📧</span>
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{user?.email}</p>
                      {verification.isEmailVerified ? (
                        <span className="text-green-500 text-xs font-semibold">✅ Verified</span>
                      ) : (
                        <span className="text-amber-500 text-xs font-semibold">Not verified</span>
                      )}
                    </div>
                  </div>
                  {!verification.isEmailVerified && emailOtpStage === 'idle' && (
                    <button onClick={handleSendEmailOtp} disabled={verifyLoading} className="text-xs font-semibold text-green-500 border border-green-400/30 bg-green-400/10 rounded-lg px-3 py-1.5 whitespace-nowrap">
                      Verify
                    </button>
                  )}
                </div>
                {!verification.isEmailVerified && emailOtpStage === 'sent' && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 mb-1">
                    <input value={emailOtpCode} onChange={e => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="input-field sm:max-w-[160px] tracking-widest text-center" />
                    <button onClick={handleVerifyEmailOtp} disabled={verifyLoading || emailOtpCode.length !== 6} className="btn-primary sm:w-auto px-5">Confirm</button>
                    <button onClick={handleSendEmailOtp} disabled={verifyLoading} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white self-center">Resend</button>
                  </div>
                )}

                {/* Phone row */}
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-base flex-shrink-0">📱</span>
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{basicForm.phone || 'No phone number added'}</p>
                      {verification.isPhoneVerified ? (
                        <span className="text-green-500 text-xs font-semibold">✅ Verified</span>
                      ) : (
                        <span className="text-amber-500 text-xs font-semibold">Not verified</span>
                      )}
                    </div>
                  </div>
                  {!verification.isPhoneVerified && phoneOtpStage === 'idle' && (
                    <button onClick={handleSendPhoneOtp} disabled={verifyLoading || !basicForm.phone} className="text-xs font-semibold text-green-500 border border-green-400/30 bg-green-400/10 rounded-lg px-3 py-1.5 whitespace-nowrap">
                      Verify
                    </button>
                  )}
                </div>
                {!verification.isPhoneVerified && phoneOtpStage === 'sent' && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-1 mb-1">
                    <input value={phoneOtpCode} onChange={e => setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="input-field sm:max-w-[160px] tracking-widest text-center" />
                    <button onClick={handleVerifyPhoneOtp} disabled={verifyLoading || phoneOtpCode.length !== 6} className="btn-primary sm:w-auto px-5">Confirm</button>
                    <button onClick={handleSendPhoneOtp} disabled={verifyLoading} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white self-center">Resend</button>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-gray-900 dark:text-white text-sm font-bold">LPU Community</p>
                    <p className="text-gray-500 text-xs">
                      {user?.lpuVerified ? `Verified with ${user.lpuEmail || 'LPU email'}` : 'Verify your LPU email to unlock campus-only challenges and trust badges.'}
                    </p>
                  </div>
                  <Link to="/lpu-verification" className="text-xs font-semibold text-green-500 border border-green-400/30 bg-green-400/10 rounded-lg px-3 py-2 whitespace-nowrap">
                    {user?.lpuVerified ? 'View status' : 'Verify LPU'}
                  </Link>
                </div>
              </div>
            )}

            {/* ── TAB: Sports Profile (player) ── */}
            {activeTab === 'sports' && role === 'player' && (
              <div className="flex flex-col gap-4">

                {/* Body stats */}
                <div className="anim-cardIn card">
                  <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">BODY & STATS</h2>

                  {/* Height */}
                  <div className="mb-4">
                    <label className="field-label mb-2 block">Height</label>
                    {/* CM row */}
                    <div className="field-group mb-2">
                      <div className="flex gap-3 items-center">
                        <input
                          type="number"
                          value={heightCm}
                          onChange={e => handleCmChange(e.target.value)}
                          className="input-field"
                          placeholder="e.g. 175"
                          min={100} max={250}
                          style={{ flex: 1 }}
                        />
                        <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>cm</span>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="height-divider my-2">OR</div>
                    {/* Ft / In row */}
                    <div className="flex gap-3 items-center">
                      <div className="flex gap-2 flex-1">
                        <div className="flex gap-2 items-center flex-1">
                          <input
                            type="number"
                            value={heightFt}
                            onChange={e => handleFtInChange(e.target.value, heightIn)}
                            className="input-field"
                            placeholder="5"
                            min={3} max={8}
                          />
                          <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>ft</span>
                        </div>
                        <div className="flex gap-2 items-center flex-1">
                          <input
                            type="number"
                            value={heightIn}
                            onChange={e => handleFtInChange(heightFt, e.target.value)}
                            className="input-field"
                            placeholder="9"
                            min={0} max={11}
                          />
                          <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>in</span>
                        </div>
                      </div>
                    </div>
                    {heightCm && (
                      <p style={{ fontSize: 11, color: '#4ade80', marginTop: 6, opacity: 0.7 }}>
                        ≈ {heightCm} cm · {heightFt}′{heightIn}″
                      </p>
                    )}
                  </div>

                  {/* Weight */}
                  <div className="field-group">
                    <label className="field-label">Weight</label>
                    <div className="flex gap-3 items-center">
                      <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="input-field" placeholder="e.g. 70" min={30} max={200} style={{ flex: 1 }} />
                      <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>kg</span>
                    </div>
                  </div>
                </div>

                {/* Sports list */}
                <div className="anim-cardIn card" style={{ animationDelay: '0.05s' }}>
                  <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-4">SPORTS I PLAY</h2>

                  {/* Add sport form — always visible */}
                  <div className="add-sport-form">
                    <p className="field-label mb-3">Add a sport</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div className="field-group">
                        <label className="field-label">Sport</label>
                        <select value={addSportForm.name} onChange={e => setAddSportForm(p => ({ ...p, name: e.target.value }))} className="input-field" style={{ padding: '8px 12px', fontSize: '13px' }}>
                          {SPORTS.map(sp => <option key={sp.value} value={sp.value}>{sp.label}</option>)}
                        </select>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Level</label>
                        <select value={addSportForm.level} onChange={e => setAddSportForm(p => ({ ...p, level: e.target.value }))} className="input-field" style={{ padding: '8px 12px', fontSize: '13px' }}>
                          {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                        </select>
                      </div>
                      <button
                        onClick={handleAddSport}
                        disabled={sportsArr.length >= SPORTS.length}
                        className="btn-primary flex-shrink-0"
                        style={{ padding: '10px 20px', fontSize: 13 }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Sport list */}
                  {sportsArr.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-3xl mb-2">🏆</p>
                      <p className="text-sm">No sports added yet — use the form above</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sportsArr.map((s, idx) => (
                        <div key={idx} className="sport-card" style={{ animation: `cardIn 0.35s ${idx * 0.04}s forwards`, opacity: 0 }}>
                          <span className="text-2xl flex-shrink-0">{SPORT_EMOJI[s.name]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white font-semibold text-sm capitalize">{s.name}</p>
                            <span className={`badge ${LEVEL_COLOR[s.level]} mt-1 inline-block`}>{s.level}</span>
                          </div>
                          <button
                            onClick={() => confirmRemoveSport(idx)}
                            className="btn-danger flex-shrink-0"
                            title="Remove sport"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Achievements */}
                <div className="anim-cardIn card" style={{ animationDelay: '0.1s' }}>
                  <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-4">ACHIEVEMENTS</h2>
                  <div className="flex gap-2 mb-4">
                    <input
                      value={newAchievement}
                      onChange={e => setNewAchievement(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addAchievement()}
                      className="input-field"
                      placeholder="e.g. District level cricket champion 2023"
                    />
                    <button onClick={addAchievement} className="btn-primary flex-shrink-0 px-4">Add</button>
                  </div>
                  {achievements.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {achievements.map((a, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-green-400/4 border border-green-400/10 rounded-xl px-4 py-2.5">
                          <span className="text-sm text-gray-900 dark:text-gray-200">🏅 {a}</span>
                          <button onClick={() => setAchievements(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400 transition-colors text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleSportsSave} disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : '💾 Save Sports Profile'}
                </button>
              </div>
            )}
            {/* ── TAB: Streak ── */}
            {activeTab === 'streak' && role === 'player' && (
              <div className="anim-cardIn card">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">
                  ACTIVITY STREAK
                </h2>
                <StreakCalendar />
              </div>
            )}

            {/* ── TAB: Coaching Profile (coach) ── */}
            {activeTab === 'coaching' && role === 'coach' && (
              <div className="anim-cardIn card">
                <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-2">COACHING PROFILE</h2>
                {coachData?.status === 'pending' && (
                  <div className="bg-yellow-400/8 border border-yellow-400/20 text-yellow-400 rounded-xl px-4 py-3 text-sm mb-4">
                    ⏳ Your coach application is pending admin approval
                  </div>
                )}
                {coachData?.status === 'rejected' && (
                  <div className="bg-red-400/8 border border-red-400/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
                    ❌ Rejected: {coachData.rejectionReason}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="field-group">
                    <label className="field-label">Experience (years)</label>
                    <input type="number" value={coachForm.experience || ''} onChange={e => setCoachForm(p => ({ ...p, experience: e.target.value }))} className="input-field" placeholder="Years of coaching" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Coaching Level</label>
                    <select value={coachForm.coachingLevel || ''} onChange={e => setCoachForm(p => ({ ...p, coachingLevel: e.target.value }))} className="input-field">
                      <option value="">Select level</option>
                      {['beginner', 'intermediate', 'advanced', 'professional'].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Hourly Rate (₹)</label>
                    <input type="number" value={coachForm.hourlyRate || ''} onChange={e => setCoachForm(p => ({ ...p, hourlyRate: e.target.value }))} className="input-field" placeholder="e.g. 500" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">City</label>
                    <input value={coachForm.city || ''} onChange={e => setCoachForm(p => ({ ...p, city: e.target.value }))} className="input-field" placeholder="Your city" />
                  </div>
                  <div className="field-group sm:col-span-2">
                    <label className="field-label">Certifications</label>
                    <textarea value={coachForm.certifications || ''} onChange={e => setCoachForm(p => ({ ...p, certifications: e.target.value }))} className="input-field resize-none" rows={2} placeholder="List your certifications..." />
                  </div>
                  <div className="field-group sm:col-span-2">
                    <label className="field-label">Bio</label>
                    <textarea value={coachForm.bio || ''} onChange={e => setCoachForm(p => ({ ...p, bio: e.target.value }))} className="input-field resize-none" rows={3} placeholder="Describe your coaching style..." />
                  </div>
                </div>
                <button onClick={handleCoachSave} disabled={loading} className="btn-primary mt-5">
                  {loading ? 'Saving...' : '💾 Save Coaching Profile'}
                </button>
              </div>
            )}

            {/* ── TAB: Certificates ── */}
            {activeTab === 'certs' && (
              <div className="flex flex-col gap-4">

                <div className="anim-cardIn card">
                  <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-5">ADD CERTIFICATE</h2>
                  <div className="flex flex-col gap-3">
                    <div className="field-group">
                      <label className="field-label">Certificate Title</label>
                      <input value={certTitle} onChange={e => setCertTitle(e.target.value)} className="input-field" placeholder="e.g. SAI Level 1 Cricket Certificate" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Upload File (PDF or Image)</label>
                      <label className="upload-zone p-5 flex flex-col items-center gap-2 cursor-pointer text-center">
                        <span className="text-3xl">{certFile ? '📄' : '📎'}</span>
                        <span className="text-sm text-gray-500">{certFile ? certFile.name : 'Click to choose PDF or image'}</span>
                        <input ref={certInputRef} type="file" accept="image/*,.pdf" onChange={e => setCertFile(e.target.files[0])} className="hidden" />
                      </label>
                    </div>
                    <button onClick={handleCertUpload} disabled={certLoading || !certTitle || !certFile} className="btn-primary">
                      {certLoading ? 'Uploading...' : '📤 Upload Certificate'}
                    </button>
                  </div>
                </div>

                <div className="anim-cardIn card" style={{ animationDelay: '0.05s' }}>
                  <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white mb-4">MY CERTIFICATES ({certs.length})</h2>
                  {certs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-3xl mb-2">📜</p>
                      <p className="text-sm">No certificates uploaded yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {certs.map((c, i) => (
                        <div key={c._id} className="cert-card" style={{ animation: `cardIn 0.4s ${i * 0.05}s forwards`, opacity: 0 }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-blue-400/10 border border-blue-400/20 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                              {c.fileUrl?.includes('.pdf') ? '📄' : '🖼️'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{c.title}</p>
                              <p className="text-gray-500 text-xs">{new Date(c.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <a href={c.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-blue-400/10 border border-blue-400/20 text-blue-400 px-3 py-1.5 rounded-xl hover:bg-blue-400/20 transition-all font-semibold">
                              View
                            </a>
                            <button onClick={() => handleCertDelete(c._id)} className="btn-danger">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="anim-cardIn card">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/10 dark:border-white/10">
                  <div>
                    <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">ACCOUNT SECURITY</h2>
                    <p className="text-gray-500 text-xs mt-1">Manage your account sign-in method and password</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.authProvider === 'google' && !user?.hasPassword ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20">
                        <span>🌐</span> Google Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-400/10 text-green-400 border border-green-400/20">
                        <ShieldCheck size={14} /> Password Protected
                      </span>
                    )}
                  </div>
                </div>

                {user?.authProvider === 'google' && !user?.hasPassword && (
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6 flex items-start gap-3">
                    <span className="text-xl">ℹ️</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-400">You currently sign in using Google</p>
                      <p className="text-xs text-slate-400 mt-1">
                        You do not have a password set yet. Create an account password below so you can also log in directly with your email and password.
                      </p>
                    </div>
                  </div>
                )}

                {securityError && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 mb-5 text-xs text-red-400">
                    ⚠️ {securityError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 max-w-lg">
                  {user?.hasPassword !== false && (
                    <div className="field-group">
                      <label className="field-label">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={securityForm.currentPassword}
                          onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                          placeholder="••••••••"
                          required
                          className="input-field pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="field-group">
                    <label className="field-label">
                      {user?.hasPassword === false ? 'Create Password (min 6 characters)' : 'New Password (min 6 characters)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={securityForm.newPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="input-field pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={securityForm.confirmPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        className={`input-field pr-10 ${
                          securityForm.confirmPassword && securityForm.confirmPassword !== securityForm.newPassword
                            ? 'border-red-500/50'
                            : securityForm.confirmPassword && securityForm.confirmPassword === securityForm.newPassword
                            ? 'border-green-400/60'
                            : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {securityForm.confirmPassword && securityForm.confirmPassword !== securityForm.newPassword && (
                      <p className="text-xs text-red-400 mt-1">❌ Passwords do not match</p>
                    )}
                    {securityForm.confirmPassword && securityForm.confirmPassword === securityForm.newPassword && (
                      <p className="text-xs text-green-400 mt-1">✅ Passwords match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={securityLoading}
                    className="btn-primary mt-2"
                  >
                    {securityLoading
                      ? 'Updating Password...'
                      : user?.hasPassword === false
                      ? '🔑 Create Password'
                      : '🔒 Update Password'}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
