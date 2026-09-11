import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Ground from '../models/Ground.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import PoolBookingSlot from '../models/PoolBookingSlot.js';
import { getRazorpay } from '../utils/razorpay.js';
import { splitAmount, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';
import { generateTicketId } from '../utils/ticket.js';
import { sendPoolBookingEmail } from '../utils/sendEmail.js';
import { notifySlotBooked, notifyPoolBookingConfirmed } from '../services/notificationService.js';
import { signPoolQr, verifyPoolQr } from '../utils/poolQr.js';
import {
  todayStr, isWithinBookingWindow, MAX_ADVANCE_DAYS, MAX_DAILY_HEADCOUNT,
  getOrCreateConfig, effectiveBlocksForDate, findEffectiveBlock, claimPoolSlotCapacity, releasePoolSlotCapacity,
} from '../utils/poolBookingEngine.js';
import { getIO } from '../socket/io.js';

const clampParty = (n) => Math.max(1, Math.min(Number(n) || 1, MAX_DAILY_HEADCOUNT));

const loadLiveBookablePool = async (groundId) => {
  const ground = await Ground.findById(groundId);
  if (!ground || ground.venueType !== 'pool') return { error: { status: 404, message: 'Pool venue not found' } };
  if (ground.approvalStatus !== 'approved' || ground.venueMode !== 'live') {
    return { error: { status: 403, message: 'This venue is still in its trial phase — booking opens once it goes live' } };
  }
  return { ground };
};

// Sum of headcount this player already has reserved at this venue on this
// date, across every pool and every booking — the "max 7 slots a day"
// rule, whether that's one booking of 7 or several smaller ones.
const dailyHeadcountUsed = async (playerId, groundId, date, excludeBookingId = null) => {
  const query = {
    player: playerId,
    ground: groundId,
    date,
    poolId: { $ne: null },
    status: { $nin: ['cancelled', 'refunded'] },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const bookings = await Booking.find(query).select('partySize');
  return bookings.reduce((sum, b) => sum + (b.partySize || 1), 0);
};

// ── Availability (read-only, any authenticated user) ────────────────────

const getPoolAvailability = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(200); return res.json({ pools: [], notice: error.message }); }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayStr();
  if (!isWithinBookingWindow(date)) {
    res.status(400);
    throw new Error(`Bookings are only open for today through the next ${MAX_ADVANCE_DAYS} days`);
  }

  const config = await getOrCreateConfig(ground._id);

  const bookedDocs = await PoolBookingSlot.find({ ground: ground._id, date });
  const bookedMap = {};
  bookedDocs.forEach((d) => { bookedMap[`${d.pool}:${d.startTime}`] = d.bookedCount; });

  const pools = config.pools
    .filter((p) => p.isActive)
    .map((p) => ({
      poolId: p._id,
      name: p.name,
      slots: effectiveBlocksForDate(p, date)
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((b) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
          capacity: b.capacity,
          bookedCount: bookedMap[`${p._id}:${b.startTime}`] || 0,
        })),
    }));

  res.json({ date, maxAdvanceDays: MAX_ADVANCE_DAYS, pools });
});

// ── Membership plans + fees (read-only, any authenticated user) ─────────

const getPoolPlans = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  res.json({
    planTypes: (config.planTypes || []).filter((p) => p.isActive),
    membershipPlans: (config.membershipPlans || []).filter((p) => p.isActive),
    registrationFee: config.registrationFee,
    coachingFee: config.coachingFee,
    alreadyRegistered: req.user.poolRegistrations?.some((id) => String(id) === String(ground._id)) || false,
    medicalCertificateUrl: req.user.medicalCertificateUrl || '',
    maxPartySize: MAX_DAILY_HEADCOUNT,
    maxAdvanceDays: MAX_ADVANCE_DAYS,
  });
});

// ── Checkout ─────────────────────────────────────────────────────────────

// Re-derives everything server-side from the request's identifying fields
// only (poolId/date/startTime/planTypeId/categoryId/partySize) — never trusts
// a client-sent price. Shared by both createPoolOrder and verifyPoolPayment
// so the amount charged can never drift between the two steps.
const resolveBookingContext = async (ground, req) => {
  const { poolId, date, startTime, planTypeId, categoryId, membershipPlanId, includeRegistration, healthConfirmed } = req.body;
  const partySize = clampParty(req.body.partySize);

  if (!poolId || !date || !startTime || (!planTypeId && !membershipPlanId)) {
    const err = new Error('poolId, date, startTime and plan/category are required');
    err.status = 400; throw err;
  }
  if (!isWithinBookingWindow(date)) {
    const err = new Error(`Bookings are only open for today through the next ${MAX_ADVANCE_DAYS} days`);
    err.status = 400; throw err;
  }
  if (healthConfirmed !== true && healthConfirmed !== 'true') {
    const err = new Error('Please confirm the health & safety declaration to continue');
    err.status = 400; throw err;
  }

  const config = await getOrCreateConfig(ground._id);
  const pool = config.pools.id(poolId);
  if (!pool || !pool.isActive) { const err = new Error('This pool is not available for booking'); err.status = 404; throw err; }

  const block = findEffectiveBlock(pool, date, startTime);
  if (!block) { const err = new Error('This slot is not open for booking'); err.status = 400; throw err; }

  // New plan-type/category pricing (planTypes own their categories). Legacy
  // membershipPlanId is still accepted for older clients, if present.
  let planName, planLabel, unitPrice;
  if (planTypeId) {
    if (!categoryId) { const err = new Error('Please pick a membership category'); err.status = 400; throw err; }
    const planType = (config.planTypes || []).find((p) => String(p._id) === String(planTypeId));
    if (!planType || !planType.isActive) { const err = new Error('Please pick a valid plan'); err.status = 400; throw err; }
    const category = (planType.categories || []).find((c) => String(c._id) === String(categoryId));
    if (!category || category.isActive === false) { const err = new Error('Please pick a valid membership category'); err.status = 400; throw err; }
    planName = `${planType.name} — ${category.name}`;
    planLabel = planType.billingLabel || 'per session';
    unitPrice = Number(category.price) || 0;
  } else {
    const plan = (config.membershipPlans || []).find((p) => String(p._id) === String(membershipPlanId));
    if (!plan || !plan.isActive) { const err = new Error('Please pick a valid membership plan'); err.status = 400; throw err; }
    planName = `${plan.name} (${plan.billingLabel})`;
    planLabel = plan.billingLabel;
    unitPrice = Number(plan.price) || 0;
  }

  const alreadyRegistered = req.user.poolRegistrations?.some((id) => String(id) === String(ground._id));
  const applyRegistration = !!includeRegistration && !alreadyRegistered && config.registrationFee > 0;

  const used = await dailyHeadcountUsed(req.user._id, ground._id, date);
  if (used + partySize > MAX_DAILY_HEADCOUNT) {
    const err = new Error(`You can only reserve up to ${MAX_DAILY_HEADCOUNT} spots per day at this pool — you've already got ${used} for ${date}`);
    err.status = 400; throw err;
  }

  const totalAmount = unitPrice * partySize + (applyRegistration ? config.registrationFee : 0);
  if (totalAmount <= 0) { const err = new Error('Invalid amount for this plan — please contact the venue'); err.status = 400; throw err; }

  const priceInfo = splitAmount(ground, totalAmount, 1); // pool = full payment upfront, no advance/final split

  const plan = { name: planName, billingLabel: planLabel };
  return { config, pool, block, plan, partySize, applyRegistration, priceInfo, date, startTime };
};

const createPoolOrder = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  let ctx;
  try {
    ctx = await resolveBookingContext(ground, req);
  } catch (err) {
    res.status(err.status || 400); throw err;
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: ctx.priceInfo.totalAmount * 100,
    currency: 'INR',
    receipt: `pool_${Date.now()}`,
    notes: {
      groundId: ground._id.toString(), poolId: ctx.pool._id.toString(),
      date: ctx.date, startTime: ctx.startTime, playerId: req.user._id.toString(), type: 'pool_full',
    },
  });

  res.json({
    orderId: order.id,
    amount: ctx.priceInfo.totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    ground: { name: ground.name, address: ground.address },
    pool: { name: ctx.pool.name },
    slot: { date: ctx.date, startTime: ctx.startTime, endTime: ctx.block.endTime, category: ctx.block.category },
    plan: { name: ctx.plan.name, billingLabel: ctx.plan.billingLabel },
    partySize: ctx.partySize,
    includesRegistration: ctx.applyRegistration,
    // Deliberately no commissionPercent/platformCommission/ownerPayout —
    // internal business data, same as the ground payment flow.
  });
});

const verifyPoolPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, medicalCertificateUrl } = req.body;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expectedSignature !== razorpaySignature) { res.status(400); throw new Error('Payment verification failed'); }

  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  let ctx;
  try {
    ctx = await resolveBookingContext(ground, req);
  } catch (err) {
    // Payment already succeeded on Razorpay's side but something about the
    // booking is no longer valid (slot removed, daily cap hit meanwhile,
    // plan disabled) — don't silently eat the money.
    res.status(409);
    throw new Error(`${err.message} Your payment was captured — please contact support for a refund.`);
  }

  const claimed = await claimPoolSlotCapacity({
    groundId: ground._id,
    poolId: ctx.pool._id,
    date: ctx.date,
    startTime: ctx.startTime,
    endTime: ctx.block.endTime,
    capacity: ctx.block.capacity,
    userId: req.user._id,
    partySize: ctx.partySize,
  });

  if (!claimed) {
    res.status(409);
    throw new Error('This slot was just filled by someone else. Your payment was captured — please contact support for a refund.');
  }

  const ticketId = generateTicketId();
  const certUrl = medicalCertificateUrl || req.user.medicalCertificateUrl || '';

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: claimed._id,
    sportId: null,
    sportName: 'Swimming',
    courtId: null,
    courtName: '',
    poolId: ctx.pool._id,
    poolName: ctx.pool.name,
    slotCategory: ctx.block.category,
    membershipPlanName: `${ctx.plan.name} (${ctx.plan.billingLabel})`,
    includedRegistrationFee: ctx.applyRegistration,
    medicalCertificateUrl: certUrl,
    ticketId,
    partySize: ctx.partySize,
    date: ctx.date,
    startTime: ctx.startTime,
    endTime: ctx.block.endTime,
    totalPrice: ctx.priceInfo.totalAmount,
    advancePrice: ctx.priceInfo.advanceAmount,
    remainingPrice: ctx.priceInfo.remainingAmount,
    commissionPercent: ctx.priceInfo.commissionPercent,
    platformCommission: ctx.priceInfo.platformCommission,
    ownerPayout: ctx.priceInfo.ownerPayout,
    status: 'completed',
  });

  const payment = await Payment.create({
    booking: booking._id,
    player: req.user._id,
    ground: ground._id,
    totalAmount: ctx.priceInfo.totalAmount,
    advanceAmount: ctx.priceInfo.advanceAmount,
    remainingAmount: ctx.priceInfo.remainingAmount,
    commissionPercent: ctx.priceInfo.commissionPercent,
    platformCommission: ctx.priceInfo.platformCommission,
    ownerPayout: ctx.priceInfo.ownerPayout,
    advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
    finalPayment: { status: 'not_due' },
    status: 'completed',
  });

  booking.payment = payment._id;
  await booking.save();

  const userUpdate = {};
  if (ctx.applyRegistration) userUpdate.$addToSet = { poolRegistrations: ground._id, bookedDays: ctx.date };
  else userUpdate.$addToSet = { bookedDays: ctx.date };
  if (medicalCertificateUrl && medicalCertificateUrl !== req.user.medicalCertificateUrl) {
    userUpdate.$set = { medicalCertificateUrl };
  }
  await User.findByIdAndUpdate(req.user._id, userUpdate);

  sendPoolBookingEmail(req.user, ground, booking).catch(() => {});
  notifyPoolBookingConfirmed({ groundId: ground._id, groundName: ground.name, userId: req.user._id, ticketId, date: ctx.date, startTime: ctx.startTime });
  notifySlotBooked({ ownerId: ground.owner, actorId: req.user._id, groundId: ground._id, groundName: ground.name, date: ctx.date, startTime: ctx.startTime, endTime: ctx.block.endTime });

  res.json({
    message: 'Payment successful — your pool session is booked 🎉 Your ticket has been emailed to you.',
    booking: sanitizeBookingForPlayer(booking),
    ticketId,
  });
});

// ── Player: QR payloads for my active pool tickets (signed) ──────────────
const getMyPoolQrs = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ player: req.user._id, poolId: { $ne: null }, status: 'completed' })
    .populate('ground', 'name')
    .sort({ date: -1, startTime: -1 });
  const now = Math.floor(Date.now() / 1000);
  const data = bookings.map((b) => {
    const exp = Math.floor(new Date(`${b.date}T${b.endTime}:00`).getTime() / 1000) + 30 * 60;
    const isExpired = now > exp;
    return {
      _id: b._id,
      ticketId: b.ticketId,
      ground: b.ground,
      poolName: b.poolName,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      partySize: b.partySize,
      slotCategory: b.slotCategory,
      checkedIn: !!b.checkedIn,
      checkedInAt: b.checkedInAt,
      isExpired,
      qrPayload: !b.checkedIn && !isExpired ? signPoolQr(String(b._id), exp) : null,
    };
  });
  res.json(data);
});

// ── Owner/admin: live bookings board for one pool venue ─────────────────
const getPoolOwnerBookings = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId);
  if (!ground || ground.venueType !== 'pool') { res.status(404); throw new Error('Pool venue not found'); }
  const isOwner = String(ground.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') { res.status(403); throw new Error('Not authorized'); }
  const bookings = await Booking.find({ ground: ground._id, poolId: { $ne: null } })
    .populate('player', 'name avatar phone email')
    .populate('ground', 'name')
    .sort({ date: 1, startTime: 1 });
  res.json(bookings);
});

// ── Owner/admin: scan QR (or type ticket) → single-use check-in ─────────
const checkinPoolBooking = asyncHandler(async (req, res) => {
  const { qrPayload, ticketId } = req.body;
  const ground = await Ground.findById(req.params.groundId);
  if (!ground || ground.venueType !== 'pool') { res.status(404); throw new Error('Pool venue not found'); }
  const isOwner = String(ground.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') { res.status(403); throw new Error('Only the venue owner can check in'); }

  let booking = null;
  let checkinMethod = 'manual';

  if (qrPayload) {
    let bookingId;
    try { bookingId = verifyPoolQr(qrPayload).bookingId; } catch (e) { res.status(400); throw new Error(e.message); }
    booking = await Booking.findById(bookingId).populate('player', 'name avatar phone').populate('ground', 'name');
    if (!booking) { res.status(404); throw new Error('Booking not found'); }
    if (String(booking.ground._id || booking.ground) !== String(ground._id)) { res.status(400); throw new Error('QR not for this venue'); }
    checkinMethod = 'qr';
  } else if (ticketId) {
    const tid = String(ticketId).trim().toUpperCase();
    booking = await Booking.findOne({ ticketId: tid, ground: ground._id }).populate('player', 'name avatar phone').populate('ground', 'name');
    if (!booking) { res.status(404); throw new Error('No booking found with that ticket ID for this venue'); }
  } else {
    res.status(400); throw new Error('qrPayload or ticketId required');
  }

  if (booking.status === 'cancelled' || booking.status === 'refunded') { res.status(400); throw new Error('Booking cancelled/refunded'); }
  if (booking.status !== 'completed') { res.status(400); throw new Error(`Booking not check-in-able (status: ${booking.status})`); }
  if (booking.checkedIn) {
    res.status(400);
    throw new Error(`Already checked in at ${new Date(booking.checkedInAt).toLocaleTimeString()} — single use, screenshot blocked`);
  }
  // date must be today (allow 30 min grace handled in expiry, but reject next-day reuse)
  const today = new Date().toISOString().split('T')[0];
  if (booking.date !== today) {
    // allow owner to still check-in with warning? strict: reject
    res.status(400); throw new Error(`Booking is for ${booking.date}, not today (${today})`);
  }

  booking.checkedIn = true;
  booking.checkedInAt = new Date();
  booking.checkinMethod = checkinMethod;
  booking.checkedInBy = req.user._id;
  await booking.save();

  const io = getIO();
  if (io) {
    io.to(`venue_${ground._id}`).emit('pool:booking-updated', booking);
    io.to(`user_${booking.player._id || booking.player}`).emit('pool:booking-updated', booking);
  }

  // reuse existing push helper pattern for player confirmation
  try {
    const { notify } = await import('../services/notificationService.js');
    await notify({
      recipient: booking.player._id || booking.player,
      type: 'pool_booking_confirmed',
      title: 'Checked in 🏊',
      body: `${booking.ground?.name || ground.name} — ${booking.date} ${booking.startTime} checked in`,
      link: '/player/dashboard',
      data: { bookingId: booking._id },
    });
  } catch {}

  res.json({
    message: `${booking.player?.name || 'Guest'} checked in — ${booking.partySize} people`,
    booking: {
      _id: booking._id, ticketId: booking.ticketId, player: booking.player, poolName: booking.poolName,
      date: booking.date, startTime: booking.startTime, endTime: booking.endTime,
      partySize: booking.partySize, slotCategory: booking.slotCategory,
      checkedIn: true, checkedInAt: booking.checkedInAt, checkinMethod,
    },
  });
});

// ── Admin-only cancellation (payment-issue path — no self-serve cancel) ──

const adminCancelPoolBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate('payment');
  if (!booking || !booking.poolId) { res.status(404); throw new Error('Pool booking not found'); }
  if (['cancelled', 'refunded'].includes(booking.status)) { res.status(400); throw new Error('Already cancelled'); }

  const payment = booking.payment ? await Payment.findById(booking.payment._id) : null;
  if (payment?.advancePayment?.razorpayPaymentId) {
    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.advancePayment.razorpayPaymentId, {
      amount: payment.totalAmount * 100,
    });
    payment.refund = { razorpayRefundId: refund.id, amount: payment.totalAmount, status: 'processed', processedAt: new Date() };
    payment.status = 'refunded';
    await payment.save();
  }

  await releasePoolSlotCapacity({
    groundId: booking.ground,
    poolId: booking.poolId,
    date: booking.date,
    startTime: booking.startTime,
    userId: booking.player,
    partySize: booking.partySize || 1,
  });

  booking.status = 'refunded';
  await booking.save();

  res.json({ message: 'Pool booking cancelled & refunded ✅' });
});

export { getPoolAvailability, getPoolPlans, createPoolOrder, verifyPoolPayment, adminCancelPoolBooking, getMyPoolQrs, getPoolOwnerBookings, checkinPoolBooking };
