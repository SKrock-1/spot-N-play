import mongoose from 'mongoose';

// A pending mate (friend) request. Accepted requests flip `User.mates` on
// both sides and the request row is stamped accepted; declined rows are
// kept for history but block nothing (a user can re-request later).
const mateRequestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Guarantees one OPEN request per pair. Declined rows are deleted rather
// than marked, otherwise the same two users could never re-request (and
// the stale 'declined' row would collide with the unique index).
mateRequestSchema.index({ from: 1, to: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
mateRequestSchema.index({ to: 1, status: 1 });

const MateRequest = mongoose.model('MateRequest', mateRequestSchema);
export default MateRequest;
