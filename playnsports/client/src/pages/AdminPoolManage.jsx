import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Waves } from 'lucide-react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import PoolSlotManager from '../components/PoolSlotManager';
import { useAuth } from '../context/AuthContext';

// Shared pool management surface for admins AND the venue's own owner
// (route /pool/manage/:id) — PoolSlotManager itself doesn't know or care
// who's driving it, because the backend authorizes "owner OR admin"
// identically on every request. This page just adds the venue header,
// a role-aware back link, and an ownership guard so a pool owner who
// types in another venue's id gets a friendly denial (the API would
// 403 them anyway).
const AdminPoolManage = () => {
  const { user } = useAuth();
  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const { id } = useParams();

  const ownerId = ground?.owner?._id || ground?.owner;
  const isOwner = ownerId && user && String(ownerId) === String(user._id);
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || isOwner;

  const showMessage = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGround = useCallback(async () => {
    try {
      const { data } = await API.get(`/grounds/${id}`);
      setGround(data);
    } catch {
      showMessage('Failed to load venue', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGround(); }, [fetchGround]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to={isAdmin ? '/admin' : '/pool/dashboard'} className="text-xs text-gray-500 hover:text-green-500 mb-4 inline-flex items-center gap-1.5"><ArrowLeft size={13} /> {isAdmin ? 'Back to Admin Panel' : 'Back to Pool Dashboard'}</Link>

        {loading && <p className="text-gray-500 text-sm">Loading venue…</p>}

        {!loading && ground && !canManage && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center">
            <p className="text-red-400 font-semibold text-sm mb-1">Not your venue 🔒</p>
            <p className="text-gray-500 text-xs">Only the venue owner or an admin can manage bookings and scan tickets here.</p>
          </div>
        )}

        {!loading && ground && ground.venueType !== 'pool' && canManage && (
          <p className="text-red-400 text-sm">This venue isn't a pool venue.</p>
        )}

        {!loading && ground && ground.venueType === 'pool' && canManage && (
          <>
            <div className="mb-6">
              <h1 className="font-bebas text-4xl tracking-wide flex items-center gap-2"><Waves className="text-green-500" size={28} /> {ground.name}</h1>
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5"><MapPin size={13} /> {ground.address}</p>
              <span className={`inline-block mt-2 text-[11px] px-3 py-1 rounded-full border ${ground.venueMode === 'live' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'}`}>
                {ground.venueMode === 'live' ? 'Live' : ground.venueMode || 'Trial'}
              </span>
            </div>

            <PoolSlotManager ground={ground} onRefresh={fetchGround} showMessage={showMessage} />
          </>
        )}

        {toast && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPoolManage;
