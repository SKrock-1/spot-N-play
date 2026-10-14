import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import FitTransaction from '../models/FitTransaction.js';
import Booking from '../models/Booking.js';

// Leaderboard ranks by lifetime Fit Points, matches played as the
// tie-breaker. Weekly/monthly windows re-derive points from the ledger
// (the only place windowed truth exists) instead of mutating the User doc.
const WINDOWS = {
  all: () => ({}),
  monthly: () => ({ createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }),
  weekly: () => ({ createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } }),
};

const getLeaderboard = asyncHandler(async (req, res) => {
  const range = ['all', 'monthly', 'weekly'].includes(req.query.range) ? req.query.range : 'all';
  const match = WINDOWS[range]();

  const [pointsRows, matchRows] = await Promise.all([
    FitTransaction.aggregate([
      { $match: match },
      { $group: { _id: '$user', fitPoints: { $sum: '$fitPoints' }, fitcoin: { $sum: '$fitcoin' } } },
    ]),
    Booking.aggregate([
      { $match: { ...match, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$player', matches: { $sum: 1 } } },
    ]),
  ]);

  const pointsMap = new Map(pointsRows.map((r) => [String(r._id), r]));
  const matchMap = new Map(matchRows.map((r) => [String(r._id), r.matches]));

  const userIds = [...new Set([...pointsMap.keys(), ...matchMap.keys()])];
  const users = await User.find({ _id: { $in: userIds } })
    .select('name avatar city fitPoints totalEarnedFitPoints')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const rows = userIds
    .filter((id) => userMap.has(id))
    .map((id) => {
      const u = userMap.get(id);
      return {
        _id: id,
        name: u.name,
        avatar: u.avatar || '',
        city: u.city || '',
        fitPoints: pointsMap.get(id)?.fitPoints ?? (range === 'all' ? u.fitPoints || 0 : 0),
        fitcoin: pointsMap.get(id)?.fitcoin ?? 0,
        matches: matchMap.get(id) || 0,
      };
    })
    // Anyone with nothing in the window ranks zero, not absent — but they'd
    // all tie at 0, so keep only people who actually did something.
    .filter((r) => r.fitPoints > 0 || r.matches > 0)
    .sort((a, b) => b.fitPoints - a.fitPoints || b.matches - a.matches || a.name.localeCompare(b.name))
    .slice(0, 100)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // My own row — always present, and always with an EXACT rank, even when
  // I'm outside the top 100 (pointsRows/matchMap cover every active player,
  // so the rank is computed from the full set, not from the sliced list).
  let me = null;
  const myId = String(req.user._id);
  const mine = rows.find((r) => r._id === myId);
  if (mine) {
    me = mine;
  } else {
    const u = await User.findById(req.user._id).select('name avatar city fitPoints').lean();
    const myPoints = await FitTransaction.aggregate([
      { $match: { ...match, user: req.user._id } },
      { $group: { _id: null, fitPoints: { $sum: '$fitPoints' }, fitcoin: { $sum: '$fitcoin' } } },
    ]);
    const myMatches = await Booking.countDocuments({ ...match, player: req.user._id, status: { $ne: 'cancelled' } });
    me = {
      _id: myId,
      name: u?.name || 'You',
      avatar: u?.avatar || '',
      city: u?.city || '',
      fitPoints: myPoints[0]?.fitPoints ?? (range === 'all' ? u?.fitPoints || 0 : 0),
      fitcoin: myPoints[0]?.fitcoin ?? 0,
      matches: myMatches,
    };
  }
  if (me.rank === undefined) me.rank = null;
  if (me.rank === null) {
    const better = pointsRows.filter((r) => {
      const pts = r.fitPoints || 0;
      if (pts !== me.fitPoints) return pts > me.fitPoints;
      return (matchMap.get(String(r._id)) || 0) > me.matches;
    }).length;
    me.rank = better + 1;
  }

  res.json({ range, rows, me, total: rows.length });
});

export { getLeaderboard };
