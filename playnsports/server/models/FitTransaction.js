import mongoose from 'mongoose';

// Append-only ledger for the Fit economy — every FC / FP credit lands here
// so the wallet, Invite & Earn history, and leaderboard can all explain
// where a number came from. No debits yet (nothing spendable), so the
// `debit` type is reserved.
const fitTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // earn_booking: paid a booking · earn_invite_signup: friend joined with
    // my code · earn_invite_booking: friend's first booking · earn_welcome:
    // I joined with someone's code
    type: {
      type: String,
      enum: ['earn_booking', 'earn_invite_signup', 'earn_invite_booking', 'earn_welcome', 'debit'],
      required: true,
    },
    fitcoin: { type: Number, default: 0 },
    fitPoints: { type: Number, default: 0 },
    // Amount in currency that produced this credit (bookings only).
    amountPaid: { type: Number, default: 0 },
    // For invite rows: the other user involved (the friend, either way).
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Free-text note shown in the wallet history list.
    note: { type: String, default: '' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true }
);

const FitTransaction = mongoose.model('FitTransaction', fitTransactionSchema);
export default FitTransaction;
