import mongoose from 'mongoose';

// Standalone arena membership (e.g. XL Arena Single Standard ₹990/month).
// Deliberately separate from the pool engine: no slots consumed, no
// capacity, no categories — just a 30-day access pass tied to one ground.
// Hourly turf bookings still go through the normal Ground.slots +
// /payments/grounds/:id/advance-order flow; membership is an optional extra.
const xlMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ground: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true, index: true },
    planName: { type: String, default: 'Standard' },
    price: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
    },
  },
  { timestamps: true }
);

xlMembershipSchema.index({ user: 1, ground: 1, status: 1 });

const XlMembership = mongoose.model('XlMembership', xlMembershipSchema);
export default XlMembership;
