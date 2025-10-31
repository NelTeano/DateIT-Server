import express from 'express';
import {
  createMatch,
  getMyMatches,
  getMatchById,
  endMatch,
  getPendingRequests,
  acceptMatchRequest,
  rejectMatchRequest
} from '../controllers/match.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';


const router = express.Router();

router.post('/create', verifyToken, createMatch);
router.get('/my-matches', verifyToken, getMyMatches);
router.get('/pending-requests', verifyToken, getPendingRequests);
router.get('/:matchId', verifyToken, getMatchById);
router.post('/accept/:matchId', verifyToken, acceptMatchRequest);
router.delete('/reject/:matchId', verifyToken, rejectMatchRequest);
router.patch('/:matchId/end', verifyToken, endMatch);

export default router;
