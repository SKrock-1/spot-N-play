import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SpotNPlayLogo from '../components/SpotNPlayLogo';

const Register = () => {
  const [step, setStep] = useState(1);
  const [useOtp, setUseOtp] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [registeredRole, setRegisteredRole] = useState('player');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  // Invite & Earn: a shared link lands here as /register?ref=XLXXXXXX.
  // The code rides the signup payload so the welcome bonus applies.
  const [searchParams] = useSearchParams();
  const inviteCode = (searchParams.get('ref') || '').trim().toUpperCase();
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.15); }
        50% { box-shadow: 0 0 40px rgba(74,222,128,0.3); }
      }
      @keyframes particle-float {
        0% { transform: translateY(100vh) scale(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-10vh) scale(1); opacity: 0; }
      }
      @keyframes count-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 7s infinite; }
      .animate-glow { animation: glow 3s ease-in-out infinite; }
      .particle {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
      }
      .animate-fadeUp-1 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s forwards; opacity: 0; }
      .animate-fadeUp-5 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s forwards; opacity: 0; }
      .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }
      .grid-dots { background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px); background-size: 28px 28px; }
      .input-field {
        width: 100%; background: var(--glass-05); border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        border-radius: 14px; padding: 14px 16px; color: var(--text-main); font-size: 15px;
        transition: all 0.3s ease; outline: none; font-family: 'DM Sans', sans-serif;
      }
      .input-field:focus { background: var(--glass-05, rgba(255,255,255,0.05)); border-color: rgba(74,222,128,0.5); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }
      .input-field::placeholder { color: var(--glass-20, rgba(255,255,255,0.2)); }
      .role-card {
        flex: 1; border-radius: 14px; padding: 16px; cursor: pointer;
        transition: all 0.3s ease; text-align: center;
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08)); background: var(--glass-02, rgba(255,255,255,0.02));
      }
      .role-card:hover { border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.04); }
      .role-card.active { border-color: rgba(74,222,128,0.5); background: rgba(74,222,128,0.08); }
      .role-card.disabled { opacity: 0.5; cursor: not-allowed; }
      .coming-soon-badge {
        background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24;
        font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px;
        text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-top: 4px;
      }
      .btn-primary {
        width: 100%; background: linear-gradient(135deg, #4ade80, #22c55e); color: black;
        font-weight: 700; font-size: 16px; border-radius: 14px; padding: 15px;
        transition: all 0.3s ease; position: relative; overflow: hidden; font-family: 'DM Sans', sans-serif;
      }
      .btn-primary::before {
        content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.35); }
      .btn-primary:disabled { opacity: 0.6; transform: none; box-shadow: none; }
      .toggle-btn { flex: 1; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 600; transition: all 0.3s ease; font-family: 'DM Sans', sans-serif; }
      .toggle-active { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
      .toggle-inactive { background: transparent; color: var(--text-muted); border: 1px solid transparent; }
      .toggle-inactive:hover { color: var(--text-muted); }
      .otp-input {
        width: 100%; background: var(--glass-05); border: 1px solid rgba(74,222,128,0.3);
        border-radius: 14px; padding: 16px; color: var(--text-main); font-size: 28px; font-weight: 700;
        text-align: center; letter-spacing: 0.5em; outline: none; transition: all 0.3s ease; font-family: 'DM Sans', sans-serif;
      }
      .otp-input:focus { border-color: rgba(74,222,128,0.6); box-shadow: 0 0 0 3px rgba(74,222,128,0.1); background: rgba(74,222,128,0.04); }
      .progress-step { width: 32px; height: 4px; border-radius: 100px; transition: all 0.3s ease; }
      .google-btn {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
        background: var(--glass-05); border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        color: var(--text-main); font-weight: 500; font-size: 15px; border-radius: 14px;
        padding: 14px; transition: all 0.3s ease; text-decoration: none;
      }
      .google-btn:hover { background: var(--glass-06, rgba(255,255,255,0.06)); border-color: var(--text-muted); color: var(--text-main); transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match ❌');
    if (form.password.length < 6) return setError('Password is too short. It must be at least 6-8 characters.');
    if (form.phone.length < 10) return setError('Enter a valid phone number');
    setLoading(true);

    if (!useOtp) {
      try {
        const { data } = await API.post('/auth/register', {
          name: form.name, email: form.email, phone: form.phone, password: form.password,
          ...(inviteCode ? { referralCode: inviteCode } : {}),
        });
        login({ _id: data._id, name: data.name, email: data.email, role: data.role, phone: data.phone, avatar: data.avatar || '', isEmailVerified: data.isEmailVerified, isPhoneVerified: data.isPhoneVerified }, data.token);
        localStorage.setItem('spotnplay_new_signup', '1');
        navigate('/player/dashboard');
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed');
      } finally { setLoading(false); }
      return;
    }

    try {
      await API.post('/otp/send', { email: form.email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const goToDashboard = (role) => {
    if (role === 'coach') navigate('/coach/dashboard');
    else if (role === 'ground_owner') navigate('/owner/dashboard');
    else if (role === 'gym_owner') navigate('/gym/dashboard');
    else if (role === 'pool_owner') navigate('/pool/dashboard');
    else if (role === 'player') navigate('/player/dashboard');
    else navigate('/');
  };

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) return setError('Enter 6 digit OTP');
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/otp/verify', {
        email: form.email, otp, name: form.name, phone: form.phone, password: form.password,
        ...(inviteCode ? { referralCode: inviteCode } : {}),
      });
      login({ _id: data._id, name: data.name, email: data.email, role: data.role, phone: data.phone, avatar: data.avatar || '', isEmailVerified: data.isEmailVerified, isPhoneVerified: data.isPhoneVerified }, data.token);
      localStorage.setItem('spotnplay_new_signup', '1');
      setRegisteredRole(data.role || 'player');
      // Email verified & account created — now offer to verify the phone number too.
      setStep(3);
      sendPhoneOtpStep();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  const sendPhoneOtpStep = async () => {
    setError('');
    try {
      await API.post('/otp/send-phone', { phone: form.phone });
      setPhoneOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send phone OTP');
    }
  };

  const handleVerifyPhone = async () => {
    if (phoneOtp.length !== 6) return setError('Enter 6 digit OTP');
    setLoading(true);
    setError('');
    try {
      await API.post('/otp/verify-phone', { phone: form.phone, otp: phoneOtp });
      updateUser({ isPhoneVerified: true });
      setPhoneVerified(true);
      setTimeout(() => goToDashboard(registeredRole), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Phone verification failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white flex items-center justify-center px-4 relative overflow-hidden py-10">
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-green-500/20 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-emerald-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s', animationDuration: '10s' }} />
      </div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-50 z-0">
        <div className="absolute inset-0 rounded-full border-[1px] border-dashed border-green-400/20 animate-spin-slow" />
        <div className="absolute inset-16 rounded-full border-[1px] border-green-400/10" style={{ animation: 'spin-slow 25s linear infinite reverse' }} />
        <div className="absolute inset-32 rounded-full border-[1px] border-dashed border-green-400/10 animate-spin-slow" style={{ animationDuration: '30s' }} />
      </div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 60%)' }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/50 to-transparent pointer-events-none" />

      {/* Floating particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="particle" style={{
          left: `${Math.random() * 100}%`,
          animation: `particle-float ${5 + Math.random() * 10}s linear ${Math.random() * 5}s infinite`,
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          background: `rgba(74,222,128,${0.2 + Math.random() * 0.4})`,
          boxShadow: `0 0 10px rgba(74,222,128,0.5)`,
        }} />
      ))}

      {/* ← max-w-lg se max-w-xl kiya — wider form */}
      <div className="relative w-full max-w-xl">

        {/* Header */}
        <div className="animate-fadeUp-1 text-center mb-6">
          <Link to="/" className="inline-flex items-center mb-6" aria-label="spotNplay Home">
            <SpotNPlayLogo size="lg" />
          </Link>
          {/* <h1 className="font-bebas text-5xl tracking-wide shimmer-text mb-2">
            {step === 1 ? 'CREATE ACCOUNT' : step === 2 ? 'VERIFY EMAIL' : 'VERIFY PHONE'}
          </h1> */}
          {/* <p className="text-gray-600 text-sm">
            {step === 1 ? 'Join thousands of players already on the map' : step === 2 ? `OTP sent to ${form.email}` : `OTP sent to ${form.phone}`}
          </p> */}
        </div>

        {/* Progress dots */}
        {useOtp && (
          <div className="animate-fadeUp-1 flex gap-2 justify-center mb-6">
            <div className="progress-step" style={{ background: step >= 1 ? '#4ade80' : 'var(--glass-10, rgba(255,255,255,0.1))' }} />
            <div className="progress-step" style={{ background: step >= 2 ? '#4ade80' : 'var(--glass-10, rgba(255,255,255,0.1))' }} />
            <div className="progress-step" style={{ background: step >= 3 ? '#4ade80' : 'var(--glass-10, rgba(255,255,255,0.1))' }} />
          </div>
        )}

        <div className="animate-fadeUp-2 bg-white dark:bg-white/2 border border-black/10 dark:border-white/6 rounded-3xl p-8 backdrop-blur-sm">
          {error && (
            <div className="animate-slideIn bg-red-400/8 border border-red-400/20 text-red-400 px-4 py-3 rounded-2xl mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Invite & Earn: a friend's link brought them here — say the bonus out loud */}
          {step === 1 && inviteCode && (
            <div className="mb-5 rounded-2xl p-4 border flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))', borderColor: 'rgba(251,191,36,0.3)' }}>
              <span className="text-2xl">🎁</span>
              <div>
                <p className="text-sm font-bold">You've been invited!</p>
                <p className="text-xs text-gray-500">Code <span className="font-mono font-bold text-yellow-500">{inviteCode}</span> applied — 20 Fitcoin lands in your wallet on signup.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Toggle */}
              {/* <div className="flex gap-1 p-1 bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 rounded-2xl mb-2">
                <button type="button" onClick={() => setUseOtp(false)} className={`toggle-btn ${!useOtp ? 'toggle-active' : 'toggle-inactive'}`}>
                  🔑 Normal Signup
                </button>
                <button type="button" onClick={() => setUseOtp(true)} className={`toggle-btn ${useOtp ? 'toggle-active' : 'toggle-inactive'}`}>
                  📧 Verify with OTP
                </button>
              </div> */}

              {/* 2 column grid for fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-fadeUp-3 md:col-span-2">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">User Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                    placeholder="e.g. Alex Johnson" required className="input-field"
                    style={focused === 'name' ? { borderColor: 'rgba(74,222,128,0.5)', background: 'var(--glass-05, rgba(255,255,255,0.05))' } : {}} />
                </div>

                <div className="animate-fadeUp-3">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Email Address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                    placeholder="alex@example.com" required className="input-field"
                    style={focused === 'email' ? { borderColor: 'rgba(74,222,128,0.5)', background: 'var(--glass-05, rgba(255,255,255,0.05))' } : {}} />
                </div>

                <div className="animate-fadeUp-3">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    onFocus={() => setFocused('phone')} onBlur={() => setFocused('')}
                    placeholder="e.g. 9876543210" required className="input-field"
                    style={focused === 'phone' ? { borderColor: 'rgba(74,222,128,0.5)', background: 'var(--glass-05, rgba(255,255,255,0.05))' } : {}} />
                </div>

                <div className="animate-fadeUp-3">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Password</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                    placeholder="••••••••" required className="input-field"
                    style={focused === 'password' ? { borderColor: 'rgba(74,222,128,0.5)', background: 'var(--glass-05, rgba(255,255,255,0.05))' } : {}} />
                </div>

                <div className="animate-fadeUp-3">
                  <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Confirm Password</label>
                  <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                    onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused('')}
                    placeholder="••••••••" required className="input-field"
                    style={focused === 'confirmPassword' ? {
                      borderColor: form.confirmPassword && form.password !== form.confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.5)',
                      background: 'var(--glass-05, rgba(255,255,255,0.05))'
                    } : {}} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 ml-1">❌ Passwords do not match</p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-green-400 text-xs mt-1 ml-1">✅ Passwords match</p>
                  )}
                </div>
              </div>

              <p className="animate-fadeUp-4 text-gray-500 text-xs -mt-1">
                Everyone starts as a player. Want to list a ground, gym, pool, or coach profile? Reach out after signup and our team will set up your account.
              </p>

              {/* Buttons */}
              <div className="animate-fadeUp-5 flex flex-col gap-3 mt-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {useOtp ? 'Sending OTP...' : 'Creating Account...'}
                    </span>
                  ) : useOtp ? 'Continue → (Verify with OTP)' : 'Create Account'}
                </button>

                <a href={`${import.meta.env.VITE_API_URL}/auth/google`} className="google-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </a>
              </div>

            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-400/10 border border-green-400/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📧</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">We sent a 6-digit OTP to</p>
                <p className="text-gray-900 dark:text-white font-semibold mt-1">{form.email}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block text-center">Enter OTP</label>
                <input type="number" value={otp} onChange={(e) => setOtp(e.target.value.slice(0, 6))} placeholder="000000" className="otp-input" />
              </div>
              <button onClick={handleVerifyAndRegister} disabled={loading || otp.length !== 6} className="btn-primary">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : 'Verify & Create Account 🚀'}
              </button>
              <button onClick={() => { setStep(1); setOtp(''); setError(''); }} className="text-gray-600 hover:text-gray-900 dark:text-white text-sm transition-colors text-center">
                ← Change Details
              </button>
              <p className="text-gray-700 text-xs text-center">
                Didn't receive OTP?{' '}
                <button onClick={() => API.post('/otp/send', { email: form.email })} className="text-green-400 hover:text-green-300 transition-colors">
                  Resend
                </button>
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              {phoneVerified ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-400/10 border border-green-400/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                  <p className="text-gray-900 dark:text-white font-semibold">Phone verified! Taking you to your dashboard...</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-400/10 border border-green-400/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">📱</div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {phoneOtpSent ? 'We sent a 6-digit OTP to' : 'Sending a 6-digit OTP to'}
                    </p>
                    <p className="text-gray-900 dark:text-white font-semibold mt-1">{form.phone}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block text-center">Enter OTP</label>
                    <input type="number" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.slice(0, 6))} placeholder="000000" className="otp-input" />
                  </div>
                  <button onClick={handleVerifyPhone} disabled={loading || phoneOtp.length !== 6} className="btn-primary">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : 'Verify Phone Number 🚀'}
                  </button>
                  <button onClick={() => goToDashboard(registeredRole)} className="text-gray-600 hover:text-gray-900 dark:text-white text-sm transition-colors text-center">
                    Skip for now — I'll verify later
                  </button>
                  <p className="text-gray-700 text-xs text-center">
                    Didn't receive OTP?{' '}
                    <button onClick={sendPhoneOtpStep} className="text-green-400 hover:text-green-300 transition-colors">
                      Resend
                    </button>
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="animate-fadeUp-5 text-center mt-6">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">Sign in →</Link>
          </p>
        </div>

        {/* Animated stats bar */}
        {/* <div className="animate-fadeUp-5 mt-6 flex justify-center gap-6">
          {[
            { value: '10K+', label: 'Players', icon: '⚡' },
            { value: '500+', label: 'Grounds', icon: '🏟️' },
            { value: '15+', label: 'Cities', icon: '🗺️' },
          ].map((stat, i) => (
            <div key={i} className="text-center" style={{ animation: `count-up 0.6s ease ${1 + i * 0.15}s forwards`, opacity: 0 }}>
              <div className="text-green-400 font-bold text-lg">{stat.icon} {stat.value}</div>
              <div className="text-gray-700 text-xs uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
};

export default Register;