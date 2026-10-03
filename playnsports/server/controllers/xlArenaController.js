import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Ground from '../models/Ground.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import XlMembership from '../models/XlMembership.js';
import { getRazorpay } from '../utils/razorpay.js';
import { claimSlotCapacity, releaseSlotCapacity, splitAmount, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';
import { generateTicketId } from '../utils/ticket.js';
import { notifySlotBooked } from '../services/notificationService.js';

// Arena membership catalogue. Single plan for now (Jaideep: Single
// Standard ₹990) — extend this array if XL adds more tiers later.
export const XL_PLANS = [
  { name: 'Standard', label: 'Single · per month', price: 990, validityDays: 30 },
];

const VALIDITY_DAYS = 30;

const activeMembership = (userId, groundId) =>
  XlMembership.findOne({
    user: userId,
    ground: groundId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

// GET /api/xl/:groundId/info — plans + my current membership (if any)
const getXlInfo = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId).select('name venueType venueMode approvalStatus sports address');
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const mine = await activeMembership(req.user._id, ground._id);
  res.json({
    ground: { _id: ground._id, name: ground.name, address: ground.address },
    plans: XL_PLANS,
    myMembership: mine
      ? { planName: mine.planName, price: mine.price, purchasedAt: mine.purchasedAt, expiresAt: mine.expiresAt, status: mine.status }
      : null,
  });
});

// POST /api/xl/:groundId/membership/order — full-payment Razorpay order
const createMembershipOrder = asyncHandler(async (req, res) => {
  const { planName = 'Standard' } = req.body;
  const plan = XL_PLANS.find((p) => p.name === planName);
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  if (ground.venueMode !== 'live') {
    res.status(403);
    throw new Error('Membership opens once the venue goes live');
  }
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: plan.price * 100,
    currency: 'INR',
    receipt: `xlmem_${Date.now()}`,
    notes: { groundId: ground._id.toString(), playerId: req.user._id.toString(), planName: plan.name, type: 'xl_membership' },
  });
  res.json({ orderId: order.id, amount: plan.price, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, plan });
});

// POST /api/xl/:groundId/membership/verify — HMAC check → 30-day pass
const verifyMembershipPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName = 'Standard' } = req.body;
  const plan = XL_PLANS.find((p) => p.name === planName);
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const now = new Date();
  const existing = await activeMembership(req.user._id, ground._id);
  // Renewals extend from the current expiry so members never lose days.
  const start = existing && existing.expiresAt > now ? existing.expiresAt : now;
  const expiresAt = new Date(start.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (existing) {
    existing.expiresAt = expiresAt;
    existing.price = plan.price;
    existing.planName = plan.name;
    existing.payment = { razorpayOrderId, razorpayPaymentId };
    await existing.save();
    return res.json({ message: 'Membership renewed ✅', myMembership: { planName: existing.planName, price: existing.price, expiresAt: existing.expiresAt, status: existing.status } });
  }
  const membership = await XlMembership.create({
    user: req.user._id,
    ground: ground._id,
    planName: plan.name,
    price: plan.price,
    purchasedAt: now,
    expiresAt,
    status: 'active',
    payment: { razorpayOrderId, razorpayPaymentId },
  });
  res.json({ message: 'Membership activated ✅', myMembership: { planName: membership.planName, price: membership.price, expiresAt: membership.expiresAt, status: membership.status } });
});

// ── Arena turf booking (mirrors xlarena.com/booking) ────────────────────
// 5-step flow: Arena → Game → Date → Time Slots → Confirm.
// Unlike pools (shared water, full payment), an arena turf is exclusive
// (capacity 1) and players routinely book several CONTINUOUS hourly slots
// in one go, paying Full now or a ₹500 Token now (rest at the arena).

const TOKEN_AMOUNT = 500;
const MAX_SLOTS_PER_ORDER = 6;
const MAX_ADVANCE_DAYS = 30;

const todayStr = () => new Date().toISOString().split('T')[0];
const plusDaysStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const slotHours = (slot) => {
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  return Math.max((eh * 60 + em - (sh * 60 + sm)) / 60, 0) || 1;
};
const isPastToday = (slot) => {
  if (slot.date !== todayStr()) return false;
  const [h, m] = slot.startTime.split(':').map(Number);
  const now = new Date();
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
};

// Shared resolver for order + verify — everything re-derived server-side,
// never trusted from the client body beyond identifying slotIds + payMode.
const resolveArenaContext = async (groundId, slotIds, payMode) => {
  if (!['full', 'token'].includes(payMode)) {
    const e = new Error("payMode must be 'full' or 'token'");
    e.status = 400;
    throw e;
  }
  const ids = [...new Set((slotIds || []).map(String))].filter(Boolean);
  if (ids.length < 1 || ids.length > MAX_SLOTS_PER_ORDER) {
    const e = new Error(`Select 1 to ${MAX_SLOTS_PER_ORDER} time slots`);
    e.status = 400;
    throw e;
  }
  const ground = await Ground.findById(groundId);
  if (!ground) {
    const e = new Error('Venue not found');
    e.status = 404;
    throw e;
  }
  if (ground.venueMode !== 'live') {
    const e = new Error('Booking opens once the venue goes live');
    e.status = 403;
    throw e;
  }
  const slots = ids.map((id) => ground.slots.id(id)).filter(Boolean);
  if (slots.length !== ids.length) {
    const e = new Error('One or more slots no longer exist');
    e.status = 404;
    throw e;
  }
  const maxDate = plusDaysStr(MAX_ADVANCE_DAYS);
  for (const s of slots) {
    if (s.date < todayStr() || s.date > maxDate || isPastToday(s)) {
      const e = new Error('One or more slots are no longer bookable (past date or outside the 30-day window)');
      e.status = 400;
      throw e;
    }
    if (s.bookedCount + 1 > s.capacity) {
      const e = new Error('One or more slots just got filled — please pick another time');
      e.status = 409;
      throw e;
    }
  }
  // Same turf, same day, back-to-back times (e.g. 17:00–18:00 + 18:00–19:00).
  const date = slots[0].date;
  const sportId = String(slots[0].sportId);
  const courtId = String(slots[0].courtId || '');
  if (!slots.every((s) => s.date === date && String(s.sportId) === sportId && String(s.courtId || '') === courtId)) {
    const e = new Error('Please select continuous time slots on the same turf and day');
    e.status = 400;
    throw e;
  }
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].startTime !== slots[i - 1].endTime) {
      const e = new Error('Please select continuous time slots');
      e.status = 400;
      throw e;
    }
  }
  const sportDoc = ground.sports.id(slots[0].sportId);
  if (!sportDoc) {
    const e = new Error('Sport configuration missing for this slot');
    e.status = 400;
    throw e;
  }
  const priced = slots.map((s) => {
    const slotTotal = Math.round((sportDoc.pricePerHour || 0) * slotHours(s));
    return { slot: s, slotTotal, split: splitAmount(ground, slotTotal, 1) };
  });
  const total = priced.reduce((sum, p) => sum + p.slotTotal, 0);
  const payable = payMode === 'full' ? total : Math.min(TOKEN_AMOUNT, total);
  return { ground, sportDoc, slots, priced, total, payable, remaining: total - payable, date, payMode };
};

// POST /api/xl/:groundId/arena-order { slotIds[], payMode }
const createArenaOrder = asyncHandler(async (req, res) => {
  let ctx;
  try {
    ctx = await resolveArenaContext(req.params.groundId, req.body.slotIds, req.body.payMode || 'token');
  } catch (err) {
    res.status(err.status || 500);
    throw err;
  }
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: ctx.payable * 100,
    currency: 'INR',
    receipt: `xlarena_${Date.now()}`,
    notes: {
      groundId: ctx.ground._id.toString(),
      playerId: req.user._id.toString(),
      slotIds: ctx.slots.map((s) => String(s._id)).join(','),
      payMode: ctx.payMode,
      type: 'xl_arena',
    },
  });
  res.json({
    orderId: order.id,
    amount: ctx.payable,
    total: ctx.total,
    remaining: ctx.remaining,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    payMode: ctx.payMode,
    slots: ctx.slots.map((s) => ({ _id: s._id, date: s.date, startTime: s.startTime, endTime: s.endTime })),
  });
});

// POST /api/xl/:groundId/arena-verify { razorpay..., slotIds[], payMode }
const verifyArenaPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }
  let ctx;
  try {
    ctx = await resolveArenaContext(req.params.groundId, req.body.slotIds, req.body.payMode || 'token');
  } catch (err) {
    res.status(err.status || 500);
    throw err;
  }

  // Claim every slot; unwind on partial failure (payment already captured —
  // surface it exactly like the single-slot flow does).
  const claimed = [];
  for (const s of ctx.slots) {
    const ok = await claimSlotCapacity({ groundId: ctx.ground._id, slotId: s._id, userId: req.user._id, partySize: 1 });
    if (!ok) {
      for (const c of claimed) {
        await releaseSlotCapacity({ groundId: ctx.ground._id, slotId: c._id, userId: req.user._id, partySize: 1 });
      }
      res.status(409);
      throw new Error('A slot was just filled by someone else. Your payment was captured — please contact support for a refund.');
    }
    claimed.push(s);
  }

  // Split the paid amount across slots proportionally (remainder on last).
  let assigned = 0;
  const bookings = [];
  for (let i = 0; i < ctx.priced.length; i++) {
    const { slot, slotTotal, split } = ctx.priced[i];
    const isLast = i === ctx.priced.length - 1;
    const share = isLast ? ctx.payable - assigned : Math.round((slotTotal / ctx.total) * ctx.payable);
    assigned += share;
    const remaining = slotTotal - share;
    const done = remaining <= 0;
    const booking = await Booking.create({
      player: req.user._id,
      ground: ctx.ground._id,
      slot: slot._id,
      sportId: slot.sportId,
      sportName: ctx.sportDoc?.name || '',
      courtId: slot.courtId,
      courtName: slot.courtId ? ctx.sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
      partySize: 1,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalPrice: slotTotal,
      advancePrice: share,
      remainingPrice: remaining,
      commissionPercent: split.commissionPercent,
      platformCommission: Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ownerPayout: slotTotal - Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ticketId: generateTicketId(),
      status: done ? 'completed' : 'advance_paid',
    });
    const payment = await Payment.create({
      booking: booking._id,
      player: req.user._id,
      ground: ctx.ground._id,
      totalAmount: slotTotal,
      advanceAmount: share,
      remainingAmount: remaining,
      commissionPercent: split.commissionPercent,
      platformCommission: Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ownerPayout: slotTotal - Math.round(split.platformCommission * (slotTotal / ctx.total)),
      advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
      finalPayment: done ? { status: 'not_due' } : { status: 'pending' },
      status: done ? 'completed' : 'advance_paid',
    });
    booking.payment = payment._id;
    await booking.save();
    bookings.push(booking);
  }

  notifySlotBooked({
    ownerId: ctx.ground.owner,
    actorId: req.user._id,
    groundId: ctx.ground._id,
    groundName: ctx.ground.name,
    date: ctx.date,
    startTime: ctx.slots[0].startTime,
    endTime: ctx.slots[ctx.slots.length - 1].endTime,
  });

  res.json({
    message: ctx.remaining > 0 ? 'Turf booked — token paid, rest at the arena ✅' : 'Turf booked — fully paid ✅',
    bookings: bookings.map(sanitizeBookingForPlayer),
    total: ctx.total,
    paid: ctx.payable,
    remaining: ctx.remaining,
  });
});

export { getXlInfo, createMembershipOrder, verifyMembershipPayment, createArenaOrder, verifyArenaPayment };
