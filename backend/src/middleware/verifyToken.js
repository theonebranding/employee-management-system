import jwt from 'jsonwebtoken';
import Session from '../models/sessionSchema.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SESSION_IDLE_TIMEOUT_MS =
  parsePositiveInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 60 * 24 * 30) * 60 * 1000;

const isSessionIdle = (session) => {
  if (!session?.lastSeenAt) return false;
  return Date.now() - new Date(session.lastSeenAt).getTime() > SESSION_IDLE_TIMEOUT_MS;
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied. Token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access Denied. Token missing' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const sessionId = verified.sid || verified.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: 'Access Denied. Session missing' });
    }

    let session;

    try {
      session = await Session.findOne({ _id: sessionId, userId: verified._id });
    } catch {
      return res.status(401).json({ message: 'Access Denied. Session invalid' });
    }

    if (!session || !session.isActive || session.revokedAt) {
      return res.status(401).json({ message: 'Access Denied. Session revoked' });
    }

    if (isSessionIdle(session)) {
      await Session.updateOne(
        { _id: session._id },
        { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
      );
      return res.status(401).json({ message: 'Access Denied. Session expired due to inactivity' });
    }

    Session.updateOne({ _id: session._id }, { lastSeenAt: new Date() }).catch(() => {});

    req.user = {
      ...verified,
      sid: verified.sid || String(session._id),
      sessionId: verified.sessionId || String(session._id),
    };
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid Token', error: err.message });
  }
};

export default verifyToken;
