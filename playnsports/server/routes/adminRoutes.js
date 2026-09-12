import express from 'express';
import {
  getAllCoaches, approveCoach, rejectCoach, getDashboardStats,
  getPendingGrounds, approveGround, rejectGround,
  getPendingSocialBookings, approveSocialBooking, rejectSocialBooking,
  getAllUsers, toggleUserActive, updateUserRole, getAllBookings,
  getEventsForAdmin, approveEvent, rejectEvent,
  getAllContactMessages, markContactMessageRead,
  setVenueCommission, setVenueMode, deleteVenue, assignVenueOwner,
} from '../controllers/adminController.js';
import {
  createCareer,
  createFaq,
  deleteFaq,
  getAdminCareers,
  getAdminCollaborations,
  getAdminFaqs,
  updateCareer,
  updateCareerApplicationStatus,
  updateCollaborationStatus,
  updateFaq,
  updateSettings,
} from '../controllers/siteController.js';
import {
  approveChallenge,
  getChallengesForAdmin,
  rejectChallenge,
} from '../controllers/challengeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const admin = [protect, authorizeRoles('admin')];

router.get('/stats', ...admin, getDashboardStats);

// Coaches
router.get('/coaches', ...admin, getAllCoaches);
router.patch('/coaches/:id/approve', ...admin, approveCoach);
router.patch('/coaches/:id/reject', ...admin, rejectCoach);

// Grounds approval
router.get('/grounds', ...admin, getPendingGrounds);
router.patch('/grounds/:id/approve', ...admin, approveGround);
router.patch('/grounds/:id/reject', ...admin, rejectGround);

// Social bookings
router.get('/social-bookings/pending', ...admin, getPendingSocialBookings);
router.patch('/social-bookings/:id/approve', ...admin, approveSocialBooking);
router.patch('/social-bookings/:id/reject', ...admin, rejectSocialBooking);

// Users
router.get('/users', ...admin, getAllUsers);
router.patch('/users/:id/toggle-active', ...admin, toggleUserActive);
router.patch('/users/:id/role', ...admin, updateUserRole);

// Bookings
router.get('/bookings', ...admin, getAllBookings);

// Venue commission split & trial→live switch
router.patch('/grounds/:id/commission', ...admin, setVenueCommission);
router.patch('/grounds/:id/venue-mode', ...admin, setVenueMode);
router.patch('/grounds/:id/owner', ...admin, assignVenueOwner);
router.delete('/grounds/:id', ...admin, deleteVenue);

// Events approval
router.get('/events', ...admin, getEventsForAdmin);
router.patch('/events/:id/approve', ...admin, approveEvent);
router.patch('/events/:id/reject', ...admin, rejectEvent);

// Contact / "Get in touch" messages
router.get('/contact', ...admin, getAllContactMessages);
router.patch('/contact/:id/read', ...admin, markContactMessageRead);

// Site CMS
router.patch('/site/settings', ...admin, updateSettings);
router.get('/site/faqs', ...admin, getAdminFaqs);
router.post('/site/faqs', ...admin, createFaq);
router.patch('/site/faqs/:id', ...admin, updateFaq);
router.delete('/site/faqs/:id', ...admin, deleteFaq);
router.get('/site/careers', ...admin, getAdminCareers);
router.post('/site/careers', ...admin, createCareer);
router.patch('/site/careers/:id', ...admin, updateCareer);
router.patch('/site/career-applications/:id', ...admin, updateCareerApplicationStatus);
router.get('/site/collaborations', ...admin, getAdminCollaborations);
router.patch('/site/collaborations/:id', ...admin, updateCollaborationStatus);

// Challenge moderation
router.get('/challenges', ...admin, getChallengesForAdmin);
router.patch('/challenges/:id/approve', ...admin, approveChallenge);
router.patch('/challenges/:id/reject', ...admin, rejectChallenge);

export default router;
