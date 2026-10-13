// Shared payment-binding guard for every verify path.
//
// A valid HMAC signature only proves "the user really paid THIS order" —
// it says nothing about what they're trying to buy with it. Without an
// explicit binding, a confirmed ₹1 order could be replayed at verify time
// to claim a ₹1500 booking (price tampering / replay).
//
// So: fetch the order back from Razorpay and check the amount plus the
// identity fields the caller cares about against what the server is about
// to grant. Throws with `.status` set for the error middleware.

export const assertOrderMatches = async ({ razorpay, orderId, expectedAmount, playerId, match = {}, kind }) => {
  let order;
  try {
    order = await razorpay.orders.fetch(orderId);
  } catch {
    const err = new Error('Could not verify this payment with the gateway');
    err.status = 400;
    throw err;
  }

  if (order.status !== 'paid') {
    const err = new Error('This payment is not completed yet');
    err.status = 400;
    throw err;
  }

  if (Number(order.amount) !== Math.round(Number(expectedAmount)) * 100) {
    const err = new Error('Payment amount does not match this booking');
    err.status = 409;
    throw err;
  }

  const notes = order.notes || {};
  if (notes.type !== kind || String(notes.playerId || '') !== String(playerId)) {
    const err = new Error('This payment was made for a different booking');
    err.status = 400;
    throw err;
  }

  for (const [key, value] of Object.entries(match)) {
    if (String(notes[key] ?? '') !== String(value ?? '')) {
      const err = new Error('This payment was made for a different booking');
      err.status = 400;
      throw err;
    }
  }

  return order;
};

export default assertOrderMatches;
