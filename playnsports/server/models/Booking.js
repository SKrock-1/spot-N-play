import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ground',
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Which sport (within the venue's sports[]) and, if applicable, which
    // named court this booking landed on. courtId is null for
    // capacity-based bookings (pool) and for 'auto' court-based bookings —
    // in 'auto' mode the player never picks a specific court, so there's
    // nothing meaningful to store.
    sportId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sportName: { type: String, default: '' },
    courtId: { type: mongoose.Schema.Types.ObjectId, default: null },
    courtName: { type: String, default: '' },
    // Pool-only fields (all null/'' for ground/gym bookings)
    poolId: { type: mongoose.Schema.Types.ObjectId, default: null }, // PoolConfig.pools[]._id
    poolName: { type: String, default: '' },
    slotCategory: { type: String, default: '' }, // 'general' | 'girls_only'
    membershipPlanName: { type: String, default: '' },
    includedRegistrationFee: { type: Boolean, default: false },
    // Snapshotted at booking time — a cert uploaded/changed afterwards on
    // the user's profile shouldn't silently rewrite what the venue already
    // saw for this specific booking.
    medicalCertificateUrl: { type: String, default: '' },
    // Human-readable ticket shown to the player and to the venue at entry —
    // same generator/format as event tickets.
    ticketId: { type: String, default: '' },
    // How many people this single booking covers (a player booking a pool
    // slot for themself + friends). 1 for court-based bookings.
    partySize: { type: Number, default: 1, min: 1 },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    advancePrice: { type: Number, required: true },
    remainingPrice: { type: Number, required: true },
    // Snapshotted at booking time from the venue's commissionPercent, so a
    // later commission change never rewrites past bookings' payout split.
    commissionPercent: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    ownerPayout: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending_approval', 'advance_pending', 'advance_paid', 'final_pending', 'completed', 'cancelled', 'refunded'],
      default: 'advance_pending',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    // ── QR check-in (pool) ────────────────────────────────────────────
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    checkinMethod: { type: String, enum: ['qr', 'manual', ''], default: '' },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
