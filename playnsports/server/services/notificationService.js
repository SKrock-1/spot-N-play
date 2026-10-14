import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../socket/io.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { sendPushToUser } from './webPush.js';

// ── Core primitive ──────────────────────────────────────────────
// Every notification in the app — current and future — is created
// through this one function. It persists to the DB AND pushes a
// real-time event to the recipient (if they're online) via the
// `user_<id>` socket room every authenticated socket joins on connect.
//
// Never throws — a notification failing must never break the feature
// that triggered it (e.g. a typo in a notification shouldn't stop an
// event from being approved).
const notify = async ({ recipient, actor = null, type, title, body = '', link = '', data = {} }) => {
  try {
    if (!recipient) return null;
    const recipientId = recipient.toString();

    // Don't notify yourself (e.g. an admin who is also somehow the actor)
    if (actor && actor.toString() === recipientId) return null;

    const notification = await Notification.create({
      recipient: recipientId, actor, type, title, body, link, data,
    });

    const io = getIO();
    if (io) {
      io.to(`user_${recipientId}`).emit('new_notification', notification);
    }

    // Real OS-level push, delivered by the browser's own push service —
    // reaches the person even if every tab of the site is fully closed.
    // Fire-and-forget: never block/slow down the notification just because
    // a push send is in flight.
    sendPushToUser(recipientId, { title, body, link, tag: notification._id.toString() });

    return notification;
  } catch (err) {
    console.error('notify() failed:', err.message);
    return null;
  }
};

// Fan a single notification out to many recipients (e.g. "all admins")
const notifyMany = async (recipients = [], payload) => {
  return Promise.all(recipients.map((recipient) => notify({ ...payload, recipient })));
};

const getAdminIds = async () => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  return admins.map((a) => a._id);
};

// ─────────────────────────────────────────────────────────────────
// Per-feature helpers — this is the "expandable" surface.
//
// To wire up a brand-new feature's notification later:
//   1. Add the type to constants/notificationTypes.js
//   2. Add a small notifyXxx() function below
//   3. Call it (fire-and-forget, e.g. `notifyXxx({...})` with no await
//      needed since it never throws) from the controller where the
//      triggering action happens.
// ─────────────────────────────────────────────────────────────────

// Someone invited you to a group
const notifyGroupInvite = ({ groupId, groupName, invitedUserId, inviterId, inviterName }) =>
  notify({
    recipient: invitedUserId,
    actor: inviterId,
    type: NOTIFICATION_TYPES.GROUP_INVITE,
    title: 'New group invitation',
    body: `${inviterName} invited you to join "${groupName}"`,
    link: '/groups',
    data: { groupId },
  });

// You received a chat message (direct or group conversation)
const notifyNewMessage = ({ conversationId, recipientId, senderId, senderName, preview }) =>
  notify({
    recipient: recipientId,
    actor: senderId,
    type: NOTIFICATION_TYPES.NEW_MESSAGE,
    title: `New message from ${senderName}`,
    body: preview?.length > 120 ? `${preview.slice(0, 120)}…` : preview,
    link: `/chat/${conversationId}`,
    data: { conversationId },
  });

// Admin approved your event
const notifyEventApproved = ({ eventId, eventTitle, organizerId }) =>
  notify({
    recipient: organizerId,
    type: NOTIFICATION_TYPES.EVENT_APPROVED,
    title: 'Event approved ✅',
    body: `Your event "${eventTitle}" is now live on /events`,
    link: '/events',
    data: { eventId },
  });

// Admin rejected your event
const notifyEventRejected = ({ eventId, eventTitle, organizerId, reason }) =>
  notify({
    recipient: organizerId,
    type: NOTIFICATION_TYPES.EVENT_REJECTED,
    title: 'Event rejected',
    body: reason ? `"${eventTitle}" was rejected: ${reason}` : `Your event "${eventTitle}" was rejected`,
    link: '/events',
    data: { eventId },
  });

// Admin approved your coach application
const notifyCoachApproved = ({ coachId, userId }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.COACH_APPROVED,
    title: 'Coach application approved 🎉',
    body: 'You are now listed as a coach on PlayNSports',
    link: '/coach/dashboard',
    data: { coachId },
  });

// Admin rejected your coach application
const notifyCoachRejected = ({ coachId, userId, reason }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.COACH_REJECTED,
    title: 'Coach application rejected',
    body: reason || 'Your coach application was rejected',
    data: { coachId },
  });

// Tell every admin a new coach application needs review
const notifyAdminsNewCoachApplication = async ({ coachId, coachName }) => {
  const admins = await getAdminIds();
  return notifyMany(admins, {
    type: NOTIFICATION_TYPES.NEW_COACH_APPLICATION,
    title: 'New coach application',
    body: `${coachName} applied to become a coach — review in Admin Panel`,
    link: '/admin',
    data: { coachId },
  });
};

// Tell every admin a new ground was submitted for approval
const notifyAdminsNewGroundSubmitted = async ({ groundId, groundName }) => {
  const admins = await getAdminIds();
  return notifyMany(admins, {
    type: NOTIFICATION_TYPES.NEW_GROUND_SUBMITTED,
    title: 'New ground submitted',
    body: `"${groundName}" was submitted for approval — review in Admin Panel`,
    link: '/admin',
    data: { groundId },
  });
};

// A player booked a slot on your ground — real-time + persisted, shows up
// in the owner's bell instantly whether they're looking at the dashboard
// or not (and is still there in the notification list if they weren't
// online at the time).
const notifySlotBooked = ({ ownerId, actorId, groundId, groundName, date, startTime, endTime, pendingApproval = false }) =>
  notify({
    recipient: ownerId,
    actor: actorId,
    type: NOTIFICATION_TYPES.SLOT_BOOKED,
    title: pendingApproval ? 'New booking request 🏟️' : 'Slot booked ✅',
    body: `"${groundName}" — ${date}, ${startTime}–${endTime}${pendingApproval ? ' (awaiting your approval)' : ''}`,
    link: '/owner/dashboard',
    data: { groundId, date, startTime, endTime },
  });

// Your event ticket is ready (fired right after joining, alongside the
// confirmation email — this is the in-app copy of the same confirmation).
// `subEventTitle` / `subEventId` are optional — present when the ticket was
// issued for a sub-event booking rather than the parent event directly.
const notifyEventTicketIssued = ({ eventId, eventTitle, userId, ticketId, subEventId = null, subEventTitle = '' }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.EVENT_TICKET_ISSUED,
    title: 'Your ticket is ready 🎟️',
    body: `Ticket ${ticketId} for "${subEventTitle ? `${eventTitle} — ${subEventTitle}` : eventTitle}" — check your email for the full confirmation.`,
    link: '/events/joined',
    data: { eventId, ticketId, subEventId },
  });

// The organizer just checked you in at the door
const notifyEventCheckedIn = ({ eventId, eventTitle, userId, subEventId = null, subEventTitle = '' }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.EVENT_CHECKED_IN,
    title: "You're checked in 🎉",
    body: `Have fun at "${subEventTitle ? `${eventTitle} — ${subEventTitle}` : eventTitle}"!`,
    link: '/events/joined',
    data: { eventId, subEventId },
  });

// Someone nearby posted a "Looking for Players" request matching your sport
const notifyNearbyGameRequest = ({ requestId, recipientId, organizerId, organizerName, sport, playersNeeded, locationName }) =>
  notify({
    recipient: recipientId,
    actor: organizerId,
    type: NOTIFICATION_TYPES.NEARBY_GAME_REQUEST,
    title: `${organizerName} is looking for ${sport} players 🏸`,
    body: `Need ${playersNeeded} more${locationName ? ` at ${locationName}` : ''} — join now`,
    link: '/map',
    data: { requestId },
  });

// Someone joined your "Looking for Players" request
const notifyGameRequestJoined = ({ requestId, organizerId, joinerId, joinerName, sport }) =>
  notify({
    recipient: organizerId,
    actor: joinerId,
    type: NOTIFICATION_TYPES.GAME_REQUEST_JOINED,
    title: `${joinerName} joined your game 🎉`,
    body: `Your ${sport} request has a new player`,
    link: '/map',
    data: { requestId },
  });

// You joined someone's request — confirmation for the joiner
const notifyGameRequestJoinConfirmed = ({ requestId, joinerId, organizerId, organizerName, sport }) =>
  notify({
    recipient: joinerId,
    actor: organizerId,
    type: NOTIFICATION_TYPES.GAME_REQUEST_JOIN_CONFIRMED,
    title: `You joined ${organizerName}'s squad ✅`,
    body: `You're now in the BGUS pool for ${sport} — waiting for ${organizerName} to assemble the final squad and book`,
    link: '/map',
    data: { requestId },
  });

// Squad is full — notify all members (organizer + joiners) to book BGUS
const notifySquadReady = ({ requestId, memberIds, organizerName, sport }) =>
  notifyMany(memberIds, {
    type: NOTIFICATION_TYPES.SQUAD_READY,
    title: `Squad ready for BGUS! 🎮`,
    body: `${organizerName}'s ${sport} squad is full — go to BGUS event and register as a squad (4) now`,
    link: '/events',
    data: { requestId },
  });

// Someone claimed a free trial at your venue
// Which dashboard a venue owner should land on from a lead notification —
// depends on what kind of venue it is, not just "gym".
const ownerDashboardLink = (venueType) => {
  if (venueType === 'gym') return '/gym/dashboard';
  if (venueType === 'pool') return '/pool/dashboard';
  return '/owner/dashboard'; // ground, social
};

const notifyVenueTrialClaimed = ({ venueId, venueType, ownerId, userId, userName, venueName }) =>
  notify({
    recipient: ownerId,
    actor: userId,
    type: NOTIFICATION_TYPES.VENUE_TRIAL_CLAIMED,
    title: `${userName} claimed a free trial 🎟️`,
    body: `New lead for ${venueName} — valid for 2 days`,
    link: ownerDashboardLink(venueType),
    data: { venueId },
  });

// A player opened an interest-only venue — no button click required on
// their end, this fires the first time each unique user views it.
const notifyVenueInterestShown = ({ venueId, venueType, ownerId, userId, userName, venueName }) =>
  notify({
    recipient: ownerId,
    actor: userId,
    type: NOTIFICATION_TYPES.VENUE_INTEREST_SHOWN,
    title: `${userName} is interested in ${venueName} 👀`,
    body: `They checked out your venue — could be a future booking once you're live`,
    link: ownerDashboardLink(venueType),
    data: { venueId },
  });

// Confirms to the trial-claimer that they've been checked in at the venue
const notifyVenueCheckedIn = ({ venueId, userId, venueName }) =>
  notify({
    recipient: userId,
    actor: null,
    type: NOTIFICATION_TYPES.VENUE_CHECKED_IN,
    title: `You're checked in at ${venueName} 🎉`,
    body: 'Enjoy your trial session!',
    link: `/venues/${venueId}`,
    data: { venueId },
  });

// Your pool booking ticket is ready (fired right after payment succeeds,
// alongside the confirmation email — this is the in-app copy of it).
const notifyPoolBookingConfirmed = ({ groundId, groundName, userId, ticketId, date, startTime }) =>
  notify({
    recipient: userId,
    type: NOTIFICATION_TYPES.POOL_BOOKING_CONFIRMED,
    title: 'Your pool ticket is ready 🎟️',
    body: `${groundName} — ${date}, ${startTime} — check your email for the full confirmation.`,
    link: '/player/dashboard',
    data: { groundId, ticketId },
  });

// Someone challenged you to a 1v1 match (fired on the opponent).
const notifyChallengeReceived = ({ challengeId, recipientId, challengerId, challengerName, sport, venue }) =>
  notify({
    recipient: recipientId,
    actor: challengerId,
    type: NOTIFICATION_TYPES.CHALLENGE_RECEIVED,
    title: `${challengerName} challenged you ⚔️`,
    body: `${sport}${venue ? ` at ${venue}` : ''} — open your dashboard to accept or decline.`,
    link: '/player/dashboard',
    data: { challengeId },
  });

// Challenge state changed — fired to the OTHER player whenever the
// challenger/opponent accepts, declines, cancels or reports a result.
const notifyChallengeUpdate = ({ challengeId, recipientId, actorId, actorName, sport, action }) => {
  const lines = {
    accepted: `${actorName} accepted your ${sport} challenge 🔥`,
    declined: `${actorName} declined your ${sport} challenge`,
    cancelled: `${actorName} cancelled their ${sport} challenge`,
    completed: `Result posted for the ${sport} challenge vs ${actorName} 🏁`,
  };
  return notify({
    recipient: recipientId,
    actor: actorId,
    type: NOTIFICATION_TYPES.CHALLENGE_UPDATE,
    title: lines[action] || `Challenge update — ${action}`,
    body: 'Open your dashboard for details.',
    link: '/player/dashboard',
    data: { challengeId, action },
  });
};

export {
  notify,
  notifyMany,
  getAdminIds,
  notifyGroupInvite,
  notifyNewMessage,
  notifyEventApproved,
  notifyEventRejected,
  notifyCoachApproved,
  notifyCoachRejected,
  notifyAdminsNewCoachApplication,
  notifyAdminsNewGroundSubmitted,
  notifySlotBooked,
  notifyEventTicketIssued,
  notifyEventCheckedIn,
  notifyNearbyGameRequest,
  notifyGameRequestJoined,
  notifyGameRequestJoinConfirmed,
  notifySquadReady,
  notifyVenueTrialClaimed,
  notifyVenueCheckedIn,
  notifyVenueInterestShown,
  notifyPoolBookingConfirmed,
  notifyChallengeReceived,
  notifyChallengeUpdate,
};
