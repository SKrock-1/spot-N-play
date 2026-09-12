import express from 'express';
import {
  getPoolConfig,
  addPool, updatePool, removePool,
  addWeeklyBlock, updateWeeklyBlock, removeWeeklyBlock,
  startOverrideDay, revertOverrideDay,
  addOverrideBlock, updateOverrideBlock, removeOverrideBlock,
  addPlanType, updatePlanType, removePlanType,
  addCategory, updateCategory, removeCategory,
  updateVenueFees,
} from '../controllers/poolConfigController.js';
import {
  getPoolAvailability, getPoolPlans, createPoolOrder, verifyPoolPayment, dummyVerifyPoolPayment, adminCancelPoolBooking,
  getMyPoolQrs, getPoolOwnerBookings, checkinPoolBooking,
} from '../controllers/poolBookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Role check only gets you in the door — admins are allowed here so they
// can manage ANY pool venue, but which specific venue each request is
// actually allowed to touch is decided inside the controller (owner-or-admin
// check per venue), not here.
const canManage = [protect, authorizeRoles('pool_owner', 'admin')];
const canBook = [protect, authorizeRoles('player')];

// ── Owner/admin: schedule config ────────────────────────────────────────
router.get('/:groundId', ...canManage, getPoolConfig);

router.post('/:groundId/pools', ...canManage, addPool);
router.put('/:groundId/pools/:poolId', ...canManage, updatePool);
router.delete('/:groundId/pools/:poolId', ...canManage, removePool);

router.post('/:groundId/pools/:poolId/weekly', ...canManage, addWeeklyBlock);
router.put('/:groundId/pools/:poolId/weekly/:blockId', ...canManage, updateWeeklyBlock);
router.delete('/:groundId/pools/:poolId/weekly/:blockId', ...canManage, removeWeeklyBlock);

router.post('/:groundId/pools/:poolId/override/:date/start', ...canManage, startOverrideDay);
router.post('/:groundId/pools/:poolId/override/:date/revert', ...canManage, revertOverrideDay);
router.post('/:groundId/pools/:poolId/override/:date/blocks', ...canManage, addOverrideBlock);
router.put('/:groundId/pools/:poolId/override/:date/blocks/:blockId', ...canManage, updateOverrideBlock);
router.delete('/:groundId/pools/:poolId/override/:date/blocks/:blockId', ...canManage, removeOverrideBlock);

// ── Owner/admin: membership plans + fees ────────────────────────────────
router.post('/:groundId/plans', ...canManage, addPlanType);
router.put('/:groundId/plans/:planId', ...canManage, updatePlanType);
router.delete('/:groundId/plans/:planId', ...canManage, removePlanType);
router.post('/:groundId/plans/:planId/categories', ...canManage, addCategory);
router.put('/:groundId/plans/:planId/categories/:categoryId', ...canManage, updateCategory);
router.delete('/:groundId/plans/:planId/categories/:categoryId', ...canManage, removeCategory);
router.put('/:groundId/fees', ...canManage, updateVenueFees);

// ── Player: browse + book + my QR tickets ───────────────────────────────
router.get('/my/qrs', protect, authorizeRoles('player'), getMyPoolQrs);
router.get('/:groundId/availability', protect, getPoolAvailability);
router.get('/:groundId/checkout-info', protect, getPoolPlans);
router.post('/:groundId/order', ...canBook, createPoolOrder);
router.post('/:groundId/verify', ...canBook, verifyPoolPayment);
router.post('/:groundId/dummy-verify', ...canBook, dummyVerifyPoolPayment);
router.get('/:groundId/bookings', protect, authorizeRoles('pool_owner', 'admin'), getPoolOwnerBookings);
router.post('/:groundId/bookings/checkin', protect, authorizeRoles('pool_owner', 'admin'), checkinPoolBooking);

// ── Admin only: the "contact admin" cancellation/refund path ───────────
router.patch('/:groundId/bookings/:bookingId/admin-cancel', protect, authorizeRoles('admin'), adminCancelPoolBooking);

export default router;
