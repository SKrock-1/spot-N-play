import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import VenueLead from '../models/VenueLead.js';
import Ground from '../models/Ground.js';
import PoolConfig from '../models/PoolConfig.js';
import PoolBookingSlot from '../models/PoolBookingSlot.js';
import Event from '../models/Event.js';
import Contact from '../models/Contact.js';
import Challenge from '../models/Challenge.js';
import CareerApplication from '../models/CareerApplication.js';
import CollaborationInquiry from '../models/CollaborationInquiry.js';
import {
  getEventsForAdmin,
  approveEvent,
  rejectEvent,
} from './eventController.js';

// ── Venue commission & trial/live mode ────────────────────

// Admin sets what cut the platform keeps on a venue's bookings. Only
// affects future orders — never retroactively changes past payouts, since
// those are snapshotted onto the Booking/Payment at the moment of purchase.
const setVenueCommission = asyncHandler(async (req, res) => {
  const { commissionPercent } = req.body;
  const pct = Number(commissionPercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    res.status(400); throw new Error('commissionPercent must be a number between 0 and 100');
  }
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Venue not found'); }
  ground.commissionPercent = pct;
  await ground.save();
  res.json({ message: `Commission set to ${pct}% ✅`, ground });
});

// Flips a venue between 'trial' (2-day free-trial lead flow), 'interest'
// (lightweight "would you book this?" signal, no ticket/check-in), and
// 'live' (full sport/court/capacity booking open to players). Any venue
// type can be in any of the three — this isn't tied to gym/pool anymore,
// so a ground or social ground being pitched to a new owner can sit in
// 'interest' just as easily.
const setVenueMode = asyncHandler(async (req, res) => {
  const { venueMode } = req.body;
  if (!['trial', 'interest', 'live'].includes(venueMode)) {
    res.status(400); throw new Error("venueMode must be 'trial', 'interest', or 'live'");
  }
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Venue not found'); }
  if (venueMode === 'live' && ground.sports.length === 0) {
    res.status(400);
    throw new Error('This venue has no sports configured yet — the owner needs to add at least one before it can go live');
  }
  ground.venueMode = venueMode;
  await ground.save();
  const label = venueMode === 'live' ? 'live 🎉' : venueMode === 'interest' ? 'interest-only mode' : 'trial mode (2-day free trial)';
  res.json({ message: `Venue is now in ${label}`, ground });
});

// Admin hands a venue to a manager account: looks the user up by email,
// flips their role to the matching owner role, and sets them as the
// venue's owner — this is how a pool manager gets their login. They keep
// using the normal /login portal; afterwards the pool page and
// /pool/manage/:id show them the Manage + Scanner options.
const assignVenueOwner = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) { res.status(400); throw new Error('Owner email is required'); }
  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) { res.status(404); throw new Error('No user found with that email — ask them to register first'); }
  if (user.role === 'admin') { res.status(400); throw new Error('Cannot hand a venue to an admin account — use a manager account'); }
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Venue not found'); }
  const ownerRole = ground.venueType === 'pool' ? 'pool_owner' : ground.venueType === 'gym' ? 'gym_owner' : 'ground_owner';
  user.role = ownerRole;
  await user.save();
  ground.owner = user._id;
  await ground.save();
  res.json({
    message: `${ground.name} handed to ${user.name} (${ownerRole}) ✅ — they can log in normally and manage it`,
    ground, user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// Admin-only venue deletion. This is the ONLY way a venue should ever be
// deleted — deleting the Ground doc directly (e.g. straight from Mongo)
// leaves orphaned Booking/Payment/VenueLead records pointing at a venue
// that no longer exists, which shows up as blank names/prices in payment
// history, the admin booking list, etc.
//
// By default this refuses to delete a venue that has bookings with money
// still in flight (advance paid, final payment pending) — those need to be
// resolved (refunded/completed) first so nobody's payment silently
// vanishes. Pass ?force=true to delete anyway and cascade-clean everything
// tied to this venue (intended for test data / cleanup, not routine use).
const deleteVenue = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Venue not found'); }

  const force = req.query.force === 'true';

  const unresolvedCount = await Booking.countDocuments({
    ground: ground._id,
    status: { $in: ['pending_approval', 'advance_pending', 'advance_paid', 'final_pending'] },
  });

  if (unresolvedCount > 0 && !force) {
    res.status(400);
    throw new Error(
      `This venue has ${unresolvedCount} booking(s) with payment still in progress. Resolve (refund/complete) them first, or delete with ?force=true to override and cascade-delete everything tied to this venue.`
    );
  }

  const [bookingResult, paymentResult, leadResult] = await Promise.all([
    Booking.deleteMany({ ground: ground._id }),
    Payment.deleteMany({ ground: ground._id }),
    VenueLead.deleteMany({ venue: ground._id }),
    PoolConfig.deleteOne({ ground: ground._id }),
    PoolBookingSlot.deleteMany({ ground: ground._id }),
  ]);

  await ground.deleteOne();

  res.json({
    message: `Venue "${ground.name}" deleted ✅`,
    cleaned: {
      bookings: bookingResult.deletedCount,
      payments: paymentResult.deletedCount,
      leads: leadResult.deletedCount,
    },
  });
});

// ── Coaches ──────────────────────────────────────────────

const getAllCoaches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const coaches = await Coach.find(query).populate('user', 'name email avatar').sort('-createdAt');
  res.json(coaches);
});

const approveCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) { res.status(404); throw new Error('Coach not found'); }
  coach.status = 'approved';
  coach.rejectionReason = '';
  await coach.save();
  await User.findByIdAndUpdate(coach.user, { role: 'coach' });
  res.json({ message: 'Coach approved ✅', coach });
});

const rejectCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) { res.status(404); throw new Error('Coach not found'); }
  coach.status = 'rejected';
  coach.rejectionReason = req.body.reason || 'Application rejected';
  await coach.save();
  res.json({ message: 'Coach rejected', coach });
});

// ── Stats ─────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalCoaches, pendingCoaches, approvedCoaches,
    totalGrounds, socialGrounds, pendingGrounds,
    totalBookings, pendingApprovals, completedBookings, cancelledBookings,
    playerCount, groundOwnerCount,
    totalEvents, pendingEvents, approvedEvents,
    totalContacts, newContacts,
    totalChallenges, pendingChallenges, careerApplications, collaborationInquiries,
  ] = await Promise.all([
    User.countDocuments(),
    Coach.countDocuments(),
    Coach.countDocuments({ status: 'pending' }),
    Coach.countDocuments({ status: 'approved' }),
    Ground.countDocuments(),
    Ground.countDocuments({ isSocial: true }),
    Ground.countDocuments({ approvalStatus: 'pending' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending_approval' }),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    User.countDocuments({ role: 'player' }),
    User.countDocuments({ role: 'ground_owner' }),
    Event.countDocuments(),
    Event.countDocuments({ approvalStatus: 'pending' }),
    Event.countDocuments({ approvalStatus: 'approved' }),
    Contact.countDocuments(),
    Contact.countDocuments({ status: 'new' }),
    Challenge.countDocuments(),
    Challenge.countDocuments({ approvalStatus: 'pending' }),
    CareerApplication.countDocuments({ status: 'new' }),
    CollaborationInquiry.countDocuments({ status: 'new' }),
  ]);

  res.json({
    totalUsers, totalCoaches, pendingCoaches, approvedCoaches,
    totalGrounds, socialGrounds, pendingGrounds,
    totalBookings, pendingApprovals, completedBookings, cancelledBookings,
    playerCount, groundOwnerCount,
    totalEvents, pendingEvents, approvedEvents,
    totalContacts, newContacts,
    totalChallenges, pendingChallenges, careerApplications, collaborationInquiries,
  });
});

// ── Contact / "Get in touch" messages ────────────────────

const getAllContactMessages = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({})
    .populate('user', 'name avatar role email')
    .sort({ createdAt: -1 });
  res.json(contacts);
});

const markContactMessageRead = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404); throw new Error('Message not found'); }
  contact.status = 'read';
  await contact.save();
  res.json({ success: true });
});

// ── Ground Approvals ──────────────────────────────────────

const getPendingGrounds = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const grounds = await Ground.find({ approvalStatus: status })
    .populate('owner', 'name email phone avatar')
    .sort('-createdAt');

  // Attach lead counts (trial claims / interest signals) so the admin
  // panel can show "12 interested" etc. without a separate round-trip per
  // venue.
  const groundIds = grounds.map((g) => g._id);
  const counts = await VenueLead.aggregate([
    { $match: { venue: { $in: groundIds } } },
    { $group: { _id: { venue: '$venue', type: '$type' }, count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    const key = String(c._id.venue);
    countMap[key] = countMap[key] || { trial: 0, interest: 0 };
    countMap[key][c._id.type] = c.count;
  });

  const shaped = grounds.map((g) => {
    const obj = g.toObject();
    const c = countMap[String(g._id)] || { trial: 0, interest: 0 };
    obj.trialLeadCount = c.trial;
    obj.interestLeadCount = c.interest;
    return obj;
  });

  res.json(shaped);
});

const approveGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }
  ground.isApproved = true;
  ground.approvalStatus = 'approved';
  ground.rejectionReason = '';
  await ground.save();
  res.json({ message: 'Ground approved ✅', ground });
});

const rejectGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }
  ground.isApproved = false;
  ground.approvalStatus = 'rejected';
  ground.rejectionReason = req.body.reason || 'Application rejected';
  await ground.save();
  res.json({ message: 'Ground rejected', ground });
});

// ── Social Booking Approvals ──────────────────────────────

const getPendingSocialBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ status: 'pending_approval' })
    .populate('player', 'name email phone avatar')
    .populate('ground', 'name address sport isSocial')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

const approveSocialBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('ground');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  const ground = await Ground.findById(booking.ground._id);
  const slot = ground.slots.id(booking.slot);
  if (slot) {
    slot.isBooked = true;
    slot.bookedBy = booking.player;
    await ground.save();
  }

  booking.status = 'completed';
  await booking.save();

  res.json({ message: 'Booking approved ✅', booking });
});

const rejectSocialBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  const ground = await Ground.findById(booking.ground);
  if (ground) {
    ground.slots = ground.slots.filter(s => s._id.toString() !== booking.slot.toString());
    await ground.save();
  }

  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Booking rejected', booking });
});

// ── Users ─────────────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort('-createdAt');
  res.json(users);
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `User ${user.isActive ? 'activated' : 'banned'}`, isActive: user.isActive });
});

const VALID_ROLES = ['player', 'ground_owner', 'coach', 'gym_owner', 'pool_owner', 'admin'];

// PATCH /api/admin/users/:id/role — used for one-off manual onboarding,
// e.g. flipping a partner's account to gym_owner before they have any
// self-serve signup flow.
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  user.role = role;
  await user.save();
  res.json({ message: `${user.name} is now ${role}`, role: user.role });
});

// ── All Bookings ──────────────────────────────────────────

const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const bookings = await Booking.find(query)
    .populate('player', 'name email phone')
    .populate('ground', 'name address sport')
    .sort('-createdAt')
    .limit(100);
  res.json(bookings);
});

export {
  getAllCoaches, approveCoach, rejectCoach, getDashboardStats,
  getPendingGrounds, approveGround, rejectGround,
  getPendingSocialBookings, approveSocialBooking, rejectSocialBooking,
  getAllUsers, toggleUserActive, updateUserRole, getAllBookings,
  getEventsForAdmin, approveEvent, rejectEvent,
  getAllContactMessages, markContactMessageRead,
  setVenueCommission, setVenueMode, deleteVenue, assignVenueOwner,
};
