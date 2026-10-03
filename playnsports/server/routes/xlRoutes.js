import express from 'express';
import { getXlInfo, createMembershipOrder, verifyMembershipPayment } from '../controllers/xlArenaController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Arena info (plans + my membership) — any logged-in user can view.
router.get('/:groundId/info', protect, getXlInfo);
// Membership purchase — players only, full payment via Razorpay.
router.post('/:groundId/membership/order', protect, authorizeRoles('player'), createMembershipOrder);
router.post('/:groundId/membership/verify', protect, authorizeRoles('player'), verifyMembershipPayment);

export default router;
