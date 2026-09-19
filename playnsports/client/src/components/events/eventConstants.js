// Shared constants and helpers for the Events feature.

export const SPORTS = [
  'football',
  'cricket',
  'basketball',
  'tennis',
  'badminton',
  'volleyball',
  'boxing',
  'hockey',
  'kabaddi',
  'kho kho',
  'pickleball',
  'table tennis',
  'squash',
  'handball',
  'futsal',
  'rugby',
  'athletics',
  'wrestling',
  'weightlifting',
  'yoga',
  'skating',
  'chess',
  'carrom',
  'archery',
  'shooting',
  'cycling',
  'box cricket',
  'box football',
  'esports',
  'other',
];

export const FIELD_SPORTS = SPORTS.filter((sport) => sport !== 'esports');

export const EVENT_CATEGORIES = [
  { id: '', label: 'All Events' },
  { id: 'sports', label: 'Sports' },
  { id: 'esports', label: 'Esports' },
];

export const ESPORTS_GAMES = [
  'BGMI',
  'Valorant',
  'Free Fire',
  'Call of Duty Mobile',
  'FIFA / EA Sports FC',
  'Rocket League',
  'Counter-Strike 2',
  'Dota 2',
  'League of Legends',
  'Other',
];

export const ESPORTS_PLATFORMS = [
  'Mobile',
  'PC',
  'Console',
  'Cross-platform',
];

export const ESPORTS_FORMATS = [
  'Solo',
  'Duo',
  'Squad',
  '5v5',
  'Knockout',
  'League',
  'Custom room',
];

export const SPORT_EMOJI = {
  football: '⚽',
  cricket: '🏏',
  basketball: '🏀',
  tennis: '🎾',
  badminton: '🏸',
  volleyball: '🏐',
  boxing: '🥊',
  hockey: '🏑',
  kabaddi: '🤼',
  'kho kho': '🏃',
  pickleball: '🏓',
  'table tennis': '🏓',
  squash: '🎾',
  handball: '🤾',
  futsal: '⚽',
  rugby: '🏉',
  athletics: '🏃',
  wrestling: '🤼',
  weightlifting: '🏋️',
  yoga: '🧘',
  skating: '⛸️',
  chess: '♟️',
  carrom: '🎯',
  archery: '🏹',
  shooting: '🎯',
  cycling: '🚴',
  'box cricket': '🏏',
  'box football': '⚽',
  esports: '🎮',
  other: '🏅',
};

export const sportLabel = (sport = '') =>
  sport === 'esports'
    ? 'Esports'
    : sport.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const eventLabel = (event = {}) =>
  event.eventCategory === 'esports'
    ? (event.gameTitle || 'Esports')
    : sportLabel(event.sport);

// 'YYYY-MM-DD' -> 'Mon, 16 Jun 2026'
export const formatEventDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// '14:30' -> '2:30 PM'
export const formatEventTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const approvalColor = (status) => {
  if (status === 'approved') return 'ev-badge-approved';
  if (status === 'rejected') return 'ev-badge-rejected';
  return 'ev-badge-pending';
};
