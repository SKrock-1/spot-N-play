import crypto from 'crypto';

const VERSION = 'SNP1';
const SEP = '.';

// expiry = slot end time as epoch seconds (e.g. 2026-09-12T18:00 local -> UTC)
export const expiryForSlot = (dateStr, endTime) => {
  const d = new Date(`${dateStr}T${endTime}:00`);
  // add 30 min grace so late entry still scans, but after that screenshot is useless anyway due to single-use
  return Math.floor((d.getTime() + 30 * 60 * 1000) / 1000);
};

export const signPoolQr = (bookingId, expiryEpoch) => {
  const secret = process.env.JWT_SECRET || 'fallback-pool-qr-secret';
  const payload = `${bookingId}.${expiryEpoch}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
  return `${VERSION}${SEP}${bookingId}${SEP}${expiryEpoch}${SEP}${sig}`;
};

export const verifyPoolQr = (raw) => {
  const secret = process.env.JWT_SECRET || 'fallback-pool-qr-secret';
  if (!raw || typeof raw !== 'string') throw new Error('Invalid QR');
  const parts = raw.trim().split(SEP);
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('Invalid QR');
  const [, bookingId, expiryStr, sig] = parts;
  if (!/^[a-f0-9]{24}$/.test(bookingId)) throw new Error('Invalid QR');
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) throw new Error('Invalid QR');
  if (Math.floor(Date.now() / 1000) > expiry) throw new Error('QR expired');
  const expected = crypto.createHmac('sha256', secret).update(`${bookingId}.${expiry}`).digest('hex').slice(0, 16);
  if (sig !== expected) throw new Error('Invalid QR');
  return { bookingId, expiry };
};

export const extractBookingIdFromQr = (raw) => {
  try {
    return verifyPoolQr(raw).bookingId;
  } catch {
    return null;
  }
};
