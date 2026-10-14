import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import MateRequest from '../models/MateRequest.js';
import Booking from '../models/Booking.js';

const PUBLIC_FIELDS = 'name avatar city state gender loginStreak fitPoints fitcoin totalEarnedFitPoints';

// GET /api/mates — my accepted mates + pending counts
const getMates = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user._id).select('mates').lean();
  const mates = me?.mates?.length
    ? await User.find({ _id: { $in: me.mates } }).select(PUBLIC_FIELDS).lean()
    : [];
  const [incoming, outgoing] = await Promise.all([
    MateRequest.find({ to: req.user._id, status: 'pending' }).populate('from', PUBLIC_FIELDS).sort({ createdAt: -1 }).lean(),
    MateRequest.find({ from: req.user._id, status: 'pending' }).populate('to', PUBLIC_FIELDS).sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ mates, incoming, outgoing });
});

// POST /api/mates/request/:userId
const sendMateRequest = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  if (String(targetId) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't add yourself as a mate");
  }
  const target = await User.findById(targetId).select('_id name').lean();
  if (!target) {
    res.status(404);
    throw new Error('Player not found');
  }
  const me = await User.findById(req.user._id).select('mates').lean();
  if ((me?.mates || []).some((m) => String(m) === String(targetId))) {
    res.status(400);
    throw new Error('Already mates');
  }
  // Either direction already pending → treat as sent, don't error.
  const eitherWay = await MateRequest.findOne({
    status: 'pending',
    $or: [{ from: req.user._id, to: targetId }, { from: targetId, to: req.user._id }],
  });
  if (eitherWay) {
    return res.json({ message: 'Request already pending', request: eitherWay, status: 'pending' });
  }
  const request = await MateRequest.create({ from: req.user._id, to: targetId, status: 'pending' });
  res.status(201).json({ message: `Mate request sent to ${target.name} 🤝`, request });
});

// POST /api/mates/accept/:requestId
const acceptMateRequest = asyncHandler(async (req, res) => {
  const request = await MateRequest.findById(req.params.requestId);
  if (!request || String(request.to) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request already answered');
  }
  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();
  // Both sides get the mate listed, and idempotently (no duplicates if a
  // race or a re-accept ever happens).
  await User.updateOne({ _id: req.user._id }, { $addToSet: { mates: request.from } });
  await User.updateOne({ _id: request.from }, { $addToSet: { mates: request.to } });
  const mate = await User.findById(request.from).select(PUBLIC_FIELDS).lean();
  res.json({ message: "You're mates now 🤝", mate });
});

// POST /api/mates/cancel/:requestId — sender withdraws a pending request
const cancelMateRequest = asyncHandler(async (req, res) => {
  const request = await MateRequest.findById(req.params.requestId);
  if (!request || String(request.from) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.status !== 'pending') {
    res.status(400);
    throw new Error('Request already answered');
  }
  await MateRequest.deleteOne({ _id: request._id });
  res.json({ message: 'Request cancelled' });
});

// POST /api/mates/decline/:requestId
const declineMateRequest = asyncHandler(async (req, res) => {
  const request = await MateRequest.findById(req.params.requestId);
  if (!request || String(request.to) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Request not found');
  }
  // Delete rather than mark declined, so the pair can re-request later
  // without colliding with the (from,to) unique index.
  await MateRequest.deleteOne({ _id: request._id });
  res.json({ message: 'Request declined' });
});

// DELETE /api/mates/:userId — remove a mate (both sides)
const removeMate = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { mates: req.params.userId } });
  await User.updateOne({ _id: req.params.userId }, { $pull: { mates: req.user._id } });
  await MateRequest.deleteMany({
    $or: [
      { from: req.user._id, to: req.params.userId },
      { from: req.params.userId, to: req.user._id },
    ],
  });
  res.json({ message: 'Mate removed' });
});

// GET /api/mates/status/:userId — for the button on a player's card
const getMateStatus = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  const me = await User.findById(req.user._id).select('mates').lean();
  const isMate = (me?.mates || []).some((m) => String(m) === String(targetId));
  if (isMate) return res.json({ status: 'mates' });
  const outgoing = await MateRequest.findOne({ from: req.user._id, to: targetId, status: 'pending' }).lean();
  if (outgoing) return res.json({ status: 'requested' });
  const incoming = await MateRequest.findOne({ from: targetId, to: req.user._id, status: 'pending' }).lean();
  if (incoming) return res.json({ status: 'incoming', requestId: incoming._id });
  res.json({ status: 'none' });
});

export { getMates, sendMateRequest, acceptMateRequest, declineMateRequest, cancelMateRequest, removeMate, getMateStatus };
