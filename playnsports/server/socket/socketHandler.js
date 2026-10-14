import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { notifyNewMessage } from '../services/notificationService.js';

const onlineUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Personal room — lets notificationService push to this user from
    // anywhere in the app (any page, not just an open conversation).
    socket.join(`user_${userId}`);

    // Shared room every connected client is in — used to broadcast
    // "Looking for Players" request events (create/join/full/cancel/expire)
    // to everyone live, the same way /players/all and /grounds/all are
    // fetched app-wide and filtered client-side rather than per-user rooms.
    socket.join('live-requests');

    // Per-venue rooms for pool check-in live updates — owner dashboard
    // subscribes to venue_<groundId> to get instant booking-updated events.
    socket.on('join_venue', (groundId) => {
      if (groundId) socket.join(`venue_${groundId}`);
    });

    console.log(`🟢 ${socket.user.name} connected (${socket.id})`);

    // Broadcast online status
    socket.broadcast.emit('user_online', { userId });

    // Send current online users to newly connected
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Join conversation rooms
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // The global room has no fixed participant list — every logged-in
        // socket (already authenticated above) is a member by definition.
        const isMember = conversation.type === 'global' || conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isMember) return;

        // Block check for direct conversations
        if (conversation.type === 'direct') {
          const otherUserId = conversation.participants.find(
            (p) => p.toString() !== userId
          );
          if (otherUserId) {
            const [me, other] = await Promise.all([
              User.findById(userId),
              User.findById(otherUserId),
            ]);
            const iBlocked = me?.blockedUsers?.some(id => id.toString() === otherUserId.toString());
            const theyBlocked = other?.blockedUsers?.some(id => id.toString() === userId);
            if (iBlocked || theyBlocked) {
              socket.emit('message_error', { error: 'Cannot send message. User is blocked.' });
              return;
            }
          }
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          text,
          readBy: [socket.user._id],
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'name avatar role');

        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        // Increment unread for offline participants
        for (const participantId of conversation.participants) {
          const pid = participantId.toString();
          if (pid !== userId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              $inc: { [`unreadCount.${pid}`]: 1 },
            });
          }
        }

        // Emit to all in room
        io.to(conversationId).emit('new_message', populated);

        // Notify participants not in room (ephemeral toast for active sessions)
        for (const participantId of conversation.participants) {
          const pid = participantId.toString();
          if (pid !== userId) {
            const participantSocketId = onlineUsers.get(pid);
            if (participantSocketId) {
              io.to(participantSocketId).emit('message_notification', {
                conversationId,
                message: populated,
                senderName: socket.user.name,
              });
            }
          }
        }

        // Persist a notification (bell/inbox) for every other participant
        for (const participantId of conversation.participants) {
          const pid = participantId.toString();
          if (pid !== userId) {
            notifyNewMessage({
              conversationId,
              recipientId: pid,
              senderId: userId,
              senderName: socket.user.name,
              preview: text,
            });
          }
        }
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', {
        userId,
        name: socket.user.name,
        conversationId,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(conversationId).emit('user_stopped_typing', {
        userId,
        conversationId,
      });
    });

    // Mark messages as read
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 },
        });
        socket.to(conversationId).emit('messages_read', { userId, conversationId });
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
      console.log(`🔴 ${socket.user.name} disconnected`);
    });
  });
};

export { socketHandler, onlineUsers };