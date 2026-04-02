import Session from '../models/sessionSchema.js';

export const listMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .select('-refreshTokenHash')
      .sort({ lastSeenAt: -1 })
      .limit(20);

    return res.status(200).json({ message: 'Sessions fetched successfully', sessions });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching sessions', error: error.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userId: req.user._id },
      { isActive: false, revokedAt: new Date(), refreshTokenHash: null },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json({ message: 'Session revoked successfully', session });
  } catch (error) {
    return res.status(500).json({ message: 'Error revoking session', error: error.message });
  }
};

export const listAllSessions = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive;

    const sessions = await Session.find(filters).sort({ createdAt: -1 }).limit(200);
    const safeSessions = sessions.map((session) => {
      const entry = session.toObject();
      delete entry.refreshTokenHash;
      return entry;
    });
    return res.status(200).json({ message: 'Session inventory fetched successfully', sessions: safeSessions });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching sessions', error: error.message });
  }
};
