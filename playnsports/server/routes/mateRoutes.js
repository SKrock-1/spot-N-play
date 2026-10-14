import express from 'express';
import { getMates, sendMateRequest, acceptMateRequest, declineMateRequest, cancelMateRequest, removeMate, getMateStatus } from '../controllers/mateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/', getMates);
router.get('/status/:userId', getMateStatus);
router.post('/request/:userId', sendMateRequest);
router.post('/accept/:requestId', acceptMateRequest);
router.post('/decline/:requestId', declineMateRequest);
router.post('/cancel/:requestId', cancelMateRequest);
router.delete('/:userId', removeMate);

export default router;
