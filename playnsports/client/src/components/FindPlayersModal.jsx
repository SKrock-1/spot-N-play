import { useState, useEffect } from 'react';
import API from '../api/axios';
import { dataStore } from '../utils/dataStore';

const SPORTS = ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football'];
const SKILLS = ['any', 'beginner', 'intermediate', 'advanced', 'professional'];
const WHEN_OPTIONS = [
  { label: 'Right Now', minutesFromNow: 0 },
  { label: 'In 30 Minutes', minutesFromNow: 30 },
  { label: 'In 1 Hour', minutesFromNow: 60 },
  { label: 'Custom Time', minutesFromNow: null },
];
const DURATIONS = [
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
  { label: '3 Hours', minutes: 180 },
];

const FindPlayersModal = ({ onClose, onCreated }) => {
  const [sport, setSport] = useState('badminton');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null); // [lat, lng]
  const [locating, setLocating] = useState(false);
  const [whenIdx, setWhenIdx] = useState(0);
  const [customTime, setCustomTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [skillLevel, setSkillLevel] = useState('any');
  const [playersNeeded, setPlayersNeeded] = useState(3);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = dataStore.get('map:userPosition');
    if (cached.status === 'ready') {
      setCoords(cached.data);
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        dataStore.set('map:userPosition', c);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, []);

  const getScheduledFor = () => {
    const opt = WHEN_OPTIONS[whenIdx];
    if (opt.minutesFromNow !== null) {
      return new Date(Date.now() + opt.minutesFromNow * 60000);
    }
    return customTime ? new Date(customTime) : null;
  };

  const handleSubmit = async () => {
    setError('');
    if (!coords) {
      setError('We need your location to post this — allow location access and try again.');
      return;
    }
    const scheduledFor = getScheduledFor();
    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      setError('Pick a valid time for the game.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await API.post('/looking', {
        sport,
        lat: coords[0],
        lng: coords[1],
        locationName,
        skillLevel,
        playersNeeded,
        scheduledFor: scheduledFor.toISOString(),
        duration,
        note,
      });
      onCreated?.(data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not post your request — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-scroll rounded-3xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}>
            🏸 Find Players
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">✕</button>
        </div>

        {error && (
          <div className="mb-4 text-xs bg-red-400/10 border border-red-400/20 text-red-500 dark:text-red-400 rounded-xl px-3 py-2">{error}</div>
        )}

        {/* Sport */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Sport</label>
        <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white capitalize outline-none focus:border-green-400/50">
          {SPORTS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>

        {/* Location */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Location</label>
        <div className="mb-4">
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. LPU Sports Complex (optional label)"
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-green-400/50 placeholder:text-gray-400"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            {locating ? '📍 Getting your current location…' : coords ? '📍 Using your current location' : '⚠️ Location unavailable — enable it to post a request'}
          </p>
        </div>

        {/* When */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">When</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {WHEN_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setWhenIdx(i)}
              className={`text-xs font-semibold rounded-xl py-2 border transition-colors ${whenIdx === i ? 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400' : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-green-400/20'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {WHEN_OPTIONS[whenIdx].minutesFromNow === null && (
          <input
            type="datetime-local"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-green-400/50"
          />
        )}
        {WHEN_OPTIONS[whenIdx].minutesFromNow !== null && <div className="mb-4" />}

        {/* Duration */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Duration</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => setDuration(d.minutes)}
              className={`text-xs font-semibold rounded-xl py-2 border transition-colors ${duration === d.minutes ? 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400' : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-green-400/20'}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Skill level */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Skill Level</label>
        <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white capitalize outline-none focus:border-green-400/50">
          {SKILLS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>

        {/* Players needed */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Players Needed</label>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayersNeeded(n)}
              className={`flex-1 text-sm font-bold rounded-xl py-2 border transition-colors ${playersNeeded === n ? 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400' : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-green-400/20'}`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={30}
            value={playersNeeded}
            onChange={(e) => setPlayersNeeded(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-16 text-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-green-400/50"
          />
        </div>

        {/* Note */}
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Optional Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          placeholder="Friendly match. Bring your own racket."
          rows={2}
          className="w-full mb-5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-green-400/50 placeholder:text-gray-400 resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || !coords}
          className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl py-3 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
        >
          {submitting ? 'Going Live…' : 'Go Live'}
        </button>
      </div>
    </div>
  );
};

export default FindPlayersModal;
