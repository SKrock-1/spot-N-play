import { useState } from 'react';
import API from '../../api/axios';
import { ESPORTS_FORMATS, ESPORTS_GAMES, ESPORTS_PLATFORMS, FIELD_SPORTS, sportLabel } from './eventConstants.js';
import SubEventFields, { emptySubEvent, serializeSubEvents } from './SubEventFields.jsx';

const EditEventModal = ({ event, onClose, onUpdated, flash }) => {
  const initialHasSubEvents = event.subEvents?.length > 0;

  const [form, setForm] = useState({
    title: event.title,
    eventCategory: event.eventCategory || (event.sport === 'esports' ? 'esports' : 'sports'),
    sport: event.sport,
    gameTitle: event.gameTitle || '',
    platform: event.platform || '',
    matchFormat: event.matchFormat || '',
    serverRegion: event.serverRegion || '',
    prizePool: event.prizePool || '',
    streamUrl: event.streamUrl || '',
    description: event.description || '',
    eventType: event.eventType,
    price: event.price || '',
    contactName: event.contactName || '',
    contactNumber: event.contactNumber || '',
    venue: event.venue,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    maxParticipants: event.maxParticipants || '',
    registrationType: event.registrationType || 'individual',
    teamSize: event.teamSize || '',
    image: event.image || '',
  });
  const [hasSubEvents, setHasSubEvents] = useState(initialHasSubEvents);
  const [subEvents, setSubEvents] = useState(
    (event.subEvents || []).map((se) => ({
      ...se,
      price: se.price || '',
      capacity: se.capacity || '',
      maxTicketsPerBooking: se.maxTicketsPerBooking || '1',
      registrationType: se.registrationType || 'individual',
      teamSize: se.teamSize || '',
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'eventCategory') {
        return {
          ...prev,
          eventCategory: value,
          sport: value === 'esports' ? 'esports' : (prev.sport === 'esports' ? 'football' : prev.sport),
          venue: value === 'esports' && !prev.venue ? 'Online lobby / Discord' : prev.venue,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await API.post('/upload/event', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, image: data.fileUrl }));
    } catch (err) {
      flash(err.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggleSubEvents = (checked) => {
    setHasSubEvents(checked);
    if (checked && subEvents.length === 0) {
      setSubEvents([emptySubEvent()]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSubEvents) {
      if (subEvents.length === 0) {
        flash('Add at least one sub-event, or switch off "Multiple Sub-Events"', 'error');
        return;
      }
      for (const se of subEvents) {
        if (!se.title || !se.venue || !se.date || !se.startTime || !se.endTime) {
          flash('Every sub-event needs a title, venue, date and time', 'error');
          return;
        }
        if (se.eventType === 'paid' && (!se.price || Number(se.price) <= 0)) {
          flash(`Add a valid ticket price for "${se.title}"`, 'error');
          return;
        }
        if (se.registrationType === 'team' && (!se.teamSize || Number(se.teamSize) < 2)) {
          flash(`Team "${se.title}" needs team size ≥2`, 'error');
          return;
        }
      }
    } else {
      if (form.eventCategory === 'esports' && !form.gameTitle) {
        flash('Choose the esports game title', 'error');
        return;
      }
      if (!form.venue || !form.date || !form.startTime || !form.endTime) {
        flash('Please fill all required fields', 'error');
        return;
      }
      if (form.eventType === 'paid' && (!form.price || Number(form.price) <= 0)) {
        flash('Please add a valid price for a paid event', 'error');
        return;
      }
      if (form.registrationType === 'team' && (!form.teamSize || Number(form.teamSize) < 2)) {
        flash('Team size must be at least 2', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await API.put(`/events/${event._id}`, {
        ...form,
        sport: form.eventCategory === 'esports' ? 'esports' : form.sport,
        price: form.eventType === 'paid' ? Number(form.price) : 0,
        maxParticipants: Number(form.maxParticipants) || 0,
        registrationType: hasSubEvents ? 'individual' : form.registrationType,
        teamSize: hasSubEvents ? 0 : (form.registrationType === 'team' ? Number(form.teamSize) || 0 : 0),
        subEvents: hasSubEvents ? serializeSubEvents(subEvents) : [],
      });
      flash('Event updated ✅');
      onUpdated();
      onClose();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to update event', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-overlay g-overlayIn" onClick={onClose}>
      <div className="g-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-bebas text-2xl tracking-wide text-white">Edit Event</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4" style={{ flex: 1 }}>
          <div>
            <label className="g-label">Event Title *</label>
            <input name="title" value={form.title} onChange={handleChange} className="g-input" required />
          </div>

          <div>
            <label className="g-label">Event Category *</label>
            <select name="eventCategory" value={form.eventCategory} onChange={handleChange} className="g-input">
              <option value="sports">Sports</option>
              <option value="esports">Esports</option>
            </select>
          </div>

          {form.eventCategory === 'esports' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="g-label">Game *</label>
                  <select name="gameTitle" value={form.gameTitle} onChange={handleChange} className="g-input" required>
                    <option value="">Select game</option>
                    {ESPORTS_GAMES.map((game) => <option key={game} value={game}>{game}</option>)}
                  </select>
                </div>
                <div>
                  <label className="g-label">Platform</label>
                  <select name="platform" value={form.platform} onChange={handleChange} className="g-input">
                    <option value="">Any platform</option>
                    {ESPORTS_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="g-label">Format</label>
                  <select name="matchFormat" value={form.matchFormat} onChange={handleChange} className="g-input">
                    <option value="">Select format</option>
                    {ESPORTS_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
                  </select>
                </div>
                <div>
                  <label className="g-label">Server / Region</label>
                  <input name="serverRegion" value={form.serverRegion} onChange={handleChange} className="g-input" placeholder="e.g. India, Asia, Mumbai" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="g-label">Prize Pool (₹, optional)</label>
                  <input type="number" min="0" name="prizePool" value={form.prizePool} onChange={handleChange} className="g-input" placeholder="e.g. 5000" />
                </div>
                <div>
                  <label className="g-label">Stream Link (optional)</label>
                  <input name="streamUrl" value={form.streamUrl} onChange={handleChange} className="g-input" placeholder="e.g. https://twitch.tv/your-lobby" />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="g-label">Sport *</label>
              <select name="sport" value={form.sport} onChange={handleChange} className="g-input">
                {FIELD_SPORTS.map((s) => (
                  <option key={s} value={s}>{sportLabel(s)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="g-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="g-input" rows={3} />
          </div>

          <div>
            <label className="g-label">Event Banner</label>
            {form.image && <img src={form.image} alt="Event banner preview" className="ev-banner mb-2" />}
            <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
            {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="g-label">Contact Name</label>
              <input name="contactName" value={form.contactName} onChange={handleChange} className="g-input" />
            </div>
            <div>
              <label className="g-label">Contact Number *</label>
              <input name="contactNumber" value={form.contactNumber} onChange={handleChange} className="g-input" required />
            </div>
          </div>

          <div className="sev-card">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSubEvents}
                onChange={(e) => toggleSubEvents(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#4ade80' }}
              />
              <div>
                <p className="font-semibold text-sm text-white">This event has multiple sub-events</p>
                <p className="text-gray-500 text-xs">Each sub-event gets its own venue, time, price and capacity.</p>
              </div>
            </label>
          </div>

          {hasSubEvents ? (
            <div>
              <p className="g-label" style={{ marginBottom: 10 }}>Sub-Events</p>
              <SubEventFields subEvents={subEvents} onChangeAll={setSubEvents} flash={flash} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="g-label">Event Type *</label>
                  <select name="eventType" value={form.eventType} onChange={handleChange} className="g-input">
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {form.eventType === 'paid' && (
                  <div>
                    <label className="g-label">Entry Fee per Person (₹) *</label>
                    <input type="number" min="1" name="price" value={form.price} onChange={handleChange} className="g-input" required />
                  </div>
                )}
              </div>

              <div>
                <label className="g-label">{form.eventCategory === 'esports' ? 'Lobby / Stream / Location *' : 'Venue / Location *'}</label>
                <input name="venue" value={form.venue} onChange={handleChange} className="g-input" placeholder={form.eventCategory === 'esports' ? 'e.g. Discord lobby, custom room, YouTube stream' : ''} required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="g-label">Date *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} className="g-input" required />
                </div>
                <div>
                  <label className="g-label">Start Time *</label>
                  <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="g-input" required />
                </div>
                <div>
                  <label className="g-label">End Time *</label>
                  <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="g-input" required />
                </div>
              </div>

              <div>
                <label className="g-label">Max Participants (optional)</label>
                <input type="number" min="0" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} className="g-input" placeholder="Leave empty for unlimited" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="g-label">Registration Type</label>
                  <select name="registrationType" value={form.registrationType} onChange={handleChange} className="g-input">
                    <option value="individual">Individual (per person)</option>
                    <option value="team">Team (one booking = one team)</option>
                  </select>
                </div>
                {form.registrationType === 'team' && (
                  <div>
                    <label className="g-label">Team Size * (incl. captain)</label>
                    <input type="number" min="2" name="teamSize" value={form.teamSize} onChange={handleChange} className="g-input" placeholder="e.g. 5" required />
                  </div>
                )}
              </div>
            </>
          )}
        </form>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="g-btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || uploading} className="g-btn-primary" style={{ flex: 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
