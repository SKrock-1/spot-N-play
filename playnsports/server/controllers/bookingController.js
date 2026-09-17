import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import User from '../models/User.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';
import { notifySlotBooked } from '../services/notificationService.js';
import { claimSlotCapacity, releaseSlotCapacity, sportForSlot, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ player: req.user._id })
    .populate('ground', 'name address sport venueType pricePerHour')
    .sort({ createdAt: -1 });

  const today = new Date();
  today.setHours(0,0,0,0);

  const activeBookings = bookings.filter(b => {
    if (['cancelled', 'refunded', 'pending'].includes(b.status)) return false;
    
    // Check if date has passed
    const bDate = new Date(b.date + 'T00:00:00');
    bDate.setHours(0,0,0,0);
    return bDate.getTime() >= today.getTime();
  });

  res.json(activeBookings.map(sanitizeBookingForPlayer));
});

const maskTicketId = (tid) => {
  if (!tid || tid.length < 8) return tid;
  return tid.slice(0, 4) + '****' + tid.slice(-4);
};

const getGroundBookings = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }

  const isOwner = String(ground.owner) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const bookings = await Booking.find({ ground: req.params.id })
    .populate('player', 'name phone hidePhoneNumber')
    .sort({ createdAt: -1 });
  const scrubbed = scrubNestedPhone(bookings, 'player', req.user._id);
  // pool tickets are sensitive — owners see masked version, admin sees full
  if (!isAdmin) {
    const masked = scrubbed.map((b) => {
      const obj = b.toObject ? b.toObject() : b;
      if (obj.ticketId) obj.ticketId = maskTicketId(obj.ticketId);
      return obj;
    });
    return res.json(masked);
  }
  res.json(scrubbed);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id });
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found or unauthorized');
  }

  // Pool bookings are full-payment-upfront and only cancelled/refunded by
  // an admin in case of a payment issue — never self-serve. Blocking this
  // here (not just in the UI) is what actually closes the loophole: a
  // player could otherwise hit this generic endpoint directly and get
  // marked 'cancelled' while keeping the money and the reserved capacity
  // both stuck, since this path has no pool-aware release or refund logic.
  if (booking.poolId) {
    res.status(400);
    throw new Error('Pool bookings can\'t be self-cancelled — please contact support if there was a payment issue.');
  }

  await releaseSlotCapacity({
    groundId: booking.ground,
    slotId: booking.slot,
    userId: req.user._id,
    partySize: booking.partySize || 1,
  });

  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Booking cancelled successfully' });
});

// Instant free booking — only for isSocial grounds (no real money involved,
// so no capacity-race concern beyond the atomic claim itself).
const bookGroundSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.body;

  const groundCheck = await Ground.findById(req.params.id).select('isSocial owner name');
  if (!groundCheck) {
    res.status(404);
    throw new Error('Ground not found');
  }
  if (!groundCheck.isSocial) {
    res.status(400);
    throw new Error('This ground requires payment to book');
  }

  const claimed = await claimSlotCapacity({ groundId: req.params.id, slotId, userId: req.user._id, partySize: 1 });

  if (!claimed) {
    const exists = await Ground.exists({ _id: req.params.id, 'slots._id': slotId });
    res.status(exists ? 400 : 404);
    throw new Error(exists ? 'This slot is no longer bookable (already booked or in the past)' : 'Slot not found');
  }

  const { ground, slot } = claimed;
  const sportDoc = sportForSlot(ground, slot);

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: slot._id,
    sportId: slot.sportId,
    sportName: sportDoc?.name || '',
    courtId: slot.courtId,
    courtName: slot.courtId ? sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
    partySize: 1,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    totalPrice: 0,
    advancePrice: 0,
    remainingPrice: 0,
    status: 'completed'
  });

  // mark booking day on user
  const bDate = slot.date; // already 'YYYY-MM-DD'
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { bookedDays: bDate }
  });

  notifySlotBooked({
    ownerId: ground.owner,
    actorId: req.user._id,
    groundId: ground._id,
    groundName: ground.name,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });

  res.status(201).json(booking);
});

const bookSocialGroundSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const ground = await Ground.findById(req.params.id);

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  if (!ground.isSocial) {
    res.status(400);
    throw new Error('This ground is not a social ground');
  }

  const sportDoc = ground.sports[0];
  if (!sportDoc) {
    res.status(400);
    throw new Error('This ground has no sport configured yet');
  }

  // Validate date is within the next 7 days (today through today+6)
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const maxObj = new Date(todayObj);
  maxObj.setDate(maxObj.getDate() + 6);

  const reqDateObj = new Date(date + 'T00:00:00');
  reqDateObj.setHours(0, 0, 0, 0);

  if (reqDateObj.getTime() < todayObj.getTime() || reqDateObj.getTime() > maxObj.getTime()) {
    res.status(400);
    throw new Error('Booking only allowed within the next 7 days');
  }

  // Validate time between 09:00 and 19:00, valid duration, and max 1 hour length
  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h)*60 + parseInt(m); };
  
  const startMins = t2m(startTime);
  const endMins = t2m(endTime);

  if (startMins < 9*60 || endMins > 19*60 || startMins >= endMins) {
    res.status(400);
    throw new Error('Time must be between 09:00 and 19:00, with a valid duration');
  }

  if (endMins - startMins > 60) {
    res.status(400);
    throw new Error('You can only book a maximum of 1 hour per slot');
  }

  // Check if player has booked today; enforce non-consecutive rule
  const existingUserBookings = await Booking.find({
    player: req.user._id,
    date: date,
    status: { $ne: 'cancelled' }
  });

  for (const b of existingUserBookings) {
    const eStart = t2m(b.startTime);
    if (Math.abs(startMins - eStart) === 0) {
      res.status(400);
      throw new Error('You have already booked this slot!');
    }
    if (Math.abs(startMins - eStart) <= 60) {
      res.status(400);
      throw new Error('You cannot book consecutive slots. Please leave at least a 1-hour gap between bookings.');
    }
  }

  // Check overlap against ALL existing booked slots for this date
  const existingSlots = ground.slots.filter(s => s.date === date && s.isBooked);
  for (const s of existingSlots) {
    const eStart = t2m(s.startTime);
    const eEnd = t2m(s.endTime);
    if (startMins < eEnd && endMins > eStart) {
      res.status(400);
      throw new Error('Slot already booked');
    }
  }

  // Atomically push the new flexible slot ONLY if no already-booked slot on
  // this date still overlaps it at the moment of the write.
  const updatedGround = await Ground.findOneAndUpdate(
    {
      _id: ground._id,
      slots: {
        $not: {
          $elemMatch: { date, isBooked: true, startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        },
      },
    },
    { $push: { slots: {
      sportId: sportDoc._id,
      courtId: null,
      date, startTime, endTime,
      capacity: 1,
      bookedCount: 1,
      bookedBy: [req.user._id],
      isBooked: true,
    } } },
    { new: true }
  );

  if (!updatedGround) {
    res.status(400);
    throw new Error('Slot already booked');
  }

  const newSlot = updatedGround.slots[updatedGround.slots.length - 1];

  const booking = await Booking.create({
    player: req.user._id,
    ground: updatedGround._id,
    slot: newSlot._id,
    sportId: sportDoc._id,
    sportName: sportDoc.name,
    partySize: 1,
    date,
    startTime,
    endTime,
    totalPrice: 0,
    advancePrice: 0,
    remainingPrice: 0,
    status: 'pending_approval'
  });
  // mark booking day on user
    const bDate = date; // already 'YYYY-MM-DD'
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { bookedDays: bDate }
    });

  notifySlotBooked({
    ownerId: updatedGround.owner,
    actorId: req.user._id,
    groundId: updatedGround._id,
    groundName: updatedGround.name,
    date,
    startTime,
    endTime,
    pendingApproval: true,
  });

  res.status(201).json(booking);
});

export { getMyBookings, getGroundBookings, cancelBooking, bookGroundSlot, bookSocialGroundSlot };
