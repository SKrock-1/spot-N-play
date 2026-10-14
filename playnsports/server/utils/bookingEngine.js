// Shared booking primitives used by both the free/social slot flow
// (bookingController) and the real-money flow (paymentController), so
// ground/gym/pool all go through the exact same concurrency-safe claim
// logic and the exact same server-side price calculation. Nothing about
// price or commission is ever taken from the client — it's always
// recomputed here from the venue document that's already loaded server-side.

import Ground from '../models/Ground.js';

export const todayStr = () => new Date().toISOString().split('T')[0];

// Atomically claims `partySize` units of capacity on one slot. The
// capacity check (bookedCount + partySize <= capacity) happens inside the
// same MongoDB update as the write via $expr on the matched array element,
// so two simultaneous requests for the last spot can never both win — one
// findOneAndUpdate call matches, the other gets null back.
export async function claimSlotCapacity({ groundId, slotId, userId, partySize = 1 }) {
  const ground = await Ground.findOneAndUpdate(
    {
      _id: groundId,
      slots: {
        $elemMatch: {
          _id: slotId,
          date: { $gte: todayStr() },
          $expr: { $lte: [{ $add: ['$bookedCount', partySize] }, '$capacity'] },
        },
      },
    },
    {
      $inc: { 'slots.$.bookedCount': partySize },
      $push: { 'slots.$.bookedBy': { $each: Array(partySize).fill(userId) } },
    },
    { new: true }
  );

  if (!ground) return null;

  const slot = ground.slots.id(slotId);
  // Keep the legacy boolean in sync for any older frontend code that still
  // reads slot.isBooked directly instead of comparing bookedCount/capacity.
  const shouldBeBooked = slot.bookedCount >= slot.capacity;
  if (slot.isBooked !== shouldBeBooked) {
    slot.isBooked = shouldBeBooked;
    await ground.save();
  }

  return { ground, slot };
}

// Releases capacity back (cancellation). Not required to be perfectly
// atomic against a concurrent claim the way claimSlotCapacity is — freeing
// space can never over-book, it can only make more room.
export async function releaseSlotCapacity({ groundId, slotId, userId, partySize = 1 }) {
  const ground = await Ground.findById(groundId);
  if (!ground) return null;
  const slot = ground.slots.id(slotId);
  if (!slot) return null;

  slot.bookedCount = Math.max(0, slot.bookedCount - partySize);
  let removed = 0;
  slot.bookedBy = slot.bookedBy.filter((id) => {
    if (removed < partySize && String(id) === String(userId)) { removed += 1; return false; }
    return true;
  });
  slot.isBooked = slot.bookedCount >= slot.capacity;

  await ground.save();
  return { ground, slot };
}

const minutesBetween = (startTime, endTime) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

// The ONLY place a booking's price and commission split get calculated.
// Always derived from the venue/sport documents already loaded server-side
// — never from anything the client sends — so tampering with a request
// body can't change what anyone gets charged.
//
// `advanceRatio` controls how much of totalAmount is due up front: grounds
// use the default 0.3 (30% advance, 70% on arrival); pool bookings pass 1
// (full payment, nothing left owing) — same commission math either way, so
// this stays the one place that math lives instead of a second copy.
export function priceForSlot({ ground, sportDoc, slot, partySize = 1, advanceRatio = 0.3 }) {
  const hours = Math.max(minutesBetween(slot.startTime, slot.endTime), 0) / 60;
  const totalAmount = Math.round((sportDoc.pricePerHour || 0) * hours * partySize);
  return splitAmount(ground, totalAmount, advanceRatio);
}

// Shared by priceForSlot (ground/gym) and poolBookingEngine (pool) — same
// commission math, same shape, so both flows produce identical Booking /
// Payment fields with no duplicated logic.
export function splitAmount(ground, totalAmount, advanceRatio = 0.3) {
  const advanceAmount = Math.round(totalAmount * advanceRatio);
  const remainingAmount = totalAmount - advanceAmount;

  const commissionPercent = ground.commissionPercent ?? 15;
  const platformCommission = Math.round(totalAmount * (commissionPercent / 100));
  const ownerPayout = totalAmount - platformCommission;

  return { totalAmount, advanceAmount, remainingAmount, commissionPercent, platformCommission, ownerPayout };
}

// Finds the sport config a slot belongs to.
export function sportForSlot(ground, slot) {
  return ground.sports.id(slot.sportId);
}

// Strips internal commission/payout figures before a Booking document goes
// to a player. Venue owners and admins are allowed to see this breakdown
// (it's their payout), players are not.
export function sanitizeBookingForPlayer(bookingDoc) {
  const b = bookingDoc.toObject ? bookingDoc.toObject() : { ...bookingDoc };
  delete b.commissionPercent;
  delete b.platformCommission;
  delete b.ownerPayout;
  return b;
}
