import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import MapLocationPicker from '../components/MapLocationPicker';
import SportCourtManager from '../components/SportCourtManager';
import { dataStore } from '../utils/dataStore';

const GroundOwnerDashboard = () => {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState([]);
  const [selectedGround, setSelectedGround] = useState(null);
  const [groundBookings, setGroundBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('grounds');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroundId, setEditingGroundId] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const EMPTY_GROUND_FORM = {
    name: '', sport: 'cricket', address: '',
    pricePerHour: '', amenities: [], coordinates: [], isSocial: false, images: [],
  };
  const [groundForm, setGroundForm] = useState(EMPTY_GROUND_FORM);
  const [amenityInput, setAmenityInput] = useState('');
  const PRESET_AMENITIES = ['Parking', 'Washroom', 'Drinking Water', 'Floodlights', 'Seating', 'Changing Room', 'First Aid', 'Equipment Rental'];

  // Leads (trial claims / interest signals) for whichever ground is
  // selected — only fetched/shown when that ground isn't 'live' yet, since
  // admin can now put ANY venue type into trial/interest mode, not just
  // gym/pool.
  const [venueLeads, setVenueLeads] = useState([]);
  const [checkinTicket, setCheckinTicket] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);

  const fetchVenueLeads = async () => {
    try {
      const { data } = await API.get('/venues/my/leads');
      setVenueLeads(data);
    } catch {
      setVenueLeads([]);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedGround || !checkinTicket.trim()) return;
    setCheckinBusy(true);
    try {
      const { data } = await API.patch(`/venues/${selectedGround._id}/checkin`, { ticketId: checkinTicket.trim() });
      showMessage(data.message);
      setCheckinTicket('');
      fetchVenueLeads();
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckinBusy(false);
    }
  };

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
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-spin { animation: spin 1s linear infinite; }

      .shimmer-text {
        background: linear-gradient(90deg, #4ade80, #86efac, #4ade80);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .grid-dots {
        background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      .glass-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 24px;
        padding: 24px;
      }

      .stat-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { border-color: rgba(74,222,128,0.15); transform: translateY(-3px); }
      .stat-green::before { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
      .stat-blue::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }
      .stat-orange::before { background: linear-gradient(90deg, transparent, #fb923c, transparent); }
      .stat-purple::before { background: linear-gradient(90deg, transparent, #a78bfa, transparent); }

      .tab-btn {
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      .tab-active {
        background: rgba(74,222,128,0.12);
        color: #4ade80;
        border: 1px solid rgba(74,222,128,0.2);
      }
      .tab-inactive {
        background: transparent;
        color: #6b7280;
        border: 1px solid transparent;
      }
      .tab-inactive:hover { color: #9ca3af; }

      .input-field {
        width: 100%;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 12px 14px;
        color: inherit;
        font-size: 14px;
        outline: none;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        box-sizing: border-box;
      }
      .input-field:focus {
        border-color: rgba(74,222,128,0.4);
        box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
      }
      .input-field::placeholder { color: #6b7280; opacity: 0.7; }
      .input-field option { background: #111; }

      .label {
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 6px;
        display: block;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 14px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        border: none;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transition: left 0.4s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
      .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

      .btn-secondary {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: #9ca3af;
        font-weight: 500;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 13px;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .btn-secondary:hover {
        background: rgba(255,255,255,0.06);
        border-color: #9ca3af;
        color: white;
      }

      .btn-danger {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.15);
        color: rgba(239,68,68,0.7);
        font-weight: 600;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 13px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .btn-danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

      .ground-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        cursor: pointer;
      }
      .ground-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .ground-card:hover::before { opacity: 1; }
      .ground-card:hover { border-color: rgba(74,222,128,0.15); }
      .ground-card.selected {
        border-color: rgba(74,222,128,0.3);
        background: rgba(74,222,128,0.03);
      }
      .ground-card.selected::before { opacity: 1; }

      .booking-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 14px;
        padding: 14px;
        transition: all 0.2s ease;
      }
      .booking-card:hover { border-color: rgba(74,222,128,0.1); }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 100px;
      }

      .slot-pill {
        background: rgba(74,222,128,0.06);
        border: 1px solid rgba(74,222,128,0.12);
        color: #6b7280;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 100px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .slot-pill.booked {
        background: rgba(239,68,68,0.06);
        border-color: rgba(239,68,68,0.12);
        color: rgba(239,68,68,0.6);
      }

      .progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.06);
        border-radius: 100px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4ade80, #22c55e);
        border-radius: 100px;
        transition: width 0.5s ease;
      }

      .revenue-card {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.1);
        border-radius: 16px;
        padding: 16px;
      }

      /* Light mode overrides */
      @media (prefers-color-scheme: light) {
        .input-field { color: #111; }
        .input-field option { background: #fff; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const cached = dataStore.get('dashboard:owner:grounds');
    if (cached.status === 'ready') {
      setGrounds(cached.data);
      return;
    }
    fetchGrounds();
  }, []);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (groundForm.images.length + files.length > 6) {
      showMessage('Up to 6 images total', 'error');
      return;
    }
    setUploadingImages(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await API.post('/upload/venue', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGroundForm((f) => ({ ...f, images: [...f.images, ...data.fileUrls] }));
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = (url) => {
    setGroundForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  };

  const fetchGrounds = async () => {
    try {
      const { data } = await API.get('/grounds/my');
      setGrounds(data);
      dataStore.set('dashboard:owner:grounds', data);
      // If a ground was selected, refresh it from fresh data
      if (selectedGround) {
        const refreshed = data.find(g => g._id === selectedGround._id);
        if (refreshed) setSelectedGround(refreshed);
      }
    } catch (err) {
      console.error('fetchGrounds error:', err);
      setGrounds([]);
    }
  };

  const fetchGroundBookings = async (groundId) => {
    try {
      const { data } = await API.get(`/bookings/grounds/${groundId}`);
      setGroundBookings(data);
    } catch { setGroundBookings([]); }
  };

  const handleSelectGround = (ground) => {
    if (selectedGround?._id === ground._id) {
      setSelectedGround(null);
      setGroundBookings([]);
    } else {
      setSelectedGround(ground);
      if (ground.venueMode === 'live' || !ground.venueMode) {
        fetchGroundBookings(ground._id);
        setActiveTab('bookings');
      } else {
        fetchVenueLeads();
        setActiveTab('grounds');
      }
    }
  };

  const handleAddAmenity = (val) => {
    const trimmed = val.trim();
    if (trimmed && !groundForm.amenities.includes(trimmed)) {
      setGroundForm({ ...groundForm, amenities: [...groundForm.amenities, trimmed] });
    }
    setAmenityInput('');
  };

  const handleRemoveAmenity = (val) => {
    setGroundForm({ ...groundForm, amenities: groundForm.amenities.filter(a => a !== val) });
  };

  const handleCreateGround = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: groundForm.name,
        sport: groundForm.sport,
        address: groundForm.address,
        pricePerHour: Number(groundForm.pricePerHour),
        amenities: groundForm.amenities,
        longitude: groundForm.coordinates[0],
        latitude: groundForm.coordinates[1],
        isSocial: groundForm.isSocial,
        images: groundForm.images,
      };

      if (isEditing) {
        const { data } = await API.put(`/grounds/${editingGroundId}`, payload);
        showMessage('Ground updated successfully! 🏟️');
        setSelectedGround(data);
      } else {
        await API.post('/grounds', payload);
        showMessage('Ground created successfully! 🏟️');
      }

      setGroundForm(EMPTY_GROUND_FORM);
      setIsEditing(false);
      setEditingGroundId(null);
      await fetchGrounds();
      setActiveTab('grounds');
    } catch (err) {
      showMessage(err.response?.data?.message || (isEditing ? 'Failed to update ground' : 'Failed to create ground'), 'error');
    } finally { setLoading(false); }
  };

  const handleEditGround = (ground) => {
    setGroundForm({
      name: ground.name,
      sport: ground.sport,
      address: ground.address,
      pricePerHour: ground.pricePerHour,
      amenities: ground.amenities || [],
      coordinates: ground.location?.coordinates ? [ground.location.coordinates[0], ground.location.coordinates[1]] : [],
      isSocial: ground.isSocial || false,
      images: ground.images || [],
    });
    setEditingGroundId(ground._id);
    setIsEditing(true);
    setActiveTab('create');
  };

  const handleDeleteGround = async (groundId) => {
    if (!window.confirm('Delete this ground permanently?')) return;
    try {
      await API.delete(`/grounds/${groundId}`);
      showMessage('Ground deleted');
      setSelectedGround(null);
      setGroundBookings([]);
      fetchGrounds();
    } catch { showMessage('Failed to delete', 'error'); }
  };

  // Called by SportCourtManager after adding/removing a sport, court, or slot — refresh ground data
  const handleSlotRefresh = async () => {
    await fetchGrounds();
  };

  const getStatusBadge = (status) => {
    const map = {
      pending_approval: { label: 'Pending Approval', color: 'bg-purple-400/10 text-purple-400 border border-purple-400/20' },
      advance_pending: { label: 'Advance Pending', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
      advance_paid: { label: 'Advance Paid', color: 'bg-blue-400/10 text-blue-400 border border-blue-400/20' },
      completed: { label: 'Completed 🎉', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      refunded: { label: 'Refunded', color: 'bg-gray-400/10 text-gray-400 border border-gray-400/20' },
      cancelled: { label: 'Cancelled', color: 'bg-red-400/10 text-red-400 border border-red-400/20' },
    };
    return map[status] || { label: status, color: 'bg-white/10 text-white' };
  };

  const getSportEmoji = (sport) => {
    const map = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', Kabbadi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', gym: '🏋️', swimming: '🏊', esports: '🎮' };
    return map[sport] || map[sport?.toLowerCase?.()] || '🏆';
  };

  const totalRevenue = grounds.reduce((sum, g) => {
    return sum + (g.slots?.filter(s => s.isBooked).length * g.pricePerHour);
  }, 0);
  const totalSlots = grounds.reduce((sum, g) => sum + (g.slots?.length || 0), 0);
  const bookedSlots = grounds.reduce((sum, g) => sum + (g.slots?.filter(s => s.isBooked).length || 0), 0);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {showMapPicker && (
        <MapLocationPicker
          initialCoordinates={groundForm.coordinates}
          initialAddress={groundForm.address}
          onConfirm={(coords, addr) => {
            // Coordinates always update; the manually-typed address is only
            // prefilled from the map's detected label if it's still empty —
            // it never overwrites something the owner already typed, since
            // map lookups often miss floor/landmark detail.
            setGroundForm((f) => ({ ...f, coordinates: coords, address: f.address ? f.address : addr }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Ground Owner</p>
            <h1 className="font-bebas text-5xl tracking-wide shimmer-text">
              {user?.name?.split(' ')[0]}'S DASHBOARD
            </h1>
            <p className="text-gray-600 text-sm mt-1">Manage your grounds and track bookings 🏟️</p>
          </div>
          <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:border-green-400/30 transition-colors flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-green-400/10 flex items-center justify-center text-green-400 font-bold text-sm">
                {user?.name?.charAt(0)}
              </div>
            )}
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fadeUp-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'My Grounds', value: grounds.length, icon: '🏟️', color: 'stat-green' },
            { label: 'Total Slots', value: totalSlots, icon: '📅', color: 'stat-blue' },
            { label: 'Slots Booked', value: bookedSlots, icon: '✅', color: 'stat-orange' },
            { label: 'Est. Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: '💰', color: 'stat-purple' },
          ].map((stat, i) => (
            <div key={i} className={`stat-card ${stat.color}`}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-bebas text-3xl text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="animate-fadeUp-3 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — My Grounds List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">MY GROUNDS</h2>
              <button onClick={() => { setIsEditing(false); setEditingGroundId(null); setGroundForm(EMPTY_GROUND_FORM); setActiveTab('create'); }} className="btn-secondary text-xs py-2 px-3">
                + New Ground
              </button>
            </div>

            {grounds.length === 0 ? (
              <div className="glass-card text-center py-10">
                <span className="text-4xl block mb-3">🏟️</span>
                <p className="text-gray-500 text-sm">No grounds yet</p>
                <button onClick={() => setActiveTab('create')} className="btn-primary mt-4 text-sm px-6 py-2.5">
                  Create First Ground
                </button>
              </div>
            ) : grounds.map((ground, i) => {
              const available = ground.slots?.filter(s => !s.isBooked).length || 0;
              const booked = ground.slots?.filter(s => s.isBooked).length || 0;
              const total = ground.slots?.length || 0;
              const fillPct = total > 0 ? (booked / total) * 100 : 0;
              const isSelected = selectedGround?._id === ground._id;

              return (
                <div
                  key={ground._id}
                  onClick={() => handleSelectGround(ground)}
                  className={`ground-card animate-cardIn ${isSelected ? 'selected' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                      {getSportEmoji(ground.sport)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm truncate flex items-center gap-2">
                        {ground.name}
                        {ground.isSocial && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold tracking-widest leading-none">SOCIAL</span>}
                        {ground.venueMode === 'trial' && <span className="text-[10px] bg-orange-400/15 border border-orange-400/25 text-orange-400 px-1.5 py-0.5 rounded-full font-bold leading-none">TRIAL</span>}
                        {ground.venueMode === 'interest' && <span className="text-[10px] bg-blue-400/15 border border-blue-400/25 text-blue-400 px-1.5 py-0.5 rounded-full font-bold leading-none">INTEREST</span>}
                      </p>
                      <p className="text-gray-600 text-xs truncate">📍 {ground.address}</p>
                    </div>
                    {isSelected && (
                      <span className="text-green-400 text-xs font-semibold flex-shrink-0">✓</span>
                    )}
                  </div>

                  {ground.venueMode && ground.venueMode !== 'live' ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {ground.venueMode === 'trial' ? `🎟️ ${ground.trialLeadCount ?? 0} trial claim(s)` : `👀 ${ground.interestLeadCount ?? 0} interested`}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-600">{booked}/{total} booked</span>
                        <span className="text-green-400 font-semibold">{ground.isSocial ? 'Free' : `₹${ground.pricePerHour}/hr`}</span>
                      </div>

                      <div className="progress-bar mb-3">
                        <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 flex-wrap items-center">
                    {ground.approvalStatus === 'pending' && (
                      <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">⏳ Pending Approval</span>
                    )}
                    {ground.approvalStatus === 'rejected' && (
                      <span className="text-[10px] bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-0.5 rounded-full font-semibold">❌ Rejected</span>
                    )}
                    {ground.approvalStatus === 'approved' && (
                      <>
                        <span className="slot-pill">✅ {available} free</span>
                        <span className="slot-pill booked">🔴 {booked} booked</span>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditGround(ground); }}
                      className="ml-auto text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20 px-3 py-1 rounded-full hover:bg-blue-400/20 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — Tabs Panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'grounds', label: '📋 Overview' },
                ...(!selectedGround || selectedGround.venueMode === 'live' || !selectedGround.venueMode ? [
                  { id: 'bookings', label: `📅 Bookings${selectedGround ? ` (${groundBookings.length})` : ''}` },
                  { id: 'slots', label: '🗓️ Manage Slots' },
                ] : [
                  { id: 'leads', label: `${selectedGround.venueMode === 'interest' ? '👀' : '🎟️'} Leads (${venueLeads.filter(l => l.venue?._id === selectedGround._id).length})` },
                ]),
                { id: 'create', label: isEditing ? '✏️ Edit Ground' : '🏟️ New Ground' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'grounds' && (
              <div className="flex flex-col gap-4">
                {selectedGround ? (
                  <>
                    <div className="glass-card animate-cardIn">
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                        <div>
                          <h3 className="font-bebas text-2xl text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {selectedGround.name}
                            {selectedGround.isSocial && <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded font-bold tracking-wider">SOCIAL</span>}
                            {selectedGround.venueMode === 'trial' && <span className="bg-orange-400/15 border border-orange-400/25 text-orange-400 text-xs px-2 py-0.5 rounded-full font-bold">🎟️ TRIAL</span>}
                            {selectedGround.venueMode === 'interest' && <span className="bg-blue-400/15 border border-blue-400/25 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">👀 INTEREST ONLY</span>}
                          </h3>
                          <p className="text-gray-500 text-sm">📍 {selectedGround.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditGround(selectedGround)} className="btn-secondary text-xs py-2">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteGround(selectedGround._id)} className="btn-danger text-xs py-2">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      <div className="revenue-card mb-4">
                        {selectedGround.approvalStatus !== 'approved' && (
                          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                            selectedGround.approvalStatus === 'pending'
                              ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                              : 'bg-red-400/10 border border-red-400/20 text-red-400'
                          }`}>
                            {selectedGround.approvalStatus === 'pending' ? '⏳ Awaiting admin approval — ground is not visible to players yet' : `❌ Rejected${selectedGround.rejectionReason ? `: ${selectedGround.rejectionReason}` : ''}`}
                          </div>
                        )}
                        {selectedGround.approvalStatus === 'approved' && selectedGround.venueMode !== 'live' && (
                          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${selectedGround.venueMode === 'trial' ? 'bg-orange-400/10 border border-orange-400/20 text-orange-400' : 'bg-blue-400/10 border border-blue-400/20 text-blue-400'}`}>
                            {selectedGround.venueMode === 'trial'
                              ? '🎟️ This ground is in trial mode — players claim a 2-day free trial instead of booking real slots. Check the Leads tab.'
                              : '👀 This ground is in interest-only mode — players just tell us they\'d book here. Check the Leads tab. Real booking opens once admin sets it live.'}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Revenue Breakdown</p>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Price per Hour</span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {selectedGround.isSocial ? 'Free (Social)' : `₹${selectedGround.pricePerHour}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Slots Booked</span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {selectedGround.slots?.filter(s => s.isBooked).length || 0}
                          </span>
                        </div>
                        <div className="w-full h-px bg-black/5 dark:bg-white/5 my-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Est. Revenue</span>
                          <span className="text-green-400 font-bold">
                            {selectedGround.isSocial ? '—' : `₹${((selectedGround.slots?.filter(s => s.isBooked).length || 0) * selectedGround.pricePerHour).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>

                      {selectedGround.amenities?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Amenities</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedGround.amenities.map((a, i) => (
                              <span key={i} className="text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-500 px-3 py-1 rounded-full">✓ {a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="glass-card animate-cardIn">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-600 uppercase tracking-wider">All Slots ({selectedGround.slots?.length || 0})</p>
                        <button onClick={() => setActiveTab('slots')} className="text-xs text-green-400 hover:underline">
                          Manage Slots →
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {!selectedGround.slots?.length ? (
                          <p className="text-gray-600 text-sm text-center py-4">No slots added yet</p>
                        ) : selectedGround.slots
                            .slice()
                            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                            .map((slot, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${slot.isBooked ? 'bg-red-400/5 border border-red-400/10' : 'bg-green-400/5 border border-green-400/10'}`}>
                            <span className="text-gray-600 dark:text-gray-400">📅 {slot.date} · {slot.startTime} — {slot.endTime}</span>
                            <span className={slot.isBooked ? 'text-red-400' : 'text-green-400'}>
                              {slot.isBooked ? '🔴 Booked' : '🟢 Free'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass-card text-center py-16 animate-cardIn">
                    <span className="text-5xl block mb-4">👈</span>
                    <p className="text-gray-500">Select a ground from the left to view details</p>
                  </div>
                )}
              </div>
            )}

            {/* LEADS TAB — trial claims / interest signals, only relevant while
                this ground isn't live yet (any venue type can be put into
                trial/interest mode now, not just gym/pool) */}
            {activeTab === 'leads' && selectedGround && (
              <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl text-gray-900 dark:text-white mb-4">
                  {selectedGround.venueMode === 'interest' ? '👀 INTERESTED PLAYERS' : '🎟️ TRIAL LEADS'} — {selectedGround.name}
                </h3>

                {selectedGround.venueMode === 'trial' && (
                  <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 mb-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={checkinTicket}
                      onChange={(e) => setCheckinTicket(e.target.value)}
                      placeholder="Enter ticket ID to check someone in (e.g. SPT-XXXXXXXX)"
                      className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50 uppercase text-gray-900 dark:text-white"
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
                {selectedGround.venueMode === 'interest' && (
                  <p className="text-gray-500 text-xs mb-4">
                    These are players who opened this ground's page while it's in interest-only mode — no ticket or check-in involved, just a signal they'd book here.
                  </p>
                )}

                {(() => {
                  const groundLeads = venueLeads.filter((l) => l.venue?._id === selectedGround._id);
                  if (groundLeads.length === 0) {
                    return (
                      <div className="text-center py-16 text-gray-400">
                        <span className="text-4xl">{selectedGround.venueMode === 'interest' ? '👀' : '🎟️'}</span>
                        <p className="text-sm mt-2">No {selectedGround.venueMode === 'interest' ? 'interest signals' : 'trial leads'} yet</p>
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden">
                      {groundLeads.map((lead) => (
                        <div key={lead._id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={lead.user?.avatar || '/favicon.svg'} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lead.user?.name}</p>
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
                  );
                })()}
              </div>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl text-gray-900 dark:text-white mb-4">
                  {selectedGround ? `BOOKINGS — ${selectedGround.name}` : 'SELECT A GROUND'}
                </h3>
                {!selectedGround ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">👈</span>
                    <p className="text-gray-500 text-sm">Click a ground on the left to view its bookings</p>
                  </div>
                ) : groundBookings.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">📅</span>
                    <p className="text-gray-500 text-sm">No bookings yet for this ground</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {groundBookings.map((booking, i) => {
                      const badge = getStatusBadge(booking.status);
                      return (
                        <div key={booking._id} className="booking-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                            <div>
                              <p className="text-gray-900 dark:text-white font-semibold text-sm">{booking.player?.name}</p>
                              {booking.player?.phone && <p className="text-gray-600 text-xs">📞 {booking.player.phone}</p>}
                            </div>
                            <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                            📅 {booking.date} · 🕐 {booking.startTime} — {booking.endTime}
                          </p>
                          <div className="flex gap-4 text-xs pt-2 border-t border-black/5 dark:border-white/5">
                            <div>
                              <span className="text-gray-600">Total </span>
                              <span className="text-gray-900 dark:text-white font-semibold">₹{booking.totalPrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Advance </span>
                              <span className="text-green-400 font-semibold">₹{booking.advancePrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Remaining </span>
                              <span className="text-orange-400 font-semibold">₹{booking.remainingPrice}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SLOTS TAB — Visual Scheduler */}
            {activeTab === 'slots' && (
              <div className="animate-cardIn">
                {selectedGround && selectedGround.approvalStatus !== 'approved' ? (
                  <div className="glass-card text-center py-16">
                    <span className="text-5xl block mb-4">{selectedGround.approvalStatus === 'pending' ? '⏳' : '❌'}</span>
                    <p className="text-gray-500 text-sm font-semibold mb-1">
                      {selectedGround.approvalStatus === 'pending' ? 'Ground Pending Admin Approval' : 'Ground Rejected'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {selectedGround.approvalStatus === 'pending'
                        ? 'You can add slots once the admin approves your ground.'
                        : selectedGround.rejectionReason || 'Contact admin for more information.'}
                    </p>
                  </div>
                ) : selectedGround && selectedGround.venueMode && selectedGround.venueMode !== 'live' ? (
                  <div className="glass-card text-center py-16">
                    <span className="text-5xl block mb-4">{selectedGround.venueMode === 'trial' ? '🎟️' : '👀'}</span>
                    <p className="text-gray-500 text-sm font-semibold mb-1">
                      This ground is in {selectedGround.venueMode === 'trial' ? 'trial' : 'interest-only'} mode
                    </p>
                    <p className="text-gray-600 text-xs">Slot booking opens once admin sets it live — check the Leads tab meanwhile.</p>
                  </div>
                ) : (
                  <SportCourtManager
                    ground={selectedGround}
                    onRefresh={handleSlotRefresh}
                    showMessage={showMessage}
                  />
                )}
              </div>
            )}

            {/* CREATE / EDIT GROUND TAB */}
            {activeTab === 'create' && (
              <div className="glass-card animate-cardIn">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bebas text-xl text-gray-900 dark:text-white">
                    {isEditing ? 'EDIT GROUND DETAILS' : 'CREATE NEW GROUND'}
                  </h3>
                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingGroundId(null);
                        setGroundForm(EMPTY_GROUND_FORM);
                        setActiveTab('grounds');
                      }}
                      className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                    >
                      Cancel ✕
                    </button>
                  )}
                </div>

                <form onSubmit={handleCreateGround} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ground Name</label>
                      <input type="text" value={groundForm.name}
                        onChange={(e) => setGroundForm({ ...groundForm, name: e.target.value })}
                        placeholder="Punjab Cricket Ground" required className="input-field" />
                    </div>
                    <div>
                      <label className="label">Sport</label>
                      <select value={groundForm.sport}
                        onChange={(e) => setGroundForm({ ...groundForm, sport: e.target.value })}
                        className="input-field">
                        <option value="football">⚽ Football</option>
                        <option value="cricket">🏏 Cricket</option>
                        <option value="basketball">🏀 Basketball</option>
                        <option value="tennis">🎾 Tennis</option>
                        <option value="badminton">🏸 Badminton</option>
                        <option value="volleyball">🏐 Volleyball</option>
                        <option value="box cricket">🏏 Box Cricket</option>
                        <option value="box football">⚽ Box Football</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Price per Hour (₹)</label>
                      <input
                        type="number"
                        value={groundForm.pricePerHour}
                        onChange={(e) => setGroundForm({ ...groundForm, pricePerHour: e.target.value })}
                        placeholder="500"
                        required={!groundForm.isSocial}
                        disabled={groundForm.isSocial}
                        className="input-field"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isSocial"
                          checked={groundForm.isSocial}
                          onChange={(e) => setGroundForm({ ...groundForm, isSocial: e.target.checked, pricePerHour: e.target.checked ? 0 : groundForm.pricePerHour })}
                          className="w-4 h-4 rounded accent-yellow-400"
                        />
                        <label htmlFor="isSocial" className="text-sm text-yellow-500 font-semibold cursor-pointer">
                          Mark as Social Ground (Free)
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="label">Address (type it yourself — most accurate)</label>
                      <input type="text" value={groundForm.address}
                        onChange={(e) => setGroundForm({ ...groundForm, address: e.target.value })}
                        placeholder="Sector 22, Chandigarh" required className="input-field" />
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="label">Photos ({groundForm.images.length}/6)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {groundForm.images.map((url) => (
                        <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(url)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">✕</button>
                        </div>
                      ))}
                      {groundForm.images.length < 6 && (
                        <label className="w-20 h-20 rounded-xl border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-green-400/40">
                          {uploadingImages ? '…' : '+ Add'}
                          <input type="file" accept="image/*" multiple hidden onChange={handleImagePick} disabled={uploadingImages} />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">Cover photo first, ideally 16:9 (1200×675px+). These show up on the ground's card in the Venues tab and on the detail page.</p>
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="label">Amenities</label>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}>
                      {groundForm.amenities.map((amenity, idx) => (
                        <span key={idx} style={{
                          background: 'rgba(74,222,128,0.1)',
                          color: '#4ade80',
                          border: '1px solid rgba(74,222,128,0.2)',
                          padding: '4px 10px',
                          borderRadius: 100,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          {amenity}
                          <button type="button" onClick={() => handleRemoveAmenity(amenity)}
                            style={{ color: 'inherit', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>
                            ✕
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={amenityInput}
                        onChange={(e) => setAmenityInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(amenityInput); } }}
                        placeholder={groundForm.amenities.length === 0 ? 'Type an amenity & hit Enter' : 'Add more...'}
                        style={{
                          flex: 1, minWidth: 120, background: 'transparent', outline: 'none',
                          border: 'none', fontSize: 14, color: 'inherit', fontFamily: 'DM Sans, sans-serif',
                        }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 py-1">Suggestions:</span>
                      {PRESET_AMENITIES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddAmenity(preset)}
                          disabled={groundForm.amenities.includes(preset)}
                          className="text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <button type="button" onClick={() => setShowMapPicker(true)} className="btn-secondary flex items-center gap-2">
                      📍 {groundForm.coordinates.length > 0 ? 'Map Pin Set ✅' : 'Pin Location on Map'}
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (isEditing ? '💾 Save Changes' : '🏟️ Create Ground')}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default GroundOwnerDashboard;