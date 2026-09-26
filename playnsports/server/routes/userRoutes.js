import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  muteConversation,
  unmuteConversation,
  getMutedConversations,
  updateMyProfile,
  getMyStreak,
  getPublicProfile,
} from '../controllers/userController.js';

const router = express.Router();

router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);
router.post('/mute/:id', protect, muteConversation);
router.post('/unmute/:id', protect, unmuteConversation);
router.get('/muted', protect, getMutedConversations);
router.patch('/profile', protect, updateMyProfile);
router.get('/streak', protect, getMyStreak);

// Public profile — must come after named routes to avoid /:id swallowing them
router.get('/:id/profile', protect, getPublicProfile);

export default router;
