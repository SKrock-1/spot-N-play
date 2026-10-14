import express from 'express';
import { getXlInfo, createMembershipOrder, verifyMembershipPayment, createArenaOrder, verifyArenaPayment } from '../controllers/xlArenaController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Arena info (plans + my membership) — any logged-in user can view.
router.get('/:groundId/info', protect, getXlInfo);
// Membership purchase — players only, full payment via Razorpay.
router.post('/:groundId/membership/order', protect, authorizeRoles('player'), createMembershipOrder);
router.post('/:groundId/membership/verify', protect, authorizeRoles('player'), verifyMembershipPayment);
// Arena turf booking (multi continuous slots, full/token payment).
router.post('/:groundId/arena-order', protect, authorizeRoles('player'), createArenaOrder);
router.post('/:groundId/arena-verify', protect, authorizeRoles('player'), verifyArenaPayment);

export default router;
