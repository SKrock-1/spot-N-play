import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import UserChip from '../components/UserChip';
import PoolBookingPanel from '../components/PoolBookingPanel';

const GroundDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [myPayments, setMyPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('slots');
  const [filterDay, setFilterDay] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: date, 2: time, 3: confirm (fixed-slot grounds)
  const [wizardDate, setWizardDate] = useState(null);
  
  const [flexDate, setFlexDate] = useState('');
  const [flexStart, setFlexStart] = useState('');
  const [mySocialBookings, setMySocialBookings] = useState([]);
  const [activeSportId, setActiveSportId] = useState(null);
  const [partySize, setPartySize] = useState(1);

  // Default to this venue's first sport once loaded (most venues only have
  // one; multi-sport venues get a tab selector — see the SPORT TABS block).
  useEffect(() => {
    if (ground?.sports?.length && !ground.sports.find(s => s._id === activeSportId)) {
      setActiveSportId(ground.sports[0]._id);
    }
  }, [ground, activeSportId]);

  // A venue that's still in trial/interest mode has no real slots to book
  // yet (any venueType can be in this state now, not just gym/pool) — send
  // the visitor to the lead-flow page instead of this booking wizard.
  useEffect(() => {
    if (ground && ground.venueMode && ground.venueMode !== 'live') {
      navigate(`/venues/${id}`, { replace: true });
    }
  }, [ground, id, navigate]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-spin { animation: spin 1s linear infinite; }
      .animate-pulse { animation: pulse 2s ease-in-out infinite; }

      .shimmer-text {
        background: linear-gradient(90deg, var(--shimmer-color));
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .grid-dots {
        background-image: radial-gradient(circle, var(--glass-05, rgba(255,255,255,0.05)) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      .glass-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 24px;
        padding: 24px;
      }

      .slot-card {
        border-radius: 16px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .slot-available {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
      }
      .slot-available:hover {
        border-color: rgba(74,222,128,0.4);
        background: rgba(74,222,128,0.04);
        transform: translateY(-2px);
      }
      .slot-selected {
        background: rgba(74,222,128,0.08);
        border: 1px solid rgba(74,222,128,0.4);
        box-shadow: 0 0 20px rgba(74,222,128,0.1);
      }
      .slot-booked {
        background: var(--glass-05);
        border: 1px solid var(--glass-04, rgba(255,255,255,0.04));
        opacity: 0.4;
        cursor: not-allowed;
      }

      .pay-btn {
        width: 100%;
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        font-size: 16px;
        border-radius: 14px;
        padding: 15px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
      }
      .pay-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
      }
      .pay-btn:hover::before { left: 100%; }
      .pay-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.35); }
      .pay-btn:disabled { opacity: 0.5; transform: none; box-shadow: none; }

      .final-pay-btn {
        background: rgba(59,130,246,0.12);
        border: 1px solid rgba(59,130,246,0.25);
        color: #60a5fa;
        font-weight: 600;
        font-size: 13px;
        border-radius: 10px;
        padding: 9px 18px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .final-pay-btn:hover {
        background: rgba(59,130,246,0.2);
        transform: translateY(-1px);
      }

      .cancel-btn {
        background: rgba(239,68,68,0.06);
        border: 1px solid rgba(239,68,68,0.15);
        color: rgba(239,68,68,0.7);
        font-weight: 600;
        font-size: 13px;
        border-radius: 10px;
        padding: 9px 18px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .cancel-btn:hover {
        background: rgba(239,68,68,0.12);
        color: #ef4444;
      }

      .tab-btn {
        padding: 10px 24px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .tab-active {
        background: rgba(74,222,128,0.12);
        color: #4ade80;
        border: 1px solid rgba(74,222,128,0.2);
      }
      .tab-inactive {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid transparent;
      }
      .tab-inactive:hover { color: var(--text-muted); }

      .amenity-chip {
        background: var(--glass-05);
        border: 1px solid rgba(255,255,255,0.07);
        color: var(--text-muted);
        font-size: 12px;
        padding: 5px 12px;
        border-radius: 100px;
        transition: all 0.2s ease;
      }
      .amenity-chip:hover {
        border-color: rgba(74,222,128,0.2);
        color: var(--text-muted);
      }

      .payment-card {
        background: var(--glass-02, rgba(255,255,255,0.02));
        border: 1px solid var(--glass-06, rgba(255,255,255,0.06));
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
      }
      .payment-card:hover {
        border-color: rgba(74,222,128,0.15);
      }

      .filter-bar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .filter-chip {
        padding: 6px 14px;
        border-radius: 100px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        border: 1px solid var(--glass-08, rgba(255,255,255,0.08));
        background: var(--glass-02, rgba(255,255,255,0.02));
        color: var(--text-muted);
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
      }
      .filter-chip:hover {
        border-color: rgba(74,222,128,0.3);
        color: var(--text-muted);
      }
      .filter-chip.active {
        background: rgba(74,222,128,0.12);
        border-color: rgba(74,222,128,0.3);
        color: #4ade80;
      }
      .date-header {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 12px 0 6px;
        border-bottom: 1px solid var(--glass-04, rgba(255,255,255,0.04));
        margin-bottom: 8px;
      }
      .book-btn {
        width: 100%;
        background: rgba(59,130,246,0.12);
        border: 1px solid rgba(59,130,246,0.3);
        color: #60a5fa;
        font-weight: 700;
        font-size: 15px;
        border-radius: 14px;
        padding: 14px;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .book-btn:hover { background: rgba(59,130,246,0.2); transform: translateY(-1px); }
      .book-btn:disabled { opacity: 0.5; transform: none; }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 100px;
      }

      .price-breakdown {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.1);
        border-radius: 16px;
        padding: 16px;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fetchMySocialBookings = async () => {
    try {
      const { data } = await API.get('/bookings/my');
      setMySocialBookings(data.filter(b => b.ground?._id === id));
    } catch {
      setMySocialBookings([]);
    }
  };

  useEffect(() => {
    fetchGround();
    if (user?.role === 'player') {
      fetchMyPayments();
      fetchMySocialBookings();
    }
  }, [id]);

  const fetchGround = async () => {
    try {
      const { data } = await API.get(`/grounds/${id}`);
      setGround(data);
    } catch {
      showMessage('Failed to load ground', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPayments = async () => {
    try {
      const { data } = await API.get('/payments/my');
      setMyPayments(data.filter((p) => p.ground?._id === id));
    } catch {
      setMyPayments([]);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAdvancePayment = async () => {
    if (!selectedSlot) return;
    setPaymentLoading(true);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      showMessage('Razorpay failed to load. Check internet connection.', 'error');
      setPaymentLoading(false);
      return;
    }

    try {
      const { data } = await API.post(`/payments/grounds/${id}/advance-order`, {
        slotId: selectedSlot._id,
        partySize,
      });

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `Advance (30%) — ${data.ground.name}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await API.post(`/payments/grounds/${id}/verify-advance`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              slotId: selectedSlot._id,
              partySize,
            });
            showMessage('Advance payment successful! Slot booked ✅');
            setSelectedSlot(null);
            setPartySize(1);
            setWizardStep(1);
            setWizardDate(null);
            fetchGround();
            fetchMyPayments();
            setActiveTab('payments');
          } catch {
            showMessage('Payment verification failed ❌', 'error');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#4ade80' },
        modal: {
          ondismiss: () => {
            showMessage('Payment cancelled', 'error');
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to create order', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFinalPayment = async (bookingId) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) return showMessage('Razorpay failed to load', 'error');

    try {
      const { data } = await API.post(`/payments/bookings/${bookingId}/final-order`);

      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: 'Final Payment (Remaining 70%)',
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await API.post(`/payments/bookings/${bookingId}/verify-final`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            showMessage('Final payment done! Booking completed 🎉');
            fetchMyPayments();
          } catch {
            showMessage('Final payment verification failed ❌', 'error');
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#4ade80' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleCancelRefund = async (bookingId) => {
    if (!window.confirm('Cancel booking and get advance refund?')) return;
    try {
      await API.post(`/payments/bookings/${bookingId}/cancel-refund`);
      showMessage('Booking cancelled & advance refunded ✅');
      fetchMyPayments();
      fetchGround();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      advance_pending: { label: 'Advance Pending', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
      advance_paid: { label: 'Advance Paid ✅', color: 'bg-blue-400/10 text-blue-400 border border-blue-400/20' },
      final_pending: { label: 'Final Due', color: 'bg-orange-400/10 text-orange-400 border border-orange-400/20' },
      completed: { label: 'Completed 🎉', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      refunded: { label: 'Refunded', color: 'bg-gray-400/10 text-gray-600 dark:text-gray-400 border border-gray-400/20' },
      cancelled: { label: 'Cancelled', color: 'bg-red-400/10 text-red-400 border border-red-400/20' },
    };
    return map[status] || { label: status, color: 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white' };
  };

  const getSportEmoji = (sport) => {
    const map = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', 'box cricket': '🏏', 'box football': '⚽' };
    return map[sport] || '🏆';
  };

  const getDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  };

  const getTimeCategory = (timeStr) => {
    const hour = parseInt(timeStr.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 16) return 'afternoon';
    if (hour < 20) return 'evening';
    return 'night';
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dDate = new Date(d);
    dDate.setHours(0, 0, 0, 0);
    if (dDate.getTime() === today.getTime()) return 'Today';
    if (dDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleDirectBook = async () => {
    if (!selectedSlot) return;
    setBookingLoading(true);
    try {
      await API.post(`/bookings/grounds/${id}/book`, { slotId: selectedSlot._id });
      showMessage('Slot booked successfully! 🎉');
      setSelectedSlot(null);
      setWizardStep(1);
      setWizardDate(null);
      fetchGround();
      if (user?.role === 'player') fetchMyPayments();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Booking failed', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSocialBook = async () => {
    if (!flexDate || !flexStart) return showMessage('Please fill all time fields', 'error');
    setBookingLoading(true);

    const [h, m] = flexStart.split(':');
    const endH = (parseInt(h) + 1).toString().padStart(2, '0');
    const calculatedEndTime = `${endH}:${m}`;

    try {
      await API.post(`/bookings/grounds/${id}/book-social`, {
        date: flexDate, startTime: flexStart, endTime: calculatedEndTime
      });
      showMessage('Request sent! Awaiting admin approval ⏳');
      setFlexDate(''); setFlexStart('');
      fetchGround();
      fetchMySocialBookings();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Booking failed. Check overlap or time constraints.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading ground...</p>
        </div>
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] flex items-center justify-center">
        <p className="text-gray-500">Ground not found</p>
      </div>
    );
  }

  // Server already strips stale (past-dated, unbooked) slots from the
  // response, but the wizard should also only ever offer a rolling 7-day
  // window — no dates from further out even if an owner added them.
  const todayISO = new Date().toISOString().split('T')[0];
  const maxWindowDate = new Date();
  maxWindowDate.setDate(maxWindowDate.getDate() + 6);
  const maxWindowISO = maxWindowDate.toISOString().split('T')[0];

  const activeSportDoc = ground.sports?.find(s => s._id === activeSportId) || ground.sports?.[0];

  const availableSlots = (ground.slots?.filter((s) => !s.isBooked) || []).filter((slot) => {
    if (slot.date < todayISO || slot.date > maxWindowISO) return false;
    if (ground.sports?.length > 1 && activeSportId && String(slot.sportId) !== String(activeSportId)) return false;
    if (filterDay !== 'all') {
      const day = getDayLabel(slot.date);
      if (day !== filterDay) return false;
    }
    return true;
  });
  const bookedSlots = ground.slots?.filter((s) => s.isBooked) || [];

  // Group available slots by date
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedSlots).sort();

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white text-sm mb-5 transition-colors">
            ← Back
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Ground Detail</p>
              <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">{ground.name}</h1>
              <p className="text-gray-500 mt-1">📍 {ground.address}</p>
              {ground.venueType === 'pool' && (user?.role === 'admin' || String(ground.owner?._id || ground.owner || '') === String(user?._id || '')) && user && (
                <button
                  onClick={() => navigate(user.role === 'admin' ? `/admin/pools/${ground._id}` : `/pool/manage/${ground._id}`)}
                  className="mt-3 inline-flex items-center gap-2 bg-green-400 hover:bg-green-300 text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  ⚙️ Manage bookings & gate scanner →
                </button>
              )}
              {/* {ground.owner?._id && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Hosted by</span>
                  <UserChip user={ground.owner} size="sm" stopPropagation={true} style={{ color: 'inherit' }} />
                </div>
              )} */}
            </div>
            <div className="flex flex-col items-end gap-2">
              {ground.venueType !== 'pool' && (
                <span className="font-bebas text-3xl text-green-400">₹{ground.sports?.length ? ground.sports[0].pricePerHour : ground.pricePerHour}<span className="text-lg text-gray-600">/hr</span></span>
              )}
              {ground.sports?.length > 1 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {ground.sports.filter(s => s.isActive).map(s => (
                    <span key={s._id} className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full capitalize">
                      {getSportEmoji(s.name)} {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full capitalize">
                  {getSportEmoji(ground.sport)} {ground.sport}
                </span>
              )}
            </div>
          </div>
        </div>

        {ground.images?.length > 0 && (
          <div className="animate-fadeUp-2 mb-6 grid grid-cols-3 gap-3">
            {ground.images.slice(0, 3).map((img, i) => (
              <div key={i} className="rounded-2xl overflow-hidden aspect-video bg-black/4 dark:bg-white/4 border border-black/6 dark:border-white/6">
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        )}

        <div className="animate-fadeUp-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ground.venueType === 'pool' ? (
          <div className="lg:col-span-3">
            <PoolBookingPanel ground={ground} user={user} showMessage={showMessage} />
          </div>
        ) : (
        <>
          {/* Left — Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {ground.amenities?.length > 0 && (
              <div className="glass-card">
                <h3 className="text-gray-900 dark:text-white font-bold mb-3 text-sm uppercase tracking-wider">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {ground.amenities.map((a, i) => (
                    <span key={i} className="amenity-chip">✓ {a}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card">
              <div className="flex gap-2 mb-5">
                {[
                  { id: 'slots', label: `Available (${availableSlots.length})` },
                  { id: 'booked', label: `Booked (${bookedSlots.length})` },
                  ...(user?.role === 'player' ? [{ id: 'payments', label: `My Payments (${myPayments.length})` }] : []),
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'slots' && (
                <div className="flex flex-col gap-3">
                  {ground.isSocial ? (
                    <div className="bg-yellow-400/5 text-yellow-500 border border-yellow-400/20 p-5 rounded-2xl">
                      <p className="font-bebas text-2xl tracking-wide">FLEXIBLE BOOKING MODE ✨</p>
                      <p className="text-sm opacity-80 mt-1">This is a social ground. You don't need to select pre-made slots! Just use the booking panel on the right to select your exact starting time (Duration is exactly 1 hour) between 9 AM and 6 PM.</p>
                      
                      <div className="mt-5">
                        <p className="text-xs uppercase font-bold tracking-wider mb-2">Unavailable (Already Booked) Times</p>
                        {bookedSlots.length === 0 ? (
                          <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/10 dark:border-white/10 text-xs">
                            All times are currently open today and tomorrow!
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {bookedSlots.map(s => (
                              <div key={s._id} className="flex items-center justify-between bg-red-400/10 text-red-500 border border-red-400/20 px-3 py-2 rounded-xl text-sm">
                                <span>📅 {s.date}</span>
                                <span className="font-bold">🕐 {s.startTime} — {s.endTime}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── Stepper header ── */}
                      <div className="flex items-center gap-2 mb-1">
                        {[
                          { n: 1, label: 'Date' },
                          { n: 2, label: 'Time' },
                          { n: 3, label: 'Confirm' },
                        ].map((s, idx) => (
                          <div key={s.n} className="flex items-center gap-2 flex-1">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                  wizardStep > s.n
                                    ? 'bg-green-400 text-black'
                                    : wizardStep === s.n
                                    ? 'bg-green-400/20 text-green-400 border-2 border-green-400'
                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 border border-black/10 dark:border-white/10'
                                }`}
                              >
                                {wizardStep > s.n ? '✓' : s.n}
                              </div>
                              <span className={`text-[10px] uppercase tracking-wider ${wizardStep >= s.n ? 'text-green-400' : 'text-gray-500'}`}>{s.label}</span>
                            </div>
                            {idx < 2 && (
                              <div className={`h-0.5 flex-1 rounded ${wizardStep > s.n ? 'bg-green-400' : 'bg-black/10 dark:bg-white/10'}`} />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* ── Sport selector (only shown for multi-sport venues) ── */}
                      {ground.sports?.length > 1 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {ground.sports.filter(s => s.isActive).map(s => (
                            <button
                              key={s._id}
                              onClick={() => { setActiveSportId(s._id); setWizardStep(1); setWizardDate(null); setSelectedSlot(null); }}
                              className={`tab-btn capitalize ${activeSportId === s._id ? 'tab-active' : 'tab-inactive'}`}
                            >
                              {s.name}{!ground.isSocial ? ` · ₹${s.pricePerHour}/hr` : ''}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ── Step 1: pick a date ── */}
                      {wizardStep === 1 && (
                        <div className="flex flex-col gap-3 animate-cardIn">
                          <p className="text-xs text-gray-600 uppercase tracking-wider">📅 Pick a date to see open slots</p>
                          {sortedDates.length === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-center">
                              <span className="text-4xl">😕</span>
                              <p className="text-gray-500 text-sm">No open slots on this ground right now</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {sortedDates.map((date, i) => (
                                <button
                                  key={date}
                                  onClick={() => { setWizardDate(date); setWizardStep(2); }}
                                  className="slot-card slot-available text-left animate-cardIn"
                                  style={{ animationDelay: `${i * 0.03}s` }}
                                >
                                  <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatDateLabel(date)}</p>
                                  <p className="text-gray-600 text-xs mt-0.5">{date} · {getDayLabel(date)}</p>
                                  <p className="text-green-400 text-xs font-bold mt-1">{groupedSlots[date].length} slot{groupedSlots[date].length !== 1 ? 's' : ''} open</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Step 2: pick a time on that date ── */}
                      {wizardStep === 2 && wizardDate && (
                        <div className="flex flex-col gap-3 animate-cardIn">
                          <button onClick={() => { setWizardStep(1); setWizardDate(null); }} className="text-gray-600 hover:text-gray-900 dark:hover:text-white text-xs w-fit flex items-center gap-1 transition-colors">
                            ← Change date
                          </button>
                          <div className="date-header">{formatDateLabel(wizardDate)} — {wizardDate}</div>

                          <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">🕐 Filter by Time</p>
                            <div className="filter-bar">
                              {[
                                { id: 'all', label: 'All Times', icon: '' },
                                { id: 'morning', label: 'Morning', icon: '🌅' },
                                { id: 'afternoon', label: 'Afternoon', icon: '☀️' },
                                { id: 'evening', label: 'Evening', icon: '🌇' },
                                { id: 'night', label: 'Night', icon: '🌙' },
                              ].map((t) => (
                                <button key={t.id} onClick={() => setFilterTime(t.id)} className={`filter-chip ${filterTime === t.id ? 'active' : ''}`}>
                                  {t.icon} {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(groupedSlots[wizardDate] || [])
                            .filter((slot) => filterTime === 'all' || getTimeCategory(slot.startTime) === filterTime)
                            .length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-2 text-center">
                              <span className="text-3xl">😕</span>
                              <p className="text-gray-500 text-sm">No slots match this time filter</p>
                              <button onClick={() => setFilterTime('all')} className="text-green-400 text-xs hover:underline">Clear filter</button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {(groupedSlots[wizardDate] || [])
                                .filter((slot) => filterTime === 'all' || getTimeCategory(slot.startTime) === filterTime)
                                .map((slot, i) => {
                                  const sHour = parseInt(slot.startTime.split(':')[0]);
                                  const isConsecutive = bookedSlots.some(s =>
                                    s.date === slot.date &&
                                    s.bookedBy?.includes(user?._id) &&
                                    Math.abs(parseInt(s.startTime.split(':')[0]) - sHour) === 1
                                  );
                                  if (isConsecutive) return null;

                                  return (
                                    <button
                                      key={slot._id}
                                      onClick={() => { setSelectedSlot(slot); setPartySize(1); setWizardStep(3); }}
                                      className="slot-card slot-available text-left animate-cardIn"
                                      style={{ animationDelay: `${i * 0.03}s` }}
                                    >
                                      <p className="text-gray-900 dark:text-white font-semibold text-sm">🕐 {slot.startTime} — {slot.endTime}</p>
                                      <p className="text-gray-600 text-xs mt-0.5">{getTimeCategory(slot.startTime)}</p>
                                      {slot.courtId && activeSportDoc?.courts?.length > 0 && (
                                        <p className="text-gray-500 text-[10px] mt-0.5">📍 {activeSportDoc.courts.find(c => c._id === slot.courtId)?.name || 'Court'}</p>
                                      )}
                                      {slot.capacity > 1 && slot.capacity < 999999 && (
                                        <p className="text-gray-500 text-[10px] mt-0.5">{slot.capacity - slot.bookedCount} spot{(slot.capacity - slot.bookedCount) !== 1 ? 's' : ''} left</p>
                                      )}
                                      <p className="text-green-400 font-bold text-sm mt-1">₹{activeSportDoc?.pricePerHour ?? ground.pricePerHour}</p>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Step 3: confirm (handled in the "Your Booking" panel on the right) ── */}
                      {wizardStep === 3 && selectedSlot && (
                        <div className="flex flex-col items-center py-10 gap-3 text-center animate-cardIn">
                          <span className="text-4xl">👉</span>
                          <p className="text-gray-500 text-sm">Review and confirm your booking in the panel on the right</p>
                          <button
                            onClick={() => { setSelectedSlot(null); setWizardStep(2); }}
                            className="text-green-400 text-xs hover:underline"
                          >
                            ← Pick a different time
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'booked' && (
                <div className="flex flex-col gap-3">
                  {bookedSlots.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-3">
                      <span className="text-4xl">✅</span>
                      <p className="text-gray-500 text-sm">No booked slots</p>
                    </div>
                  ) : bookedSlots.map((slot, i) => (
                    <div key={slot._id} className="slot-card slot-booked animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900 dark:text-white font-semibold text-sm">📅 {slot.date}</p>
                          <p className="text-gray-500 text-xs mt-0.5">🕐 {slot.startTime} — {slot.endTime}</p>
                        </div>
                        <span className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-3 py-1 rounded-full">Booked</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'payments' && user?.role === 'player' && (
                <div className="flex flex-col gap-3">
                  {myPayments.length === 0 ? (
                    <div className="flex flex-col items-center py-10 gap-3 text-center">
                      <span className="text-4xl">💳</span>
                      <p className="text-gray-500 text-sm">No payments for this ground yet</p>
                    </div>
                  ) : myPayments.map((payment, i) => {
                    const badge = getStatusBadge(payment.status);
                    return (
                      <div key={payment._id} className="payment-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm">
                              {payment.booking?.date} · {payment.booking?.startTime} — {payment.booking?.endTime}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5">Booking #{payment.booking?._id?.slice(-6)}</p>
                          </div>
                          <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                        </div>

                        <div className="price-breakdown mb-3">
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-500">Total Amount</span>
                            <span className="text-gray-900 dark:text-white font-semibold">₹{payment.totalAmount}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-500">Advance Paid (30%)</span>
                            <span className="text-green-400 font-semibold">₹{payment.advanceAmount}</span>
                          </div>
                          <div className="w-full h-px bg-black/5 dark:bg-white/5 my-2" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Remaining (70%)</span>
                            <span className={`font-semibold ${payment.finalPayment?.status === 'paid' ? 'text-green-400' : 'text-orange-400'}`}>
                              {payment.finalPayment?.status === 'paid' ? '✅ Paid' : `₹${payment.remainingAmount} due`}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {payment.status === 'advance_paid' && (
                            <button onClick={() => handleFinalPayment(payment.booking?._id)} className="final-pay-btn">
                              💳 Pay Remaining ₹{payment.remainingAmount}
                            </button>
                          )}
                          {['advance_paid'].includes(payment.status) && (
                            <button onClick={() => handleCancelRefund(payment.booking?._id)} className="cancel-btn">
                              Cancel & Refund
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right — Booking Panel */}
          <div className="flex flex-col gap-4 sticky top-24 h-max">
            <div className="glass-card">
              <h3 className="font-bebas text-xl tracking-wide text-gray-900 dark:text-white mb-4">BOOK THIS GROUND</h3>

              {ground.isSocial ? (
                // ── SOCIAL GROUND BOOKING PANEL ──
                <div className="flex flex-col gap-4">
                  <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-xl">
                    <p className="text-yellow-500 font-bold mb-3 text-center">✨ Social Ground Booking</p>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1 block">Date</label>
                        <input
                          type="date"
                          value={flexDate}
                          onChange={(e) => { setFlexDate(e.target.value); setFlexStart(''); }}
                          min={new Date().toISOString().split('T')[0]}
                          max={new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0]}
                          className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-400 transition"
                        />
                        <p className="text-gray-500 text-[10px] mt-1">Bookable up to 7 days ahead</p>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1 block">Start Time (1-Hour Session)</label>
                        <select
                          value={flexStart}
                          onChange={(e) => setFlexStart(e.target.value)}
                          disabled={!flexDate}
                          className="w-full bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-lg p-2.5 text-sm outline-none focus:border-yellow-400 transition text-gray-900 dark:text-white"
                        >
                          <option value="">{flexDate ? 'Select a Starting Hour' : 'Select a Date first'}</option>
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => {
                            const isBooked = bookedSlots.some(s => s.date === flexDate && s.startTime === time);
                            if (isBooked) return null;
                            const tHour = parseInt(time.split(':')[0]);
                            const isConsecutive = bookedSlots.some(s => {
                              return s.date === flexDate &&
                                     s.bookedBy?.includes(user?._id) &&
                                     Math.abs(parseInt(s.startTime.split(':')[0]) - tHour) === 1;
                            });
                            if (isConsecutive) return null;
                            return (
                              <option key={time} value={time}>
                                {time} — {tHour + 1}:00
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {user?.role === 'player' ? (
                    <button
                      onClick={handleSocialBook}
                      disabled={bookingLoading || !flexDate || !flexStart}
                      className="pay-btn w-full"
                      style={{ background: 'linear-gradient(135deg, #facc15, #eab308)', color: 'black' }}
                    >
                      {bookingLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Sending Request...
                        </span>
                      ) : (
                        <span className="flex gap-2 items-center justify-center">📤 Send Booking Request</span>
                      )}
                    </button>
                  ) : (
                    <div className="bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm font-semibold p-4 rounded-xl text-center">
                      Only logged in Players can book.
                    </div>
                  )}

                  {/* ── My Pending / Confirmed Requests for this ground ── */}
                  {mySocialBookings.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">My Requests</p>
                      {mySocialBookings.map(b => {
                        const isPending   = b.status === 'pending_approval';
                        const isConfirmed = b.status === 'completed';
                        return (
                          <div
                            key={b._id}
                            className={`rounded-xl p-3 border text-sm ${
                              isPending   ? 'bg-yellow-400/5 border-yellow-400/20' :
                              isConfirmed ? 'bg-green-400/5 border-green-400/20'  :
                                            'bg-red-400/5 border-red-400/20 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white text-xs">📅 {b.date}</p>
                                <p className="text-gray-500 text-xs">⏰ {b.startTime} — {b.endTime}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${
                                isPending   ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                                isConfirmed ? 'bg-green-400/10 text-green-400 border-green-400/20'   :
                                              'bg-red-400/10 text-red-400 border-red-400/20'
                              }`}>
                                {isPending ? '⏳ Pending' : isConfirmed ? '✅ Confirmed' : '❌ Rejected'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-gray-500 text-xs text-center">Free booking — admin reviews your request</p>
                </div>
              ) : selectedSlot ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 rounded-16 p-4 rounded-2xl">
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Selected Slot</p>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">📅 {selectedSlot.date}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">🕐 {selectedSlot.startTime} — {selectedSlot.endTime}</p>
                    {activeSportDoc && ground.sports?.length > 1 && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm capitalize">🏅 {activeSportDoc.name}</p>
                    )}
                    {selectedSlot.courtId && activeSportDoc && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        📍 {activeSportDoc.courts?.find(c => c._id === selectedSlot.courtId)?.name || 'Assigned court'}
                      </p>
                    )}
                  </div>

                  {/* Party size — only meaningful for capacity-based venues
                      (pool) where several people can share one slot. */}
                  {activeSportDoc && (!activeSportDoc.courts || activeSportDoc.courts.length === 0) && (
                    <div className="bg-black/3 dark:bg-white/3 border border-black/8 dark:border-white/8 rounded-2xl p-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">
                        How many people? {selectedSlot.capacity < 999999 && (
                          <span className="normal-case text-gray-500">({selectedSlot.capacity - selectedSlot.bookedCount} spot{(selectedSlot.capacity - selectedSlot.bookedCount) !== 1 ? 's' : ''} left)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPartySize(p => Math.max(1, p - 1))}
                          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold"
                        >−</button>
                        <span className="text-lg font-bold text-gray-900 dark:text-white w-8 text-center">{partySize}</span>
                        <button
                          onClick={() => setPartySize(p => Math.min(selectedSlot.capacity - selectedSlot.bookedCount, p + 1))}
                          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold"
                        >+</button>
                      </div>
                    </div>
                  )}

                  <div className="price-breakdown">
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Payment Breakdown</p>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Total Price</span>
                      <span className="text-gray-900 dark:text-white font-semibold">₹{(activeSportDoc?.pricePerHour || ground.pricePerHour) * partySize}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Pay Now (30%)</span>
                      <span className="text-green-400 font-bold">₹{Math.round((activeSportDoc?.pricePerHour || ground.pricePerHour) * partySize * 0.3)}</span>
                    </div>
                    <div className="w-full h-px bg-black/5 dark:bg-white/5 my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">After Playing (70%)</span>
                      <span className="text-orange-400 font-semibold">₹{((activeSportDoc?.pricePerHour || ground.pricePerHour) * partySize) - Math.round((activeSportDoc?.pricePerHour || ground.pricePerHour) * partySize * 0.3)}</span>
                    </div>
                    <p className="text-gray-600 text-[11px] mt-2">Final amount is always confirmed by the server at payment time — the figures above are an estimate.</p>
                  </div>

                  {user?.role === 'player' ? (
                    <button onClick={handleAdvancePayment} disabled={paymentLoading} className="pay-btn w-full">
                      {paymentLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Processing...
                        </span>
                      ) : `💳 Pay ₹${Math.round(ground.pricePerHour * 0.3)} Advance To Book`}
                    </button>
                  ) : (
                    <div className="bg-orange-400/10 border border-orange-400/20 text-orange-400 text-sm font-semibold p-4 rounded-xl text-center">
                      Only logged in Players can book.
                    </div>
                  )}

                  <p className="text-gray-700 text-xs text-center">
                    Pay 30% advance via Razorpay to confirm your slot
                  </p>

                  <button onClick={() => { setSelectedSlot(null); setWizardStep(2); }} className="text-gray-600 hover:text-gray-900 dark:text-white text-sm transition-colors text-center">
                    ✕ Clear selection
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-3 text-center">
                  <span className="text-4xl">👆</span>
                  <p className="text-gray-500 text-sm">{wizardStep === 1 ? 'Pick a date, then a time slot to book' : 'Select a slot from the list to book'}</p>
                  <p className="text-gray-700 text-xs">Only 30% advance needed to confirm</p>
                </div>
              )}
            </div>

            <div className="glass-card">
              <h3 className="text-gray-900 dark:text-white font-bold text-sm uppercase tracking-wider mb-4">Ground Info</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Sport', value: `${getSportEmoji(ground.sport)} ${ground.sport}` },
                  { label: 'Price', value: `₹${ground.pricePerHour}/hr` },
                  { label: 'Total Slots', value: ground.slots?.length || 0 },
                  { label: 'Available', value: availableSlots.length },
                  { label: 'Location', value: ground.address },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                    <span className="text-gray-600 text-xs uppercase tracking-wider flex-shrink-0">{item.label}</span>
                    <span className="text-gray-700 dark:text-gray-300 text-sm text-right capitalize">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
        )}
        </div>
      </div>
    </div>
  );
};

export default GroundDetail;