import { useState, useEffect } from 'react';
import API from '../api/axios';

const SPORT_OPTIONS = ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'Kabbadi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football', 'gym', 'swimming', 'esports', 'other'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
const DAYS_AHEAD = 14;

// Self-contained styling so this component renders correctly regardless of
// which dashboard mounts it (GroundOwnerDashboard already defines these
// classes globally; LeadVenueDashboard — used for gym/pool — doesn't, so
// this injects its own copy, guarded so it never duplicates).
const useLocalStyles = () => {
  useEffect(() => {
    if (document.getElementById('scm-styles')) return;
    const style = document.createElement('style');
    style.id = 'scm-styles';
    style.textContent = `
      .scm .glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 24px; padding: 24px; }
      html.dark .scm .glass-card { border-color: rgba(255,255,255,0.06); }
      .scm .tab-btn { padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; transition: all .2s ease; white-space: nowrap; cursor: pointer; }
      .scm .tab-active { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
      .scm .tab-inactive { background: transparent; color: #6b7280; border: 1px solid rgba(107,114,128,0.2); }
      .scm .tab-inactive:hover { color: #9ca3af; }
      .scm .input-field { width: 100%; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 12px; color: inherit; font-size: 13px; outline: none; }
      html.dark .scm .input-field { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
      .scm .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; display: block; }
      .scm .btn-primary { background: linear-gradient(135deg,#4ade80,#22c55e); color: #052e12; font-weight: 700; border-radius: 12px; padding: 10px 20px; font-size: 13px; }
      .scm .btn-primary:disabled { opacity: 0.6; }
      .scm .btn-secondary { background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: #6b7280; font-weight: 500; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      html.dark .scm .btn-secondary { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #9ca3af; }
      .scm .btn-danger { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-weight: 600; border-radius: 12px; padding: 8px 16px; font-size: 12px; }
      .scm .slot-pill { min-height: 44px; }
    `;
    document.head.appendChild(style);
  }, []);
};

const toTimeStr = (h) => `${String(h).padStart(2, '0')}:00`;
const fmt = (h) => { const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:00 ${ampm}`; };
const getDates = () => {
  const dates = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};
const dayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Replaces the old single-sport SlotScheduler. A venue (ground/gym/pool) can
// now offer several sports at once, each with its own price, slot length,
// and either named courts (badminton court 1, 2, 3...) or — for pool-style
// venues — a simple headcount cap per slot. This component lets the owner
// configure all of that and then add/remove the actual bookable time slots.
const SportCourtManager = ({ ground, onRefresh, showMessage }) => {
  useLocalStyles();
  const [activeSportId, setActiveSportId] = useState(ground?.sports?.[0]?._id || null);
  const [showAddSport, setShowAddSport] = useState(false);
  const [savingSport, setSavingSport] = useState(false);
  const [newSport, setNewSport] = useState({ name: 'badminton', pricePerHour: '', slotDurationMinutes: 60, bookingMode: 'auto', capacityPerSlot: '' });
  const [newCourtName, setNewCourtName] = useState('');
  const [selectedDate, setSelectedDate] = useState(getDates()[0]);
  const [selectedCourtIds, setSelectedCourtIds] = useState([]); // for 'specific' mode slot-adding
  const [saving, setSaving] = useState(null);

  const isPoolVenue = ground?.venueType === 'pool';

  useEffect(() => {
    if (ground?.sports?.length && !ground.sports.find(s => s._id === activeSportId)) {
      setActiveSportId(ground.sports[0]._id);
    }
  }, [ground, activeSportId]);

  const sportDoc = ground?.sports?.find(s => s._id === activeSportId);

  useEffect(() => { setSelectedCourtIds([]); }, [activeSportId]);

  if (!ground) return null;

  const handleAddSport = async (e) => {
    e.preventDefault();
    setSavingSport(true);
    try {
      await API.post(`/grounds/${ground._id}/sports`, {
        name: newSport.name,
        pricePerHour: isPoolVenue ? 0 : Number(newSport.pricePerHour) || 0,
        slotDurationMinutes: Number(newSport.slotDurationMinutes) || 60,
        bookingMode: newSport.bookingMode,
        capacityPerSlot: newSport.capacityPerSlot ? Number(newSport.capacityPerSlot) : null,
      });
      showMessage('Sport added ✅');
      setShowAddSport(false);
      setNewSport({ name: 'badminton', pricePerHour: '', slotDurationMinutes: 60, bookingMode: 'auto', capacityPerSlot: '' });
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to add sport', 'error');
    } finally {
      setSavingSport(false);
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!confirm('Remove this sport? Its courts and unbooked slots go with it.')) return;
    try {
      await API.delete(`/grounds/${ground._id}/sports/${sportId}`);
      showMessage('Sport removed');
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to remove sport', 'error');
    }
  };

  const handleToggleMode = async (mode) => {
    if (!sportDoc) return;
    try {
      await API.put(`/grounds/${ground._id}/sports/${sportDoc._id}`, { bookingMode: mode });
      showMessage(`Booking mode set to "${mode === 'specific' ? 'player picks court' : 'auto-assign'}" ✅`);
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update', 'error');
    }
  };

  const handleAddCourt = async (e) => {
    e.preventDefault();
    if (!newCourtName.trim() || !sportDoc) return;
    try {
      await API.post(`/grounds/${ground._id}/sports/${sportDoc._id}/courts`, { name: newCourtName.trim() });
      showMessage('Court added ✅');
      setNewCourtName('');
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to add court', 'error');
    }
  };

  const handleRemoveCourt = async (courtId) => {
    if (!confirm('Remove this court?')) return;
    try {
      await API.delete(`/grounds/${ground._id}/sports/${sportDoc._id}/courts/${courtId}`);
      showMessage('Court removed');
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to remove court', 'error');
    }
  };

  const toggleCourtActive = async (court) => {
    try {
      await API.put(`/grounds/${ground._id}/sports/${sportDoc._id}/courts/${court._id}`, { isActive: !court.isActive });
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update court', 'error');
    }
  };

  const daySlots = (ground.slots || []).filter(s => s.date === selectedDate && String(s.sportId) === String(activeSportId));

  const slotForHour = (hour) => daySlots.find(s => parseInt(s.startTime.split(':')[0]) === hour);

  const handleHourClick = async (hour) => {
    if (!sportDoc) return;
    const existing = slotForHour(hour);
    setSaving(hour);
    try {
      if (existing) {
        if (existing.bookedCount > 0) { setSaving(null); return; } // can't remove booked
        await API.delete(`/grounds/${ground._id}/slots/${existing._id}`);
        showMessage(`Slot ${fmt(hour)} removed`);
      } else {
        await API.post(`/grounds/${ground._id}/slots`, {
          sportId: sportDoc._id,
          courtIds: sportDoc.bookingMode === 'specific' ? selectedCourtIds : undefined,
          slots: [{ date: selectedDate, startTime: toTimeStr(hour), endTime: toTimeStr(hour + 1) }],
        });
        showMessage(`Slot ${fmt(hour)} added ✅`);
      }
      onRefresh();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update slot', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (ground.venueMode !== 'live') {
    return (
      <div className="scm glass-card text-center py-16">
        <span className="text-5xl block mb-4">🚧</span>
        <p className="text-gray-500 text-sm font-semibold mb-1">Venue still in trial phase</p>
        <p className="text-gray-600 text-xs">Sport & slot booking opens once an admin marks this venue as live.</p>
      </div>
    );
  }

  return (
    <div className="scm flex flex-col gap-5">
      {/* Sport tabs */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">SPORTS AT THIS VENUE</h4>
          <button className="btn-secondary text-xs" onClick={() => setShowAddSport(v => !v)}>
            {showAddSport ? 'Cancel' : '+ Add Sport'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {(ground.sports || []).map(s => (
            <button
              key={s._id}
              onClick={() => setActiveSportId(s._id)}
              className={`tab-btn ${activeSportId === s._id ? 'tab-active' : 'tab-inactive'}`}
            >
              {s.name} {s.courts?.length > 0 ? `· ${s.courts.length} courts` : ''}
            </button>
          ))}
          {(!ground.sports || ground.sports.length === 0) && (
            <p className="text-gray-500 text-xs">No sports configured yet — add one to start creating slots.</p>
          )}
        </div>

        {showAddSport && (
          <form onSubmit={handleAddSport} className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sport</label>
                <select className="input-field" value={newSport.name} onChange={e => setNewSport({ ...newSport, name: e.target.value })}>
                  {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {!isPoolVenue && (
                <div>
                  <label className="label">Price / hour (₹)</label>
                  <input type="number" className="input-field" min="0" value={newSport.pricePerHour}
                    onChange={e => setNewSport({ ...newSport, pricePerHour: e.target.value })} required />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slot length (minutes)</label>
                <select className="input-field" value={newSport.slotDurationMinutes} onChange={e => setNewSport({ ...newSport, slotDurationMinutes: e.target.value })}>
                  {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
              {isPoolVenue ? (
                <div>
                  <label className="label">Headcount cap per slot (blank = no cap)</label>
                  <input type="number" className="input-field" min="1" placeholder="No cap"
                    value={newSport.capacityPerSlot} onChange={e => setNewSport({ ...newSport, capacityPerSlot: e.target.value })} />
                </div>
              ) : (
                <div>
                  <label className="label">Booking mode</label>
                  <select className="input-field" value={newSport.bookingMode} onChange={e => setNewSport({ ...newSport, bookingMode: e.target.value })}>
                    <option value="auto">Auto-assign any court</option>
                    <option value="specific">Player picks the court</option>
                  </select>
                </div>
              )}
            </div>
            <button className="btn-primary text-sm" disabled={savingSport}>{savingSport ? 'Adding…' : 'Add Sport'}</button>
          </form>
        )}
      </div>

      {sportDoc && (
        <>
          {/* Sport settings + court management */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide capitalize">{sportDoc.name} SETTINGS</h4>
              <button className="btn-danger text-xs" onClick={() => handleRemoveSport(sportDoc._id)}>Remove sport</button>
            </div>

            {!isPoolVenue && sportDoc.courts?.length >= 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Booking mode:</span>
                  <button
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${sportDoc.bookingMode === 'auto' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-black/5 dark:bg-white/5 text-gray-500'}`}
                    onClick={() => handleToggleMode('auto')}
                  >Auto-assign</button>
                  <button
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${sportDoc.bookingMode === 'specific' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-black/5 dark:bg-white/5 text-gray-500'}`}
                    onClick={() => handleToggleMode('specific')}
                  >Player picks court</button>
                </div>

                <label className="label">Courts ({sportDoc.courts?.length || 0})</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(sportDoc.courts || []).map(c => (
                    <div key={c._id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${c.isActive ? 'border-black/10 dark:border-white/10' : 'border-red-500/30 opacity-50'}`}>
                      <button onClick={() => toggleCourtActive(c)} title={c.isActive ? 'Active — click to disable' : 'Disabled — click to enable'}>
                        {c.isActive ? '🟢' : '⚪'}
                      </button>
                      <span>{c.name}</span>
                      <button onClick={() => handleRemoveCourt(c._id)} className="text-red-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddCourt} className="flex gap-2">
                  <input className="input-field flex-1" placeholder="e.g. Court 5" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} />
                  <button className="btn-secondary text-xs whitespace-nowrap">+ Add Court</button>
                </form>
                {sportDoc.bookingMode === 'auto' && (
                  <p className="text-gray-600 text-[11px] mt-2">
                    Auto-assign: players just book "a spot" — up to {sportDoc.courts.filter(c => c.isActive).length || 0} people can book the same time window and any active court gets used.
                  </p>
                )}
              </div>
            )}

            {isPoolVenue && (
              <p className="text-gray-600 text-xs mb-2">
                Headcount cap per slot: <span className="text-gray-900 dark:text-white font-semibold">{sportDoc.capacityPerSlot || 'No cap'}</span>
              </p>
            )}
          </div>

          {/* Slot calendar for this sport */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bebas text-lg text-gray-900 dark:text-white tracking-wide">SLOTS</h4>
            </div>

            {sportDoc.bookingMode === 'specific' && sportDoc.courts?.length > 0 && (
              <div className="mb-3">
                <label className="label">Add slots for which court(s)? (blank = all active courts)</label>
                <div className="flex flex-wrap gap-2">
                  {sportDoc.courts.filter(c => c.isActive).map(c => (
                    <button
                      key={c._id}
                      onClick={() => setSelectedCourtIds(ids => ids.includes(c._id) ? ids.filter(x => x !== c._id) : [...ids, c._id])}
                      className={`text-xs px-2.5 py-1 rounded-full border ${selectedCourtIds.includes(c._id) ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-black/10 dark:border-white/10 text-gray-500'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {getDates().map(d => (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${selectedDate === d ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'border-black/10 dark:border-white/10 text-gray-500'}`}>
                  {dayLabel(d)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {HOURS.map(h => {
                const slot = slotForHour(h);
                const state = !slot ? 'empty' : (slot.bookedCount > 0 ? (slot.bookedCount >= slot.capacity ? 'full' : 'partial') : 'available');
                const stateStyles = {
                  empty: 'border-black/10 dark:border-white/10 text-gray-500 hover:border-green-500/40',
                  available: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
                  partial: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
                  full: 'bg-red-500/15 border-red-500/40 text-red-400 cursor-not-allowed',
                };
                return (
                  <button
                    key={h}
                    disabled={saving === h || (slot && slot.bookedCount > 0)}
                    onClick={() => handleHourClick(h)}
                    className={`slot-pill border text-xs py-2 rounded-lg transition-all ${stateStyles[state]}`}
                    title={slot ? `Capacity ${slot.bookedCount}/${slot.capacity}` : 'Click to add'}
                  >
                    {saving === h ? '…' : fmt(h)}
                    {slot && slot.capacity > 1 && <div className="text-[10px] opacity-70">{slot.bookedCount}/{slot.capacity}</div>}
                  </button>
                );
              })}
            </div>
            <p className="text-gray-600 text-[11px] mt-3">
              🔵 available &nbsp; 🟠 partially booked &nbsp; 🔴 full/booked — click empty slots to add, click available (unbooked) slots to remove.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SportCourtManager;
