import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';

// XL Arena booking — mirrors https://xlarena.com/booking's 5-step flow:
//   1. Arena (turf location + turf type) → 2. Game → 3. Date →
//   4. Time Slots (multi-select, must be continuous) → 5. Confirm
//      (Full amount now vs ₹500 Token now, rest at the arena).
//
// Arena physics (NOT pool physics): exclusive turfs (capacity 1),
// 60-min hourly slots, several back-to-back slots bookable in one order.
// Hourly pricing comes from the venue's own sport config (₹/hr);
// the order/verify round-trips re-derive everything server-side.

const TOKEN_AMOUNT = 500;
const WINDOW_DAYS = 30;

const SPORT_EMOJI = { 'box cricket': '🏏', 'box football': '⚽', cricket: '🏏', football: '⚽' };
const sportEmoji = (s) => SPORT_EMOJI[s?.toLowerCase?.()] || '🏆';

const INCLUDED = ['Playing Equipment Available', 'Free Wi-Fi', 'Free Parking', 'Drinking Water', 'Ample Garden Space', 'Kids Playing Area'];

const XL_RULES = [
  'Turf shoes only — no metal spikes or bare feet on the turf.',
  'Report 15 minutes early — slots start sharp, late arrival eats into play time.',
  'No outside food, smoking, or alcohol inside the arena.',
  'Damage to turf, nets, or equipment will be charged.',
];

const isoOf = (d) => d.toISOString().split('T')[0];
const todayISO = () => isoOf(new Date());
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
const dayLabel = (ds) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ds + 'T00:00:00').getDay()];
const fmtDate = (ds) => new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const slotHours = (s) => {
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  return Math.max((eh * 60 + em - (sh * 60 + sm)) / 60, 0) || 1;
};

const STEPS = ['Arena', 'Game', 'Date', 'Time Slots', 'Confirm'];

const XlArenaBookingPanel = ({ ground, user, showMessage, onBooked }) => {
  const [step, setStep] = useState(1);
  // Step 1
  const [locations, setLocations] = useState(ground ? [ground] : []);
  const [locationId, setLocationId] = useState(ground?._id || null);
  const [locDoc, setLocDoc] = useState(ground || null);
  const [turfId, setTurfId] = useState(null);
  // Step 2
  const [gameId, setGameId] = useState(null);
  // Step 3
  const [date, setDate] = useState(null);
  // Step 4
  const [slotIds, setSlotIds] = useState([]);
  // Step 5
  const [payMode, setPayMode] = useState('token');
  const [payLoading, setPayLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  // Membership strip
  const [xlInfo, setXlInfo] = useState(null);
  const [memLoading, setMemLoading] = useState(false);

  // All XL locations (scales when new arenas like Cabbana get added).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await API.get('/grounds/all');
        const xls = (Array.isArray(data) ? data : data?.grounds || []).filter((g) => g?.name?.toLowerCase().includes('xl arena'));
        if (live && xls.length) {
          setLocations(xls);
          if (!locationId) setLocationId(xls[0]._id);
        }
      } catch { /* fallback: the ground we're already on */ }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full doc for the chosen location (slots included).
  useEffect(() => {
    if (!locationId) return;
    if (String(locDoc?._id) === String(locationId) && locDoc?.slots) return;
    (async () => {
      try {
        const { data } = await API.get(`/grounds/${locationId}`);
        setLocDoc(data);
      } catch { /* keep previous */ }
    })();
    setTurfId(null); setGameId(null); setDate(null); setSlotIds([]); setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const games = useMemo(() => (locDoc?.sports || []).filter((s) => s.isActive), [locDoc]);
  const game = useMemo(() => games.find((s) => String(s._id) === String(gameId)) || null, [games, gameId]);
  const turfs = useMemo(() => {
    const all = [];
    (locDoc?.sports || []).forEach((s) => (s.courts || []).filter((c) => c.isActive).forEach((c) => all.push({ ...c, sportId: s._id, sportName: s.name })));
    return game ? all.filter((t) => String(t.sportId) === String(game._id)) : all;
  }, [locDoc, game]);
  const turf = useMemo(() => turfs.find((t) => String(t._id) === String(turfId)) || null, [turfs, turfId]);

  // Auto-narrow turf when a game is picked (turfs are game-specific here).
  useEffect(() => {
    if (game && turfs.length && !turfs.find((t) => String(t._id) === String(turfId))) {
      setTurfId(turfs[0]._id);
      setDate(null); setSlotIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const maxISO = addDays(WINDOW_DAYS - 1);
  const openSlots = useMemo(() => {
    if (!locDoc?.slots) return [];
    const today = todayISO();
    return locDoc.slots.filter((s) => {
      if (s.isBooked || (s.bookedCount || 0) >= s.capacity) return false;
      if (s.date < today || s.date > maxISO) return false;
      if (game && String(s.sportId) !== String(game._id)) return false;
      if (turf && s.courtId && String(s.courtId) !== String(turf._id)) return false;
      return true;
    });
  }, [locDoc, game, turf, maxISO]);

  const openDates = useMemo(() => [...new Set(openSlots.map((s) => s.date))].sort(), [openSlots]);
  const daySlots = useMemo(() => {
    const list = openSlots.filter((s) => s.date === date);
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return list;
  }, [openSlots, date]);

  const selectedSlots = useMemo(() => {
    const map = new Map(daySlots.map((s) => [String(s._id), s]));
    return slotIds.map((id) => map.get(String(id))).filter(Boolean);
  }, [slotIds, daySlots]);

  const pricePerSlot = game?.pricePerHour || locDoc?.sports?.[0]?.pricePerHour || 0;
  const total = selectedSlots.reduce((sum, s) => sum + Math.round(pricePerSlot * slotHours(s)), 0);
  const payable = payMode === 'full' ? total : Math.min(TOKEN_AMOUNT, total);

  const locOpenCount = (l) => (l?.slots || []).filter((s) => !s.isBooked && (s.bookedCount || 0) < s.capacity && s.date >= todayISO()).length;
  const turfCount = (l) => (l?.sports || []).reduce((n, s) => n + (s.courts || []).filter((c) => c.isActive).length, 0) || (l?.sports?.length || 0);

  // ── Membership (kept from Jaideep's Single Standard ₹990 ask) ──
  useEffect(() => {
    if (!locDoc?._id) return;
    API.get(`/xl/${locDoc._id}/info`).then(({ data }) => setXlInfo(data)).catch(() => setXlInfo(null));
  }, [locDoc?._id]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const sc = document.createElement('script');
      sc.id = 'razorpay-script';
      sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
      sc.onload = () => resolve(true);
      sc.onerror = () => resolve(false);
      document.body.appendChild(sc);
    });

  const handleMembership = async () => {
    if (user?.role !== 'player') return showMessage?.('Only players can buy membership', 'error');
    setMemLoading(true);
    try {
      if (!(await loadRazorpay())) return showMessage?.('Razorpay failed to load', 'error');
      const plan = xlInfo?.plans?.[0] || { name: 'Standard', price: 990 };
      const { data } = await API.post(`/xl/${locDoc._id}/membership/order`, { planName: plan.name });
      new window.Razorpay({
        key: data.keyId, amount: data.amount * 100, currency: data.currency,
        name: 'PLAYNSPORTS', description: `XL Membership ${plan.name} — ₹${plan.price}/month`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            await API.post(`/xl/${locDoc._id}/membership/verify`, {
              razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature, planName: plan.name,
            });
            showMessage?.('Membership activated — welcome to XL ✅');
            const { data: info } = await API.get(`/xl/${locDoc._id}/info`);
            setXlInfo(info);
          } catch { showMessage?.('Membership verification failed ❌', 'error'); }
          finally { setMemLoading(false); }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#fbbf24' },
        modal: { ondismiss: () => setMemLoading(false) },
      }).open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Membership order failed', 'error');
      setMemLoading(false);
    }
  };

  // ── Step guards ──
  const continuous = (list) => {
    const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) if (sorted[i].startTime !== sorted[i - 1].endTime) return false;
    return true;
  };
  const canNext = () => {
    if (step === 1) return locationId && turfId;
    if (step === 2) return !!gameId;
    if (step === 3) return !!date;
    if (step === 4) return selectedSlots.length >= 1 && continuous(selectedSlots);
    return true;
  };
  const nextHint = () => {
    if (step === 1) return 'Please select a ground location.';
    if (step === 2) return 'Please select a sport.';
    if (step === 3) return 'Please select a booking date.';
    if (step === 4 && selectedSlots.length < 1) return 'Please select at least one time slot.';
    if (step === 4) return 'Please select continuous time slots.';
    return '';
  };

  const toggleSlot = (s) => {
    setSlotIds((prev) => (prev.map(String).includes(String(s._id)) ? prev.filter((id) => String(id) !== String(s._id)) : [...prev, s._id]));
  };

  // ── Confirm & Pay ──
  const handlePay = async () => {
    if (!canNext() && step === 5) return;
    if (selectedSlots.length < 1) return showMessage?.('Please select at least one time slot.', 'error');
    if (!continuous(selectedSlots)) return showMessage?.('Please select continuous time slots.', 'error');
    if (user?.role !== 'player') return showMessage?.('Only players can book', 'error');
    setPayLoading(true);
    try {
      if (!(await loadRazorpay())) return showMessage?.('Razorpay failed to load. Check internet.', 'error');
      const gid = locDoc._id;
      const { data } = await API.post(`/xl/${gid}/arena-order`, { slotIds, payMode });
      new window.Razorpay({
        key: data.keyId, amount: data.amount * 100, currency: data.currency,
        name: 'PLAYNSPORTS', description: `XL Arena — ${game?.name} · ${selectedSlots.length} slot(s)`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            const { data: done } = await API.post(`/xl/${gid}/arena-verify`, {
              razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature, slotIds, payMode,
            });
            setSuccess(done);
            setSlotIds([]);
            onBooked?.();
          } catch (err) {
            showMessage?.(err.response?.data?.message || 'Payment verification failed ❌', 'error');
          } finally { setPayLoading(false); }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#4ade80' },
        modal: { ondismiss: () => setPayLoading(false) },
      }).open();
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to create order', 'error');
      setPayLoading(false);
    }
  };

  const stepState = (n) => (step > n ? 'done' : step === n ? 'active' : 'todo');

  const summary = (
    <div className="glass-card lg:sticky lg:top-4">
      <p className="font-bebas text-2xl tracking-wide mb-3">Your Booking</p>
      {[
        ['Ground', locDoc?.name || 'Not selected'],
        ['Turf Type', turf?.name || 'Not selected'],
        ['Game', game ? `${sportEmoji(game.name)} ${game.name}` : 'Not selected'],
        ['Date', date ? fmtDate(date) : 'Not selected'],
        ['Time Slots', selectedSlots.length ? selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ') : '—'],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 text-sm py-1 border-b border-black/5 dark:border-white/5 last:border-0">
          <span className="text-gray-500">{k}</span>
          <span className="font-semibold text-right capitalize">{v}</span>
        </div>
      ))}
      <div className="flex justify-between items-center mt-3">
        <span className="text-gray-500 text-sm">Total Amount</span>
        <span className="font-bebas text-3xl text-green-400">₹{total}</span>
      </div>
      <button
        onClick={() => (step < 5 ? (canNext() ? setStep(5) : showMessage?.(nextHint(), 'error')) : handlePay())}
        disabled={(step === 5 && payLoading) || total <= 0}
        className="w-full mt-3 bg-green-400 hover:bg-green-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors"
      >
        {step === 5 ? (payLoading ? 'Processing…' : `Pay Now ₹${payable}`) : `Pay Now ₹${payable}`}
      </button>
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Included</p>
        {INCLUDED.map((a) => <p key={a} className="text-xs text-gray-500">✓ {a}</p>)}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="glass-card text-center py-10">
        <span className="text-5xl">🎉</span>
        <h3 className="font-bebas text-3xl tracking-wide mt-3">{success.message}</h3>
        <p className="text-sm text-gray-500 mt-1">Booking Date · {success.bookings?.[0]?.date} · {success.bookings?.map((b) => `${b.startTime}–${b.endTime}`).join(', ')}</p>
        <p className="text-sm mt-2">Tickets: <span className="font-mono font-bold">{success.bookings?.map((b) => b.ticketId).join(', ')}</span></p>
        <p className="text-sm text-gray-500 mt-1">Paid ₹{success.paid}{success.remaining > 0 ? ` · pay ₹${success.remaining} at the arena` : ''}</p>
        <p className="text-sm text-gray-500 mt-3">Receive your confirmation, visit XL Arena, start your match — equipment available on site. 🏟️</p>
        <button onClick={() => { setSuccess(null); setStep(1); }} className="mt-5 bg-green-400 hover:bg-green-300 text-black text-sm font-bold px-6 py-2.5 rounded-xl">Book Another Slot</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Membership strip */}
      <div className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))', borderColor: 'rgba(251,191,36,0.25)' }}>
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold">XL Membership</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg mt-0.5">
            {xlInfo?.myMembership ? <>Member · {xlInfo.myMembership.planName} <span className="text-green-400 text-sm">until {new Date(xlInfo.myMembership.expiresAt).toLocaleDateString('en-IN')}</span></>
              : <>Single Standard · <span className="text-yellow-500">₹{xlInfo?.plans?.[0]?.price || 990}</span><span className="text-sm text-gray-500 font-normal">/month</span></>}
          </p>
        </div>
        <button onClick={handleMembership} disabled={memLoading} className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-sm font-bold px-5 py-2.5 rounded-xl">
          {memLoading ? '…' : xlInfo?.myMembership ? '🔁 Renew' : '⭐ Become a Member'}
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const st = stepState(n);
          return (
            <div key={label} className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${st === 'done' ? 'bg-green-400 text-black' : st === 'active' ? 'bg-green-400/20 text-green-400 border-2 border-green-400' : 'bg-black/5 dark:bg-white/5 text-gray-500 border border-black/10 dark:border-white/10'}`}>
                  {st === 'done' ? '✓' : n}
                </div>
                <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider text-center ${step >= n ? 'text-green-400' : 'text-gray-500'}`}>{label}</span>
              </div>
              {n < STEPS.length && <div className={`h-0.5 flex-1 rounded ${step > n ? 'bg-green-400' : 'bg-black/10 dark:bg-white/10'}`} />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* ── Step 1: Arena ── */}
          {step === 1 && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Turf Location</h3>
              <p className="text-sm text-gray-500 mb-4">Choose the turf you'd like to play at</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locations.map((l) => {
                  const sel = String(locationId) === String(l._id);
                  return (
                    <button key={l._id} onClick={() => setLocationId(l._id)}
                      className={`rounded-2xl p-4 text-left border transition-all ${sel ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10 hover:border-green-400/40'}`}>
                      <span className="text-3xl">🏟️</span>
                      <p className="font-bold mt-2 uppercase">{l.name}</p>
                      <p className="text-xs text-gray-500">📍 {l.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{turfCount(l)} Turf{(turfCount(l) || 0) !== 1 ? 's' : ''} Available</p>
                      <p className="text-xs text-green-400 font-bold mt-1">{locOpenCount(l) > 0 ? '● Slots Available' : '○ No open slots this week'}</p>
                    </button>
                  );
                })}
              </div>
              {turfs.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Select Turf Type</p>
                  <div className="flex flex-wrap gap-2">
                    {turfs.map((t) => (
                      <button key={t._id} onClick={() => setTurfId(t._id)}
                        className={`tab-btn ${String(turfId) === String(t._id) ? 'tab-active' : 'tab-inactive'}`}>
                        🏟️ {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Game ── */}
          {step === 2 && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Game</h3>
              <p className="text-sm text-gray-500 mb-4">Which game will you be playing?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {games.map((s) => {
                  const sel = String(gameId) === String(s._id);
                  const open = (locDoc?.slots || []).filter((x) => String(x.sportId) === String(s._id) && !x.isBooked && (x.bookedCount || 0) < x.capacity && x.date >= todayISO()).length;
                  return (
                    <button key={s._id} onClick={() => setGameId(s._id)}
                      className={`rounded-2xl p-5 text-left border transition-all ${sel ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10 hover:border-green-400/40'}`}>
                      <span className="text-4xl">{sportEmoji(s.name)}</span>
                      <p className="font-bold capitalize mt-2 text-lg">{s.name}</p>
                      <p className="mt-1"><span className="font-bebas text-2xl text-green-400">₹{s.pricePerHour}</span><span className="text-xs text-gray-500"> per slot</span></p>
                      <p className="text-xs text-gray-500">{open}+ Slots</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Date ── */}
          {step === 3 && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Booking Date</h3>
              <p className="text-sm text-gray-500 mb-4">Pick your preferred playing date</p>
              <div className="flex gap-2 mb-4">
                {[{ l: 'Today', d: addDays(0) }, { l: 'Tomorrow', d: addDays(1) }, { l: 'Day After', d: addDays(2) }].map((q) => {
                  const has = openDates.includes(q.d);
                  return (
                    <button key={q.l} disabled={!has} onClick={() => setDate(q.d)}
                      className={`flex-1 rounded-xl px-3 py-2.5 border text-sm font-bold transition-all disabled:opacity-35 ${date === q.d ? 'border-green-400/60 bg-green-400/10 text-green-400' : 'border-black/10 dark:border-white/10'}`}>
                      {q.l}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Or pick a custom date</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(i)).map((d) => {
                  const has = openDates.includes(d);
                  const sel = date === d;
                  return (
                    <button key={d} disabled={!has} onClick={() => setDate(d)}
                      className={`flex-shrink-0 rounded-xl px-3 py-2 border text-center transition-all disabled:opacity-30 ${sel ? 'border-green-400/60 bg-green-400/10' : 'border-black/10 dark:border-white/10'}`}>
                      <p className={`text-[11px] font-bold ${sel ? 'text-green-400' : 'text-gray-500'}`}>{dayLabel(d)}</p>
                      <p className="text-sm font-semibold">{new Date(d + 'T00:00:00').getDate()}</p>
                    </button>
                  );
                })}
              </div>
              {date && <p className="text-xs text-green-400 font-bold mt-3">Booking Date · {fmtDate(date)} Confirmed</p>}
              <p className="text-[11px] text-gray-500 mt-1">Bookings available up to 30 days in advance · greyed dates have no open slots</p>
            </div>
          )}

          {/* ── Step 4: Time Slots ── */}
          {step === 4 && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Select Time</h3>
              <p className="text-sm text-gray-500 mb-1">{date ? fmtDate(date) : ''}{turf ? ` · 🏟️ ${turf.name}` : ''}</p>
              <p className="text-xs text-gray-500 mb-4">Tap to select — book several back-to-back hours in one go</p>
              {daySlots.length === 0 ? (
                <p className="text-gray-500 text-sm">No open slots on this date — go back and pick another day.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {daySlots.map((s) => {
                    const sel = slotIds.map(String).includes(String(s._id));
                    return (
                      <button key={s._id} onClick={() => toggleSlot(s)}
                        className={`slot-card text-left ${sel ? 'slot-selected' : 'slot-available'}`}>
                        <p className="font-semibold text-sm">🕐 {s.startTime} — {s.endTime}</p>
                        <p className="text-green-400 text-xs font-bold mt-0.5">₹{pricePerSlot} · {sel ? '✓ Selected' : 'Tap to add'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlots.length > 0 && !continuous(selectedSlots) && (
                <p className="text-xs text-red-400 font-bold mt-3">Please select continuous time slots.</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                <span className="text-sm text-gray-500">Total Amount</span>
                <span className="font-bebas text-3xl text-green-400">₹{total}</span>
              </div>
            </div>
          )}

          {/* ── Step 5: Confirm ── */}
          {step === 5 && (
            <div className="glass-card animate-cardIn">
              <h3 className="font-bebas text-2xl tracking-wide">Booking Summary</h3>
              <p className="text-sm text-gray-500 mb-4">Review your details before confirming</p>
              {[
                ['Ground Location', `${locDoc?.name || ''} — ${locDoc?.address || ''}`],
                ['Turf Type', turf?.name || '—'],
                ['Sport', game ? `${game.name}` : '—'],
                ['Booking Date', date ? fmtDate(date) : '—'],
                ['Time Slots', selectedSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-sm py-1.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-gray-500 flex-shrink-0">{k}</span>
                  <span className="font-semibold text-right capitalize">{v}</span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm">Total Amount</span>
                <span className="font-bebas text-3xl text-green-400">₹{total}</span>
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-4 mb-2">Payment Option</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setPayMode('full')}
                  className={`rounded-xl p-3 text-left border text-sm ${payMode === 'full' ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10'}`}>
                  <p className="font-bold">Full Amount {payMode === 'full' && '✓'}</p>
                  <p className="text-xs text-gray-500">Pay complete booking amount now — nothing due at the arena</p>
                </button>
                <button onClick={() => setPayMode('token')}
                  className={`rounded-xl p-3 text-left border text-sm ${payMode === 'token' ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10'}`}>
                  <p className="font-bold">Token Amount — ₹{Math.min(TOKEN_AMOUNT, total)} now {payMode === 'token' && '✓'}</p>
                  <p className="text-xs text-gray-500">Pay ₹{Math.min(TOKEN_AMOUNT, total)} now to confirm slot{total - Math.min(TOKEN_AMOUNT, total) > 0 ? `, ₹${total - Math.min(TOKEN_AMOUNT, total)} at the arena` : ''}</p>
                </button>
              </div>
              <div className="flex justify-between items-center mt-3 text-sm font-bold">
                <span>Payable Now</span>
                <span className="font-bebas text-3xl text-green-400">₹{payable}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">🔒 Your booking is protected with secure encrypted payment</p>
              <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 p-3">
                {XL_RULES.map((r, i) => <p key={i} className="text-xs text-gray-500 mt-1">• {r}</p>)}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 border border-black/10 dark:border-white/10 rounded-xl py-3 text-sm font-bold hover:border-green-400/40">
                Back{step === 2 ? ' Select Turf' : step === 3 ? ' Select date' : step === 4 ? ' Select Time' : ''}
              </button>
            )}
            {step < 5 && (
              <button onClick={() => (canNext() ? setStep(step + 1) : showMessage?.(nextHint(), 'error'))}
                className="flex-1 bg-green-400 hover:bg-green-300 text-black font-bold py-3 rounded-xl">
                {step === 4 ? 'Next Step' : step === 1 ? 'Select Game' : step === 2 ? 'Select Date' : 'Select Time'}
              </button>
            )}
            {step === 5 && (
              <button onClick={handlePay} disabled={payLoading}
                className="flex-1 bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl">
                {payLoading ? 'Processing…' : 'Confirm & Pay'}
              </button>
            )}
          </div>
        </div>
        <div>{summary}</div>
      </div>
    </div>
  );
};

export default XlArenaBookingPanel;
