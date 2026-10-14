import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import FitTransaction from '../models/FitTransaction.js';
import {
  ensureReferralCode, creditUser, getEconomy,
  INVITE_SIGNUP_FITCOIN, INVITE_FIRSTBOOKING_FITCOIN,
} from '../services/fitService.js';

// GET /api/users/fit/wallet — balances, invite stats, recent history
const getMyWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await ensureReferralCode(user);
  res.json(await getEconomy(req.user._id));
});

// POST /api/users/fit/apply-referral { code } — one shot, self-only
const applyReferral = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400);
    throw new Error('Enter an invite code');
  }
  const user = await User.findById(req.user._id);
  if (user.referredBy) {
    res.status(400);
    throw new Error('You have already used an invite code');
  }
  const inviter = await User.findOne({ referralCode: code });
  if (!inviter) {
    res.status(404);
    throw new Error('Invalid invite code');
  }
  if (String(inviter._id) === String(user._id)) {
    res.status(400);
    throw new Error("You can't use your own code");
  }
  user.referredBy = inviter._id;
  await user.save();

  // Welcome bonus to the new player; the inviter's 100 FC lands later, on
  // the friend's first paid booking (awardForPayment owns that guard).
  await creditUser({
    userId: user._id,
    type: 'earn_welcome',
    fitcoin: INVITE_SIGNUP_FITCOIN,
    fitPoints: INVITE_SIGNUP_FITCOIN,
    relatedUser: inviter._id,
    note: 'Welcome bonus for using an invite code',
  });
  await FitTransaction.create({
    user: inviter._id,
    type: 'earn_invite_signup',
    fitcoin: 0,
    fitPoints: 0,
    relatedUser: user._id,
    note: `${user.name} joined with your code`,
  });

  res.json({
    message: `Welcome bonus ${INVITE_SIGNUP_FITCOIN} Fitcoin added 🎉`,
    invitedBy: { _id: inviter._id, name: inviter.name },
    ...(await getEconomy(user._id)),
  });
});

// GET /api/users/fit/invite — code, share link, invited friends + earnings
const getInviteInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const code = await ensureReferralCode(user);
  const invited = await User.find({ referredBy: req.user._id })
    .select('name avatar createdAt totalEarnedFitPoints')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const rewarded = await User.countDocuments({ referredBy: req.user._id, referralRewardGiven: true });
  const earned = await FitTransaction.aggregate([
    { $match: { user: req.user._id, type: { $in: ['earn_invite_booking'] } } },
    { $group: { _id: null, fitcoin: { $sum: '$fitcoin' }, count: { $sum: 1 } } },
  ]);
  // The link a friend taps: must be the REAL signup route (/register —
  // there is no /signup route) on the configured frontend origin.
  const origin = (process.env.CLIENT_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const inviteLink = `${origin}/register?ref=${code}`;
  res.json({
    referralCode: code,
    inviteLink,
    rules: {
      signupBonus: INVITE_SIGNUP_FITCOIN,
      firstBookingBonus: INVITE_FIRSTBOOKING_FITCOIN,
    },
    invitedCount: invited.length,
    rewardedCount: rewarded,
    earnedFitcoin: earned[0]?.fitcoin || 0,
    invited: invited.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar || '',
      joinedAt: u.createdAt,
    })),
  });
});

export { getMyWallet, applyReferral, getInviteInfo };
