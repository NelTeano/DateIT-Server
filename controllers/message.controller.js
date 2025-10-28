import Message from '../models/Message.js';
import Match from '../models/Match.js';

/**
 * Send a message
 */
export const sendMessage = async (req, res) => {
  try {
    const { matchId, content, receiverId } = req.body;
    const senderId = req.user.id;

    // Validate match exists and is active
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    if (match.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message. Match has ended.',
      });
    }

    // Verify sender is part of the match
    const isPartOfMatch =
      match.user1.toString() === senderId ||
      match.user2.toString() === senderId;

    if (!isPartOfMatch) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access',
      });
    }

    // Create new message
    const newMessage = new Message({
      matchId,
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
    });

    await newMessage.save();

    // Populate sender info for the response
    await newMessage.populate('sender', 'name profilePicture');

    // Emit socket event to the match room
    const io = req.app.get('io');
    io.to(matchId).emit('message:received', newMessage);

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
    });
  }
};

/**
 * Get all messages for a match
 */
export const getMessagesByMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Verify match exists and user is part of it
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    const isPartOfMatch =
      match.user1.toString() === userId ||
      match.user2.toString() === userId;

    if (!isPartOfMatch) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access',
      });
    }

    // Fetch messages with pagination
    const messages = await Message.find({ matchId })
      .populate('sender', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments({ matchId });

    res.json({
      success: true,
      messages: messages.reverse(),
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: page,
      totalMessages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
    });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    // Update all unread messages where user is the receiver
    const result = await Message.updateMany(
      {
        matchId,
        receiver: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadMessageCount = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const unreadCount = await Message.countDocuments({
      matchId,
      receiver: userId,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
    });
  }
};