import express from 'express';
import {
  createMatch,
  getMyMatches,
  getMatchById,
  endMatch,
} from '../controllers/match.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';


const router = express.Router();

router.post('/create', verifyToken, createMatch);
router.get('/my-matches', verifyToken, getMyMatches);
router.get('/:matchId', verifyToken, getMatchById);
router.patch('/:matchId/end', verifyToken, endMatch);

export default router;
