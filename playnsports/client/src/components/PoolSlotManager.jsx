import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CreditCard, ClipboardList, Circle, CircleDot, UserRound, Waves, Ticket, FileText, Lock, ScanLine, Search } from 'lucide-react';
import API from '../api/axios';
import { useSocket } from '../context/SocketContext';

const camErrorText = (e) => {
  const name = e?.name || '';
  const msg = (e?.message || '').toLowerCase();
  if (name === 'NotAllowedError') return 'Camera permission denied — allow camera for this site in the browser, then tap Scan again. Or upload a QR photo below.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera found on this device — upload a QR photo below or type the ticket ID.';
  if (name === 'SecurityError' || msg.includes('secure') || msg.includes('https') || msg.includes('getusermedia'))
    return 'This browser blocks the camera on non-HTTPS addresses — open this page via http://localhost:5173 on the venue PC, or upload a QR photo below.';
  return `Camera failed (${e?.message || 'unknown error'}) — upload a QR photo below or type the ticket ID.`;
};

const ScannerBox = ({ groundId, onScanned, showMessage }) => {
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const doCheckin = async (payload) => {
    try {
      const { data } = await API.post(`/pools/${groundId}/bookings/checkin`, payload);
      setLastResult({ ok: true, msg: data.message, booking: data.booking });
      showMessage?.(data.message, 'success');
      onScanned?.();
    } catch (e) {
      const msg = e.response?.data?.message || 'Check-in failed';
      setLastResult({ ok: false, msg });
      showMessage?.(msg, 'error');
    }
  };
  useEffect(() => {
    if (!scanning) return;
    let html5Qr;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;
      html5Qr = new Html5Qrcode('pool-qr-reader');
      try {
        await html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 },
          (decoded) => { doCheckin({ qrPayload: decoded }); setScanning(false); try { html5Qr.stop().catch(()=>{}); } catch {} },
          () => {});
        setCamError('');
      } catch (e) {
        if (cancelled) return;
        const msg = camErrorText(e);
        setCamError(msg);
        showMessage?.(msg, 'error');
        setScanning(false);
        try { html5Qr.clear().catch(()=>{}); } catch {}
      }
    })();
    return () => { cancelled = true; try { html5Qr?.stop().catch(()=>{}); } catch {} };
  }, [scanning]);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const decoded = await Html5Qrcode.scanFile(file, false);
      await doCheckin({ qrPayload: decoded });
    } catch (err) {
      const msg = err?.message && !/no qr/i.test(err.message) ? `Photo scan failed: ${err.message}` : 'No QR found in that photo — try a clearer shot or type the ticket ID.';
      setLastResult({ ok: false, msg });
      showMessage?.(msg, 'error');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="mb-4 p-4 rounded-2xl border border-green-400/20 bg-green-400/5">
      <p className="text-sm font-bold text-green-400 flex items-center gap-2"><ScanLine size={16} /> Gate Scanner — one scan = one entry</p>
      <p className="text-[11px] text-gray-500 mb-3">Screenshot reuse blocked — second scan of same QR is rejected as “Already checked in”.</p>
      {!scanning ? <button onClick={() => { setCamError(''); setScanning(true); }} className="bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm min-h-[44px]">📷 Scan QR</button> : <button onClick={() => setScanning(false)} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-xl text-sm min-h-[44px]">Stop</button>}
      <div id="pool-qr-reader" className="mt-3 rounded-xl overflow-hidden" style={{ display: scanning ? 'block' : 'none' }}></div>
      {camError && <p className="text-xs mt-2 text-amber-500">{camError}</p>}
      <div className="flex gap-2 mt-3">
        <label className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap min-h-[44px] inline-flex items-center">
          {uploading ? 'Reading…' : '📤 Upload QR photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <input value={manual} onChange={(e)=>setManual(e.target.value.toUpperCase())} placeholder="SPT-XXXXXXXX" className="input-field flex-1 min-h-[44px]" style={{fontFamily:'monospace', fontSize: 16}} />
        <button onClick={() => manual.trim() && doCheckin({ ticketId: manual.trim() })} className="bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm min-h-[44px]">Check-in</button>
      </div>
      {lastResult && <p className={`text-xs mt-2 font-semibold ${lastResult.ok ? 'text-green-400' : 'text-red-400'}`}>{lastResult.msg}</p>}
    </div>
  );
};

const BookingsFilters = ({ bookings, bookingsLoading, fetchBookings }) => {
  const [q, setQ] = useState('');
  const [dateF, setDateF] = useState('');
  const [statusF, setStatusF] = useState('');
  const { socket } = useSocket();
  const [liveBookings, setLiveBookings] = useState(bookings);
  useEffect(()=> setLiveBookings(bookings), [bookings]);
  useEffect(()=>{
    if(!socket) return;
    const h=(b)=> setLiveBookings(prev=> prev.map(x=> String(x._id)===String(b._id)? {...x, ...b}: x));
    socket.on('pool:booking-updated', h);
    return()=> socket.off('pool:booking-updated', h);
  }, [socket]);
  const filtered = (liveBookings||[]).filter(b=>{
    if(dateF && b.date!==dateF) return false;
    if(statusF==='checkedIn' && !b.checkedIn) return false;
    if(statusF==='notCheckedIn' && b.checkedIn) return false;
    if(q && !`${b.player?.name} ${b.ticketId} ${b.player?.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const checkedCount = (liveBookings||[]).filter(b=>b.checkedIn).length;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 text-xs text-gray-500"><Search size={12} /><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / ticket / phone" className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs outline-none" /></div>
        <input type="date" value={dateF} onChange={e=>setDateF(e.target.value)} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs" />
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs"><option value="">All states</option><option value="notCheckedIn">Booked</option><option value="checkedIn">Checked-in</option></select>
        <span className="text-[11px] text-gray-500 ml-auto">{filtered.length} shown · {checkedCount} checked-in</span>
      </div>
      {bookingsLoading && <p className="text-gray-500 text-sm">Loading…</p>}
      {!bookingsLoading && filtered.length===0 && <p className="text-gray-500 text-sm italic">No matching bookings.</p>}
      {!bookingsLoading && filtered.length>0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((b)=>(
            <div key={b._id} className={`slot-row ${b.checkedIn?'!border-green-400/30 !bg-green-400/5': b.slotCategory==='girls_only'?'girls':'general'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{b.player?.name || 'Player'} <span className="text-gray-500 font-normal">· {b.partySize} people</span> {b.checkedIn && <span className="ml-2 text-[10px] bg-green-400 text-black px-1.5 py-0.5 rounded-full font-bold">✓ Checked-in {b.checkedInAt? new Date(b.checkedInAt).toLocaleTimeString():''}</span>}</p>
                <p className="text-xs text-gray-500">{b.poolName} · {b.date} {b.startTime}–{b.endTime} · {b.membershipPlanName}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1"><Ticket size={11} /> {b.ticketId} · {b.status} {b.checkedIn? `· via ${b.checkinMethod}`:''}</p>
                {b.medicalCertificateUrl && <a href={b.medicalCertificateUrl} target="_blank" rel="noreferrer" className="text-[11px] text-green-500 underline flex items-center gap-1"><FileText size={11} /> View medical certificate</a>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">₹{b.totalPrice}</p>
                <p className="text-[10px] text-gray-500">your payout ₹{b.ownerPayout}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Self-contained styling — needs to render correctly both inside the pool
// owner dashboard and inside the admin panel's manage-venue page.
const useLocalStyles = () => {
  useEffect(() => {
    if (document.getElementById('psm-styles')) return;
    const style = document.createElement('style');
    style.id = 'psm-styles';
    style.textContent = `
      .psm .glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 24px; padding: 24px; }
      html.dark .psm .glass-card { border-color: rgba(255,255,255,0.06); }
      .psm .tab-btn { padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; transition: all .2s ease; white-space: nowrap; cursor: pointer; }
      .psm .tab-active { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
      .psm .tab-inactive { background: transparent; color: #6b7280; border: 1px solid rgba(107,114,128,0.2); }
      .psm .tab-inactive:hover { color: #9ca3af; }
      .psm .input-field { width: 100%; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 12px; color: inherit; font-size: 13px; outline: none; }
      html.dark .psm .input-field { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .psm .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; display: block; }
      .psm .btn-primary { background: linear-gradient(135deg,#4ade80,#22c55e); color: #052e12; font-weight: 700; border-radius: 12px; padding: 10px 20px; font-size: 13px; }
      .psm .btn-primary:disabled { opacity: 0.6; }
      .psm .btn-secondary { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 500; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      html.dark .psm .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .psm .btn-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-weight: 600; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      .psm .slot-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); }
      html.dark .psm .slot-row { border-color: rgba(255,255,255,0.08); }
      .psm .slot-row.girls { background: rgba(236,72,153,0.08); border-color: rgba(236,72,153,0.25); }
      .psm .slot-row.general { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.2); }
      .psm .badge-girls { background: rgba(236,72,153,0.15); color: #ec4899; border: 1px solid rgba(236,72,153,0.3); }
      .psm .badge-general { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
    `;
    document.head.appendChild(style);
  }, []);
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const todayStr = () => new Date().toISOString().split('T')[0];
const todayDow = () => new Date().getDay();
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const PoolSlotManager = ({ ground, onRefresh, showMessage }) => {
  useLocalStyles();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('schedule'); // schedule | plans | bookings
  const [activePoolId, setActivePoolId] = useState(null);
  const [activeDay, setActiveDay] = useState('today');
  const [busy, setBusy] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', defaultCapacity: 20 });
  const [newSlot, setNewSlot] = useState({ startTime: '06:00', endTime: '06:50', capacity: '', category: 'general' });
  const [editingBlock, setEditingBlock] = useState(null); // { blockId, capacity, category }
  const [bookings, setBookings] = useState(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [newPlanType, setNewPlanType] = useState({ name: '', billingLabel: 'per session' });
  const [newCategory, setNewCategory] = useState({}); // { [planTypeId]: { name, price } }

  const { socket } = useSocket();
  useEffect(() => {
    if (socket && ground?._id) socket.emit('join_venue', ground._id);
  }, [socket, ground?._id]);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await API.get(`/pools/${ground._id}`);
      setConfig(data);
      setActivePoolId((prev) => prev || data.pools?.[0]?._id || null);
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to load pool schedule', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ground._id]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const { data } = await API.get(`/bookings/grounds/${ground._id}`);
      setBookings(data.filter((b) => b.poolId));
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Failed to load bookings', 'error');
    } finally {
      setBookingsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ground._id]);

  useEffect(() => { if (tab === 'bookings' && bookings === null) fetchBookings(); }, [tab, bookings, fetchBookings]);

  const pool = config?.pools?.find((p) => p._id === activePoolId) || config?.pools?.[0];
  useEffect(() => { setEditingBlock(null); }, [activePoolId, activeDay]);

  if (ground.venueMode !== 'live' || ground.approvalStatus !== 'approved') {
    return (
      <div className="psm glass-card text-center py-16">
        <Lock className="mx-auto mb-4 text-gray-400" size={40} strokeWidth={1.5} />
        <p className="text-gray-500 text-sm font-semibold mb-1">Venue still in trial phase</p>
        <p className="text-gray-600 text-xs">Pool slot scheduling opens once an admin marks this venue as live.</p>
      </div>
    );
  }
  if (loading || !config) {
    return <div className="psm glass-card text-center py-16 text-gray-500 text-sm">Loading pool schedule…</div>;
  }

  const isCustomToday = pool?.overrideDates?.includes(todayStr());
  const dow = activeDay === 'today' ? todayDow() : activeDay;
  const todayMode = activeDay === 'today';
  const editable = !todayMode || isCustomToday;

  const blocksForView = !pool
    ? []
    : todayMode
      ? (isCustomToday ? pool.overrideBlocks.filter((b) => b.date === todayStr()) : pool.weeklyBlocks.filter((b) => b.dayOfWeek === dow))
      : pool.weeklyBlocks.filter((b) => b.dayOfWeek === dow);

  const sortedBlocks = [...blocksForView].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const call = async (fn, msg) => {
    setBusy(true);
    try {
      const { data } = await fn();
      setConfig(data);
      if (msg) showMessage?.(msg);
      onRefresh?.();
      return data;
    } catch (err) {
      showMessage?.(err.response?.data?.message || 'Something went wrong', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  // ── Pools ──
  const handleAddPool = async (e) => {
    e.preventDefault();
    if (!newPool.name.trim()) return;
    const data = await call(
      () => API.post(`/pools/${ground._id}/pools`, { name: newPool.name.trim(), defaultCapacity: Number(newPool.defaultCapacity) || 20 }),
      'Pool added'
    );
    if (data) { setShowAddPool(false); setNewPool({ name: '', defaultCapacity: 20 }); setActivePoolId(data.pools[data.pools.length - 1]._id); }
  };
  const handleRemovePool = async () => {
    if (!pool || !confirm(`Remove "${pool.name}"? Its whole schedule goes with it.`)) return;
    const data = await call(() => API.delete(`/pools/${ground._id}/pools/${pool._id}`), 'Pool removed');
    if (data) setActivePoolId(data.pools[0]?._id || null);
  };
  const handlePoolMetaBlur = (field, value) => {
    if (!pool) return;
    if (field === 'defaultCapacity' && (!value || Number(value) < 1 || Number(value) === pool.defaultCapacity)) return;
    if (field === 'name' && (!value.trim() || value.trim() === pool.name)) return;
    call(() => API.put(`/pools/${ground._id}/pools/${pool._id}`, { [field]: field === 'defaultCapacity' ? Number(value) : value }));
  };
  const togglePoolActive = () => pool && call(() => API.put(`/pools/${ground._id}/pools/${pool._id}`, { isActive: !pool.isActive }));

  // ── Today override ──
  const handleStartCustomToday = () => pool && call(() => API.post(`/pools/${ground._id}/pools/${pool._id}/override/${todayStr()}/start`), 'Today is now customizable — edit below');
  const handleRevertToday = () => {
    if (!pool || !confirm('Revert today back to the recurring schedule? Any changes made just for today will be lost.')) return;
    call(() => API.post(`/pools/${ground._id}/pools/${pool._id}/override/${todayStr()}/revert`), 'Reverted to the recurring schedule');
  };

  // ── Slots ──
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!pool || !editable) return;
    if (!newSlot.startTime || !newSlot.endTime) { showMessage?.('Enter start and end time', 'error'); return; }
    const body = {
      startTime: newSlot.startTime, endTime: newSlot.endTime,
      capacity: newSlot.capacity ? Number(newSlot.capacity) : pool.defaultCapacity,
      category: newSlot.category,
    };
    if (todayMode) {
      await call(() => API.post(`/pools/${ground._id}/pools/${pool._id}/override/${todayStr()}/blocks`, body), 'Slot added');
    } else {
      await call(() => API.post(`/pools/${ground._id}/pools/${pool._id}/weekly`, { ...body, dayOfWeek: dow }), 'Slot added');
    }
    setNewSlot({ startTime: '06:00', endTime: '06:50', capacity: '', category: 'general' });
  };
  const handleSaveEdit = async () => {
    if (!editingBlock || !pool) return;
    const cap = Number(editingBlock.capacity);
    if (!cap || cap < 1) { showMessage?.('Enter a valid capacity', 'error'); return; }
    const body = { capacity: cap, category: editingBlock.category };
    if (todayMode) {
      await call(() => API.put(`/pools/${ground._id}/pools/${pool._id}/override/${todayStr()}/blocks/${editingBlock.blockId}`, body), 'Slot updated');
    } else {
      await call(() => API.put(`/pools/${ground._id}/pools/${pool._id}/weekly/${editingBlock.blockId}`, body), 'Slot updated');
    }
    setEditingBlock(null);
  };
  const handleRemoveSlot = async (blockId) => {
    if (!pool) return;
    if (todayMode) {
      await call(() => API.delete(`/pools/${ground._id}/pools/${pool._id}/override/${todayStr()}/blocks/${blockId}`), 'Slot removed');
    } else {
      await call(() => API.delete(`/pools/${ground._id}/pools/${pool._id}/weekly/${blockId}`), 'Slot removed');
    }
    setEditingBlock(null);
  };

  // ── Plan types + categories + fees ──
  const handleAddPlanType = async (e) => {
    e.preventDefault();
    if (!newPlanType.name.trim()) return;
    const data = await call(() => API.post(`/pools/${ground._id}/plan-types`, newPlanType), 'Plan type added');
    if (data) setNewPlanType({ name: '', billingLabel: 'per session' });
  };
  const togglePlanTypeActive = (pt) => call(() => API.put(`/pools/${ground._id}/plan-types/${pt._id}`, { isActive: !pt.isActive }));
  const removePlanType = (pt) => confirm(`Remove "${pt.name}" and all its categories?`) && call(() => API.delete(`/pools/${ground._id}/plan-types/${pt._id}`), 'Plan type removed');

  const handleAddCategory = async (e, planTypeId) => {
    e.preventDefault();
    const draft = newCategory[planTypeId] || {};
    if (!draft.name?.trim() || draft.price === undefined || draft.price === '') return;
    const data = await call(() => API.post(`/pools/${ground._id}/plan-types/${planTypeId}/categories`, { name: draft.name.trim(), price: Number(draft.price) }), 'Category added');
    if (data) setNewCategory((s) => ({ ...s, [planTypeId]: { name: '', price: '' } }));
  };
  const toggleCategoryActive = (planTypeId, cat) => call(() => API.put(`/pools/${ground._id}/plan-types/${planTypeId}/categories/${cat._id}`, { isActive: !cat.isActive }));
  const removeCategory = (planTypeId, cat) => confirm(`Remove "${cat.name}"?`) && call(() => API.delete(`/pools/${ground._id}/plan-types/${planTypeId}/categories/${cat._id}`), 'Category removed');

  const handleFeeBlur = (field, value) => {
    if (value === '' || Number(value) < 0 || Number(value) === config[field]) return;
    call(() => API.put(`/pools/${ground._id}/fees`, { [field]: Number(value) }));
  };

  return (
    <div className="psm flex flex-col gap-5">
      {/* Top-level tabs */}
      <div className="flex gap-2">
        {[['schedule', 'Schedule', CalendarDays], ['plans', 'Membership & Fees', CreditCard], ['bookings', 'Bookings', ClipboardList]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-btn flex items-center gap-1.5 ${tab === id ? 'tab-active' : 'tab-inactive'}`}><Icon size={13} />{label}</button>
        ))}
      </div>

      {tab === 'schedule' && (
        <>
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">POOLS AT THIS VENUE</h4>
              <button className="btn-secondary text-xs" onClick={() => setShowAddPool((v) => !v)}>{showAddPool ? 'Cancel' : '+ Add Pool'}</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(config.pools || []).map((p) => (
                <button key={p._id} onClick={() => setActivePoolId(p._id)} className={`tab-btn flex items-center gap-1.5 ${activePoolId === p._id ? 'tab-active' : 'tab-inactive'}`}>
                  {p.isActive ? <CircleDot size={13} className="text-green-500" /> : <Circle size={13} className="text-gray-400" />} {p.name}
                </button>
              ))}
            </div>
            {showAddPool && (
              <form onSubmit={handleAddPool} className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Pool name</label>
                    <input className="input-field" placeholder="e.g. Pool 2" value={newPool.name} onChange={(e) => setNewPool({ ...newPool, name: e.target.value })} required /></div>
                  <div><label className="label">Default capacity</label>
                    <input type="number" min="1" className="input-field" value={newPool.defaultCapacity} onChange={(e) => setNewPool({ ...newPool, defaultCapacity: e.target.value })} /></div>
                </div>
                <button className="btn-primary text-sm" disabled={busy}>{busy ? 'Adding…' : 'Add Pool'}</button>
              </form>
            )}
          </div>

          {pool && (
            <>
              <div className="glass-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">{pool.name} SETTINGS</h4>
                  {config.pools.length > 1 && <button className="btn-danger text-xs" onClick={handleRemovePool}>Remove pool</button>}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className="label">Name</label>
                    <input className="input-field" defaultValue={pool.name} key={`${pool._id}-name`} onBlur={(e) => handlePoolMetaBlur('name', e.target.value)} /></div>
                  <div><label className="label">Default capacity per slot</label>
                    <input type="number" min="1" className="input-field" defaultValue={pool.defaultCapacity} key={`${pool._id}-cap`} onBlur={(e) => handlePoolMetaBlur('defaultCapacity', e.target.value)} /></div>
                </div>
                <button onClick={togglePoolActive} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 w-fit ${pool.isActive ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-black/5 dark:bg-white/5 text-gray-500 border-black/10 dark:border-white/10'}`}>
                  {pool.isActive ? <CircleDot size={13} /> : <Circle size={13} />} {pool.isActive ? 'Active — players can book' : 'Disabled — click to re-enable'}
                </button>
              </div>

              <div className="glass-card">
                <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide mb-3">SCHEDULE</h4>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  <button onClick={() => setActiveDay('today')} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${activeDay === 'today' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-black/10 dark:border-white/10 text-gray-500'}`}>Today</button>
                  {DAY_LABELS.map((label, i) => (
                    <button key={label} onClick={() => setActiveDay(i)} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${activeDay === i ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-black/10 dark:border-white/10 text-gray-500'}`}>{label}</button>
                  ))}
                </div>

                {todayMode && (
                  <div className="mb-3 p-3 rounded-xl border border-black/8 dark:border-white/8 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {isCustomToday ? 'Today has a custom schedule for just this date.' : `Today (${DAY_LABELS_FULL[dow]}) is following the recurring weekly schedule.`}
                    </p>
                    {isCustomToday
                      ? <button className="btn-secondary text-xs" onClick={handleRevertToday} disabled={busy}>Revert to recurring schedule</button>
                      : <button className="btn-primary text-xs" onClick={handleStartCustomToday} disabled={busy}>Customize just today</button>}
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-4">
                  {sortedBlocks.length === 0 && <p className="text-gray-500 text-xs italic py-4 text-center">No slots yet — closed this day, or add one below.</p>}
                  {sortedBlocks.map((b) => (
                    <div key={b._id} className={`slot-row ${b.category === 'girls_only' ? 'girls' : 'general'}`}>
                      <span className="text-sm font-semibold">{fmtTime(b.startTime)} – {fmtTime(b.endTime)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${b.category === 'girls_only' ? 'badge-girls' : 'badge-general'}`}>
                        {b.category === 'girls_only' && <UserRound size={10} />}{b.category === 'girls_only' ? 'Girls Only' : 'General'}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">cap {b.capacity}</span>
                      {editable && (
                        <button className="text-xs text-gray-500 hover:text-green-500" onClick={() => setEditingBlock({ blockId: b._id, capacity: b.capacity, category: b.category })}>Edit</button>
                      )}
                    </div>
                  ))}
                </div>

                {editingBlock && (
                  <div className="mb-4 p-3 rounded-xl border border-green-400/30 bg-green-400/5 flex flex-wrap items-end gap-3">
                    <div><label className="label">Capacity</label>
                      <input type="number" min="1" className="input-field w-24" value={editingBlock.capacity} onChange={(e) => setEditingBlock({ ...editingBlock, capacity: e.target.value })} /></div>
                    <div><label className="label">Category</label>
                      <select className="input-field w-36" value={editingBlock.category} onChange={(e) => setEditingBlock({ ...editingBlock, category: e.target.value })}>
                        <option value="general">General</option>
                        <option value="girls_only">Girls Only</option>
                      </select></div>
                    <button className="btn-primary text-xs" onClick={handleSaveEdit} disabled={busy}>Save</button>
                    <button className="btn-danger text-xs" onClick={() => handleRemoveSlot(editingBlock.blockId)} disabled={busy}>Remove</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditingBlock(null)}>Cancel</button>
                  </div>
                )}

                {editable ? (
                  <form onSubmit={handleAddSlot} className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-end gap-3">
                    <div><label className="label">Start</label>
                      <input type="time" className="input-field w-28" value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} required /></div>
                    <div><label className="label">End</label>
                      <input type="time" className="input-field w-28" value={newSlot.endTime} onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} required /></div>
                    <div><label className="label">Category</label>
                      <select className="input-field w-36" value={newSlot.category} onChange={(e) => setNewSlot({ ...newSlot, category: e.target.value })}>
                        <option value="general">General</option>
                        <option value="girls_only">Girls Only (pink)</option>
                      </select></div>
                    <div><label className="label">Capacity</label>
                      <input type="number" min="1" className="input-field w-24" placeholder={String(pool.defaultCapacity)} value={newSlot.capacity} onChange={(e) => setNewSlot({ ...newSlot, capacity: e.target.value })} /></div>
                    <button className="btn-primary text-xs" disabled={busy}>+ Add Slot</button>
                  </form>
                ) : (
                  <p className="text-gray-600 text-[11px]">Switch to a weekday tab to edit the recurring pattern, or hit "Customize just today" above.</p>
                )}

                <p className="text-gray-600 text-[11px] mt-3">General slots shown in blue, girls-only in pink. Weekday tabs edit the schedule that repeats every week; Today only edits this one date.</p>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'plans' && (
        <>
          <div className="glass-card">
            <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide mb-1">PLAN TYPES</h4>
            <p className="text-gray-500 text-xs mb-4">
              A plan type is <em>how</em> someone pays (Single Session, Monthly, Semester...). Each plan type has its own set of categories below it — that's <em>who</em> they are (Hosteler, Day Scholar...) and what that category pays. Players only ever see categories that exist under the plan type they picked.
            </p>

            <div className="flex flex-col gap-4 mb-4">
              {(config.planTypes || []).length === 0 && <p className="text-gray-500 text-xs italic">No plan types yet — add one below (e.g. "Single Session").</p>}
              {(config.planTypes || []).map((pt) => (
                <div key={pt._id} className="rounded-2xl border border-black/8 dark:border-white/8 p-3.5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold">{pt.name}</span>
                    <span className="text-xs text-gray-500">{pt.billingLabel}</span>
                    <button onClick={() => togglePlanTypeActive(pt)} className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${pt.isActive ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 border-black/10'}`}>
                      {pt.isActive ? 'Active' : 'Disabled'}
                    </button>
                    <button className="btn-danger text-xs" onClick={() => removePlanType(pt)}>Remove</button>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3 pl-1">
                    {pt.categories.length === 0 && <p className="text-gray-500 text-xs italic">No categories yet — add one below (e.g. "LPU Hosteler — ₹100").</p>}
                    {pt.categories.map((cat) => (
                      <div key={cat._id} className="flex items-center gap-2 text-xs bg-black/3 dark:bg-white/3 rounded-lg px-3 py-2">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-gray-500 ml-1">₹{cat.price}</span>
                        <button onClick={() => toggleCategoryActive(pt._id, cat)} className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${cat.isActive ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-black/5 dark:bg-white/5 text-gray-500 border-black/10'}`}>
                          {cat.isActive ? 'Active' : 'Disabled'}
                        </button>
                        <button className="text-red-500 hover:text-red-400" onClick={() => removeCategory(pt._id, cat)}>Remove</button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => handleAddCategory(e, pt._id)} className="flex flex-wrap items-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                    <div><label className="label">Category name</label>
                      <input className="input-field w-40" placeholder="e.g. LPU Hosteler" value={newCategory[pt._id]?.name || ''}
                        onChange={(e) => setNewCategory((s) => ({ ...s, [pt._id]: { ...s[pt._id], name: e.target.value } }))} /></div>
                    <div><label className="label">Price (₹)</label>
                      <input type="number" min="0" className="input-field w-24" value={newCategory[pt._id]?.price ?? ''}
                        onChange={(e) => setNewCategory((s) => ({ ...s, [pt._id]: { ...s[pt._id], price: e.target.value } }))} /></div>
                    <button className="btn-secondary text-xs" disabled={busy}>+ Add Category</button>
                  </form>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPlanType} className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-end gap-3">
              <div><label className="label">Plan type name</label>
                <input className="input-field w-48" placeholder="e.g. Monthly Membership" value={newPlanType.name} onChange={(e) => setNewPlanType({ ...newPlanType, name: e.target.value })} required /></div>
              <div><label className="label">Billing label</label>
                <input className="input-field w-36" placeholder="per month" value={newPlanType.billingLabel} onChange={(e) => setNewPlanType({ ...newPlanType, billingLabel: e.target.value })} /></div>
              <button className="btn-primary text-xs" disabled={busy}>+ Add Plan Type</button>
            </form>
          </div>

          <div className="glass-card">
            <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide mb-3">FEES</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Registration fee (₹, one-time per player)</label>
                <input type="number" min="0" className="input-field" defaultValue={config.registrationFee} key={`reg-${config.registrationFee}`} onBlur={(e) => handleFeeBlur('registrationFee', e.target.value)} /></div>
              <div><label className="label">Coaching fee (₹/month) — display only for now</label>
                <input type="number" min="0" className="input-field" defaultValue={config.coachingFee} key={`coach-${config.coachingFee}`} onBlur={(e) => handleFeeBlur('coachingFee', e.target.value)} /></div>
            </div>
            <div className="mt-4">
              <button disabled className="text-xs px-4 py-2 rounded-full border border-black/10 dark:border-white/10 text-gray-400 bg-black/5 dark:bg-white/5 cursor-not-allowed flex items-center gap-1.5">
                <Waves size={13} /> Coaching — Coming Soon
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'bookings' && (
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">INCOMING BOOKINGS</h4>
            <button onClick={fetchBookings} className="text-xs text-gray-500 hover:text-green-400">↻ Refresh</button>
          </div>
          {/* Scanner */}
          <ScannerBox groundId={ground._id} onScanned={fetchBookings} showMessage={showMessage} />
          {/* Filters */}
          <BookingsFilters bookings={bookings} bookingsLoading={bookingsLoading} fetchBookings={fetchBookings} />
        </div>
      )}
    </div>
  );
};

export default PoolSlotManager;
