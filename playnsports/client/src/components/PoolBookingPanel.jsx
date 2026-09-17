import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Waves, CalendarDays, Clock, CreditCard, ListChecks, CheckCircle2, ChevronLeft, ChevronRight,
  AlertTriangle, Upload, FileText, Ticket, MapPin, Users, X, Info, HeartPulse, BookOpen, ShieldAlert,
} from 'lucide-react';
import API from '../api/axios';
import PoolQr from './PoolQr';
import PoolBookingGuide from './PoolBookingGuide';
import PoolRules from './PoolRules';

const useLocalStyles = () => {
  useEffect(() => {
    if (document.getElementById('pbp-styles')) return;
    const style = document.createElement('style');
    style.id = 'pbp-styles';
    style.textContent = `
      .pbp { --pbp-radius: 16px; }
      .pbp .panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: var(--pbp-radius); }
      html.dark .pbp .panel { border-color: rgba(255,255,255,0.06); }
      .pbp .tab-btn { padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all .15s ease; border: 1px solid; }
      .pbp .tab-active { background: rgba(74,222,128,0.1); color: #22c55e; border-color: rgba(74,222,128,0.35); }
      .pbp .tab-inactive { background: transparent; color: #6b7280; border-color: rgba(107,114,128,0.2); }
      .pbp .tab-inactive:hover { border-color: rgba(107,114,128,0.4); color: #9ca3af; }
      .pbp .slot-card { border-radius: 14px; padding: 12px 14px; border: 1px solid; cursor: pointer; transition: all .15s ease; }
      .pbp .slot-card.girls { background: rgba(219,39,119,0.06); border-color: rgba(219,39,119,0.28); }
      .pbp .slot-card.general { background: rgba(37,99,235,0.05); border-color: rgba(37,99,235,0.22); }
      .pbp .slot-card.full { opacity: 0.45; cursor: not-allowed; }
      .pbp .slot-card.expired { opacity: 0.4; cursor: not-allowed; background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.2); }
      .pbp .slot-card.chosen { box-shadow: 0 0 0 2px #22c55e; }
      .pbp .slot-card:hover:not(.full):not(.expired) { border-color: rgba(74,222,128,0.5); }
      .pbp .badge-girls { background: rgba(219,39,119,0.12); color: #db2777; border: 1px solid rgba(219,39,119,0.3); }
      .pbp .badge-general { background: rgba(37,99,235,0.1); color: #2563eb; border: 1px solid rgba(37,99,235,0.28); }
      .pbp .badge-expired { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
      .pbp .input-field { width: 100%; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 12px; color: inherit; font-size: 13px; outline: none; }
      html.dark .pbp .input-field { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .pbp .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; display: block; font-weight: 600; }
      .pbp .btn-primary { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#4ade80,#16a34a); color: #052e12; font-weight: 700; border-radius: 12px; padding: 11px 22px; font-size: 14px; }
      .pbp .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
      .pbp .btn-secondary { display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 600; border-radius: 12px; padding: 10px 18px; font-size: 13px; }
      html.dark .pbp .btn-secondary { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
      .pbp .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
      .pbp .plan-card { border-radius: 16px; padding: 16px; border: 1px solid rgba(107,114,128,0.2); cursor: pointer; transition: all .15s ease; }
      .pbp .plan-card:hover { border-color: rgba(74,222,128,0.4); }
      .pbp .plan-card.chosen { border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
      .pbp .cal-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 13px; cursor: pointer; border: 1px solid transparent; }
      .pbp .cal-cell.selected { border-color: #22c55e; color: #22c55e; font-weight: 700; background: rgba(74,222,128,0.08); }
      .pbp .cal-cell.disabled { color: #4b5563; cursor: not-allowed; opacity: 0.4; }
      .pbp .cal-cell:not(.disabled):hover { background: rgba(107,114,128,0.1); }
      .pbp .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; }
      .pbp .modal-box { background: #0f0f0f; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 22px; max-width: 420px; width: 100%; color: #fff; }
      .pbp .summary-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid rgba(107,114,128,0.12); }
      .pbp .summary-row:last-child { border-bottom: none; }
      .pbp .stepper-btn { width: 44px; height: 44px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 20px; font-weight: 700; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: inherit; }
      html.dark .pbp .stepper-btn { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
      .pbp .stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .pbp .stepper-btn:not(:disabled):active { transform: scale(0.94); background: rgba(74,222,128,0.15); }
      @media (max-width: 640px) {
        .pbp .input-field { font-size: 16px; }
        .pbp .btn-primary, .pbp .btn-secondary { min-height: 44px; }
        .pbp .tab-btn { padding: 12px 14px; }
        .pbp .pay-row { flex-direction: column; align-items: stretch; }
        .pbp .pay-row .btn-primary { width: 100%; justify-content: center; }
      }
      .pbp .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    `;
    document.head.appendChild(style);
  }, []);
};

const STEPS_HOURLY = [
  { n: 1, label: 'Date & Slot', icon: CalendarDays },
  { n: 2, label: 'Category', icon: ListChecks },
  { n: 3, label: 'Confirm', icon: CheckCircle2 },
];
const STEPS_MEMBERSHIP = [
  { n: 1, label: 'Plan', icon: CreditCard },
  { n: 2, label: 'Category', icon: ListChecks },
  { n: 3, label: 'Date & Slot', icon: Clock },
  { n: 4, label: 'Confirm', icon: CheckCircle2 },
];
const MAX_ADVANCE_DAYS = 7;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const toDateStr = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (n) => { const d = todayDate(); d.setDate(d.getDate() + n); return toDateStr(d); };
const dateLabel = (dateStr) => {
  const offset = Math.round((new Date(`${dateStr}T00:00:00`) - todayDate()) / 86400000);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const isWithinWindow = (dateStr) => dateStr >= addDays(0) && dateStr <= addDays(MAX_ADVANCE_DAYS);

// A plan type's card shows a price range across its own categories, so the
// player knows roughly what to expect before they even open the category
// list — "₹100–150" if categories differ, a single "₹100" if they're all
// the same (or there's only one).
const priceRangeLabel = (planType) => {
  const prices = planType.categories.map((c) => c.price);
  if (!prices.length) return 'No pricing set';
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? `\u20b9${min}` : `\u20b9${min}\u2013${max}`;
};

const loadRazorpayScript = () => new Promise((resolve) => {
  if (document.getElementById('razorpay-script')) return resolve(true);
  const script = document.createElement('script');
  script.id = 'razorpay-script';
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const Stepper = ({ step, onJump, steps }) => {
  const list = steps || STEPS_HOURLY;
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {list.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={s.n} className="flex items-center gap-1.5 flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                disabled={s.n >= step}
                onClick={() => onJump(s.n)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  step > s.n ? 'bg-green-500 text-white cursor-pointer' : step === s.n ? 'bg-green-500/15 text-green-500 border-2 border-green-500' : 'bg-black/5 dark:bg-white/5 text-gray-400 border border-black/10 dark:border-white/10'
                }`}
              >
                {step > s.n ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={2.5} />}
              </button>
              <span className={`text-[9px] uppercase tracking-wider font-semibold text-center leading-tight ${step >= s.n ? 'text-green-500' : 'text-gray-500'}`}>{s.label}</span>
            </div>
            {idx < list.length - 1 && <div className={`h-0.5 flex-1 rounded ${step > s.n ? 'bg-green-500' : 'bg-black/10 dark:bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
};

const StepNav = ({ onBack, onNext, nextLabel, nextDisabled, nextIcon: NextIcon = ChevronRight, showBack = true }) => (
  <div className="pay-row flex items-center justify-between gap-3 mt-6 pt-5 border-t border-black/8 dark:border-white/8">
    {showBack ? (
      <button className="btn-secondary" onClick={onBack}><ChevronLeft size={15} /> Back</button>
    ) : <span />}
    <button className="btn-primary" onClick={onNext} disabled={nextDisabled}>{nextLabel} <NextIcon size={15} /></button>
  </div>
);

// Minimal month calendar, cells outside [today, today+MAX_ADVANCE_DAYS] disabled.
const MiniCalendar = ({ selected, onSelect }) => {
  const [viewDate, setViewDate] = useState(() => { const d = todayDate(); d.setDate(1); return d; });
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const maxDateObj = new Date(`${addDays(MAX_ADVANCE_DAYS)}T00:00:00`);
  const canPrev = new Date(year, month, 1) > todayDate();
  const canNext = new Date(year, month + 1, 1) <= maxDateObj;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <button disabled={!canPrev} onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</span>
        <button disabled={!canNext} onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-[10px] text-gray-500 font-semibold py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = toDateStr(new Date(year, month, day));
          const disabled = !isWithinWindow(dateStr);
          return (
            <button key={day} disabled={disabled} onClick={() => onSelect(dateStr)} className={`cal-cell ${disabled ? 'disabled' : ''} ${selected === dateStr ? 'selected' : ''}`}>
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-3"><Info size={12} /> Bookings open up to {MAX_ADVANCE_DAYS} days in advance</p>
    </div>
  );
};

const PoolBookingPanel = ({ ground, user, showMessage }) => {
  useLocalStyles();
  const [step, setStep] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedDate, setSelectedDate] = useState(addDays(0));
  const [availability, setAvailability] = useState(null);
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePoolId, setActivePoolId] = useState(null);

  const [bookingMode, setBookingMode] = useState('hourly'); // 'hourly' | 'membership'
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [chosenSlot, setChosenSlot] = useState(null);
  const [planTypeId, setPlanTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [partySize, setPartySize] = useState(1);
  // Free-type buffer for the swimmers field: typing must never be force-
  // clamped mid-keystroke (typing "5" after "1" used to become "15" → 7).
  // Committed + clamped on blur / Enter / stepper / pay.
  const [partyInput, setPartyInput] = useState('1');
  const maxParty = checkoutInfo?.maxPartySize || 7;
  const clampPartyUi = (n) => {
    const v = parseInt(n, 10);
    if (Number.isNaN(v)) return 1;
    return Math.min(Math.max(v, 1), maxParty);
  };
  const setParty = (n) => { const c = clampPartyUi(n); setPartySize(c); setPartyInput(String(c)); };
  const [includeRegistration, setIncludeRegistration] = useState(false);
  const [healthConfirmed, setHealthConfirmed] = useState(false);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const [certUrl, setCertUrl] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [availError, setAvailError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setAvailError('');
    // Fetch availability and checkout-info independently — a failure in one
    // must never blank out the other (a checkout-info 500 used to wipe the
    // whole wizard into a misleading "no bookable pool" message).
    try {
      const { data } = await API.get(`/pools/${ground._id}/availability`, { params: { date: selectedDate } });
      setAvailability(data);
      setActivePoolId((prev) => {
        const stillThere = data.pools?.some((p) => p.poolId === prev);
        return stillThere ? prev : (data.pools?.[0]?.poolId || null);
      });
    } catch (err) {
      setAvailError(err.response?.data?.message || 'Failed to load pool availability');
      showMessage?.(err.response?.data?.message || 'Failed to load pool availability', 'error');
    }
    if (!checkoutInfo) {
      try {
        const { data } = await API.get(`/pools/${ground._id}/checkout-info`);
        setCheckoutInfo(data);
        if (data?.medicalCertificateUrl && !certUrl) setCertUrl(data.medicalCertificateUrl);
      } catch (err) {
        setCheckoutError(err.response?.data?.message || 'Failed to load membership plans');
        showMessage?.(err.response?.data?.message || 'Failed to load membership plans', 'error');
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ground._id, selectedDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Split planTypes into hourly vs membership for the start-of-form toggle.
  // Membership = Monthly / Semester / Session Package (filtered by name).
  const hourlyPlanTypes = useMemo(() => {
    const all = checkoutInfo?.planTypes || [];
    return all.filter((pt) => {
      const n = (pt.name || '').toLowerCase();
      return !(n.includes('monthly') || n.includes('semester') || n.includes('session') || n.includes('package'));
    });
  }, [checkoutInfo]);
  const membershipPlanTypes = useMemo(() => {
    const all = checkoutInfo?.planTypes || [];
    return all.filter((pt) => {
      const n = (pt.name || '').toLowerCase();
      return n.includes('monthly') || n.includes('semester') || n.includes('session') || n.includes('package');
    });
  }, [checkoutInfo]);

  // Auto-select hourly plan when in hourly mode (membership picks plan via category card)
  useEffect(() => {
    if (!checkoutInfo) return;
    if (bookingMode === 'hourly' && !planTypeId) {
      const target = hourlyPlanTypes[0] || checkoutInfo.planTypes?.[0];
      if (target) setPlanTypeId(target._id);
    }
    if (bookingMode === 'membership') {
      // clear stale hourly auto-select when switching to membership
      const isHourlySelected = hourlyPlanTypes.some((p) => p._id === planTypeId);
      if (isHourlySelected) {
        setPlanTypeId('');
        setCategoryId('');
      }
    }
  }, [checkoutInfo, bookingMode, hourlyPlanTypes, planTypeId]);

  const activePool = availability?.pools?.find((p) => p.poolId === activePoolId) || availability?.pools?.[0];
  const selectedPlanType = checkoutInfo?.planTypes?.find((p) => p._id === planTypeId) || hourlyPlanTypes[0] || null;
  const selectedCategory = selectedPlanType?.categories?.find((c) => c._id === categoryId);
  const estimatedTotal = selectedCategory ? selectedCategory.price * partySize + (bookingMode === 'membership' && includeRegistration ? (checkoutInfo?.registrationFee || 0) : 0) : 0;
  const quickDates = useMemo(() => [addDays(0), addDays(1), addDays(2)], []);

  const jumpTo = (n) => { if (n < step) setStep(n); };

  const handleSlotClick = (slot) => {
    if (slot.bookedCount >= slot.capacity || slot.expired) return;
    if (slot.category === 'girls_only') {
      setConfirmSlot(slot);
    } else {
      setChosenSlot(slot);
      setParty(1);
      setIncludeRegistration(false);
      setHealthConfirmed(false);
      setRulesConfirmed(false);
      if (bookingMode === 'hourly') {
        setCategoryId('');
        setStep(2);
      } else {
        // membership: slot is step 3 → next is confirm (step 4)
        setStep(4);
      }
    }
  };

  const handleMembershipPlanPick = (pt) => {
    setPlanTypeId(pt._id);
    setCategoryId('');
    setStep(2);
  };
  const handleMembershipCategoryPick = (ptId, catId) => {
    setPlanTypeId(ptId);
    setCategoryId(catId);
    setStep(3);
  };

  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertUploading(true);
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      const { data } = await API.post('/upload/certificate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCertUrl(data.fileUrl);
      showMessage?.('Certificate uploaded');
    } catch {
      showMessage?.('Certificate upload failed', 'error');
    } finally {
      setCertUploading(false);
    }
  };

  const handlePay = async () => {
    if (!chosenSlot || !planTypeId || !categoryId || !healthConfirmed || !rulesConfirmed) return;
    // Commit any half-typed swimmer count first so Pay always uses the final value
    const finalParty = clampPartyUi(partyInput);
    setParty(finalParty);
    setPaying(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) { showMessage?.('Razorpay failed to load. Check your connection.', 'error'); setPaying(false); return; }

    const bookingBody = {
      poolId: activePool.poolId, date: selectedDate, startTime: chosenSlot.startTime,
      planTypeId, categoryId, partySize: finalParty, includeRegistration: bookingMode === 'membership' ? includeRegistration : false, healthConfirmed,
    };

    try {
      const { data } = await API.post(`/pools/${ground._id}/order`, bookingBody);
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `${ground.name} — ${activePool.name} — ${selectedDate} ${fmtTime(chosenSlot.startTime)}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const { data: result } = await API.post(`/pools/${ground._id}/verify`, {
              ...bookingBody,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              medicalCertificateUrl: certUrl,
            });
            setTicket(result.booking);
            showMessage?.('Payment successful — booked');
            fetchAll();
          } catch (err) {
            showMessage?.(err.response?.data?.message || 'Payment verification failed', 'error');
          } finally {
            setPaying(false);
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#22c55e' },
        modal: { ondismiss: () => { showMessage?.('Payment cancelled', 'error'); setPaying(false); } },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Could not start payment', 'error');
      setPaying(false);
    }
  };

  // DEV-ONLY dummy booking: same payload straight to dummy-verify, no
  // Razorpay. The button below only renders when import.meta.env.DEV, so
  // production builds can never show it.
  const handleDummyPay = async () => {
    if (!chosenSlot || !planTypeId || !categoryId || !healthConfirmed || !rulesConfirmed) return;
    const finalParty = clampPartyUi(partyInput);
    setParty(finalParty);
    setPaying(true);
    try {
      const { data } = await API.post(`/pools/${ground._id}/dummy-verify`, {
        poolId: activePool.poolId, date: selectedDate, startTime: chosenSlot.startTime,
        planTypeId, categoryId, partySize: finalParty, includeRegistration: bookingMode === 'membership' ? includeRegistration : false, healthConfirmed,
        medicalCertificateUrl: certUrl,
      });
      setTicket(data.booking);
      showMessage?.('Test booking confirmed 🧪 No payment taken');
      fetchAll();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Dummy booking failed (is the backend flag on?)', 'error');
    } finally {
      setPaying(false);
    }
  };

  const resetWizard = () => {
    setTicket(null);
    setQrPayload(null);
    setStep(1);
    setChosenSlot(null);
    setPlanTypeId('');
    setCategoryId('');
    setParty(1);
    setHealthConfirmed(false);
    setRulesConfirmed(false);
  };

  useEffect(() => {
    if (!ticket?._id) return;
    API.get('/pools/my/qrs').then(({ data }) => {
      const hit = data.find((r) => String(r._id) === String(ticket._id));
      if (hit?.qrPayload) setQrPayload(hit.qrPayload);
    }).catch(() => {});
  }, [ticket]);

  if (ticket) {
    return (
      <div className="pbp panel text-center py-8 px-6">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <Ticket className="text-green-500" size={26} />
        </div>
        <h3 className="font-bebas text-2xl tracking-wide mb-1">Booking Confirmed</h3>
        <p className="text-gray-500 text-sm mb-5">Your ticket has been emailed to you and is in your dashboard notifications.</p>
        <div className="flex flex-col items-center gap-4 mb-5">
          {qrPayload ? <PoolQr payload={qrPayload} ticketId={ticket.ticketId} /> : (
            <div className="inline-block bg-green-500/8 border border-dashed border-green-500/40 rounded-xl px-7 py-3">
              <p className="text-[10px] text-green-600 uppercase tracking-widest font-semibold">Ticket ID</p>
              <p className="text-xl font-bold tracking-widest">{ticket.ticketId}</p>
            </div>
          )}
        </div>
        <p className="text-gray-500 text-xs">{ticket.poolName} · {ticket.date} · {fmtTime(ticket.startTime)}–{fmtTime(ticket.endTime)} · {ticket.partySize} {ticket.partySize === 1 ? 'person' : 'people'}</p>
        <p className="text-[11px] text-gray-500 mt-2">One QR = one entry — screenshot sharing blocked after first scan</p>
        <button className="btn-secondary mt-6" onClick={resetWizard}>Book another slot</button>
      </div>
    );
  }

  if (availability?.notice && !availability.pools?.length) {
    return (
      <div className="pbp panel text-center py-14">
        <AlertTriangle className="mx-auto mb-3 text-gray-400" size={32} strokeWidth={1.5} />
        <p className="text-gray-500 text-sm">{availability.notice}</p>
      </div>
    );
  }

  return (
    <div className="pbp grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main wizard */}
      <div className="lg:col-span-2 panel p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Waves className="text-green-500" size={20} />
            <h3 className="font-bebas text-2xl text-gray-900 dark:text-white tracking-wide">Book a Pool Session</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowRules(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15">
              <ShieldAlert size={12} /> Pool Rules
            </button>
            <button onClick={() => setShowGuide(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-500/25 bg-green-500/8 text-green-600 hover:bg-green-500/15">
              <BookOpen size={12} /> Guide
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-3">Choose how you want to swim — Hourly or Membership. <button onClick={() => setShowGuide(true)} className="underline decoration-dotted underline-offset-2 hover:text-green-600">New here? See the full guide →</button> <span className="mx-1">·</span> <button onClick={() => setShowRules(true)} className="underline decoration-dotted underline-offset-2 hover:text-amber-600">View pool rules</button></p>
        <PoolBookingGuide
          open={showGuide}
          onClose={() => setShowGuide(false)}
          hourlyLabel={hourlyPlanTypes[0] ? `${priceRangeLabel(hourlyPlanTypes[0])} ${hourlyPlanTypes[0].billingLabel}` : '₹100–150 per session'}
          membershipLabel="₹1,000–7,000 per plan"
        />
        <PoolRules open={showRules} onClose={() => setShowRules(false)} />
        {/* Separate booking flows — Hourly vs Membership — differentiated at the very start */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => { setBookingMode('hourly'); setStep(1); setPlanTypeId(hourlyPlanTypes[0]?._id || ''); setCategoryId(''); setChosenSlot(null); setIncludeRegistration(false); setHealthConfirmed(false); setRulesConfirmed(false); }}
            className={`text-left rounded-2xl border-2 p-4 transition-all ${bookingMode === 'hourly' ? 'border-green-500 bg-green-500/10' : 'border-black/10 dark:border-white/10 hover:border-green-500/30'}`}
          >
            <p className="text-sm font-bold flex items-center gap-2"><Clock size={14} className={bookingMode === 'hourly' ? 'text-green-500' : 'text-gray-400'} /> Hourly</p>
            <p className="text-xs text-gray-500 mt-1">Pay per session</p>
            <p className="text-sm font-bold text-green-600 mt-1">{hourlyPlanTypes[0] ? priceRangeLabel(hourlyPlanTypes[0]) : '₹100–150'} <span className="text-[11px] font-normal text-gray-500">{hourlyPlanTypes[0]?.billingLabel || 'per session'}</span></p>
            <p className="text-[11px] text-gray-500 mt-1">Pick any slot, pay per visit — best for occasional swimmers.</p>
          </button>
          <button
            type="button"
            onClick={() => { setBookingMode('membership'); setStep(1); setPlanTypeId(''); setCategoryId(''); setChosenSlot(null); setIncludeRegistration(false); setHealthConfirmed(false); setRulesConfirmed(false); }}
            className={`text-left rounded-2xl border-2 p-4 transition-all ${bookingMode === 'membership' ? 'border-green-500 bg-green-500/10' : 'border-black/10 dark:border-white/10 hover:border-green-500/30'}`}
          >
            <p className="text-sm font-bold flex items-center gap-2"><Waves size={14} className={bookingMode === 'membership' ? 'text-green-500' : 'text-gray-400'} /> Membership</p>
            <p className="text-xs text-gray-500 mt-1">Monthly · Semester · Session Package</p>
            <p className="text-sm font-bold text-green-600 mt-1">₹1,000–7,000 <span className="text-[11px] font-normal text-gray-500">per plan</span></p>
            <p className="text-[11px] text-gray-500 mt-1">One plan covers your period — best for regulars. Opens separate membership flow.</p>
          </button>
        </div>

        <Stepper step={step} steps={bookingMode === 'hourly' ? STEPS_HOURLY : STEPS_MEMBERSHIP} onJump={jumpTo} />

        {/* ── HOURLY FLOW: Date & Slot → Category → Confirm ── */}
        {bookingMode === 'hourly' && step === 1 && (
          <div>
            {availability?.pools?.length > 1 && (
              <div className="mb-4">
                <label className="label">Pool</label>
                <div className="flex gap-2">
                  {availability.pools.map((p) => (
                    <button key={p.poolId} onClick={() => setActivePoolId(p.poolId)} className={`tab-btn ${activePoolId === p.poolId ? 'tab-active' : 'tab-inactive'}`}>{p.name}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="label">Date</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {quickDates.map((d) => (
                <button key={d} onClick={() => { setSelectedDate(d); setShowCalendar(false); setChosenSlot(null); setCategoryId(''); }} className={`tab-btn text-center ${selectedDate === d && !showCalendar ? 'tab-active' : 'tab-inactive'}`}>
                  {dateLabel(d)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCalendar((v) => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-500 mb-3">
              <CalendarDays size={14} /> {showCalendar ? 'Hide calendar' : 'Or pick a custom date'}
            </button>
            {showCalendar && <MiniCalendar selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setChosenSlot(null); setCategoryId(''); setShowCalendar(false); }} />}
            {!loading && availError && !activePool && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-3.5 py-3 mt-1 mb-4">
                <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">Couldn't load pool availability: {availError} — please refresh and try again.</p>
              </div>
            )}
            {!loading && !availError && !activePool && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3 mt-1 mb-4">
                <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">This venue doesn't have a bookable pool set up yet — nothing here is active.</p>
              </div>
            )}
            <div className="pt-3 mt-1 border-t border-black/5 dark:border-white/5">
              <p className="section-title"><Clock size={13} /> Available slots — {dateLabel(selectedDate)} {activePool ? `· ${activePool.name}` : ''}</p>
              {loading && <p className="text-gray-500 text-sm py-6 text-center">Loading slots…</p>}
              {!loading && activePool && activePool.slots?.length === 0 && <p className="text-gray-500 text-sm italic py-6 text-center">No sessions scheduled for {dateLabel(selectedDate).toLowerCase()}.</p>}
              {!loading && activePool && activePool.slots?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePool.slots.map((slot) => {
                    const full = slot.bookedCount >= slot.capacity;
                    const stateClass = slot.expired ? 'expired' : full ? 'full' : chosenSlot?.startTime === slot.startTime ? 'chosen' : '';
                    return (
                      <div key={slot.startTime} onClick={() => handleSlotClick(slot)} className={`slot-card ${slot.category === 'girls_only' ? 'girls' : 'general'} ${stateClass}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${slot.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>{slot.category === 'girls_only' ? 'Girls Only' : 'General'}</span>
                        </div>
                        {slot.expired ? <span className="badge-expired text-[10px] px-2 py-0.5 rounded-full font-medium inline-block">Expired</span> : <p className="text-xs text-gray-500">{full ? 'Fully booked' : `${slot.capacity - slot.bookedCount} spots left of ${slot.capacity}`}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              {!loading && activePool?.slots?.length > 0 && !chosenSlot && <p className="text-[11px] text-gray-500 text-center mt-3">Tap a slot to choose your category →</p>}
            </div>
          </div>
        )}
        {bookingMode === 'hourly' && step === 2 && !chosenSlot && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">Pick a date & slot in Step 1 first.</p>
          </div>
        )}
        {bookingMode === 'hourly' && step === 2 && chosenSlot && !selectedPlanType && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/8 px-3.5 py-3">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">Couldn't load membership plans{checkoutError ? `: ${checkoutError}` : ''} — please go back and try again, or contact the venue.</p>
          </div>
        )}
        {bookingMode === 'hourly' && step === 2 && chosenSlot && selectedPlanType && (
          <div>
            <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><MapPin size={13} /> {activePool?.name} · {dateLabel(selectedDate)} · {fmtTime(chosenSlot.startTime)}–{fmtTime(chosenSlot.endTime)}</p>
            <p className="text-xs text-gray-500 mb-4">{selectedPlanType.name} · {selectedPlanType.billingLabel} — pick who you are</p>
            <label className="label">Select your category — Hourly</label>
            <div className="flex flex-col gap-2 mb-2">
              {selectedPlanType.categories.map((cat) => (
                <label key={cat._id} className={`plan-card flex items-center gap-3 ${categoryId === cat._id ? 'chosen' : ''}`} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="category" checked={categoryId === cat._id} onChange={() => setCategoryId(cat._id)} />
                  <span className="text-sm font-semibold">{cat.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">₹{cat.price} {selectedPlanType.billingLabel}</span>
                </label>
              ))}
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Continue" nextDisabled={!categoryId} />
          </div>
        )}

        {/* ── MEMBERSHIP FLOW: Plan → Category → Date & Slot → Confirm ── */}
        {bookingMode === 'membership' && step === 1 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Membership flow — choose your plan first, then category, then slot. Separate from Hourly for a seamless experience.</p>
            {!membershipPlanTypes.length ? (
              <p className="text-gray-500 text-xs italic">No membership plans set up yet — contact the venue.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {membershipPlanTypes.map((pt) => (
                  <button key={pt._id} onClick={() => handleMembershipPlanPick(pt)} className={`text-left plan-card ${planTypeId === pt._id ? 'chosen' : ''}`}>
                    <p className="text-sm font-bold">{pt.name}</p>
                    <p className="text-xs text-gray-500">{pt.billingLabel}</p>
                    <p className="text-lg font-bold text-green-600 mt-1">{priceRangeLabel(pt)}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{pt.categories.length} categor{pt.categories.length === 1 ? 'y' : 'ies'}</p>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-3">Monthly ₹1,000–2,000 · Semester ₹4,000–5,000 · Session Package ₹6,000–7,000 — pick one to see its categories.</p>
          </div>
        )}
        {bookingMode === 'membership' && step === 2 && !planTypeId && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">Pick a membership plan in Step 1 first.</p>
          </div>
        )}
        {bookingMode === 'membership' && step === 2 && planTypeId && (
          <div>
            <p className="text-sm text-gray-500 mb-4">{selectedPlanType?.name} · {selectedPlanType?.billingLabel} — pick your category</p>
            <label className="label">Select your category</label>
            <div className="flex flex-col gap-2 mb-2">
              {(selectedPlanType?.categories || []).map((cat) => (
                <label key={cat._id} className={`plan-card flex items-center gap-3 ${categoryId === cat._id ? 'chosen' : ''}`} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="memCategory" checked={categoryId === cat._id} onChange={() => setCategoryId(cat._id)} />
                  <span className="text-sm font-semibold">{cat.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">₹{cat.price} {selectedPlanType.billingLabel}</span>
                </label>
              ))}
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Continue to Slot" nextDisabled={!categoryId} />
          </div>
        )}
        {bookingMode === 'membership' && step === 3 && (
          <div>
            {availability?.pools?.length > 1 && (
              <div className="mb-4">
                <label className="label">Pool</label>
                <div className="flex gap-2">
                  {availability.pools.map((p) => (
                    <button key={p.poolId} onClick={() => setActivePoolId(p.poolId)} className={`tab-btn ${activePoolId === p.poolId ? 'tab-active' : 'tab-inactive'}`}>{p.name}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="label">Date</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {quickDates.map((d) => (
                <button key={d} onClick={() => { setSelectedDate(d); setShowCalendar(false); setChosenSlot(null); }} className={`tab-btn text-center ${selectedDate === d && !showCalendar ? 'tab-active' : 'tab-inactive'}`}>
                  {dateLabel(d)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCalendar((v) => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-500 mb-3">
              <CalendarDays size={14} /> {showCalendar ? 'Hide calendar' : 'Or pick a custom date'}
            </button>
            {showCalendar && <MiniCalendar selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setChosenSlot(null); setShowCalendar(false); }} />}
            <div className="pt-3 mt-1 border-t border-black/5 dark:border-white/5">
              <p className="section-title"><Clock size={13} /> Available slots — {dateLabel(selectedDate)} {activePool ? `· ${activePool.name}` : ''} <span className="text-[11px] font-normal normal-case tracking-normal text-gray-500">· Membership: {selectedPlanType?.name || '—'} {selectedCategory ? `· ${selectedCategory.name}` : ''}</span></p>
              {loading && <p className="text-gray-500 text-sm py-6 text-center">Loading slots…</p>}
              {!loading && activePool && activePool.slots?.length === 0 && <p className="text-gray-500 text-sm italic py-6 text-center">No sessions scheduled for {dateLabel(selectedDate).toLowerCase()}.</p>}
              {!loading && activePool && activePool.slots?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePool.slots.map((slot) => {
                    const full = slot.bookedCount >= slot.capacity;
                    const stateClass = slot.expired ? 'expired' : full ? 'full' : chosenSlot?.startTime === slot.startTime ? 'chosen' : '';
                    return (
                      <div key={slot.startTime} onClick={() => handleSlotClick(slot)} className={`slot-card ${slot.category === 'girls_only' ? 'girls' : 'general'} ${stateClass}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm flex items-center gap-1.5"><Clock size={13} className="text-gray-400" />{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${slot.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>{slot.category === 'girls_only' ? 'Girls Only' : 'General'}</span>
                        </div>
                        {slot.expired ? <span className="badge-expired text-[10px] px-2 py-0.5 rounded-full font-medium inline-block">Expired</span> : <p className="text-xs text-gray-500">{full ? 'Fully booked' : `${slot.capacity - slot.bookedCount} spots left of ${slot.capacity}`}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              {!loading && activePool?.slots?.length > 0 && !chosenSlot && <p className="text-[11px] text-gray-500 text-center mt-3">Tap a slot to continue to confirm →</p>}
            </div>
            <StepNav onBack={() => setStep(2)} onNext={() => {}} nextLabel="Pick a Slot" nextDisabled />
          </div>
        )}

        {/* Confirm — Hourly step 3, Membership step 4 */}
        {((bookingMode === 'hourly' && step === 3) || (bookingMode === 'membership' && step === 4)) && chosenSlot && selectedCategory && (
          <div>
            <div className="mb-5">
              <label className="label">Number of swimmers (max {checkoutInfo.maxPartySize})</label>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="One fewer swimmer" className="stepper-btn" disabled={partySize <= 1} onClick={() => setParty(partySize - 1)}>−</button>
                <input
                  type="number" inputMode="numeric" min="1" max={checkoutInfo.maxPartySize}
                  className="input-field text-center font-bold" style={{ maxWidth: 96 }}
                  value={partyInput}
                  onChange={(e) => setPartyInput(e.target.value)}
                  onBlur={(e) => setParty(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  aria-label="Number of swimmers"
                />
                <button type="button" aria-label="One more swimmer" className="stepper-btn" disabled={partySize >= checkoutInfo.maxPartySize} onClick={() => setParty(partySize + 1)}>+</button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">Each swimmer must have their own valid booking.</p>
            </div>

            {bookingMode === 'membership' && checkoutInfo.registrationFee > 0 && !checkoutInfo.alreadyRegistered && (
              <div className="mb-5">
                <p className="section-title">Registration</p>
                <div className="flex flex-col gap-2">
                  <label className="plan-card flex items-center gap-3" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="reg" checked={!includeRegistration} onChange={() => setIncludeRegistration(false)} />
                    <span className="text-sm">I'm already registered</span>
                  </label>
                  <label className="plan-card flex items-center gap-3" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="reg" checked={includeRegistration} onChange={() => setIncludeRegistration(true)} />
                    <span className="text-sm">I'm a new member — +₹{checkoutInfo.registrationFee}</span>
                  </label>
                </div>
              </div>
            )}

            <div className="mb-5">
              <p className="section-title"><HeartPulse size={13} /> Health &amp; Safety</p>
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400 mb-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={healthConfirmed} onChange={(e) => setHealthConfirmed(e.target.checked)} />
                I confirm that I am fit to swim and do not have an open wound, communicable illness, or other restricted condition.
              </label>
              <label className="label">Medical certificate (optional)</label>
              {certUrl ? (
                <div className="flex items-center gap-3 text-xs">
                  <a href={certUrl} target="_blank" rel="noreferrer" className="text-green-600 underline flex items-center gap-1"><FileText size={13} /> Certificate on file — view</a>
                  <label className="btn-secondary text-xs cursor-pointer">{certUploading ? 'Uploading…' : 'Replace'}<input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} disabled={certUploading} /></label>
                </div>
              ) : (
                <label className="btn-secondary text-xs cursor-pointer inline-flex"><Upload size={13} /> {certUploading ? 'Uploading…' : 'Upload certificate'}<input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} disabled={certUploading} /></label>
              )}
            </div>

            <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="section-title"><ShieldAlert size={13} /> Pool Rules</p>
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={rulesConfirmed} onChange={(e) => setRulesConfirmed(e.target.checked)} />
                <span>I have read and agree to the <button type="button" onClick={() => setShowRules(true)} className="underline decoration-dotted underline-offset-2 text-amber-700 dark:text-amber-300 hover:text-amber-600">Pool Rules & Regulations</button> — including ID card, attire/cap, shower, red cap for beginners, no valuables/food/pets/diving, and management/government authority.</span>
              </label>
              <button type="button" onClick={() => setShowRules(true)} className="text-[11px] text-amber-700 dark:text-amber-300 underline mt-2 inline-flex items-center gap-1"><Info size={11} /> View full rules</button>
            </div>

            <div className="rounded-xl border border-black/8 dark:border-white/8 p-4 mb-2">
              <div className="summary-row"><span className="text-gray-500 text-sm">Pool</span><span className="font-semibold text-sm">{activePool?.name}</span></div>
              <div className="summary-row"><span className="text-gray-500 text-sm">Date & time</span><span className="font-semibold text-sm">{dateLabel(selectedDate)}, {fmtTime(chosenSlot.startTime)}–{fmtTime(chosenSlot.endTime)}</span></div>
              <div className="summary-row"><span className="text-gray-500 text-sm">Category</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${chosenSlot.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>{chosenSlot.category === 'girls_only' ? 'Girls Only' : 'General'}</span></div>
              <div className="summary-row"><span className="text-gray-500 text-sm">Plan</span><span className="font-semibold text-sm">{selectedPlanType.name}</span></div>
              <div className="summary-row"><span className="text-gray-500 text-sm">Membership</span><span className="font-semibold text-sm">{selectedCategory.name}</span></div>
              <div className="summary-row"><span className="text-gray-500 text-sm">Swimmers</span><span className="font-semibold text-sm">{partySize}</span></div>
              {includeRegistration && <div className="summary-row"><span className="text-gray-500 text-sm">Registration</span><span className="font-semibold text-sm">₹{checkoutInfo.registrationFee}</span></div>}
              {certUrl && <div className="summary-row"><span className="text-gray-500 text-sm">Certificate</span><span className="font-semibold text-sm text-green-600">Attached</span></div>}
            </div>

            <StepNav
              onBack={() => setStep(bookingMode === 'hourly' ? 2 : 3)}
              onNext={handlePay}
              nextLabel={paying ? 'Processing…' : `Pay ₹${estimatedTotal}`}
              nextDisabled={paying || !healthConfirmed || !rulesConfirmed}
              nextIcon={CreditCard}
            />
            {(!healthConfirmed || !rulesConfirmed) && <p className="text-[11px] text-amber-500 text-right mt-2">{!healthConfirmed && !rulesConfirmed ? 'Confirm health & agree to pool rules to continue.' : !healthConfirmed ? 'Confirm the health & safety declaration above to continue.' : 'Please agree to pool rules to continue.'}</p>}
            {import.meta.env.DEV && (
              <button
                onClick={handleDummyPay}
                disabled={paying || !healthConfirmed || !rulesConfirmed}
                className="btn-secondary w-full justify-center mt-3"
                title="Local testing only — no money moves. Never shown in production builds."
              >
                🧪 {paying ? 'Booking…' : `Test booking (no payment) · ₹${estimatedTotal}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky summary sidebar */}
      <div className="lg:col-span-1">
        <div className="panel p-5 lg:sticky lg:top-20">
          <h4 className="font-bebas text-lg tracking-wide mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Your Booking</h4>
          <div className="flex flex-col">
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Venue</span><span className="font-semibold text-sm text-right">{ground.name}</span></div>
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Pool</span><span className="font-semibold text-sm text-right">{activePool?.name || '—'}</span></div>
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Date</span><span className="font-semibold text-sm text-right">{dateLabel(selectedDate)}</span></div>
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Time slot</span><span className="font-semibold text-sm text-right">{chosenSlot ? `${fmtTime(chosenSlot.startTime)} – ${fmtTime(chosenSlot.endTime)}` : 'Not selected'}</span></div>
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Plan</span><span className="font-semibold text-sm text-right">{selectedPlanType ? selectedPlanType.name : 'Not selected'}</span></div>
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Membership</span><span className="font-semibold text-sm text-right">{selectedCategory ? selectedCategory.name : 'Not selected'}</span></div>
            {selectedCategory && <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide">Price</span><span className="font-semibold text-sm text-right">₹{selectedCategory.price} {selectedPlanType.billingLabel}</span></div>}
            <div className="summary-row"><span className="text-gray-500 text-xs uppercase tracking-wide flex items-center gap-1"><Users size={12} /> Swimmers</span><span className="font-semibold text-sm text-right">{chosenSlot ? partySize : '—'}</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total amount</p>
            <p className="text-2xl font-bold text-green-600">₹{estimatedTotal}</p>
            <p className="text-[11px] text-gray-500 mt-1">Full payment collected now — no partial advance for pool bookings.</p>
          </div>
        </div>
      </div>

      {/* Girls-only confirmation popup */}
      {confirmSlot && (
        <div className="pbp modal-backdrop" onClick={() => setConfirmSlot(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-pink-400" size={20} />
              <h4 className="font-bebas text-xl tracking-wide text-pink-400">Girls Only Session</h4>
            </div>
            <p className="text-sm text-gray-300 mb-1">This session ({fmtTime(confirmSlot.startTime)} – {fmtTime(confirmSlot.endTime)}) is reserved for female swimmers only.</p>
            {/* <p className="text-sm text-pink-300 mb-5">If you book this and are found not to be female at the venue, <strong>no refund will be given.</strong></p> */}
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setConfirmSlot(null)}><X size={14} /> Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => { setChosenSlot(confirmSlot); setParty(1); setIncludeRegistration(false); setHealthConfirmed(false); setRulesConfirmed(false); setConfirmSlot(null); setStep(bookingMode === 'hourly' ? 2 : 4); if (bookingMode === 'hourly') setCategoryId(''); }}>I understand, continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolBookingPanel;
