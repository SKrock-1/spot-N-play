import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Ground from '../models/Ground.js';
import XlMembership from '../models/XlMembership.js';
import { getRazorpay } from '../utils/razorpay.js';

// Arena membership catalogue. Single plan for now (Jaideep: Single
// Standard ₹990) — extend this array if XL adds more tiers later.
export const XL_PLANS = [
  { name: 'Standard', label: 'Single · per month', price: 990, validityDays: 30 },
];

const VALIDITY_DAYS = 30;

const activeMembership = (userId, groundId) =>
  XlMembership.findOne({
    user: userId,
    ground: groundId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

// GET /api/xl/:groundId/info — plans + my current membership (if any)
const getXlInfo = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId).select('name venueType venueMode approvalStatus sports address');
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const mine = await activeMembership(req.user._id, ground._id);
  res.json({
    ground: { _id: ground._id, name: ground.name, address: ground.address },
    plans: XL_PLANS,
    myMembership: mine
      ? { planName: mine.planName, price: mine.price, purchasedAt: mine.purchasedAt, expiresAt: mine.expiresAt, status: mine.status }
      : null,
  });
});

// POST /api/xl/:groundId/membership/order — full-payment Razorpay order
const createMembershipOrder = asyncHandler(async (req, res) => {
  const { planName = 'Standard' } = req.body;
  const plan = XL_PLANS.find((p) => p.name === planName);
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  if (ground.venueMode !== 'live') {
    res.status(403);
    throw new Error('Membership opens once the venue goes live');
  }
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: plan.price * 100,
    currency: 'INR',
    receipt: `xlmem_${Date.now()}`,
    notes: { groundId: ground._id.toString(), playerId: req.user._id.toString(), planName: plan.name, type: 'xl_membership' },
  });
  res.json({ orderId: order.id, amount: plan.price, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, plan });
});

// POST /api/xl/:groundId/membership/verify — HMAC check → 30-day pass
const verifyMembershipPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName = 'Standard' } = req.body;
  const plan = XL_PLANS.find((p) => p.name === planName);
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const now = new Date();
  const existing = await activeMembership(req.user._id, ground._id);
  // Renewals extend from the current expiry so members never lose days.
  const start = existing && existing.expiresAt > now ? existing.expiresAt : now;
  const expiresAt = new Date(start.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (existing) {
    existing.expiresAt = expiresAt;
    existing.price = plan.price;
    existing.planName = plan.name;
    existing.payment = { razorpayOrderId, razorpayPaymentId };
    await existing.save();
    return res.json({ message: 'Membership renewed ✅', myMembership: { planName: existing.planName, price: existing.price, expiresAt: existing.expiresAt, status: existing.status } });
  }
  const membership = await XlMembership.create({
    user: req.user._id,
    ground: ground._id,
    planName: plan.name,
    price: plan.price,
    purchasedAt: now,
    expiresAt,
    status: 'active',
    payment: { razorpayOrderId, razorpayPaymentId },
  });
  res.json({ message: 'Membership activated ✅', myMembership: { planName: membership.planName, price: membership.price, expiresAt: membership.expiresAt, status: membership.status } });
});

export { getXlInfo, createMembershipOrder, verifyMembershipPayment };
