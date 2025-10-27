import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import {
  sendMessage,
  getMessagesByMatch,
  markMessagesAsRead,
  getUnreadMessageCount,
} from '../controllers/message.controller.js';

const router = express.Router();

router.post('/send', authMiddleware, sendMessage);
router.get('/:matchId', authMiddleware, getMessagesByMatch);
router.patch('/:matchId/read', authMiddleware, markMessagesAsRead);
router.get('/:matchId/unread-count', authMiddleware, getUnreadMessageCount);

export default router;
