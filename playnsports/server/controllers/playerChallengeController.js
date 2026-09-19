import asyncHandler from 'express-async-handler';
import PlayerChallenge from '../models/PlayerChallenge.js';
import User from '../models/User.js';
import { getIO } from '../socket/io.js';
import { notifyChallengeReceived, notifyChallengeUpdate } from '../services/notificationService.js';

// Sports a player can challenge another to. Kept in sync with the Player
// model's sport enum (physical sports — no esports on this flow).
const CHALLENGE_SPORTS = [
  'football', 'cricket', 'basketball', 'tennis', 'badminton',
  'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball',
  'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics',
  'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom',
  'archery', 'shooting', 'cycling', 'box cricket', 'box football',
];

const emitChallengeChange = (payload) => {
  try {
    const io = getIO();
    if (io) io.emit('challenge_update', payload);
  } catch {
    // socket layer not ready yet — notifications already cover it
  }
};

const populateChallenge = (query) =>
  query
    .populate('challenger', 'name avatar role')
    .populate('opponent', 'name avatar role')
    .populate('winner', 'name avatar')
    .sort({ updatedAt: -1 });

// POST /api/player-challenges
// Body: { opponentId, sport, proposedDate?, proposedTime?, venue?, message? }
const createChallenge = asyncHandler(async (req, res) => {
  const { opponentId, sport, proposedDate, proposedTime, venue, message } = req.body;

  if (!opponentId || !sport) {
    res.status(400);
    throw new Error('opponentId and sport are required');
  }
  const cleanSport = String(sport).trim().toLowerCase();
  if (!CHALLENGE_SPORTS.includes(cleanSport)) {
    res.status(400);
    throw new Error('Choose a valid sport for the challenge');
  }
  if (String(opponentId) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't challenge yourself");
  }

  const opponent = await User.findById(opponentId).select('role isActive');
  if (!opponent || !opponent.isActive) {
    res.status(404);
    throw new Error('Player not found');
  }
  if (opponent.role !== 'player') {
    res.status(400);
    throw new Error('You can only challenge players');
  }

  if (proposedDate) {
    const d = new Date(`${proposedDate}T${proposedTime || '23:59'}`);
    if (Number.isNaN(d.getTime())) {
      res.status(400);
      throw new Error('Invalid proposed date');
    }
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) {
      res.status(400);
      throw new Error("Proposed date can't be in the past");
    }
  }

  // One live challenge per pair per sport — avoids spamming the same person.
  const existing = await PlayerChallenge.findOne({
    challenger: req.user._id,
    opponent: opponentId,
    sport: cleanSport,
    status: 'pending',
  });
  if (existing) {
    res.status(400);
    throw new Error(`You already have a pending ${cleanSport} challenge with this player`);
  }

  const challenge = await PlayerChallenge.create({
    challenger: req.user._id,
    opponent: opponentId,
    sport: cleanSport,
    proposedDate: proposedDate || '',
    proposedTime: proposedTime || '',
    venue: venue || '',
    message: message || '',
  });

  await notifyChallengeReceived({
    challengeId: challenge._id,
    recipientId: opponentId,
    challengerId: req.user._id,
    challengerName: req.user.name,
    sport: cleanSport,
    venue: challenge.venue,
  });
  emitChallengeChange({ challengeId: challenge._id, opponentId, challengerId: req.user._id });

  res.status(201).json(challenge);
});

// GET /api/player-challenges/mine → everything about me, pre-split for the UI
const getMyChallenges = asyncHandler(async (req, res) => {
  const mine = await populateChallenge(
    PlayerChallenge.find({
      $or: [{ challenger: req.user._id }, { opponent: req.user._id }],
    })
  );

  const incoming = mine.filter((c) => String(c.opponent?._id) === String(req.user._id) && c.status === 'pending');
  const outgoing = mine.filter((c) => String(c.challenger?._id) === String(req.user._id) && c.status === 'pending');
  const active = mine.filter((c) => c.status === 'accepted');
  const history = mine.filter((c) => ['completed', 'declined', 'cancelled'].includes(c.status));

  res.json({ incoming, outgoing, active, history });
});

// PATCH /api/player-challenges/:id/respond  body { action: 'accept' | 'decline' }
const respondChallenge = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    res.status(400);
    throw new Error("action must be 'accept' or 'decline'");
  }

  const challenge = await PlayerChallenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (String(challenge.opponent) !== String(req.user._id)) {
    res.status(403); throw new Error('Only the challenged player can respond');
  }
  if (challenge.status !== 'pending') {
    res.status(400); throw new Error('This challenge was already handled');
  }

  challenge.status = action === 'accept' ? 'accepted' : 'declined';
  await challenge.save();

  await notifyChallengeUpdate({
    challengeId: challenge._id,
    recipientId: challenge.challenger,
    actorId: req.user._id,
    actorName: req.user.name,
    sport: challenge.sport,
    action: challenge.status,
  });
  emitChallengeChange({ challengeId: challenge._id, opponentId: challenge.opponent, challengerId: challenge.challenger });

  res.json(challenge);
});

// PATCH /api/player-challenges/:id/cancel — challenger only, while pending/accepted
const cancelChallenge = asyncHandler(async (req, res) => {
  const challenge = await PlayerChallenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }
  if (String(challenge.challenger) !== String(req.user._id)) {
    res.status(403); throw new Error('Only the challenger can cancel');
  }
  if (!['pending', 'accepted'].includes(challenge.status)) {
    res.status(400); throw new Error('This challenge can no longer be cancelled');
  }

  challenge.status = 'cancelled';
  await challenge.save();

  await notifyChallengeUpdate({
    challengeId: challenge._id,
    recipientId: challenge.opponent,
    actorId: req.user._id,
    actorName: req.user.name,
    sport: challenge.sport,
    action: 'cancelled',
  });
  emitChallengeChange({ challengeId: challenge._id, opponentId: challenge.opponent, challengerId: challenge.challenger });

  res.json(challenge);
});

// PATCH /api/player-challenges/:id/result — either participant, while accepted.
// Body: { winnerId } for a winner, or { draw: true } for a tie.
const reportResult = asyncHandler(async (req, res) => {
  const { winnerId, draw } = req.body;

  const challenge = await PlayerChallenge.findById(req.params.id);
  if (!challenge) { res.status(404); throw new Error('Challenge not found'); }

  const isChallenger = String(challenge.challenger) === String(req.user._id);
  const isOpponent = String(challenge.opponent) === String(req.user._id);
  if (!isChallenger && !isOpponent) {
    res.status(403); throw new Error('Only the two players can report the result');
  }
  if (challenge.status !== 'accepted') {
    res.status(400); throw new Error('Report the result only after the challenge is accepted');
  }

  const otherId = isChallenger ? challenge.opponent : challenge.challenger;

  if (draw) {
    challenge.winner = null;
  } else {
    if (!winnerId) { res.status(400); throw new Error('Pick a winner or mark it as a draw'); }
    const w = String(winnerId);
    if (w !== String(challenge.challenger) && w !== String(challenge.opponent)) {
      res.status(400); throw new Error('Winner must be one of the two players');
    }
    challenge.winner = w;
  }

  challenge.status = 'completed';
  challenge.resultNote = (req.body.resultNote || '').trim();
  challenge.reportedBy = req.user._id;
  challenge.completedAt = new Date();
  await challenge.save();

  await notifyChallengeUpdate({
    challengeId: challenge._id,
    recipientId: otherId,
    actorId: req.user._id,
    actorName: req.user.name,
    sport: challenge.sport,
    action: 'completed',
  });
  emitChallengeChange({ challengeId: challenge._id, opponentId: challenge.opponent, challengerId: challenge.challenger });

  res.json(challenge);
});

export { createChallenge, getMyChallenges, respondChallenge, cancelChallenge, reportResult, CHALLENGE_SPORTS };
