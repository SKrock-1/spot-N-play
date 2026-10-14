import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserChip from '../components/UserChip';
import { dataStore } from '../utils/dataStore';
import { useSocket } from '../context/SocketContext';
import FindPlayersModal from '../components/FindPlayersModal';
import LiveRequestCard from '../components/LiveRequestCard';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Icons ─────────────────────────────────────────────────────────
const getPlayerIcon = (gender) => {
  const isGirl = gender && gender.toLowerCase() === 'female';
  const emoji = isGirl ? '👩🏻' : '👦🏻';
  const bg = isGirl ? '#ec4899' : '#ef4444';
  return new L.DivIcon({
    html: `<div style="position:relative;width:36px;height:36px;background:${bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:2px 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;">${emoji}</div></div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
  });
};

const groundIcon = new L.DivIcon({
  html: `<div style="position:relative;width:36px;height:36px;background:#3b82f6;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:2px 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;">🏟️</div></div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
});

const socialGroundIcon = new L.DivIcon({
  html: `<div style="position:relative;width:36px;height:36px;background:#eab308;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:2px 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;">✨</div></div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
});

const gymIcon = new L.DivIcon({
  html: `<div style="position:relative;width:36px;height:36px;background:#22c55e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:2px 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:18px;">🏋️</div></div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
});

const userIcon = new L.DivIcon({
  html: `<div style="position:relative;width:24px;height:24px"><div style="position:absolute;inset:0;background:#4ade80;border-radius:50%;animation:pulse-dot 2s ease-in-out infinite;opacity:0.3"></div><div style="position:absolute;inset:4px;background:#4ade80;border-radius:50%;border:3px solid #060606;box-shadow:0 0 12px rgba(74,222,128,0.6)"></div></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12], className: '',
});

const GAME_SPORT_EMOJI = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', esports: '🎮' };

const getGameIcon = (sport) => new L.DivIcon({
  html: `<div style="position:relative;width:40px;height:40px"><div style="position:absolute;inset:0;background:#4ade80;border-radius:50%;animation:pulse-dot 1.4s ease-in-out infinite;opacity:0.35"></div><div style="position:absolute;inset:5px;background:#0d1117;border-radius:50%;border:2px solid #4ade80;box-shadow:0 0 14px rgba(74,222,128,0.7);display:flex;align-items:center;justify-content:center;font-size:16px;">${GAME_SPORT_EMOJI[sport] || '🏅'}</div></div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: '',
});

// ── Helpers ───────────────────────────────────────────────────────
const INDIA_BOUNDS = L.latLngBounds(L.latLng(6.5, 68.0), L.latLng(37.5, 97.5));

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const d = getDistanceKm(lat1, lon1, lat2, lon2);
  return d < 1 ? `${Math.round(d*1000)} m` : `${d.toFixed(1)} km`;
};

// Split an array into fixed-size chunks — keeps every batch request safely
// under the server's per-request point cap (server/controllers/geocodeController.js),
// no matter how many players end up on screen (e.g. a site-wide /players/all load).
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getAreaNamesBatch = async (players) => {
  if (players.length === 0) return {};
  try {
    // One request per chunk of markers instead of N parallel single-marker
    // requests — see server/controllers/geocodeController.js for why the old
    // N-parallel approach was the actual cause of the map's rate-limit flicker.
    const points = players.map((p) => ({
      id: p._id,
      lat: p.location.coordinates[1],
      lon: p.location.coordinates[0],
    }));
    const chunks = chunk(points, 50);
    const areas = {};
    const results = await Promise.all(
      chunks.map((c) => API.post('/geocode/reverse-batch', { points: c }).catch(() => null))
    );
    results.forEach((res) => {
      (res?.data?.results || []).forEach((r) => { areas[r.id] = r.area; });
    });
    return areas;
  } catch {
    return {};
  }
};

// ── Map sub-components ────────────────────────────────────────────
// Approximate lat/lng bounding box for a center + radius (meters) — plain
// trig, no Leaflet map instance required. (L.circle(...).getBounds() looks
// like it should work standalone but doesn't: internally it calls
// this._map.layerPointToLatLng(...), which only exists once the circle has
// actually been added to a map — calling it on a bare, never-added circle
// throws "Cannot read properties of undefined (reading 'layerPointToLatLng')".)
const radiusBounds = (center, radiusMeters) => {
  const [lat, lng] = center;
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180) || 1);
  return L.latLngBounds(
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta]
  );
};

const MapSetup = () => {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(INDIA_BOUNDS);
    map.setMinZoom(5);
    map.setMaxZoom(18);
    map.options.maxBoundsViscosity = 1.0;

    // Leaflet measures its container's pixel size once, on mount. If that
    // measurement happens mid-animation (this page fades/translates its
    // sections in on load) it can grab a stale size, and every vector layer
    // drawn afterwards — the search-radius circle, player markers — ends up
    // positioned against the wrong pixel grid. That's what showed up as a
    // dashed circle boundary "stuck" at the wrong spot on screen: it wasn't
    // recalculating, just wrongly calculated once and staying that way.
    // invalidateSize() forces Leaflet to re-measure and redraw everything
    // against the real, final layout.
    const revalidate = () => map.invalidateSize();
    const t1 = setTimeout(revalidate, 300);   // after the entrance animation settles
    const t2 = setTimeout(revalidate, 900);
    window.addEventListener('resize', revalidate);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', revalidate);
    };
  }, [map]);
  return null;
};

// Fly to position (user's location on first load) — fits to the FULL
// search-radius circle, not just a fixed zoom level. At a fixed zoom, a
// 5-100km radius circle is almost always bigger than the visible map, so
// only a stray arc of its edge shows up on screen (looked like a rendering
// glitch, but it was really just an oversized circle with nothing else
// visible to give it context).
const FlyToUser = ({ position, radius, done }) => {
  const map = useMap();
  useEffect(() => {
    if (position && !done.current) {
      done.current = true;
      const bounds = radiusBounds(position, radius);
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.2 });
    }
  }, [position]);
  return null;
};

// After a search: fit the map to show all results AND the full search-radius
// circle, without moving the filter panel. Previously this only fit the
// result markers — if they clustered tightly, the map zoomed in far past
// the radius circle's actual size, leaving its dashed edge slicing across
// the screen with nothing else in view to explain it.
const FitAfterSearch = ({ trigger, players, grounds, socialgrounds, position, radius }) => {
  const map = useMap();
  useEffect(() => {
    if (!trigger || !position) return;
    const pts = [position];
    players.forEach(p => pts.push([p.location.coordinates[1], p.location.coordinates[0]]));
    grounds.forEach(g => pts.push([g.location.coordinates[1], g.location.coordinates[0]]));
    socialgrounds.forEach(g => pts.push([g.location.coordinates[1], g.location.coordinates[0]]));
    const bounds = L.latLngBounds(pts).extend(radiusBounds(position, radius));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 1 });
  }, [trigger]);
  return null;
};

const RecenterButton = ({ position }) => {
  const map = useMap();
  return (
    <button onClick={() => map.flyTo(position, 14, { duration: 1 })} className="recenter-btn text-green-400" title="Recenter">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────
const MapSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeRequests } = useSocket();

  const [position, setPosition] = useState(null);
  // idle | locating | granted | denied | unsupported | error
  const [locationStatus, setLocationStatus] = useState('idle');
  const [players, setPlayers] = useState([]);
  const [grounds, setGrounds] = useState([]);
  const [socialgrounds, setSocialGrounds] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [venueFilter, setVenueFilter] = useState('all'); // all | ground | social | gym
  const [myGroups, setMyGroups] = useState([]);
  const [playerAreas, setPlayerAreas] = useState({});
  const [showFindPlayers, setShowFindPlayers] = useState(false);
  const [joiningRequestId, setJoiningRequestId] = useState(null);

  // Filters
  const [nameQuery, setNameQuery] = useState('');
  const [sport, setSport] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [radius, setRadius] = useState(5000);

  const [activeTab, setActiveTab] = useState('players');
  const [loading, setLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState({});
  const [searched, setSearched] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0); // increment to trigger FitAfterSearch
  const [routeData, setRouteData] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const flyDone = useRef(false);

  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  // Players sorted closest-first for the sidebar list (map markers stay in
  // their original order — only the list ranking changes).
  const sortedPlayers = useMemo(() => {
    if (!position) return players;
    return [...players].sort((a, b) => {
      const da = getDistanceKm(position[0], position[1], a.location.coordinates[1], a.location.coordinates[0]);
      const db = getDistanceKm(position[0], position[1], b.location.coordinates[1], b.location.coordinates[0]);
      return da - db;
    });
  }, [players, position]);

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Styles ──────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0}to{opacity:1} }
      @keyframes shimmer { from{background-position:-200% center}to{background-position:200% center} }
      @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.4} }
      @keyframes cardIn { from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes dashAnim { 0%{stroke-dashoffset:100}100%{stroke-dashoffset:0} }
      @keyframes pulsePath { 0%,100%{filter:drop-shadow(0 0 8px rgba(74,222,128,0.5));opacity:0.8}50%{filter:drop-shadow(0 0 16px rgba(74,222,128,1));opacity:1} }

      .animate-fadeUp-1 { animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards;opacity:0 }
      .animate-fadeUp-2 { animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards;opacity:0 }
      .animate-fadeUp-3 { animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards;opacity:0 }
      .animate-fadeIn   { animation:fadeIn 0.5s ease forwards }
      .animate-cardIn   { animation:cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards }
      .animated-path { stroke-dasharray:12 16;stroke-linecap:round;stroke-linejoin:round;animation:dashAnim 1s linear infinite,pulsePath 2s ease-in-out infinite }

      .shimmer-text { background:linear-gradient(90deg,#4ade80,#22c55e,#86efac,#4ade80);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite }
      .grid-dots { background-image:radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:28px 28px }

      .map-container .leaflet-container { background:#f0f0f0 !important;border-radius:20px }
      .dark .map-container .leaflet-container { background:#1a1a1a !important }

      .recenter-btn { position:absolute;bottom:20px;right:20px;z-index:1000;width:40px;height:40px;background:rgba(0,0,0,0.7);border:1px solid rgba(74,222,128,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(8px) }
      .recenter-btn:hover { background:rgba(74,222,128,0.15);border-color:rgba(74,222,128,0.5);transform:scale(1.08) }

      .map-legend { position:absolute;bottom:20px;left:20px;z-index:1000;background:rgba(255,255,255,0.9);border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:10px 14px;backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:6px }
      .dark .map-legend { background:rgba(0,0,0,0.75);border:1px solid rgba(255,255,255,0.08) }
      .map-legend-item { display:flex;align-items:center;gap:8px;font-size:11px;color:#374151 }
      .dark .map-legend-item { color:#9ca3af }

      .dist-badge { font-size:10px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.15);color:#4ade80;padding:2px 7px;border-radius:6px;font-weight:600;white-space:nowrap }

      .filter-panel { background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:20px }
      html:not(.dark) .filter-panel { background:rgba(0,0,0,0.015);border-color:rgba(0,0,0,0.08) }

      .search-input { width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 14px 11px 38px;color:inherit;font-size:14px;outline:none;transition:all 0.3s;font-family:'DM Sans',sans-serif }
      .search-input:focus { border-color:rgba(74,222,128,0.4);background:rgba(74,222,128,0.03);box-shadow:0 0 0 3px rgba(74,222,128,0.06) }
      .search-input::placeholder { color:#6b7280 }
      html:not(.dark) .search-input { background:rgba(0,0,0,0.02);border-color:rgba(0,0,0,0.1);color:#111827 }

      .select-field { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 14px;color:inherit;font-size:14px;outline:none;transition:all 0.3s;cursor:pointer;appearance:none;font-family:'DM Sans',sans-serif }
      .select-field:focus,.select-field:hover { border-color:rgba(74,222,128,0.4) }
      .select-field option { background:#111;color:#e5e7eb }
      html:not(.dark) .select-field { background:rgba(0,0,0,0.02);border-color:rgba(0,0,0,0.1);color:#111827 }
      html:not(.dark) .select-field option { background:#fff;color:#111827 }

      .search-btn { background:linear-gradient(135deg,#4ade80,#22c55e);color:black;font-weight:700;border-radius:12px;padding:11px 24px;font-size:14px;transition:all 0.3s;position:relative;overflow:hidden;white-space:nowrap;font-family:'DM Sans',sans-serif }
      .search-btn::before { content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);transition:left 0.4s }
      .search-btn:hover::before { left:100% }
      .search-btn:hover { transform:translateY(-1px);box-shadow:0 6px 20px rgba(74,222,128,0.35) }
      .search-btn:disabled { opacity:0.5;transform:none;box-shadow:none }

      .tab-btn { flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;transition:all 0.3s;font-family:'DM Sans',sans-serif }
      .tab-active { background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.25) }
      .tab-inactive { background:transparent;color:#6b7280;border:1px solid transparent }
      html:not(.dark) .tab-inactive { color:#374151 }
      .tab-inactive:hover { border-color:rgba(255,255,255,0.08) }
      html:not(.dark) .tab-inactive:hover { border-color:rgba(0,0,0,0.1) }

      .player-card,.ground-card { background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:14px;transition:all 0.3s;cursor:pointer }
      html:not(.dark) .player-card, html:not(.dark) .ground-card { background:rgba(0,0,0,0.015);border-color:rgba(0,0,0,0.08) }
      .player-card:hover,.ground-card:hover { background:rgba(255,255,255,0.04);border-color:rgba(74,222,128,0.2);transform:translateX(3px) }
      html:not(.dark) .player-card:hover, html:not(.dark) .ground-card:hover { background:rgba(0,0,0,0.03) }
      .animate-cardIn { animation:cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards }

      .invite-btn { background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);color:#4ade80;font-size:11px;font-weight:600;border-radius:8px;padding:5px 10px;transition:all 0.2s;font-family:'DM Sans',sans-serif }
      .invite-btn:hover { background:rgba(74,222,128,0.15);border-color:rgba(74,222,128,0.4) }
      .invite-btn:disabled { opacity:0.5;cursor:not-allowed }

      .skill-badge { font-size:10px;font-weight:600;padding:3px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em }
      .skill-beginner { background:rgba(234,179,8,0.1);color:#eab308;border:1px solid rgba(234,179,8,0.2) }
      .skill-intermediate { background:rgba(59,130,246,0.1);color:#3b82f6;border:1px solid rgba(59,130,246,0.2) }
      .skill-advanced { background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2) }

      .range-slider { -webkit-appearance:none;appearance:none;width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;outline:none;cursor:pointer }
      html:not(.dark) .range-slider { background:rgba(0,0,0,0.1) }
      .range-slider::-webkit-slider-thumb { -webkit-appearance:none;width:20px;height:20px;background:linear-gradient(135deg,#4ade80,#22c55e);border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(74,222,128,0.4);transition:transform 0.2s }
      .range-slider::-webkit-slider-thumb:hover { transform:scale(1.15) }
      .range-slider::-moz-range-thumb { width:20px;height:20px;background:linear-gradient(135deg,#4ade80,#22c55e);border-radius:50%;cursor:pointer;border:none;box-shadow:0 2px 8px rgba(74,222,128,0.4) }

      .stat-chip { display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:100px;padding:4px 10px;font-size:12px;color:#9ca3af }
      html:not(.dark) .stat-chip { background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.08);color:#6b7280 }

      .empty-state { display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;color:#6b7280 }

      .leaflet-popup-content-wrapper { background:#0d1117 !important;border:1px solid rgba(255,255,255,0.1) !important;border-radius:14px !important;box-shadow:0 20px 60px rgba(0,0,0,0.8) !important;color:white !important }
      .leaflet-popup-tip { background:#0d1117 !important }
      .leaflet-popup-close-button { color:rgba(255,255,255,0.4) !important }
      .leaflet-popup-close-button:hover { color:white !important }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ── Init ────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        dataStore.set('map:userPosition', coords);
        setPosition(coords);
        setLocationStatus('granted');
      },
      (err) => {
        setLocationStatus(err?.code === err?.PERMISSION_DENIED ? 'denied' : 'error');
      }
    );
  }, []);

  useEffect(() => {
    const cachedPos = dataStore.get('map:userPosition');
    if (cachedPos.status === 'ready') {
      setPosition(cachedPos.data);
      setLocationStatus('granted');
    } else {
      requestLocation();
    }
    if (user?.role === 'player') fetchMyGroups();
  }, []);

  useEffect(() => {
    if (position) handleInitialLoad();
  }, [position]);

  const fetchMyGroups = async () => {
    try {
      const { data } = await API.get('/groups/my');
      setMyGroups(data.filter(g => g.isOpen && g.createdBy._id === user._id));
    } catch { setMyGroups([]); }
  };

  const handleJoinRequest = async (id) => {
    setJoiningRequestId(id);
    try {
      await API.post(`/looking/${id}/join`);
    } catch {
      // Errors are non-fatal here — the live socket event is the source of
      // truth for whether the join actually landed.
    } finally {
      setJoiningRequestId(null);
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await API.post(`/looking/${id}/cancel`);
    } catch {}
  };

  // Silent initial load — show everything on the map. Reads through the
  // shared players:all/grounds:all cache (same data Home and the app's
  // background prefetcher use), so revisiting the map after the first
  // visit renders instantly instead of refetching.
  const handleInitialLoad = async () => {
    try {
      const [prData, grData] = await Promise.all([
        dataStore.getOrFetch('players:all', () => API.get('/players/all').then(r => r.data)),
        dataStore.getOrFetch('grounds:all', () => API.get('/grounds/all').then(r => r.data)),
      ]);
      setPlayers(prData);
      setGrounds(grData.filter(g => !g.isSocial && g.venueType !== 'gym'));
      setSocialGrounds(grData.filter(g => g.isSocial));
      setGyms(grData.filter(g => g.venueType === 'gym'));
      setSearched(true);
      // Fetch area names in the background, one request for the whole batch.
      // Merge into existing state rather than replacing it, so a slow/failed
      // lookup never wipes area labels that were already showing.
      const areas = await getAreaNamesBatch(prData);
      setPlayerAreas(prev => ({ ...prev, ...areas }));
    } catch {
      // Transient network/rate-limit error on initial load — leave whatever
      // is already on screen alone instead of clearing it, so the map
      // doesn't flicker empty and then repopulate a moment later.
    }
  };

  // Filtered search with all params
  const handleSearch = async () => {
    if (!position) return;
    setLoading(true);
    setSearchError('');
    try {
      let params = `longitude=${position[1]}&latitude=${position[0]}&radius=${radius}`;
      if (sport) params += `&sport=${sport}`;
      if (skillLevel) params += `&skillLevel=${skillLevel}`;
      if (nameQuery.trim()) params += `&name=${encodeURIComponent(nameQuery.trim())}`;

      const [pr, gr] = await Promise.all([
        API.get(`/players/nearby?${params}`),
        API.get(`/grounds/nearby?${params}`),
      ]);

      setPlayers(pr.data);
      const all = gr.data;
      setGrounds(all.filter(g => !g.isSocial && g.venueType !== 'gym'));
      setSocialGrounds(all.filter(g => g.isSocial));
      setGyms(all.filter(g => g.venueType === 'gym'));
      setSearched(true);

      // Trigger map zoom-to-results
      setFitTrigger(t => t + 1);

      const areas = await getAreaNamesBatch(pr.data);
      setPlayerAreas(prev => ({ ...prev, ...areas }));
    } catch (err) {
      // Don't wipe existing markers on a transient failure (rate limit,
      // flaky network) — that's what caused the "everything disappears for
      // a second" flicker. Keep showing the last good results and just
      // tell the person the refresh didn't go through.
      if (err?.response?.status === 429) {
        setSearchError("You're searching a bit fast — please wait a few seconds and try again.");
      } else {
        setSearchError('Could not refresh results. Showing your last search.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setNameQuery(''); setSport(''); setSkillLevel('');
    setRadius(5000);
    handleInitialLoad();
  };

  const handleInvite = async (playerId, groupId) => {
    try {
      await API.post(`/groups/${groupId}/invite`, { userId: playerId });
      setInviteStatus(prev => ({ ...prev, [`${playerId}-${groupId}`]: 'sent' }));
    } catch (err) {
      setInviteStatus(prev => ({ ...prev, [`${playerId}-${groupId}`]: 'failed' }));
      alert(err.response?.data?.message || 'Failed to send invite');
    }
  };

  const getSkillClass = l => l === 'beginner' ? 'skill-beginner' : l === 'intermediate' ? 'skill-intermediate' : 'skill-advanced';

  const handleNavigate = async (destLat, destLng) => {
    if (!position) return;
    setIsNavigating(true);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${position[1]},${position[0]};${destLng},${destLat}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        setRouteData({ coords: route.geometry.coordinates.map(c => [c[1], c[0]]), distance: route.distance, duration: route.duration });
      } else { alert('Could not find a route.'); }
    } catch { alert('Error fetching route.'); }
    finally { setIsNavigating(false); }
  };

  const radioPct = ((radius - 1000) / 99000) * 100;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-fadeUp-1 mb-6">
          <h1 className="font-bebas text-4xl md:text-5xl tracking-wide shimmer-text">FIND PLAYERS & GROUNDS</h1>
        </div>

        {/* ── Filter panel ── */}
        <div data-tour="map-filters" className="animate-fadeUp-2 filter-panel mb-6">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Name search */}
            <div className="flex flex-col gap-1.5" style={{ flex: '1', minWidth: '180px' }}>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Search by name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  value={nameQuery}
                  onChange={e => setNameQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="search-input"
                  placeholder="Player or ground name…"
                />
              </div>
            </div>

            {/* Sport */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">Sport</label>
              <select value={sport} onChange={e => setSport(e.target.value)} className="select-field">
                <option value="">All Sports</option>
                <option value="football">⚽ Football</option>
                <option value="cricket">🏏 Cricket</option>
                <option value="basketball">🏀 Basketball</option>
                <option value="tennis">🎾 Tennis</option>
                <option value="badminton">🏸 Badminton</option>
                <option value="volleyball">🏐 Volleyball</option>
                <option value="boxing">🥊 Boxing</option>
                <option value="hockey">🏑 Hockey</option>
                <option value="kabaddi">🤼 Kabaddi</option>
                <option value="kho kho">🏃 Kho Kho</option>
                <option value="pickleball">🏓 Pickleball</option>
                <option value="table tennis">🏓 Table Tennis</option>
                <option value="squash">🎾 Squash</option>
                <option value="handball">🤾 Handball</option>
                <option value="futsal">⚽ Futsal</option>
                <option value="rugby">🏉 Rugby</option>
                <option value="athletics">🏃 Athletics</option>
                <option value="wrestling">🤼 Wrestling</option>
                <option value="weightlifting">🏋️ Weightlifting</option>
                <option value="yoga">🧘 Yoga</option>
                <option value="skating">⛸️ Skating</option>
                <option value="chess">♟️ Chess</option>
                <option value="carrom">🎯 Carrom</option>
                <option value="archery">🏹 Archery</option>
                <option value="shooting">🎯 Shooting</option>
                <option value="cycling">🚴 Cycling</option>
                <option value="box cricket">🏏 Box Cricket</option>
                <option value="box football">⚽ Box Football</option>
                <option value="esports">🎮 Esports</option>
              </select>
            </div>

            {/* Skill level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 uppercase tracking-wider">Skill Level</label>
              <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)} className="select-field">
                <option value="">All Levels</option>
                <option value="beginner">🟡 Beginner</option>
                <option value="intermediate">🔵 Intermediate</option>
                <option value="advanced">🟢 Advanced</option>
              </select>
            </div>

            {/* Radius slider */}
            <div className="flex flex-col gap-1.5" style={{ minWidth: '180px', flex: '1' }}>
              <label className="text-xs text-gray-500 uppercase tracking-wider flex justify-between">
                <span>Radius</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</span>
              </label>
              <input
                type="range" min="1000" max="100000" step="1000"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="range-slider"
                style={{ background: `linear-gradient(to right,#4ade80 0%,#4ade80 ${radioPct}%,rgba(255,255,255,0.08) ${radioPct}%,rgba(255,255,255,0.08) 100%)` }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 km</span><span>50 km</span><span>100 km</span>
              </div>
            </div>

            {/* Search button */}
            <button onClick={handleSearch} disabled={loading || !position} className="search-btn">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Searching…
                </span>
              ) : '🔍 Search Now'}
            </button>

            {searchError && (
              <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2 mt-1">
                {searchError}
              </div>
            )}
          </div>

          {/* Results summary */}
          {searched && (
            <div className="animate-fadeIn flex flex-wrap items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="stat-chip"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>{players.length} Players</div>
              <div className="stat-chip"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>{grounds.length} Grounds</div>
              <div className="stat-chip"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/>{socialgrounds.length} Social</div>
              {(nameQuery || sport || skillLevel || radius !== 5000) && (
                <button onClick={handleClearFilters} style={{ fontSize:'11px', color:'#9ca3af', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', padding:'4px 12px', cursor:'pointer' }}>
                  ✕ Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Map + list ── */}
        <div className="animate-fadeUp-3 grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Map */}
          <div className="lg:col-span-2 map-container rounded-3xl overflow-hidden border border-black/6 dark:border-white/6" style={{ height: '560px', position: 'relative' }}>
            {position ? (
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0}
                minZoom={5}
                maxZoom={18}
              >
                <MapSetup />
                <FlyToUser position={position} radius={radius} done={flyDone} />
                <FitAfterSearch trigger={fitTrigger} players={players} grounds={grounds} socialgrounds={socialgrounds} position={position} radius={radius} />
                <RecenterButton position={position} />

                <TileLayer
  key={isDark ? 'dark' : 'light'}
  url={isDark
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`
    : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
/>

                {/* Route */}
                {routeData && (
                  <>
                    <Polyline positions={routeData.coords} pathOptions={{ color: '#4ade80', weight: 6, lineCap: 'round', lineJoin: 'round', className: 'animated-path' }} />
                    <div style={{ position:'absolute',top:20,left:'50%',transform:'translateX(-50%)',zIndex:1000,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'12px 20px',borderRadius:'100px',display:'flex',alignItems:'center',gap:20,boxShadow:'0 10px 40px rgba(0,0,0,0.6)',whiteSpace:'nowrap' }}>
                      <div className="flex flex-col"><span style={{fontSize:10,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:2}}>Distance</span><span className="font-bebas text-xl tracking-wide text-green-400 leading-none">{routeData.distance>=1000?(routeData.distance/1000).toFixed(1)+' km':Math.round(routeData.distance)+' m'}</span></div>
                      <div style={{width:1,height:32,background:'rgba(255,255,255,0.1)'}}/>
                      <div className="flex flex-col"><span style={{fontSize:10,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:2}}>Est. Time</span><span className="font-bebas text-xl tracking-wide text-blue-400 leading-none">{routeData.duration>=3600?Math.floor(routeData.duration/3600)+'h '+Math.round((routeData.duration%3600)/60)+'m':Math.round(routeData.duration/60)+' min'}</span></div>
                      <button onClick={e=>{e.stopPropagation();setRouteData(null)}} style={{marginLeft:4,background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',padding:6,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,cursor:'pointer'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </>
                )}

                {/* User marker */}
                <Marker position={position} icon={userIcon}>
                  <Popup><div style={{color:'white',fontSize:13}}><strong>📍 You are here</strong><p style={{color:'#4ade80',margin:'4px 0 0'}}>{user?.name}</p></div></Popup>
                </Marker>

                {/* Search radius circle */}
                <Circle center={position} radius={radius} pathOptions={{ color:'#4ade80', fillColor:'#4ade80', fillOpacity:0.04, weight:1, dashArray:'6' }} />

                {/* Players — skip any orphaned record whose linked user no
                    longer exists (e.g. deleted directly in the DB) */}
                {players.filter(player => player.user).map(player => {
                  const lat = player.location.coordinates[1];
                  const lng = player.location.coordinates[0];
                  const area = playerAreas[player._id] || '';
                  const dist = getDistance(position[0], position[1], lat, lng);
                  return (
                    <React.Fragment key={player._id}>
                      <Circle center={[lat,lng]} radius={120} pathOptions={{color:'#ef4444',fillColor:'#ef4444',fillOpacity:0.12,weight:1.5}} />
                      <Marker position={[lat,lng]} icon={getPlayerIcon(player.user?.gender)}>
                        <Popup>
                          <div style={{color:'white',fontSize:13,minWidth:160}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                              {player.user?.avatar ? <img src={player.user.avatar} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',border:'2px solid #4ade80'}}/> : <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(74,222,128,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#4ade80',fontWeight:'bold'}}>{player.user?.name?.charAt(0)}</div>}
                              <div><div style={{fontWeight:700}}>{player.user?.name}</div>{area && <div style={{fontSize:11,color:'#6b7280'}}>📍 {area}</div>}</div>
                              <span className="dist-badge" style={{marginLeft:'auto'}}>{dist}</span>
                            </div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
                              <span style={{background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',fontSize:11,padding:'2px 8px',borderRadius:100}}>{player.sport}</span>
                              <span style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#9ca3af',fontSize:11,padding:'2px 8px',borderRadius:100}}>{player.skillLevel}</span>
                            </div>
                            {player.bio && <p style={{color:'#6b7280',fontSize:11,margin:'4px 0'}}>{player.bio}</p>}
                            {player.user?.phone && <p style={{color:'#9ca3af',fontSize:12}}>📞 {player.user.phone}</p>}
                            {user?.role==='player' && player.user?._id!==user._id && myGroups.length>0 && myGroups.map(group=>{
                              const isMember=group.members.some(m=>(m._id&&m._id===player.user._id)||m===player.user._id);
                              const invited=group.invitations?.some(inv=>inv.user===player.user._id||(inv.user?._id===player.user._id));
                              const local=inviteStatus[`${player.user._id}-${group._id}`];
                              const disabled=isMember||invited||local==='sent';
                              return <button key={group._id} onClick={()=>handleInvite(player.user._id,group._id)} disabled={disabled} style={{width:'100%',marginTop:4,background:disabled?'rgba(255,255,255,0.05)':'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.3)',color:disabled?'#6b7280':'#4ade80',fontSize:12,fontWeight:600,padding:'6px 10px',borderRadius:8,cursor:disabled?'not-allowed':'pointer'}}>{isMember?'🤝 Already in Group':invited||local==='sent'?'✅ Invited':local==='failed'?'❌ Retry':`+ Invite to ${group.name}`}</button>;
                            })}
                            {user?._id!==player.user?._id && <button onClick={async()=>{try{const{data}=await API.post('/chat/direct',{userId:player.user._id});navigate(`/chat/${data._id}`);}catch{}}} className="invite-btn w-full mt-1" style={{color:'#4ade80',marginTop:6}}>💬 Message</button>}
                            <button onClick={()=>navigate(`/users/${player.user?._id}/profile`)} className="invite-btn w-full mt-1" style={{color:'#a78bfa',background:'rgba(167,139,250,0.08)',borderColor:'rgba(167,139,250,0.2)',marginTop:4}}>👤 View Profile</button>
                            <button onClick={()=>handleNavigate(lat,lng)} className="invite-btn w-full mt-1" style={{color:'#3b82f6',background:'rgba(59,130,246,0.08)',borderColor:'rgba(59,130,246,0.2)',marginTop:4}}>{isNavigating?'⏳ Calculating…':'🗺️ Navigate'}</button>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {/* Social grounds */}
                {socialgrounds.map(ground => {
                  const gLat=ground.location.coordinates[1]; const gLng=ground.location.coordinates[0];
                  const dist=getDistance(position[0],position[1],gLat,gLng);
                  return (
                    <Marker key={ground._id} position={[gLat,gLng]} icon={socialGroundIcon}>
                      <Popup>
                        <div style={{color:'white',fontSize:13,minWidth:160}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><div style={{fontWeight:700,fontSize:15}}>{ground.name}</div><span className="dist-badge" style={{color:'#eab308',borderColor:'rgba(234,179,8,0.2)',background:'rgba(234,179,8,0.1)'}}>{dist}</span></div>
                          <div style={{color:'#6b7280',fontSize:12,marginBottom:6}}>📍 {ground.address}</div>
                          <div style={{display:'flex',gap:6,marginBottom:8}}><span style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.2)',color:'#eab308',fontSize:11,padding:'2px 8px',borderRadius:100}}>✨ Social</span><span style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',color:'#60a5fa',fontSize:11,padding:'2px 8px',borderRadius:100}}>{ground.sport}</span></div>
                          <div style={{color:'#eab308',fontWeight:700,fontSize:14,marginBottom:8}}>Free to Book</div>
                          <button onClick={()=>navigate(ground.venueMode === 'live' ? `/grounds/${ground._id}` : `/venues/${ground._id}`)} style={{width:'100%',background:'linear-gradient(135deg,#facc15,#eab308)',color:'black',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>View & Book Free →</button>
                          <button onClick={()=>handleNavigate(gLat,gLng)} style={{width:'100%',marginTop:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(234,179,8,0.3)',color:'#facc15',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>{isNavigating?'⏳ Calculating…':'🗺️ Navigate'}</button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Regular grounds */}
                {grounds.map(ground => {
                  const gLat=ground.location.coordinates[1]; const gLng=ground.location.coordinates[0];
                  const dist=getDistance(position[0],position[1],gLat,gLng);
                  return (
                    <Marker key={ground._id} position={[gLat,gLng]} icon={groundIcon}>
                      <Popup>
                        <div style={{color:'white',fontSize:13,minWidth:160}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><div style={{fontWeight:700,fontSize:15}}>{ground.name}</div><span className="dist-badge">{dist}</span></div>
                          <div style={{color:'#6b7280',fontSize:12,marginBottom:6}}>📍 {ground.address}</div>
                          <div style={{display:'flex',gap:6,marginBottom:8}}><span style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',color:'#60a5fa',fontSize:11,padding:'2px 8px',borderRadius:100}}>{ground.sport}</span></div>
                          <button onClick={()=>navigate(ground.venueMode === 'live' ? `/grounds/${ground._id}` : `/venues/${ground._id}`)} style={{width:'100%',background:'linear-gradient(135deg,#4ade80,#22c55e)',color:'black',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>View & Book →</button>
                          <button onClick={()=>handleNavigate(gLat,gLng)} style={{width:'100%',marginTop:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ade80',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>{isNavigating?'⏳ Calculating…':'🗺️ Navigate'}</button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Gyms */}
                {gyms.map(gym => {
                  const gLat=gym.location.coordinates[1]; const gLng=gym.location.coordinates[0];
                  const dist=getDistance(position[0],position[1],gLat,gLng);
                  return (
                    <Marker key={gym._id} position={[gLat,gLng]} icon={gymIcon}>
                      <Popup>
                        <div style={{color:'white',fontSize:13,minWidth:160}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><div style={{fontWeight:700,fontSize:15}}>{gym.name}</div><span className="dist-badge">{dist}</span></div>
                          <div style={{color:'#6b7280',fontSize:12,marginBottom:6}}>📍 {gym.address}</div>
                          <span style={{background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',fontSize:11,padding:'2px 8px',borderRadius:100,display:'inline-block',marginBottom:8}}>🎟️ 2-Day Free Trial</span>
                          <button onClick={()=>navigate(gym.venueMode === 'live' ? `/grounds/${gym._id}` : `/venues/${gym._id}`)} style={{width:'100%',background:'linear-gradient(135deg,#4ade80,#22c55e)',color:'black',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>{gym.venueMode === 'interest' ? "I'm Interested →" : 'Get Free Trial →'}</button>
                          <button onClick={()=>handleNavigate(gLat,gLng)} style={{width:'100%',marginTop:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ade80',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>{isNavigating?'⏳ Calculating…':'🗺️ Navigate'}</button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Live "Looking for Players" markers — always visible on the map, same as players/grounds */}
                {activeRequests.map((req) => {
                  const [gLng, gLat] = req.location.coordinates;
                  const spotsLeft = Math.max(req.playersNeeded - (req.playersJoined?.length || 0), 0);
                  const isOrganizer = req.user?._id === user?._id;
                  const alreadyJoined = req.playersJoined?.some((p) => p._id === user?._id);
                  return (
                    <Marker key={req._id} position={[gLat, gLng]} icon={getGameIcon(req.sport)}>
                      <Popup>
                        <div style={{color:'white',fontSize:13,minWidth:170}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:15,textTransform:'capitalize'}}>{GAME_SPORT_EMOJI[req.sport]||'🏅'} {req.sport}</div>
                          </div>
                          <div style={{color:'#6b7280',fontSize:12,marginBottom:2}}>{req.user?.name}{isOrganizer?' (you)':''}</div>
                          {req.locationName && <div style={{color:'#6b7280',fontSize:12,marginBottom:6}}>📍 {req.locationName}</div>}
                          <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                            <span style={{background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',fontSize:11,padding:'2px 8px',borderRadius:100}}>{spotsLeft>0?`Need ${spotsLeft} more`:'Full'}</span>
                            <span style={{background:'rgba(255,255,255,0.06)',color:'#9ca3af',fontSize:11,padding:'2px 8px',borderRadius:100,textTransform:'capitalize'}}>{req.skillLevel}</span>
                          </div>
                          {!isOrganizer && spotsLeft>0 && !alreadyJoined && (
                            <button onClick={()=>handleJoinRequest(req._id)} disabled={joiningRequestId===req._id} style={{width:'100%',background:'linear-gradient(135deg,#4ade80,#22c55e)',color:'black',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>{joiningRequestId===req._id?'Joining…':'Join Game'}</button>
                          )}
                          {alreadyJoined && !isOrganizer && <div style={{textAlign:'center',color:'#4ade80',fontWeight:700,fontSize:12}}>✅ You're in</div>}
                          {isOrganizer && (
                            <button onClick={()=>handleCancelRequest(req._id)} style={{width:'100%',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171',fontWeight:700,fontSize:12,padding:8,borderRadius:8,cursor:'pointer'}}>Cancel Request</button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Legend */}
                <div className="map-legend">
                  {[
                    ['#4ade80', 'You', '50%'],
                    ['#ef4444', `Players (${players.length})`, '2px'],
                    ['#3b82f6', `Grounds (${grounds.length})`, '2px'],
                    ['#eab308', `Social (${socialgrounds.length})`, '2px'],
                    ['#22c55e', `Gyms (${gyms.length})`, '2px'],
                    ['#4ade80', `Games (${activeRequests.length})`, '2px'],
                  ].map(([color, label, br]) => (
                    <div key={label} className="map-legend-item">
                      <span style={{ width: 10, height: 10, borderRadius: br, background: color, flexShrink: 0 }} />
                      {label}
                    </div>
                  ))}
                  <div className="map-legend-item">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1px dashed #4ade80', flexShrink: 0 }} />
                    {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} range
                  </div>
                </div>
              </MapContainer>
            ) : locationStatus === 'denied' ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <span className="text-4xl">📍</span>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Location access is turned off</p>
                <p className="text-gray-500 text-xs max-w-xs">Enable location for this site in your browser settings to see players and grounds near you.</p>
                <button onClick={requestLocation} className="search-btn mt-1">Enable Location</button>
              </div>
            ) : locationStatus === 'unsupported' ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <span className="text-4xl">📍</span>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Location isn't supported on this browser</p>
                <p className="text-gray-500 text-xs max-w-xs">Try a different browser to search players and grounds by distance.</p>
              </div>
            ) : locationStatus === 'error' ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <span className="text-4xl">📍</span>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Couldn't get your location</p>
                <p className="text-gray-500 text-xs max-w-xs">This can happen on a weak signal or connection. Try again.</p>
                <button onClick={requestLocation} className="search-btn mt-1">Try Again</button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"/>
                <p className="text-gray-500 text-sm">Getting your location…</p>
              </div>
            )}
          </div>

          {/* ── Sidebar list ── */}
          <div className="flex flex-col gap-3" style={{ height: '560px' }}>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[['players','🟢','Players'],['venues','🏢','Venues'],['games','🔥','Games']].map(([id,dot,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} className={`tab-btn ${activeTab===id?'tab-active':'tab-inactive'}`}>{dot} {label}{id==='games'?` (${activeRequests.length})`:id==='venues'?` (${grounds.length+socialgrounds.length+gyms.length})`:(searched?` (${players.length})`:'')}
                </button>
              ))}
            </div>

            {activeTab==='venues' && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[['all','All'],['ground','🔵 Grounds'],['social','🟡 Social'],['gym','🟢 Gyms']].map(([id,label])=>(
                  <button key={id} onClick={()=>setVenueFilter(id)} className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border whitespace-nowrap transition-colors ${venueFilter===id?'bg-green-400/15 border-green-400/30 text-green-500 dark:text-green-400':'border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div data-tour="map-players-list" className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1" style={{ scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent' }}>

              {/* Players list */}
              {activeTab==='players' && (
                players.length===0 ? <div className="empty-state"><span className="text-4xl">😕</span><p className="text-sm">No players found</p><p className="text-xs opacity-60">Try increasing the radius or clearing filters</p></div>
                : sortedPlayers.map((player,i)=>(
                  <div key={player._id} className="player-card animate-cardIn" style={{animationDelay:`${i*0.04}s`}}>
                    <div className="flex items-center gap-3 mb-2">
                      {player.user?.avatar ? <img src={player.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-green-400/30 flex-shrink-0"/> : <div className="w-10 h-10 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0">{player.user?.name?.charAt(0)}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{player.user?.name}</p>
                        {playerAreas[player._id] && <p className="text-gray-500 text-xs truncate">📍 {playerAreas[player._id]}</p>}
                      </div>
                      <span className="dist-badge">{position?getDistance(position[0],position[1],player.location.coordinates[1],player.location.coordinates[0]):''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">⚽ {player.sport}</span>
                      <span className={`skill-badge ${getSkillClass(player.skillLevel)}`}>{player.skillLevel}</span>
                    </div>
                    {player.bio && <p className="text-gray-500 text-xs mb-1.5 line-clamp-1">{player.bio}</p>}
                    {player.user?.phone && <p className="text-gray-500 text-xs mb-2">📞 {player.user.phone}</p>}
                    {user?.role==='player' && player.user?._id!==user._id && myGroups.length>0 && (
                      <div className="flex flex-col gap-1 mb-1">
                        {myGroups.map(group=>{
                          const isMember=group.members.some(m=>(m._id&&m._id===player.user._id)||m===player.user._id);
                          const invited=group.invitations?.some(inv=>inv.user===player.user._id||(inv.user?._id===player.user._id));
                          const local=inviteStatus[`${player.user._id}-${group._id}`];
                          const disabled=isMember||invited||local==='sent';
                          return <button key={group._id} onClick={()=>handleInvite(player.user._id,group._id)} disabled={disabled} className="invite-btn" style={{background:disabled?'rgba(255,255,255,0.05)':'rgba(74,222,128,0.08)',color:disabled?'#6b7280':'#4ade80',cursor:disabled?'not-allowed':'pointer',borderColor:disabled?'rgba(255,255,255,0.08)':'rgba(74,222,128,0.2)'}}>{isMember?'🤝 In Group':invited||local==='sent'?'✅ Invited':local==='failed'?'❌ Retry':`+ Invite to ${group.name}`}</button>;
                        })}
                      </div>
                    )}
                    {player.user?._id!==user?._id && <button data-tour={i===0?'map-message-btn':undefined} onClick={async()=>{try{const{data}=await API.post('/chat/direct',{userId:player.user._id});navigate(`/chat/${data._id}`);}catch{}}} className="invite-btn w-full" style={{color:'#4ade80',marginTop:4}}>💬 Message</button>}
                    <button onClick={()=>navigate(`/users/${player.user?._id}/profile`)} className="invite-btn w-full" style={{color:'#a78bfa',background:'rgba(167,139,250,0.08)',borderColor:'rgba(167,139,250,0.2)',marginTop:4}}>👤 View Profile</button>
                  </div>
                ))
              )}

              {/* Venues list — grounds + social + gyms, unified */}
              {activeTab==='venues' && (() => {
                const showGrounds = venueFilter==='all' || venueFilter==='ground';
                const showSocial = venueFilter==='all' || venueFilter==='social';
                const showGyms = venueFilter==='all' || venueFilter==='gym';
                const total = (showGrounds?grounds.length:0) + (showSocial?socialgrounds.length:0) + (showGyms?gyms.length:0);
                if (total===0) return <div className="empty-state"><span className="text-4xl">🏟️</span><p className="text-sm">No venues found</p></div>;
                return (
                  <>
                    {showGrounds && grounds.map((ground,i)=>(
                      <div key={ground._id} onClick={()=>navigate(ground.venueMode === 'live' ? `/grounds/${ground._id}` : `/venues/${ground._id}`)} className="ground-card animate-cardIn" style={{animationDelay:`${i*0.04}s`}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{ground.name}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="dist-badge">{position?getDistance(position[0],position[1],ground.location.coordinates[1],ground.location.coordinates[0]):''}</span>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs mb-2">📍 {ground.address}</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-xs bg-blue-400/8 border border-blue-400/15 text-blue-400 px-2 py-0.5 rounded-full capitalize">🏟️ {ground.sport}</span>
                          <span className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-500 px-2 py-0.5 rounded-full">{ground.slots?.filter(s=>!s.isBooked).length||0} slots free</span>
                        </div>
                        <p className="text-green-400/60 text-xs">Tap to view & book →</p>
                      </div>
                    ))}

                    {showSocial && socialgrounds.map((ground,i)=>(
                      <div key={ground._id} onClick={()=>navigate(ground.venueMode === 'live' ? `/grounds/${ground._id}` : `/venues/${ground._id}`)} className="ground-card animate-cardIn" style={{animationDelay:`${i*0.04}s`,borderColor:'rgba(234,179,8,0.2)'}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">{ground.name}<span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold tracking-widest">SOCIAL</span></p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="dist-badge" style={{color:'#eab308',borderColor:'rgba(234,179,8,0.2)',background:'rgba(234,179,8,0.1)'}}>{position?getDistance(position[0],position[1],ground.location.coordinates[1],ground.location.coordinates[0]):''}</span>
                            <span className="text-yellow-400 font-bold text-sm">Free</span>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs mb-2">📍 {ground.address}</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-xs bg-blue-400/8 border border-blue-400/15 text-blue-400 px-2 py-0.5 rounded-full capitalize">🏟️ {ground.sport}</span>
                          <span className="text-xs bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 text-gray-500 px-2 py-0.5 rounded-full">{ground.slots?.filter(s=>!s.isBooked).length||0} slots free</span>
                        </div>
                        <p className="text-yellow-400/80 text-xs font-semibold">Tap to view & book free →</p>
                      </div>
                    ))}

                    {showGyms && gyms.map((gym,i)=>(
                      <div key={gym._id} onClick={()=>navigate(gym.venueMode === 'live' ? `/grounds/${gym._id}` : `/venues/${gym._id}`)} className="ground-card animate-cardIn" style={{animationDelay:`${i*0.04}s`,borderColor:'rgba(74,222,128,0.25)'}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">{gym.name}<span className="text-[10px] bg-green-400 text-black px-1.5 py-0.5 rounded font-bold tracking-widest">GYM</span></p>
                          <span className="dist-badge">{position?getDistance(position[0],position[1],gym.location.coordinates[1],gym.location.coordinates[0]):''}</span>
                        </div>
                        <p className="text-gray-500 text-xs mb-2">📍 {gym.address}</p>
                        <span className="text-xs bg-green-400/10 border border-green-400/20 text-green-500 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">🎟️ 2-Day Free Trial</span>
                        <p className="text-green-400/60 text-xs mt-2">Tap to claim your trial →</p>
                      </div>
                    ))}
                  </>
                );
              })()}
              {activeTab==='games' && (
                <div className="flex flex-col gap-3">
                  <button onClick={()=>setShowFindPlayers(true)} className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-xs rounded-xl py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-400/30">
                    🏸 Find Players
                  </button>
                  {activeRequests.length===0 ? (
                    <div className="empty-state"><span className="text-4xl">🔥</span><p className="text-sm">No active games right now</p></div>
                  ) : activeRequests.map((req,i)=>(
                    <div key={req._id} className="animate-cardIn" style={{animationDelay:`${i*0.04}s`}}>
                      <LiveRequestCard request={req} onJoin={handleJoinRequest} onCancel={handleCancelRequest} joining={joiningRequestId===req._id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFindPlayers && (
        <FindPlayersModal
          onClose={() => setShowFindPlayers(false)}
        />
      )}
    </div>
  );
};

export default MapSearch;
