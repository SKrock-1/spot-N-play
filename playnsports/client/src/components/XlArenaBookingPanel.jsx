import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';

// XL Arena booking — arena-style UI on top of the standard GROUND slot
// engine (Ground.slots, 30% advance via /payments/grounds/:id/*).
//
// Why not PoolBookingPanel? A pool is shared water (capacity 20-50,
// full upfront payment, swimmers, health cert, QR gate). XL Arena is two
// exclusive turfs (capacity 1 per court, 60-min slots, 30% advance + 70%
// at the arena). Different venue physics → different flow:
//   1. Choose Your Game (Box Cricket / Box Football)
//   2. Pick Turf + Date (turf pills + 7-day strip from real slot dates)
//   3. Pick Time Slot (hourly grid, morning/evening groups)
//   4. Confirm & Pay Advance (30% now, rest at arena)
// Plus an optional XL Membership strip (Single Standard ₹990/month,
// standalone 30-day pass via /api/xl — consumes no slot).

const SPORT_EMOJI = { 'box cricket': '🏏', 'box football': '⚽' };
const sportEmoji = (s) => SPORT_EMOJI[s?.toLowerCase?.()] || '🏆';

const XL_ARENA_RULES = [
  'Turf shoes only — no metal spikes or bare feet on the turf.',
  'Report 15 minutes early — your slot starts sharp, late arrival eats into play time.',
  'No outside food, smoking, or alcohol inside the arena.',
  'Damage to turf, nets, or equipment will be charged.',
  'Cancel at least 3 hours ahead to claim your advance refund from My Payments.',
];

const timeCategory = (t) => {
  const h = parseInt(String(t).split(':')[0]);
  if (h < 12) return 'morning';
  if (h < 16) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
};
const CAT_LABEL = { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌇 Evening', night: '🌙 Night' };
const dayLabel = (dateStr) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T00:00:00').getDay()];
const fmtDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const XlArenaBookingPanel = ({ ground, user, showMessage, onBooked }) => {
  const [activeSportId, setActiveSportId] = useState(null);
  const [activeCourtId, setActiveCourtId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [xlInfo, setXlInfo] = useState(null);
  const [memLoading, setMemLoading] = useState(false);

  const todayISO = new Date().toISOString().split('T')[0];
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 6);
  const maxISO = maxDate.toISOString().split('T')[0];

  // ── Defaults: first sport → its first turf → first open date ──
  useEffect(() => {
    if (ground?.sports?.length && !activeSportId) setActiveSportId(ground.sports[0]._id);
  }, [ground, activeSportId]);

  const activeSport = useMemo(
    () => ground?.sports?.find((s) => String(s._id) === String(activeSportId)) || ground?.sports?.[0],
    [ground, activeSportId]
  );

  useEffect(() => {
    if (activeSport?.courts?.length && !activeSport.courts.find((c) => String(c._id) === String(activeCourtId))) {
      setActiveCourtId(activeSport.courts[0]._id);
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  }, [activeSport, activeCourtId]);

  // ── Slots for this game (+turf), open only, rolling 7-day window ──
  const gameSlots = useMemo(() => {
    if (!ground?.slots || !activeSport) return [];
    return ground.slots.filter((s) => {
      if (s.isBooked || s.bookedCount >= s.capacity) return false;
      if (String(s.sportId) !== String(activeSport._id)) return false;
      if (activeCourtId && s.courtId && String(s.courtId) !== String(activeCourtId)) return false;
      if (s.date < todayISO || s.date > maxISO) return false;
      return true;
    });
  }, [ground, activeSport, activeCourtId, todayISO, maxISO]);

  const openDates = useMemo(() => [...new Set(gameSlots.map((s) => s.date))].sort(), [gameSlots]);

  useEffect(() => {
    if (openDates.length && !openDates.includes(selectedDate)) {
      setSelectedDate(openDates[0]);
      setSelectedSlot(null);
    }
  }, [openDates, selectedDate]);

  const daySlots = useMemo(() => {
    const list = gameSlots.filter((s) => s.date === selectedDate);
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return list;
  }, [gameSlots, selectedDate]);

  const grouped = useMemo(() => {
    const g = { morning: [], afternoon: [], evening: [], night: [] };
    daySlots.forEach((s) => g[timeCategory(s.startTime)]?.push(s));
    return g;
  }, [daySlots]);

  const courtName = (slot) => activeSport?.courts?.find((c) => String(c._id) === String(slot?.courtId || activeCourtId))?.name || '';

  // Price: turf rate × slot hours. Server recomputes authoritatively —
  // this is display only (same 30/70 split as every other ground).
  const hoursFor = (slot) => {
    if (!slot) return 1;
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    return Math.max((eh * 60 + em - (sh * 60 + sm)) / 60, 0) || 1;
  };
  const total = selectedSlot ? Math.round((activeSport?.pricePerHour || 0) * hoursFor(selectedSlot)) : 0;
  const advance = Math.round(total * 0.3);
  const atArena = total - advance;

  const openCountFor = (sport) =>
    (ground?.slots || []).filter(
      (s) => String(s.sportId) === String(sport._id) && !s.isBooked && s.bookedCount < s.capacity && s.date >= todayISO && s.date <= maxISO
    ).length;

  // ── Membership ──
  const fetchXlInfo = async () => {
    try {
      const { data } = await API.get(`/xl/${ground._id}/info`);
      setXlInfo(data);
    } catch {
      setXlInfo(null);
    }
  };
  useEffect(() => {
    if (ground?._id) fetchXlInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ground?._id]);

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
      const { data } = await API.post(`/xl/${ground._id}/membership/order`, { planName: plan.name });
      new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `XL Membership ${plan.name} — ₹${plan.price}/month`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            await API.post(`/xl/${ground._id}/membership/verify`, {
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
              planName: plan.name,
            });
            showMessage?.('Membership activated — welcome to XL ✅');
            fetchXlInfo();
          } catch {
            showMessage?.('Membership verification failed ❌', 'error');
          } finally {
            setMemLoading(false);
          }
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

  // ── Hourly turf booking (standard ground advance flow) ──
  const handlePayAdvance = async () => {
    if (!selectedSlot) return;
    if (!rulesAccepted) return showMessage?.('Please accept the arena rules first', 'error');
    if (user?.role !== 'player') return showMessage?.('Only players can book', 'error');
    setPayLoading(true);
    try {
      if (!(await loadRazorpay())) return showMessage?.('Razorpay failed to load. Check internet.', 'error');
      const { data } = await API.post(`/payments/grounds/${ground._id}/advance-order`, {
        slotId: selectedSlot._id,
        partySize: 1, // exclusive turf — one team per slot
      });
      new window.Razorpay({
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'PLAYNSPORTS',
        description: `Advance (30%) — XL Arena ${activeSport?.name}`,
        order_id: data.orderId,
        handler: async (r) => {
          try {
            await API.post(`/payments/grounds/${ground._id}/verify-advance`, {
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
              slotId: selectedSlot._id,
              partySize: 1,
            });
            showMessage?.('Turf booked — advance paid ✅');
            setSelectedSlot(null);
            setRulesAccepted(false);
            onBooked?.();
          } catch {
            showMessage?.('Payment verification failed ❌', 'error');
          } finally {
            setPayLoading(false);
          }
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

  const pickSport = (s) => {
    setActiveSportId(s._id);
    setActiveCourtId(s.courts?.[0]?._id || null);
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Membership strip ── */}
      <div
        className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.03))', borderColor: 'rgba(251,191,36,0.25)' }}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold">XL Membership</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg mt-0.5">
            {xlInfo?.myMembership ? (
              <>Member · {xlInfo.myMembership.planName} <span className="text-green-400 text-sm">until {new Date(xlInfo.myMembership.expiresAt).toLocaleDateString('en-IN')}</span></>
            ) : (
              <>Single Standard · <span className="text-yellow-500">₹{xlInfo?.plans?.[0]?.price || 990}</span><span className="text-sm text-gray-500 font-normal">/month</span></>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">30-day arena pass — hourly turf bookings still apply per slot.</p>
        </div>
        <button
          onClick={handleMembership}
          disabled={memLoading}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          {memLoading ? '…' : xlInfo?.myMembership ? '🔁 Renew' : '⭐ Become a Member'}
        </button>
      </div>

      {/* ── Step 1: Choose your game ── */}
      <div className="glass-card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3"><span className="text-green-400 font-bold">1 ·</span> Choose your game</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(ground?.sports || []).filter((s) => s.isActive).map((s) => {
            const active = String(activeSport?._id) === String(s._id);
            return (
              <button
                key={s._id}
                onClick={() => pickSport(s)}
                className={`rounded-2xl p-4 text-left border transition-all ${active ? 'border-green-400/60 bg-green-400/8' : 'border-black/10 dark:border-white/10 hover:border-green-400/40'}`}
                style={active ? { boxShadow: '0 0 24px rgba(74,222,128,0.12)' } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{sportEmoji(s.name)}</span>
                  {active && <span className="text-green-400 text-sm font-bold">✓ Selected</span>}
                </div>
                <p className="text-gray-900 dark:text-white font-bold capitalize mt-2">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">📍 {(s.courts || []).map((c) => c.name).join(' · ') || 'Arena turf'} · ⏱️ {s.slotDurationMinutes || 60} min slots</p>
                <p className="mt-2"><span className="font-bebas text-2xl text-green-400">₹{s.pricePerHour}</span><span className="text-xs text-gray-500">/hour</span>
                  <span className="text-xs text-gray-500 ml-2">· {openCountFor(s)} open</span></p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Turf + Date ── */}
      <div className="glass-card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3"><span className="text-green-400 font-bold">2 ·</span> Pick turf & date</p>
        {(activeSport?.courts?.length > 1) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeSport.courts.filter((c) => c.isActive).map((c) => (
              <button
                key={c._id}
                onClick={() => { setActiveCourtId(c._id); setSelectedDate(null); setSelectedSlot(null); }}
                className={`tab-btn ${String(activeCourtId) === String(c._id) ? 'tab-active' : 'tab-inactive'}`}
              >
                🏟️ {c.name}
              </button>
            ))}
          </div>
        )}
        {openDates.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-center">
            <span className="text-3xl">😕</span>
            <p className="text-gray-500 text-sm">No open {activeSport?.name} slots this week — check back soon</p>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {openDates.map((d) => {
              const n = gameSlots.filter((s) => s.date === d).length;
              const sel = d === selectedDate;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                  className={`flex-shrink-0 rounded-xl px-4 py-2.5 border text-center transition-all ${sel ? 'border-green-400/60 bg-green-400/10' : 'border-black/10 dark:border-white/10 hover:border-green-400/40'}`}
                >
                  <p className={`text-xs font-bold ${sel ? 'text-green-400' : 'text-gray-500'}`}>{dayLabel(d)}</p>
                  <p className="text-gray-900 dark:text-white text-sm font-semibold whitespace-nowrap">{fmtDate(d)}</p>
                  <p className="text-[11px] text-green-400 font-bold">{n} open</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Step 3: Time slots ── */}
      {selectedDate && (
        <div className="glass-card">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            <span className="text-green-400 font-bold">3 ·</span> Pick a time — {fmtDate(selectedDate)}
            {courtName() ? <span className="text-gray-500"> · 🏟️ {courtName()}</span> : null}
          </p>
          {daySlots.length === 0 ? (
            <p className="text-gray-500 text-sm">All slots taken for this date.</p>
          ) : (
            Object.entries(grouped).map(([cat, list]) => list.length > 0 && (
              <div key={cat} className="mb-3 last:mb-0">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{CAT_LABEL[cat]}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {list.map((s) => {
                    const sel = String(selectedSlot?._id) === String(s._id);
                    return (
                      <button
                        key={s._id}
                        onClick={() => setSelectedSlot(sel ? null : s)}
                        className={`slot-card text-left ${sel ? 'slot-selected' : 'slot-available'}`}
                      >
                        <p className="text-gray-900 dark:text-white font-semibold text-sm">🕐 {s.startTime} — {s.endTime}</p>
                        <p className="text-green-400 text-xs font-bold mt-0.5">₹{activeSport?.pricePerHour}/hr</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Step 4: Confirm & pay ── */}
      {selectedSlot && (
        <div className="glass-card" style={{ borderColor: 'rgba(74,222,128,0.3)' }}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3"><span className="text-green-400 font-bold">4 ·</span> Confirm & pay advance</p>
          <div className="price-breakdown mb-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">🏏 {activeSport?.name} · 🏟️ {courtName(selectedSlot)}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">📅 {fmtDate(selectedSlot.date)} · 🕐 {selectedSlot.startTime}–{selectedSlot.endTime}</span></div>
            <div className="border-t border-black/10 dark:border-white/10 mt-2 pt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Turf total</span><span className="font-bold">₹{total}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Advance now (30%)</span><span className="font-bold text-green-400">₹{advance}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Due at arena (70%)</span><span>₹{atArena}</span></div>
            </div>
          </div>
          <div className="mb-3 rounded-xl border border-black/10 dark:border-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Arena rules</p>
            {XL_ARENA_RULES.map((r, i) => (
              <p key={i} className="text-xs text-gray-500 mt-1">• {r}</p>
            ))}
            <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
              <input type="checkbox" checked={rulesAccepted} onChange={(e) => setRulesAccepted(e.target.checked)} className="accent-green-400 w-4 h-4" />
              <span>I accept the arena rules</span>
            </label>
          </div>
          <button
            onClick={handlePayAdvance}
            disabled={payLoading}
            className="w-full bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors"
          >
            {payLoading ? 'Processing…' : `💳 Pay ₹${advance} Advance`}
          </button>
          <p className="text-[11px] text-gray-500 text-center mt-2">Exclusive turf — one team per slot · remaining ₹{atArena} at the arena</p>
        </div>
      )}
    </div>
  );
};

export default XlArenaBookingPanel;
