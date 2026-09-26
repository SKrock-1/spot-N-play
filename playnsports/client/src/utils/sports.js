// Single source for sports — keep in sync with server Ground.js SPORT_NAMES
export const SPORTS = [
  'football','cricket','basketball','tennis','badminton','volleyball','boxing','hockey',
  'kabaddi','kho kho','pickleball','table tennis','squash','handball','futsal','rugby',
  'athletics','wrestling','weightlifting','yoga','skating','chess','carrom','archery','shooting','cycling',
  'box cricket','box football','gym','swimming','esports','other',
];
export const SPORT_EMOJI = {
  football:'⚽', cricket:'🏏', basketball:'🏀', tennis:'🎾', badminton:'🏸', volleyball:'🏐', boxing:'🥊', hockey:'🏑',
  kabaddi:'🤼','kho kho':'🏃', pickleball:'🏓','table tennis':'🏓', squash:'🎾', handball:'🤾', futsal:'⚽', rugby:'🏉',
  athletics:'🏃', wrestling:'🤼', weightlifting:'🏋️', yoga:'🧘', skating:'⛸️', chess:'♟️', carrom:'🎯', archery:'🏹', shooting:'🎯', cycling:'🚴',
  'box cricket':'🏏','box football':'⚽', gym:'🏋️', swimming:'🏊', esports:'🎮', other:'🏅',
};
export const getSportEmoji = (s) => SPORT_EMOJI[s] || SPORT_EMOJI[s?.toLowerCase?.()] || '🏆';
export const sportLabel = (s='') => s==='esports'?'Esports': s.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
