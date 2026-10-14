import { useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ESPORTS_FORMATS, ESPORTS_GAMES, ESPORTS_PLATFORMS, FIELD_SPORTS, sportLabel } from './eventConstants.js';
import SubEventFields, { emptySubEvent, serializeSubEvents } from './SubEventFields.jsx';

const emptyForm = (user) => ({
  title: '',
  eventCategory: 'sports',
  sport: 'football',
  gameTitle: '',
  platform: '',
  matchFormat: '',
  serverRegion: '',
  prizePool: '',
  streamUrl: '',
  description: '',
  eventType: 'free',
  price: '',
  contactName: user?.name || '',
  contactNumber: user?.phone || '',
  venue: '',
  date: '',
  startTime: '',
  endTime: '',
  maxParticipants: '',
  registrationType: 'individual',
  teamSize: '',
  image: '',
});

const CreateEventForm = ({ onCreated, flash }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm(user));
  const [hasSubEvents, setHasSubEvents] = useState(false);
  const [subEvents, setSubEvents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    if (!form.title || !form.contactNumber) {
      flash('Please fill all required fields', 'error');
      return;
    }

    if (form.eventCategory === 'esports' && !form.gameTitle) {
      flash('Choose the esports game title', 'error');
      return;
    }

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
    } else if (!form.venue || !form.date || !form.startTime || !form.endTime) {
      flash('Please fill all required fields', 'error');
      return;
    } else if (form.eventType === 'paid' && (!form.price || Number(form.price) <= 0)) {
      flash('Please add a valid price for a paid event', 'error');
      return;
    } else if (form.registrationType === 'team' && (!form.teamSize || Number(form.teamSize) < 2)) {
      flash('Team size must be at least 2', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/events', {
        ...form,
        sport: form.eventCategory === 'esports' ? 'esports' : form.sport,
        price: form.eventType === 'paid' ? Number(form.price) : 0,
        maxParticipants: Number(form.maxParticipants) || 0,
        registrationType: hasSubEvents ? 'individual' : form.registrationType,
        teamSize: hasSubEvents ? 0 : (form.registrationType === 'team' ? Number(form.teamSize) || 0 : 0),
        subEvents: hasSubEvents ? serializeSubEvents(subEvents) : [],
      });
      flash('Event submitted for admin approval ✅ It will appear on Explore once approved.');
      setForm(emptyForm(user));
      setHasSubEvents(false);
      setSubEvents([]);
      onCreated?.();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="g-card g-cardIn flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div>
        <h3 className="font-bebas text-2xl tracking-wide text-white mb-1">Create an Event</h3>
        <p className="text-gray-500 text-sm">Submit the details below — an admin will review and approve your event before it goes live on the Explore page.</p>
      </div>

      {/* Title */}
      <div>
        <label className="g-label">Event Title *</label>
        <input name="title" value={form.title} onChange={handleChange} className="g-input" placeholder={form.eventCategory === 'esports' ? 'e.g. BGMI Campus Scrims' : 'e.g. Sunday Sports Meet'} required />
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

      {/* Description */}
      <div>
        <label className="g-label">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="g-input" rows={3} placeholder="What's this event about overall?" />
      </div>

      {/* Banner */}
      <div>
        <label className="g-label">Event Banner {hasSubEvents ? '(shown at the top of the event, above the sub-events list)' : '(optional)'}</label>
        {form.image && <img src={form.image} alt="Event banner preview" className="ev-banner mb-2" />}
        <input type="file" accept="image/*" onChange={handleImageChange} className="g-input" disabled={uploading} />
        {uploading && <p className="text-gray-500 text-xs mt-1">Uploading…</p>}
      </div>

      {/* Contact info — shown to players via "Contact Admin", kept for internal record */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="g-label">Contact Name</label>
          <input name="contactName" value={form.contactName} onChange={handleChange} className="g-input" placeholder="Your name" />
        </div>
        <div>
          <label className="g-label">Contact Number *</label>
          <input name="contactNumber" value={form.contactNumber} onChange={handleChange} className="g-input" placeholder="For admin reference" required />
        </div>
      </div>

      {/* Sub-events toggle */}
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
            <p className="text-gray-500 text-xs">Use this for multi-game tournaments, brackets or sports meets where each activity has its own schedule and capacity.</p>
          </div>
        </label>
      </div>

      {hasSubEvents ? (
        <div>
          <p className="ed-section-title" style={{ marginBottom: 10 }}>Sub-Events</p>
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
                <input type="number" min="1" name="price" value={form.price} onChange={handleChange} className="g-input" placeholder="e.g. 200" required />
              </div>
            )}
          </div>

          <div>
            <label className="g-label">{form.eventCategory === 'esports' ? 'Lobby / Stream / Location *' : 'Venue / Location *'}</label>
            <input name="venue" value={form.venue} onChange={handleChange} className="g-input" placeholder={form.eventCategory === 'esports' ? 'e.g. Discord lobby, custom room, YouTube stream' : 'e.g. Green Park Turf, Sector 21'} required />
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
                <input type="number" min="2" name="teamSize" value={form.teamSize} onChange={handleChange} className="g-input" placeholder="e.g. 5 for XL Cup" required />
              </div>
            )}
          </div>
        </>
      )}

      <button type="submit" disabled={submitting || uploading} className="g-btn-primary mt-1">
        {submitting ? 'Submitting…' : '🚀 Submit for Approval'}
      </button>
    </form>
  );
};

export default CreateEventForm;
