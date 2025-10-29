import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  sendMessage,
  getMessagesByMatch,
  markMessagesAsRead,
  getUnreadMessageCount,
} from '../controllers/message.controller.js';

const router = express.Router();

router.post('/send', verifyToken, sendMessage);
router.get('/:matchId', verifyToken, getMessagesByMatch);
router.patch('/:matchId/read', verifyToken, markMessagesAsRead);
router.get('/:matchId/unread-count', verifyToken, getUnreadMessageCount);

export default router;
