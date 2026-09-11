import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Navbar from './Navbar';
import MapLocationPicker from './MapLocationPicker';
import SportCourtManager from './SportCourtManager';
import PoolSlotManager from './PoolSlotManager';

const STATUS_BADGE = {
  pending: { label: 'Pending Review', color: 'bg-yellow-400/10 text-yellow-500 dark:text-yellow-400 border border-yellow-400/20' },
  approved: { label: 'Live', color: 'bg-green-400/10 text-green-500 dark:text-green-400 border border-green-400/20' },
  rejected: { label: 'Rejected', color: 'bg-red-400/10 text-red-500 dark:text-red-400 border border-red-400/20' },
};

// Shared owner-dashboard for any venue type that runs on the trial/interest
// lead flow instead of slot booking (currently: gym, pool). One venue per
// owner, same as the gym flow this was lifted from — VenueLead + the
// /venues/:id/claim-trial + /checkin endpoints are already venue-type
// agnostic on the backend.
const LeadVenueDashboard = ({ venueType, title, subtitle, icon, namePlaceholder, descriptionPlaceholder, emptyLeadsHint }) => {
  const [activeTab, setActiveTab] = useState('venue');
  const [venue, setVenue] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkinTicket, setCheckinTicket] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);

  const [form, setForm] = useState({
    name: '', address: '', coordinates: [], description: '', images: [],
  });

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const fetchVenue = async () => {
    try {
      const { data } = await API.get('/grounds/my');
      const mine = data.find((g) => g.venueType === venueType) || null;
      setVenue(mine);
      if (mine) {
        setForm({
          name: mine.name,
          address: mine.address,
          coordinates: mine.location?.coordinates || [],
          description: mine.description || '',
          images: mine.images || [],
        });
      }
    } catch {
      setVenue(null);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data } = await API.get('/venues/my/leads');
      setLeads(data);
    } catch {
      setLeads([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchVenue(), fetchLeads()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueType]);

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (form.images.length + files.length > 6) {
      showMessage('Up to 6 images total', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await API.post('/upload/venue', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, images: [...f.images, ...data.fileUrls] }));
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url) => {
    setForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.address.trim() || form.coordinates.length !== 2) {
      showMessage('Name, address, and a map pin are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        longitude: form.coordinates[0],
        latitude: form.coordinates[1],
        description: form.description,
        images: form.images,
        venueType,
      };
      if (venue) {
        const { data } = await API.put(`/grounds/${venue._id}`, payload);
        setVenue(data);
        showMessage(`${title} profile updated ${icon}`);
      } else {
        await API.post('/grounds', payload);
        showMessage(`Submitted for review — an admin will approve it shortly ${icon}`);
        await fetchVenue();
      }
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!venue || !checkinTicket.trim()) return;
    setCheckinBusy(true);
    try {
      const { data } = await API.patch(`/venues/${venue._id}/checkin`, { ticketId: checkinTicket.trim() });
      showMessage(data.message);
      setCheckinTicket('');
      fetchLeads();
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckinBusy(false);
    }
  };

  const badge = venue ? STATUS_BADGE[venue.approvalStatus] : null;
  const checkedInCount = leads.filter((l) => l.status === 'checked_in').length;

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />

      {showMapPicker && (
        <MapLocationPicker
          initialCoordinates={form.coordinates}
          initialAddress={form.address}
          onConfirm={(coords, addr) => {
            // Coordinates always update; the manually-typed address is only
            // prefilled from the map's detected label if still empty — it
            // never overwrites something already typed.
            setForm((f) => ({ ...f, coordinates: coords, address: f.address ? f.address : addr }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/10 border border-green-400/25 text-green-500 dark:text-green-400'
            : 'bg-red-400/10 border border-red-400/25 text-red-500 dark:text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <h1 className="text-3xl sm:text-4xl mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}>
          {title} Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{subtitle}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 text-center">
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">{leads.length}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{venue?.venueMode === 'interest' ? 'Interested Users' : 'Total Leads'}</p>
          </div>
          {venue?.venueMode !== 'interest' && (
            <>
              <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-green-500 dark:text-green-400">{checkedInCount}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Checked In</p>
              </div>
              <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 text-center">
                <p className="text-2xl font-bold text-green-500 dark:text-green-400">{leads.length - checkedInCount}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Pending Visit</p>
              </div>
            </>
          )}
        </div>

        {/* Quick action: full bookings board + gate scanner on one page */}
        {venue && venueType === 'pool' && (
          <Link
            to={`/pool/manage/${venue._id}`}
            className="flex items-center gap-3 mb-6 rounded-2xl border border-green-400/25 bg-green-400/8 hover:bg-green-400/15 transition-colors p-4"
          >
            <span className="w-10 h-10 rounded-xl bg-green-400 flex items-center justify-center text-black text-lg font-black flex-shrink-0">📋</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">Bookings & Gate Scanner</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Live booking data, QR check-in, schedule & plans — all in one place</span>
            </span>
            <span className="ml-auto text-green-500 dark:text-green-400 font-bold flex-shrink-0">→</span>
          </Link>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            ['venue', `My ${title}`],
            ['leads', `Leads (${leads.length})`],
            ...(venue?.venueMode === 'live' ? [['booking', 'Sports & Slots']] : []),
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`text-sm font-semibold rounded-xl px-4 py-2 border transition-colors ${activeTab === id ? 'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400' : 'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'booking' && venue?.venueMode === 'live' && (
          venueType === 'pool'
            ? <PoolSlotManager ground={venue} onRefresh={fetchVenue} showMessage={showMessage} />
            : <SportCourtManager ground={venue} onRefresh={fetchVenue} showMessage={showMessage} />
        )}

        {activeTab === 'venue' && (
          <div className="rounded-3xl border border-black/8 dark:border-white/8 p-5 sm:p-6">
            {venue && badge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${badge.color}`}>{badge.label}</span>
            )}
            {venue?.approvalStatus === 'rejected' && venue.rejectionReason && (
              <p className="text-red-500 dark:text-red-400 text-xs mb-4">Reason: {venue.rejectionReason}</p>
            )}

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{title} Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={namePlaceholder}
              className="w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50"
            />

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Address (type it yourself — most accurate)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address, landmark, floor etc."
              className="w-full mb-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50"
            />
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setShowMapPicker(true)} className="bg-green-400/10 border border-green-400/25 text-green-500 dark:text-green-400 text-xs font-semibold rounded-xl px-4 py-2 whitespace-nowrap">
                📍 {form.coordinates.length === 2 ? 'Map Pin Set ✅' : 'Pin on Map'}
              </button>
              <p className="text-[11px] text-gray-400">The map pin only sets where you show up on the map — it's separate from the address above.</p>
            </div>

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 1000) })}
              rows={4}
              placeholder={descriptionPlaceholder}
              className="w-full mb-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50 resize-none"
            />

            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Photos ({form.images.length}/6)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.images.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(url)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">✕</button>
                </div>
              ))}
              {form.images.length < 6 && (
                <label className="w-20 h-20 rounded-xl border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-green-400/40">
                  {uploading ? '…' : '+ Add'}
                  <input type="file" accept="image/*" multiple hidden onChange={handleImagePick} disabled={uploading} />
                </label>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-5">Cover photo first, ideally 16:9 (1200×675px+). Gallery photos: 4:3 or square, 800×800px+.</p>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl px-6 py-3 disabled:opacity-50"
            >
              {venue ? 'Save Changes' : 'Submit for Review'}
            </button>
          </div>
        )}

        {activeTab === 'leads' && (
          <div>
            {venue && venue.venueMode !== 'interest' && (
              <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 mb-4 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={checkinTicket}
                  onChange={(e) => setCheckinTicket(e.target.value)}
                  placeholder="Enter ticket ID to check someone in (e.g. SPT-XXXXXXXX)"
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50 uppercase"
                />
                <button
                  onClick={handleCheckIn}
                  disabled={checkinBusy || !checkinTicket.trim()}
                  className="bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl px-5 py-2.5 disabled:opacity-50 whitespace-nowrap"
                >
                  {checkinBusy ? 'Checking…' : 'Check In'}
                </button>
              </div>
            )}
            {venue?.venueMode === 'interest' && leads.length > 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                These are people who opened your venue while it's in interest-only mode — no ticket or check-in involved, just a signal that they'd book here.
              </p>
            )}

            {leads.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="text-4xl">🎟️</span>
                <p className="text-sm mt-2">{emptyLeadsHint}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden">
                {leads.map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={lead.user?.avatar || '/favicon.svg'} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{lead.user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {lead.user?.phone || lead.user?.email}{lead.type === 'trial' ? ` · ${lead.ticketId}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      lead.status === 'checked_in' ? 'bg-green-400/10 text-green-500 dark:text-green-400 border border-green-400/20'
                      : lead.status === 'expired' ? 'bg-gray-400/10 text-gray-500 border border-gray-400/20'
                      : 'bg-yellow-400/10 text-yellow-500 dark:text-yellow-400 border border-yellow-400/20'
                    }`}>
                      {lead.status === 'checked_in' ? '✅ Checked In' : lead.status === 'expired' ? 'Expired' : lead.type === 'interest' ? '👀 Interested' : '🎟️ Interested'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadVenueDashboard;
