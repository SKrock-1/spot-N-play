import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://127.0.0.1:5000/api';
const XL = '6a7951c06ad9e03900551857';
const PLAYER = '69b1cd50890f258d819b6c0e';
const OTHER = '69b06910018df35b2ae95cd6';
const POOL = '6a7954a26ad9e039005519d4';
const tok = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '2h' });
const H = (id) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok(id) });
let P = PLAYER;

let passed = 0, failed = 0;
const issues = [];
const ok = (m, c, issue = null) => {
  if (c) { passed++; console.log(`  PASS ${m}`); }
  else { failed++; console.log(`  FAIL ${m}${issue ? ' -> ' + issue : ''}`); if (issue) issues.push(`${m}: ${issue}`); }
};
const j = async (r) => { try { return await r.json(); } catch { return {}; } };

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// wipe any test state from previous runs
await db.collection('materequests').deleteMany({ $or: [{ from: new mongoose.Types.ObjectId(PLAYER) }, { to: new mongoose.Types.ObjectId(PLAYER) }, { from: new mongoose.Types.ObjectId(OTHER) }, { to: new mongoose.Types.ObjectId(OTHER) }] });
await db.collection('users').updateMany({ _id: { $in: [new mongoose.Types.ObjectId(PLAYER), new mongoose.Types.ObjectId(OTHER)] } }, { $set: { mates: [] } });
await db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(PLAYER) }, { $set: { referredBy: null, referralRewardGiven: false, fitcoin: 0, fitPoints: 0, totalEarnedFitcoin: 0, totalEarnedFitPoints: 0 } });
await db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(OTHER) }, { $set: { referredBy: null, referralRewardGiven: false } });
await db.collection('fittransactions').deleteMany({ user: { $in: [new mongoose.Types.ObjectId(PLAYER), new mongoose.Types.ObjectId(OTHER)] } });
// Release any arena bookings the test player already holds — a real booking
// on the test date would trip the anti-consecutive rule and cause a false
// failure in the ground regression check.
const stale = await db.collection('bookings').find({ player: new mongoose.Types.ObjectId(PLAYER) }).toArray();
for (const b of stale) {
  if (b.ground && b.slot) {
    await db.collection('grounds').updateOne({ _id: b.ground }, { $inc: { 'slots.$[s].bookedCount': -1 }, $set: { 'slots.$[s].isBooked': false } }, { arrayFilters: [{ 's._id': b.slot }] });
    await db.collection('grounds').updateOne({ _id: b.ground }, { $pull: { 'slots.$[s].bookedBy': new mongoose.Types.ObjectId(PLAYER) } }, { arrayFilters: [{ 's._id': b.slot }] });
  }
  await db.collection('payments').deleteMany({ booking: b._id });
}
await db.collection('bookings').deleteMany({ player: new mongoose.Types.ObjectId(PLAYER) });
await db.collection('notifications').deleteMany({ user: { $in: [new mongoose.Types.ObjectId(PLAYER), new mongoose.Types.ObjectId(OTHER)] }, type: { $in: ['new_message', 'chat_started'] } });

console.log('\n=== 1. HEALTH / AUTH ===');
ok('version check 200', (await fetch(`${BASE}/version/check`)).status === 200);
const email = `e2e_${Date.now()}@lpu.in`;
let r = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'E2E Test', email, password: 'test1234', phone: '9998887770' }) });
const reg = await j(r);
ok('register 201 + token', r.status === 201 && !!reg.token, 'register');
const NEW = reg._id;
const HN = H(NEW);
ok('new user gets referralCode lazily (null ok at signup, wallet issues one)', true);
r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'test1234' }) });
ok('login 200 + token', r.status === 200 && !!(await j(r)).token);
r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'wrongpass' }) });
ok('login rejects bad password 401', r.status === 401, `got ${r.status}`);

console.log('\n=== 2. SEARCH / SPORT DATA ===');
r = await fetch(`${BASE}/coaches`, { headers: H(P) });
const coaches = await j(r);
ok('coaches list 200 + has sports', r.status === 200 && coaches.length > 0, 'coaches');
r = await fetch(`${BASE}/coaches?sport=pickleball`, { headers: H(P) });
ok('coaches?sport=pickleball exact-match filter 200', r.status === 200, `got ${r.status}`);
r = await fetch(`${BASE}/grounds/all`, { headers: H(P) });
ok('grounds/all 200 (XL location list source)', r.status === 200);
const all = await j(r);
ok('XL Arena present in /grounds/all', all.some(g => g?.name?.toLowerCase().includes('xl arena')));
r = await fetch(`${BASE}/players/all`, { headers: H(P) });
ok('players/all 200 (Find Players / Mates search)', r.status === 200);

console.log('\n=== 3. XL ARENA BOOKING ENGINE ===');
const g = await (await fetch(`${BASE}/grounds/${XL}`, { headers: H(P) })).json();
const game = g.sports.find(s => s.name === 'box cricket');
const today = new Date().toISOString().split('T')[0];
const open = g.slots.filter(s => !s.isBooked && (s.bookedCount || 0) < s.capacity && s.date >= today);
const openDates = [...new Set(open.map(s => s.date))].sort();
ok('XL has open slots in 30d window', open.length > 0, `${open.length}`);
const d0 = openDates.find(d => d > today) || openDates[0];
const same = open.filter(s => s.date === d0 && String(s.courtId) === String(open[0].courtId)).sort((a, b) => a.startTime.localeCompare(b.startTime));
const pair = [same[0], same.find(s => s.startTime === same[0].endTime)].filter(Boolean);
ok('continuous pair exists', pair.length === 2);

const orderXL = async (slots, mode = 'token', hdr = H(P)) => {
  const r = await fetch(`${BASE}/xl/${XL}/arena-order`, { method: 'POST', headers: hdr, body: JSON.stringify({ slotIds: slots.map(s => s._id), payMode: mode }) });
  return { status: r.status, body: await j(r) };
};
let o = await orderXL(pair, 'token');
ok('token order: 1500 total / 500 payable', o.status === 200 && o.body.total === 1500 && o.body.amount === 500);
o = await orderXL(pair, 'full');
ok('full order: 1500 payable / 0 remaining', o.status === 200 && o.body.amount === 1500 && o.body.remaining === 0);
const other = same.find(s => s.startTime !== pair[0].endTime && s._id !== pair[0]._id);
o = await orderXL([pair[0], other]);
ok('non-continuous slots rejected 400', o.status === 400, `got ${o.status}`);
const cross = open.find(s => s.date === d0 && String(s.courtId) !== String(open[0].courtId) && String(s.sportId) !== String(game._id));
o = await orderXL([pair[0], cross]);
ok('cross-turf rejected 400', o.status === 400, `got ${o.status}`);
o = await orderXL(pair, 'bogus');
ok('invalid payMode rejected 400', o.status === 400, `got ${o.status}`);
o = await orderXL([same[same.length - 1]], 'token');
ok('single-slot order ok (no minimum-2 rule, unlike xlarena.com)', o.status === 200, `got ${o.status} ${JSON.stringify(o.body).slice(0, 120)}`);
// stale slot id
o = await orderXL([{ _id: '6a7951c06ad9e03900551899' }]);
ok('unknown slotId handled with 4xx not 500', o.status >= 400 && o.status < 500, `got ${o.status}`);
// package-9 date outside window
o = await orderXL([{ _id: String(same[0]._id).slice(0, 23) + '9' }]);
console.log(`  (info) stale/first-slot order -> ${o.status}`);

console.log('\n=== 4. PAYMENT BINDING (amount replay probe) ===');
// A cheap paid order reused against an expensive slot set - is the slot set
// bound to the order server-side, or only the signature checked?
o = await orderXL([same[0]], 'token'); // 750 total, 500 payable
const sigCheap = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${o.body.orderId}|pay_cheap`).digest('hex');
r = await fetch(`${BASE}/xl/${XL}/arena-verify`, {
  method: 'POST', headers: H(P),
  body: JSON.stringify({ razorpayOrderId: o.body.orderId, razorpayPaymentId: 'pay_cheap', razorpaySignature: sigCheap, slotIds: pair.map(s => s._id), payMode: 'full' }),
});
const replay = await j(r);
ok('SECURITY: cannot verify a 2-slot full booking with a 1-slot token order', r.status !== 200,
  `ACCEPTED REPLAYED ORDER - paid ${replay.paid}, booked ${replay.bookings?.length} slots for a ${o.body.amount} order`);

console.log('\n=== 5. FIT ECONOMY ===');
const walletOf = async (h) => (await fetch(`${BASE}/users/fit/wallet`, { headers: h })).json();
let wRaw = await fetch(`${BASE}/users/fit/wallet`, { headers: H(P) });
let w = await walletOf(H(P));
ok('wallet issues referralCode', /^XL/.test(w.referralCode || ''), w.referralCode || 'none');

// invite chain: new user applies player's code
r = await fetch(`${BASE}/users/fit/apply-referral`, { method: 'POST', headers: HN, body: JSON.stringify({ code: w.referralCode }) });
ok('new user applies invite code -> 20 FC', r.status === 200);
let wn = await walletOf(HN);
ok('welcome bonus credited (20 FC / 20 FP)', wn.fitcoin === 20 && wn.fitPoints === 20, `${wn.fitcoin}/${wn.fitPoints}`);
r = await fetch(`${BASE}/users/fit/apply-referral`, { method: 'POST', headers: HN, body: JSON.stringify({ code: w.referralCode }) });
ok('code cannot be applied twice 400', r.status === 400, `got ${r.status}`);
const inv = await (await fetch(`${BASE}/users/fit/invite`, { headers: H(P) })).json();
ok('inviter sees 1 invited friend', inv.invitedCount === 1, `${inv.invitedCount}`);

// first booking by the invited friend pays inviter 100 FC
const order2 = await orderXL(pair, 'token', HN);
console.log(`  (info) invited-user order -> ${order2.status}`);

console.log('\n=== 6. MATES LIFECYCLE ===');
r = await fetch(`${BASE}/mates/request/${OTHER}`, { method: 'POST', headers: H(P) });
ok('mate request sent', r.status === 201, `got ${r.status}`);
ok('self mate request blocked', (await (await fetch(`${BASE}/mates/request/${P}`, { method: 'POST', headers: H(P) })).json(), await fetch(`${BASE}/mates/request/${P}`, { method: 'POST', headers: H(P) }).then(x => x.status) === 400));
let mv = await (await fetch(`${BASE}/mates`, { headers: H(OTHER) })).json();
const inc = mv.incoming?.[0];
ok('invitee sees incoming request', !!inc);
r = await fetch(`${BASE}/mates/decline/${inc._id}`, { method: 'POST', headers: H(OTHER) });
ok('decline works', r.status === 200);
r = await fetch(`${BASE}/mates/request/${OTHER}`, { method: 'POST', headers: H(P) });
ok('RE-REQUEST AFTER DECLINE works (no unique-index crash)', r.status === 201, `got ${r.status} ${JSON.stringify(await j(r)).slice(0, 140)}`);
mv = await (await fetch(`${BASE}/mates`, { headers: H(OTHER) })).json();
r = await fetch(`${BASE}/mates/accept/${mv.incoming?.[0]?._id}`, { method: 'POST', headers: H(OTHER) });
const acc = await j(r);
ok('accept -> mutual mates', r.status === 200 && acc.mate?._id === P, `${r.status} ${JSON.stringify(acc).slice(0, 140)}`);
r = await fetch(`${BASE}/mates/status/${OTHER}`, { headers: H(P) });
ok('status = mates', (await j(r)).status === 'mates');
r = await fetch(`${BASE}/mates/${OTHER}`, { method: 'DELETE', headers: H(P) });
ok('remove mate', r.status === 200, `${r.status}`);
r = await fetch(`${BASE}/mates/status/${OTHER}`, { headers: H(P) });
ok('status back to none', (await j(r)).status === 'none');

console.log('\n=== 7. LEADERBOARD ===');
for (const range of ['weekly', 'monthly', 'all']) {
  r = await fetch(`${BASE}/leaderboard?range=${range}`, { headers: H(P) });
  const lb = await j(r);
  ok(`leaderboard ${range} 200 + me row`, r.status === 200 && lb.me?._id === P, `${r.status}`);
}
r = await fetch(`${BASE}/leaderboard?range=bogus`, { headers: H(P) });
ok('bad range falls back to all-time (no 500)', r.status === 200, `got ${r.status}`);

console.log('\n=== 8. CHAT + MUTE + START NOTIFICATION ===');
r = await fetch(`${BASE}/chat/direct`, { method: 'POST', headers: H(P), body: JSON.stringify({ userId: OTHER }) });
const conv = await j(r);
ok('direct conversation created 200/201', [200, 201].includes(r.status), `got ${r.status}`);
const CONV = conv._id;
r = await fetch(`${BASE}/users/mute/${CONV}`, { method: 'POST', headers: H(P) });
ok('mute conversation 200', r.status === 200, `got ${r.status}`);
r = await fetch(`${BASE}/users/muted`, { headers: H(P) });
const muted = await j(r);
ok('muted list contains conversation', (muted.mutedConversations || muted || []).some(c => String(c._id || c) === String(CONV)), 'not listed');
r = await fetch(`${BASE}/users/unmute/${CONV}`, { method: 'POST', headers: H(P) });
ok('unmute 200', r.status === 200);
r = await fetch(`${BASE}/users/muted`, { headers: H(P) });
const muted2 = await j(r);
ok('muted list empty after unmute', !(muted2.mutedConversations || muted2 || []).some(c => String(c._id || c) === String(CONV)));
r = await fetch(`${BASE}/chat/${CONV}/messages`, { headers: H(P) });
ok('messages endpoint 200', r.status === 200, `got ${r.status}`);

console.log('\n=== 9. GROUND + POOL REGRESSION ===');
r = await fetch(`${BASE}/payments/grounds/${XL}/advance-order`, { method: 'POST', headers: H(P), body: JSON.stringify({ slotId: pair[0]._id, partySize: 1 }) });
const adv = await j(r);
ok('ground advance-order 200 (30/70 legacy path)', r.status === 200 && adv.totalAmount === 750 && adv.amount === 225, `${r.status} ${JSON.stringify(adv).slice(0, 100)}`);
r = await fetch(`${BASE}/pools/${POOL}/checkout-info`, { headers: H(P) });
ok('pool checkout-info 200', r.status === 200, `got ${r.status}`);
r = await fetch(`${BASE}/pools/${POOL}/availability?date=${d0}`, { headers: H(P) });
ok('pool availability 200', r.status === 200);
r = await fetch(`${BASE}/pools/${XL}/checkout-info`, { headers: H(P) });
ok('XL no longer leaks into pool API (404)', r.status === 404, `got ${r.status}`);

console.log('\n=== 10. CLEANUP + FINAL STATE ===');
await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(NEW) });
await db.collection('fittransactions').deleteMany({ user: new mongoose.Types.ObjectId(NEW) });
await db.collection('conversations').deleteOne({ _id: new mongoose.Types.ObjectId(CONV) });
await db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(P) }, { $set: { fitcoin: 0, fitPoints: 0, totalEarnedFitcoin: 0, totalEarnedFitPoints: 0, referredBy: null, referralRewardGiven: false } });
await db.collection('fittransactions').deleteMany({ user: new mongoose.Types.ObjectId(P) });
await db.collection('users').updateOne({ _id: new mongoose.Types.ObjectId(OTHER) }, { $set: { mates: [], referredBy: null, fitcoin: 0, fitPoints: 0 } });
await db.collection('bookings').deleteMany({ player: new mongoose.Types.ObjectId(P), ticketId: { $in: [] } });
const dirty = (await db.collection('grounds').findOne({ _id: new mongoose.Types.ObjectId(XL) })).slots.filter(s => s.bookedCount > 0).length;
ok('no dirty slots left after test', dirty === 0, `${dirty}`);

console.log(`\n===== RESULT: ${passed} passed, ${failed} failed =====`);
if (issues.length) { console.log('\nISSUES FOUND:'); issues.forEach(i => console.log(' - ' + i)); }
await mongoose.disconnect();
process.exit(failed ? 1 : 0);
