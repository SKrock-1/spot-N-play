import asyncHandler from 'express-async-handler';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { getIO } from '../socket/io.js';

// ── Global Chat ──────────────────────────────────────────────────
//
// One singleton Conversation with type 'global' that every logged-in user
// can read and post in — no participants list to maintain (that's what
// used to leak the full user directory via the old "All" tab), no invites,
// no per-user membership bookkeeping. Anyone authenticated is a member.
// Created lazily on first use instead of a seed script, so it just works
// on any environment (local, staging, prod) without a migration step.
let cachedGlobalConversationId = null;

const getOrCreateGlobalConversation = async () => {
  if (cachedGlobalConversationId) {
    const existing = await Conversation.findById(cachedGlobalConversationId);
    if (existing) return existing;
  }
  let conversation = await Conversation.findOne({ type: 'global' });
  if (!conversation) {
    conversation = await Conversation.create({ type: 'global', participants: [] });
  }
  cachedGlobalConversationId = conversation._id.toString();
  return conversation;
};

const isConversationMember = (conversation, userId) => {
  if (conversation.type === 'global') return true; // everyone, always
  return conversation.participants.some((p) => p.toString() === userId.toString());
};

// Get or create direct conversation
const getOrCreateDirectConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (userId === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot chat with yourself');
  }

  let conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, userId] },
  })
    .populate('participants', 'name avatar role')
    .populate('lastMessage');

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'direct',
      participants: [req.user._id, userId],
    });
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar role')
      .populate('lastMessage');
  }

  res.json(conversation);
});

// Get or create group conversation
const getOrCreateGroupConversation = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId).populate('members', 'name avatar');
  if (!group) { res.status(404); throw new Error('Group not found'); }

  const isMember = group.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  ) || group.createdBy.toString() === req.user._id.toString();

  if (!isMember) { res.status(403); throw new Error('Not a group member'); }

  let conversation = await Conversation.findOne({ type: 'group', group: groupId })
    .populate('participants', 'name avatar role')
    .populate('lastMessage')
    .populate('group', 'name sport createdBy maxMembers isOpen');

  if (!conversation) {
    const memberIds = group.members.map((m) => m._id);
    const uniqueIds = [...new Set([group.createdBy.toString(), ...memberIds.map(id => id.toString())])];
    conversation = await Conversation.create({
      type: 'group',
      group: groupId,
      participants: uniqueIds,
    });
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar role')
      .populate('lastMessage')
      .populate('group', 'name sport createdBy maxMembers isOpen');
  }


    if (conversation) {
      const seen = new Set();
      const deduped = conversation.participants.filter(p => {
        const id = p._id?.toString() || p.toString();
        if (seen.has(id)) return false;
        seen.add(id); return true;
      });
      conversation.participants = deduped;
}

  res.json(conversation);
});

// Get all my conversations — the pinned Global Chat always comes first,
// followed by the user's own direct/group conversations, most recent first.
const getMyConversations = asyncHandler(async (req, res) => {
  const globalConversation = await getOrCreateGlobalConversation();
  const populatedGlobal = await Conversation.findById(globalConversation._id)
    .populate('lastMessage');

  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate('participants', 'name avatar role')
    .populate('lastMessage')
    .populate('group', 'name sport createdBy maxMembers isOpen')
    .sort({ lastMessageAt: -1 });

  res.json([populatedGlobal, ...conversations]);
});

// Get messages for a conversation
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = 50;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) { res.status(404); throw new Error('Conversation not found'); }

  if (!isConversationMember(conversation, req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: req.user._id }, // hide messages this user deleted "for me"
  })
    .populate('sender', 'name avatar role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Mark as read
  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  // Reset unread count
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCount.${req.user._id}`]: 0 },
  });

  res.json(messages.reverse());
});

// Send message (REST fallback)
const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) { res.status(404); throw new Error('Conversation not found'); }

  if (!isConversationMember(conversation, req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Block check for direct conversations
  if (conversation.type === 'direct') {
    const otherUserId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );
    if (otherUserId) {
      const [me, other] = await Promise.all([
        User.findById(req.user._id),
        User.findById(otherUserId),
      ]);
      const iBlocked = me?.blockedUsers?.some(id => id.toString() === otherUserId.toString());
      const theyBlocked = other?.blockedUsers?.some(id => id.toString() === req.user._id.toString());
      if (iBlocked || theyBlocked) {
        res.status(403);
        throw new Error('Cannot send message. User is blocked.');
      }
    }
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user._id,
    text,
    readBy: [req.user._id],
  });

  const populated = await Message.findById(message._id)
    .populate('sender', 'name avatar role');

  // Update conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
  });

  // Increment unread for others (no-op for the global room — it has no
  // fixed participant list, so there's nothing to track per-user unreads for)
  for (const participantId of conversation.participants) {
    if (participantId.toString() !== req.user._id.toString()) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $inc: { [`unreadCount.${participantId}`]: 1 },
      });
    }
  }

  res.json(populated);
});

// Delete a message — "for me" (hide only for the requester) or
// "for everyone" (sender only; replaces text + flags it for all participants).
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { forEveryone } = req.body;

  const message = await Message.findById(messageId);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  const conversation = await Conversation.findById(message.conversation);
  if (!conversation) { res.status(404); throw new Error('Conversation not found'); }

  if (!isConversationMember(conversation, req.user._id)) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const isSender = message.sender.toString() === req.user._id.toString();

  if (forEveryone) {
    if (!isSender) {
      res.status(403);
      throw new Error('Only the sender can delete this message for everyone');
    }
    message.deletedForEveryone = true;
    message.text = 'This message was deleted';
    await message.save();

    const io = getIO();
    if (io) {
      io.to(message.conversation.toString()).emit('message_deleted', {
        messageId: message._id,
        conversationId: message.conversation,
        forEveryone: true,
      });
    }
  } else {
    if (!message.deletedFor.some((id) => id.toString() === req.user._id.toString())) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }
  }

  res.json({ success: true, messageId: message._id, forEveryone: !!forEveryone });
});

export {
  getOrCreateDirectConversation,
  getOrCreateGroupConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  deleteMessage,
};
