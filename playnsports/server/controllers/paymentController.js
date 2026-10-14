import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { notifySlotBooked, notifyEventTicketIssued } from '../services/notificationService.js';
import { generateTicketId } from '../utils/ticket.js';
import { sendEventTicketEmail } from '../utils/sendEmail.js';
import { claimSlotCapacity, releaseSlotCapacity, priceForSlot, sportForSlot, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';
import { getRazorpay } from '../utils/razorpay.js';

// Mirrors the confirmed event ticket into the standalone Ticket collection
// so the app can show a player's tickets without re-populating the whole
// Event document. Same helper as in eventController.js — this controller's
// verifyEventPayment is a separate (legacy) event-payment path that also
// issues a ticket, so it needs the same mirroring.
const saveTicketToDatabase = async (user, event, ticketId, paymentStatus = 'free') => {
  try {
    const orgUser = await User.findById(event.organizer).select('name phone email avatar');
    await Ticket.create({
      user: user._id,
      event: event._id,
      ticketId,
      eventTitle: event.title,
      sport: event.sport,
      venue: event.venue,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      price: event.price || 0,
      paymentStatus,
      organizer: {
        name: orgUser?.name || event.contactName || 'Host',
        phone: orgUser?.phone || event.contactNumber || '',
        email: orgUser?.email || '',
        avatar: orgUser?.avatar || '',
      },
    });
  } catch (err) {
    console.error('Error saving Ticket DB record:', err.message);
  }
};

const MAX_PARTY_SIZE = 50;
const clampParty = (n) => Math.max(1, Math.min(Number(n) || 1, MAX_PARTY_SIZE));

// Strips internal business figures (commission split, owner payout) before
// a Payment document goes back to a player's browser — that data has no
// legitimate reason to ever reach client-side code or a network tab.
const sanitizePaymentForPlayer = (paymentDoc) => {
  const p = paymentDoc.toObject ? paymentDoc.toObject() : { ...paymentDoc };
  delete p.commissionPercent;
  delete p.platformCommission;
  delete p.ownerPayout;
  return p;
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ── Ground Booking Payments ─────────────────────────────────

const createAdvanceOrder = asyncHandler(async (req, res) => {
  const { slotId } = req.body;
  const partySize = clampParty(req.body.partySize);

  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }
  if (ground.venueMode !== 'live') { res.status(403); throw new Error('This venue is still in its trial phase — booking opens once it goes live'); }

  const slot = ground.slots.id(slotId);
  if (!slot) { res.status(404); throw new Error('Slot not found'); }
  if (slot.date < todayStr()) { res.status(400); throw new Error('This slot is in the past and can no longer be booked'); }
  if (slot.bookedCount + partySize > slot.capacity) { res.status(400); throw new Error('Not enough space left in this slot'); }

  const sportDoc = ground.sports.id(slot.sportId);
  if (!sportDoc) { res.status(400); throw new Error('Sport configuration missing for this slot'); }
  if (sportDoc.courts.length > 0 && partySize !== 1) {
    res.status(400); throw new Error('This sport is booked one court at a time');
  }

  const existingUserBookings = await Booking.find({
    player: req.user._id,
    date: slot.date,
    status: { $nin: ['cancelled', 'refunded'] },
  });

  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
  const startMins = t2m(slot.startTime);

  // The anti-hogging "leave a gap" rule only makes sense for exclusive
  // court-style bookings — a capacity venue like a pool is meant to have
  // many people in back-to-back or overlapping slots.
  if (sportDoc.courts.length > 0) {
    for (const b of existingUserBookings) {
      const eStart = t2m(b.startTime);
      if (Math.abs(startMins - eStart) === 0) {
        res.status(400); throw new Error('You have already booked this slot!');
      }
      if (Math.abs(startMins - eStart) <= 60) {
        res.status(400); throw new Error('You cannot book consecutive slots. Please leave at least a 1-hour gap between bookings.');
      }
    }
  }

  const { totalAmount, advanceAmount, remainingAmount } = priceForSlot({ ground, sportDoc, slot, partySize });

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: advanceAmount * 100,
    currency: 'INR',
    receipt: `adv_${Date.now()}`,
    notes: { groundId: ground._id.toString(), slotId, playerId: req.user._id.toString(), partySize, type: 'advance' },
  });

  res.json({
    orderId: order.id,
    amount: advanceAmount,
    totalAmount,
    remainingAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    ground: { name: ground.name, address: ground.address },
    slot: { date: slot.date, startTime: slot.startTime, endTime: slot.endTime },
    sport: sportDoc.name,
    court: slot.courtId ? sportDoc.courts.id(slot.courtId)?.name : null,
    partySize,
    // Deliberately no commissionPercent/platformCommission/ownerPayout here
    // — that's internal business data, the player's browser has no reason
    // to ever see it, in the response or in the network tab.
  });
});

const verifyAdvancePayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, slotId } = req.body;
  const partySize = clampParty(req.body.partySize);

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed');
  }

  // Atomic claim — payment signature already verified above, so this is the
  // last check before we consider the spot(s) theirs. The capacity check
  // (bookedCount + partySize <= capacity) happens inside the same update
  // via $expr, so it's race-safe even when several players are competing
  // for the last spot in a capacity-based slot (e.g. a pool).
  const claimed = await claimSlotCapacity({ groundId: req.params.id, slotId, userId: req.user._id, partySize });

  if (!claimed) {
    // Payment already succeeded on Razorpay's side but the slot is gone —
    // don't silently eat the money, surface it so the flow can refund.
    res.status(409);
    throw new Error('This slot was just filled by someone else. Your payment was captured — please contact support for a refund, or use "Cancel & Refund" once the booking briefly appears.');
  }

  const { ground, slot } = claimed;
  const sportDoc = sportForSlot(ground, slot);
  const priceInfo = priceForSlot({ ground, sportDoc, slot, partySize });

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: slot._id,
    sportId: slot.sportId,
    sportName: sportDoc?.name || '',
    courtId: slot.courtId,
    courtName: slot.courtId ? sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
    partySize,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    totalPrice: priceInfo.totalAmount,
    advancePrice: priceInfo.advanceAmount,
    remainingPrice: priceInfo.remainingAmount,
    commissionPercent: priceInfo.commissionPercent,
    platformCommission: priceInfo.platformCommission,
    ownerPayout: priceInfo.ownerPayout,
    status: 'advance_paid',
  });

  const payment = await Payment.create({
    booking: booking._id,
    player: req.user._id,
    ground: ground._id,
    totalAmount: priceInfo.totalAmount,
    advanceAmount: priceInfo.advanceAmount,
    remainingAmount: priceInfo.remainingAmount,
    commissionPercent: priceInfo.commissionPercent,
    platformCommission: priceInfo.platformCommission,
    ownerPayout: priceInfo.ownerPayout,
    advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
    finalPayment: { status: 'pending' },
    status: 'advance_paid',
  });

  booking.payment = payment._id;
  await booking.save();

  notifySlotBooked({
    ownerId: ground.owner,
    actorId: req.user._id,
    groundId: ground._id,
    groundName: ground.name,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });

  res.json({ message: 'Advance payment successful ✅', booking: sanitizeBookingForPlayer(booking), payment: sanitizePaymentForPlayer(payment) });
});

const createFinalOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id }).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }
  if (booking.status !== 'advance_paid') { res.status(400); throw new Error('Final payment not due'); }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: booking.remainingPrice * 100,
    currency: 'INR',
    receipt: `final_${Date.now()}`,
    notes: { bookingId: booking._id.toString(), playerId: req.user._id.toString(), type: 'final' },
  });

  res.json({ orderId: order.id, amount: booking.remainingPrice, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, booking });
});

const verifyFinalPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed');
  }

  const booking = await Booking.findById(req.params.id).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  booking.status = 'completed';
  await booking.save();

  const payment = await Payment.findById(booking.payment._id);
  payment.finalPayment = { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() };
  payment.status = 'completed';
  await payment.save();

  res.json({ message: 'Final payment successful ✅ Booking completed!', booking, payment });
});

const cancelAndRefund = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id }).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }
  if (booking.poolId) {
    res.status(400);
    throw new Error('Pool bookings can\'t be self-cancelled — please contact support if there was a payment issue.');
  }
  if (!['advance_paid', 'advance_pending'].includes(booking.status)) {
    res.status(400); throw new Error('Cannot cancel this booking');
  }

  const payment = await Payment.findById(booking.payment);
  if (payment?.advancePayment?.razorpayPaymentId) {
    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.advancePayment.razorpayPaymentId, {
      amount: payment.advanceAmount * 100,
    });
    payment.refund = { razorpayRefundId: refund.id, amount: payment.advanceAmount, status: 'processed', processedAt: new Date() };
    payment.status = 'refunded';
    await payment.save();
  }

  await releaseSlotCapacity({
    groundId: booking.ground,
    slotId: booking.slot,
    userId: req.user._id,
    partySize: booking.partySize || 1,
  });

  booking.status = 'refunded';
  await booking.save();

  res.json({ message: 'Booking cancelled & advance refunded ✅' });
});

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ player: req.user._id })
    .populate('ground', 'name address sport')
    .populate('booking')
    .sort({ createdAt: -1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePayments = payments.filter((p) => {
    if (['cancelled', 'refunded'].includes(p.status)) return false;
    if (!p.booking) return false;
    const bDate = new Date(p.booking.date + 'T00:00:00');
    bDate.setHours(0, 0, 0, 0);
    return bDate.getTime() >= today.getTime();
  });

  res.json(activePayments.map(sanitizePaymentForPlayer));
});

// ── Event Payments ──────────────────────────────────────────
// NOTE: Event payments do NOT create a Payment document.
// Payment info is stored directly on Event.participants (razorpayOrderId, razorpayPaymentId, amountPaid).

const assertEventJoinable = (event, user) => {
  if (event.approvalStatus !== 'approved') throw new Error('This event is not open yet');
  if (event.status !== 'upcoming') throw new Error('This event is no longer accepting participants');
  if (event.organizer.toString() === user._id.toString()) throw new Error('You cannot join your own event');
  const already = event.participants.find((p) => p.user.toString() === user._id.toString());
  if (already) throw new Error('You have already joined this event');
  if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) throw new Error('This event is full');
  // A ticket is only useful if we can actually deliver it — every joiner
  // needs a verified email before they can claim a spot, paid or free.
  if (!user.isEmailVerified) {
    const err = new Error('Please verify your email before joining an event — we need it to send your ticket.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }
};

const createEventOrder = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.eventType !== 'paid') {
    res.status(400); throw new Error('This event is free — join directly, no payment needed');
  }

  try {
    assertEventJoinable(event, req.user);
  } catch (err) {
    res.status(400); throw err;
  }

  const razorpay = getRazorpay();
  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(Number(event.price) * 100),
      currency: 'INR',
      // Razorpay caps `receipt` at 40 characters — use the id's last 10
      // chars instead of the full ObjectId, still unique enough paired
      // with the timestamp.
      receipt: `evt_${event._id.toString().slice(-10)}_${Date.now()}`,
      notes: { eventId: event._id.toString(), userId: req.user._id.toString(), type: 'event_join' },
    });
  } catch (err) {
    const reason = err?.error?.description || err.message || 'Unknown Razorpay error';
    res.status(err?.statusCode && err.statusCode < 500 ? 400 : 502);
    throw new Error(`Could not create payment order: ${reason}`);
  }

  res.json({
    orderId: order.id,
    amount: event.price,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    event: { _id: event._id, title: event.title },
  });
});

const verifyEventPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res.status(400); throw new Error('Missing payment verification fields');
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed — signature mismatch');
  }

  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  // Idempotency: a retried verify call for a payment that already went
  // through should just hand back the existing ticket, not error or
  // double-book.
  const existing = event.participants.find(
    (p) => p.user.toString() === req.user._id.toString() || p.razorpayPaymentId === razorpayPaymentId
  );
  if (existing) {
    return res.json({
      message: 'Payment verified — you joined the event 🎉',
      event,
      ticketId: existing.ticketId,
    });
  }

  try {
    assertEventJoinable(event, req.user);
  } catch (err) {
    res.status(400); throw err;
  }

  const ticketId = generateTicketId();

  event.participants.push({
    user: req.user._id,
    paymentStatus: 'paid',
    amountPaid: event.price,
    razorpayOrderId,
    razorpayPaymentId,
    ticketId,
  });
  await event.save();

  await saveTicketToDatabase(req.user, event, ticketId, 'paid');

  sendEventTicketEmail(req.user, event, ticketId).catch(() => {});
  notifyEventTicketIssued({ eventId: event._id, eventTitle: event.title, userId: req.user._id, ticketId });

  res.json({ message: 'Payment successful — you joined the event 🎉 Your ticket has been emailed to you.', event, ticketId });
});

export {
  createAdvanceOrder,
  verifyAdvancePayment,
  createFinalOrder,
  verifyFinalPayment,
  cancelAndRefund,
  getMyPayments,
  createEventOrder,
  verifyEventPayment,
};