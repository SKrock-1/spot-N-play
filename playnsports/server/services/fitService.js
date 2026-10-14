import crypto from 'crypto';
import User from '../models/User.js';
import FitTransaction from '../models/FitTransaction.js';

// ── Tunables (all PM-editable in one place) ──────────────────────────
// 1 unit of currency = 1 fitcoin (app bills in INR, so ₹1 = 1 FC).
export const FITCOIN_PER_RUPEE = 1;
// Fit Points ride along 1:1 for now — they're the lifetime score, never
// spendable. Move this number to rebalance how fast levels climb.
export const FITPOINT_PER_RUPEE = 1;
// Invite & Earn: friend gets this on joining with a code; the inviter gets
// this when the friend completes their first paid booking.
export const INVITE_SIGNUP_FITCOIN = 20;
export const INVITE_FIRSTBOOKING_FITCOIN = 100;

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const generateReferralCode = () => {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `XL${code}`;
};

// Every user gets a code exactly once, lazily, so existing accounts don't
// need a backfill migration.
export const ensureReferralCode = async (user) => {
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 5; i++) {
    const candidate = generateReferralCode();
    const taken = await User.exists({ referralCode: candidate });
    if (!taken) {
      user.referralCode = candidate;
      await user.save();
      return candidate;
    }
  }
  return null;
};

// The ONE place Fit progress is credited. `amountPaid` is the currency the
// player actually paid; FC/FP are derived from the constants above so the
// ratio lives in exactly one file.
export const awardForPayment = async ({ userId, amountPaid, bookingId = null, note = '' }) => {
  const paid = Math.round(Number(amountPaid) || 0);
  if (paid <= 0) return null;

  const fitcoin = paid * FITCOIN_PER_RUPEE;
  const fitPoints = paid * FITPOINT_PER_RUPEE;

  await User.updateOne(
    { _id: userId },
    {
      $inc: { fitcoin, fitPoints, totalEarnedFitcoin: fitcoin, totalEarnedFitPoints: fitPoints },
    }
  );
  await FitTransaction.create({
    user: userId,
    type: 'earn_booking',
    fitcoin,
    fitPoints,
    amountPaid: paid,
    note,
    booking: bookingId,
  });

  // If this player was invited, pay their inviter the one-time first-booking
  // bonus. The bonus is CLAIMED atomically first (conditional update on
  // referralRewardGiven), so concurrent bookings for the same invited friend
  // can never both win — and a crash between claim and credit loses at most
  // this one bonus, it can never double-pay.
  const payer = await User.findById(userId).select('_id referredBy name').lean();
  if (payer?.referredBy) {
    const claim = await User.findOneAndUpdate(
      { _id: payer._id, referralRewardGiven: { $ne: true } },
      { $set: { referralRewardGiven: true } },
      { new: true }
    );
    if (claim) {
      await creditUser({
        userId: payer.referredBy,
        type: 'earn_invite_booking',
        fitcoin: INVITE_FIRSTBOOKING_FITCOIN,
        fitPoints: INVITE_FIRSTBOOKING_FITCOIN,
        relatedUser: payer._id,
        note: 'Your invite made their first booking',
      });
    }
  }
  return { fitcoin, fitPoints };
};

// Low-level credit used by invite rewards (no booking amount behind them).
export const creditUser = async ({ userId, type, fitcoin = 0, fitPoints = 0, relatedUser = null, note = '' }) => {
  if (!userId || (!fitcoin && !fitPoints)) return null;
  await User.updateOne(
    { _id: userId },
    {
      $inc: { fitcoin, fitPoints, totalEarnedFitcoin: fitcoin, totalEarnedFitPoints: fitPoints },
    }
  );
  return FitTransaction.create({ user: userId, type, fitcoin, fitPoints, note, relatedUser });
};

export const getEconomy = async (userId) => {
  const u = await User.findById(userId)
    .select('fitcoin fitPoints totalEarnedFitcoin totalEarnedFitPoints referralCode referredBy referralRewardGiven mates')
    .lean();
  if (!u) return null;
  const history = await FitTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  const invited = await User.countDocuments({ referredBy: userId });
  return {
    fitcoin: u.fitcoin || 0,
    fitPoints: u.fitPoints || 0,
    totalEarnedFitcoin: u.totalEarnedFitcoin || 0,
    totalEarnedFitPoints: u.totalEarnedFitPoints || 0,
    referralCode: u.referralCode || null,
    invitedCount: invited,
    inviteRewarded: !!u.referralRewardGiven,
    mateCount: (u.mates || []).length,
    history: history.map((h) => ({
      _id: h._id,
      type: h.type,
      fitcoin: h.fitcoin,
      fitPoints: h.fitPoints,
      amountPaid: h.amountPaid,
      note: h.note,
      createdAt: h.createdAt,
    })),
  };
};
