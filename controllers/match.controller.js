import Match from '../models/match.model.js';

/**
 * Create a new match
 */
export const createMatch = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    const existingMatch = await Match.findOne({
      $or: [
        { user1: currentUserId, user2: targetUserId },
        { user1: targetUserId, user2: currentUserId },
      ],
    });

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: 'Match already exists',
        matchId: existingMatch._id,
      });
    }

    const newMatch = new Match({
      user1: currentUserId,
      user2: targetUserId,
      status: 'active',
    });

    await newMatch.save();

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      match: newMatch,
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ success: false, message: 'Error creating match' });
  }
};

/**
 * Get all active matches for a user
 */
export const getMyMatches = async (req, res) => {
  try {
    const userId = req.user.id;

    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active',
    })
      .populate('user1', 'name profilePicture')
      .populate('user2', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      matches,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ success: false, message: 'Error fetching matches' });
  }
};

/**
 * Get specific match details
 */
export const getMatchById = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = await Match.findById(matchId)
      .populate('user1', 'name profilePicture')
      .populate('user2', 'name profilePicture');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (
      match.user1._id.toString() !== userId &&
      match.user2._id.toString() !== userId
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    res.json({
      success: true,
      match,
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ success: false, message: 'Error fetching match' });
  }
};

/**
 * End a match
 */
export const endMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (match.status === 'ended') {
      return res.status(400).json({ success: false, message: 'Match already ended' });
    }

    match.status = 'ended';
    match.endedBy = userId;
    match.endedAt = new Date();
    await match.save();


    res.json({
      success: true,
      message: 'Match ended successfully',
      match,
    });
  } catch (error) {
    console.error('Error ending match:', error);
    res.status(500).json({ success: false, message: 'Error ending match' });
  }
};


export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all pending matches where the current user is user2
    // (meaning someone else liked them first)
    const pendingRequests = await Match.find({
      user2: userId,
      status: 'pending'
    })
      .populate('user1', 'name photoUrl age bio gender')
      .populate('user2', 'name photoUrl age bio gender')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      pendingRequests,
      count: pendingRequests.length
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending requests' 
    });
  }
};

/**
 * Accept a pending match request
 */
export const acceptMatchRequest = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = await Match.findById(matchId)
      .populate('user1', 'name photoUrl')
      .populate('user2', 'name photoUrl');

    if (!match) {
      return res.status(404).json({ 
        success: false, 
        message: 'Match request not found' 
      });
    }

    // Verify that the current user is user2 (the one being liked)
    if (match.user2._id.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    if (match.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Match request is not pending' 
      });
    }

    // Update match to active
    match.status = 'active';
    await match.save();

    // Emit socket event if you have socket.io set up
    // const io = req.app.get('io');
    // io.to(match.user1._id.toString()).emit('match:accepted', {
    //   matchId: match._id,
    //   user: match.user2
    // });

    res.json({
      success: true,
      message: 'Match accepted successfully',
      match
    });
  } catch (error) {
    console.error('Error accepting match request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error accepting match request' 
    });
  }
};

/**
 * Reject a pending match request
 */
export const rejectMatchRequest = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ 
        success: false, 
        message: 'Match request not found' 
      });
    }

    // Verify that the current user is user2
    if (match.user2.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access' 
      });
    }

    if (match.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Match request is not pending' 
      });
    }

    // Delete the match request
    await Match.findByIdAndDelete(matchId);

    res.json({
      success: true,
      message: 'Match request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting match request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error rejecting match request' 
    });
  }
};