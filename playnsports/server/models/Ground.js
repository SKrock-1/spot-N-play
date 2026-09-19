import mongoose from 'mongoose';

const SPORT_NAMES = [
  'football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey',
  'kabaddi', 'Kabbadi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby',
  'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling',
  'box cricket', 'box football', 'gym', 'swimming', 'esports', 'other',
];

// A single physical court/pitch/lane belonging to one sport within a venue.
// Named individually (not just a count) so an owner can label them and take
// one out of rotation (e.g. "Court 4 — under maintenance") without touching
// the others.
const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

// One sport offered at a venue, with its own price, slot length and booking
// behaviour. A venue can have several of these (e.g. 12 badminton courts +
// 1 volleyball court + 6 squash courts all under one gym/ground).
//
// Two shapes, depending on whether the sport is court-based or capacity-based:
//  - Court-based (most sports): `courts` holds named courts. `capacityPerSlot`
//    is unused.
//  - Capacity-based (pool, open gym floor): `courts` stays empty and
//    `capacityPerSlot` caps how many people can share one slot.
//    `capacityPerSlot: null` means no cap.
const sportConfigSchema = new mongoose.Schema(
  {
    name: { type: String, enum: SPORT_NAMES, required: true },
    pricePerHour: { type: Number, required: true, default: 0 },
    // Per-sport slot length — a venue with two sports can run 30-min squash
    // slots and 90-min cricket-pitch slots side by side.
    slotDurationMinutes: { type: Number, required: true, default: 60, min: 15, max: 240 },
    // Owner-chosen per sport: 'auto' lets the system assign any free court
    // for that time; 'specific' lets the player choose exactly which court.
    bookingMode: { type: String, enum: ['auto', 'specific'], default: 'auto' },
    capacityPerSlot: { type: Number, default: null, min: 1 },
    courts: [courtSchema],
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

// One bookable time window. Belongs to exactly one sport within the venue.
// `courtId` is set when the sport is court-based (either because the owner
// created this slot for one named court, or because it got auto-assigned at
// booking time). Capacity-based slots (pool, gym floor) leave courtId null
// and instead track how many people have claimed a spot via bookedCount vs
// capacity.
const slotSchema = new mongoose.Schema({
  sportId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courtId: { type: mongoose.Schema.Types.ObjectId, default: null },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  // How many concurrent bookings this one slot instance can hold. 1 for a
  // single court. For an 'auto' court-based sport it's set to however many
  // active courts that sport has (so N players can all book the same time
  // window without the system caring which physical court they land on).
  // For a capacity-based sport (pool) it's the owner's headcount cap, or a
  // very large number when there is no cap.
  capacity: { type: Number, default: 1 },
  bookedCount: { type: Number, default: 0 },
  // One entry per booked unit (so length === bookedCount). Kept as a flat
  // array of user ids — a player booking for a group of friends appears
  // multiple times, once per person, which keeps the capacity math a single
  // integer comparison.
  bookedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Legacy back-compat field some older frontend code still reads directly.
  // Kept in sync on every write path (see groundController/bookingController)
  // rather than as a live virtual, so it round-trips through plain
  // ground.slots.push()/.id() mongoose subdocument mutations too.
  isBooked: { type: Boolean, default: false },
});

const NO_CAP = 1000000; // sentinel used internally when capacityPerSlot is null ("no cap")

const groundSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add ground name'],
      trim: true,
    },
    // ── Legacy single-sport fields ──────────────────────────────────────
    // Kept so old records / any code path that still reads them keeps
    // working. New venues are created with `sports` populated instead, and
    // these are auto-derived from sports[0] for backward compatibility (see
    // groundController.syncLegacySportFields).
    sport: {
      type: String,
      enum: SPORT_NAMES,
      required: function () { return this.venueType !== 'gym' && this.venueType !== 'pool'; },
    },
    pricePerHour: {
      type: Number,
      required: function () { return this.venueType !== 'gym' && this.venueType !== 'pool'; },
      default: 0,
    },
    // ── New multi-sport / multi-court model ─────────────────────────────
    sports: [sportConfigSchema],
    address: {
      type: String,
      required: [true, 'Please add address'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    images: [{ type: String }],
    amenities: [{ type: String }],
    slots: [slotSchema],
    isSocial: { type: Boolean, default: false },
    venueType: {
      type: String,
      enum: ['ground', 'social', 'gym', 'pool'],
      default: 'ground',
    },
    // 'trial' = 2-day free-trial lead flow (walk-in ticket + owner check-in).
    // 'interest' = lighter-weight signal — a player just tells us "I'd book
    // this if it were on the platform" by opening the venue; no ticket, no
    // check-in, no commitment on either side. Useful while a deal is still
    // being negotiated and there's nothing to actually trial yet.
    // 'live' = full sport/court/capacity booking is open to players.
    // Admin decides which of the three any venue is in — not tied to
    // venueType, so a ground being pitched to a new owner can sit in
    // 'interest' just as easily as a gym or pool can.
    venueMode: {
      type: String,
      enum: ['trial', 'interest', 'live'],
      default: function () { return this.venueType === 'ground' || this.venueType === 'social' ? 'live' : 'trial'; },
    },
    // Admin-set cut of each booking that stays on the platform; the rest
    // goes to the venue owner. Snapshotted onto each Payment at order-time
    // so changing this later never rewrites historical payouts.
    commissionPercent: { type: Number, default: 15, min: 0, max: 100 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    // Admin approval
    isApproved: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

groundSchema.index({ location: '2dsphere' });

groundSchema.statics.NO_CAP = NO_CAP;

export default mongoose.model('Ground', groundSchema);
