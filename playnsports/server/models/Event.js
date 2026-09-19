import mongoose from 'mongoose';

// One other roster member's basic info (the captain is captured separately
// via captainName/captainMobile on the booking itself). bgmiId is for
// squad events like BGUS (Battle Ground University Series) — BGMI squad
// requires each player's in-game ID; kept optional for backward compat
// with XL-CUP team events that only need name+mobile.
const teamPlayerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    mobile: { type: String, trim: true, required: true },
    bgmiId: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    amountPaid: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },

    // ── Team registration (only set when the event's registrationType
    // is 'team' — see eventSchema.registrationType below) ──
    teamName: { type: String, trim: true, default: '' },
    captainName: { type: String, trim: true, default: '' },
    captainMobile: { type: String, trim: true, default: '' },
    captainBgmiId: { type: String, trim: true, default: '' },
    players: [teamPlayerSchema], // the rest of the roster, excluding the captain

    // ── Ticket / check-in ──
    ticketId: { type: String, default: '' },
    // Event-specific registration-form answers (e.g. National Sports Day
    // collects college registration number & year). Empty unless the event
    // enables formConfig.
    collegeRegNo: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' }, // e.g. "SPT-4F7K2Q9X"
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    ticketEmailSent: { type: Boolean, default: false },
  },
  { _id: false }
);

// Same shape as participantSchema, plus `quantity` — how many tickets this
// single booking covers under one player (mirrors `partySize` on the
// ground/pool Booking model). One ticket ID is issued per booking and
// covers the whole party, not one per seat. For team registrations,
// quantity is always 1 — one booking = one team, and `capacity` on the
// sub-event/event means "max teams" instead of "max seats" in that mode.
const subEventBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
    joinedAt: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    amountPaid: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },

    teamName: { type: String, trim: true, default: '' },
    captainName: { type: String, trim: true, default: '' },
    captainMobile: { type: String, trim: true, default: '' },
    captainBgmiId: { type: String, trim: true, default: '' },
    players: [teamPlayerSchema],

    ticketId: { type: String, default: '' },
    // Event-specific registration-form answers (e.g. National Sports Day
    // collects college registration number & year). Empty unless the event
    // enables formConfig.
    collegeRegNo: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    ticketEmailSent: { type: Boolean, default: false },
  },
  { _id: false }
);

// A single activity inside a parent event — e.g. "Under-16 Football" and
// "Open Cricket Box League" living inside one "Summer Sports Meet" event.
// Each sub-event has its own venue/date/time/price/capacity so they can run
// completely independently of one another.
const subEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a sub-event title'],
    trim: true,
  },
  description: { type: String, trim: true, default: '' },
  image: { type: String, default: '' }, // optional own banner, falls back to parent event's

  gameTitle: { type: String, trim: true, default: '' },
  platform: { type: String, trim: true, default: '' },
  matchFormat: { type: String, trim: true, default: '' },

  // ── esports extras (only meaningful when eventCategory === 'esports') ──
  // Prize pool in ₹ (0 = none / bragging rights only) and an optional stream
  // link so players can watch the lobby when they're not playing.
  prizePool: { type: Number, default: 0 },
  streamUrl: { type: String, trim: true, default: '' },

  eventType: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free',
  },
  price: { type: Number, default: 0 },

  venue: {
    type: String,
    required: [true, 'Please add a venue / location for the sub-event'],
    trim: true,
  },
  date: { type: String, required: true },      // 'YYYY-MM-DD' — start date
  endDate: { type: String, default: '' },       // 'YYYY-MM-DD' — end date; '' or === date means single-day
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },

  // 'individual' = players book N tickets for themselves (default).
  // 'team' = one registration = one full team roster (captain + players),
  // gated on a mandatory team size set by the organizer.
  registrationType: {
    type: String,
    enum: ['individual', 'team'],
    default: 'individual',
  },
  // Mandatory number of players per team, captain included (e.g. 11 for
  // an 11-a-side game). Only meaningful when registrationType === 'team'.
  teamSize: { type: Number, default: 0, min: 0 },

  // Total number of seats across all players when registrationType is
  // 'individual'; total number of TEAMS allowed when 'team'. 0 = unlimited.
  capacity: { type: Number, default: 0 },
  // How many tickets a single player is allowed to book in one go for
  // *this* sub-event — dynamic per sub-event (e.g. 7 for one, 5 for
  // another). Not used in 'team' mode (always 1 booking = 1 team).
  maxTicketsPerBooking: { type: Number, default: 1, min: 1 },

  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
  },

  bookings: [subEventBookingSchema],
});

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add an event title'],
      trim: true,
    },
    sport: {
      type: String,
      enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football', 'esports', 'other'],
      required: true,
    },
    eventCategory: {
      type: String,
      enum: ['sports', 'esports'],
      default: 'sports',
    },
    gameTitle: { type: String, trim: true, default: '' },
    platform: { type: String, trim: true, default: '' },
    matchFormat: { type: String, trim: true, default: '' },
    serverRegion: { type: String, trim: true, default: '' },

    // ── esports extras (see subEventSchema) ──
    prizePool: { type: Number, default: 0 },
    streamUrl: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },

    // ── type & pricing ──
    eventType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    price: { type: Number, default: 0 },

    // ── contact info (shown to interested users) ──
    contactName: { type: String, trim: true, default: '' },
    contactNumber: {
      type: String,
      required: [true, 'Please add a contact number'],
      trim: true,
    },

    // ── where & when ──
    // Not schema-required: for a sub-event container these are derived from
    // the earliest sub-event instead of being entered directly (see
    // eventController#deriveTopLevelFields). Still required by the
    // controller for a plain (non-sub-event) event.
    venue: { type: String, trim: true, default: '' },
    date: { type: String, default: '' },       // 'YYYY-MM-DD' — start date
    endDate: { type: String, default: '' },    // 'YYYY-MM-DD' — end date; '' or === date means single-day
    startTime: { type: String, default: '' },  // 'HH:mm'
    endTime: { type: String, default: '' },    // 'HH:mm'

    maxParticipants: { type: Number, default: 0 }, // 0 = unlimited (seats, or teams in 'team' mode)
    image: { type: String, default: '' },

    // 'individual' = players join/book tickets for themselves (default).
    // 'team' = one registration = one full team roster. Only meaningful
    // for events that DON'T use sub-events — a sub-event container has its
    // own registrationType/teamSize per sub-event instead.
    registrationType: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual',
    },
    teamSize: { type: Number, default: 0, min: 0 },
  // ── Registration form gate (per event) ──
  // When enabled, joining asks for extra details (stored per participant /
  // booking) and the organizer's CSV export includes them. Built for
  // events like National Sports Day that must collect every registrant's
  // college registration number & year.
  formConfig: {
    collectCollegeRegNo: { type: Boolean, default: false },
    collectYear: { type: Boolean, default: false },
  },


    // ── sub-events ──
    // When this is non-empty, the event is a "container" — players book
    // through its sub-events instead of joining the parent event directly.
    // The flat venue/date/time/price/maxParticipants/participants fields
    // above stay as-is for events that don't use sub-events at all.
    subEvents: [subEventSchema],

    // ── admin approval ──
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },

    // ── lifecycle ──
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    participants: [participantSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
