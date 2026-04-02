import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Admin from '../models/adminSchema.js';
import Employee from '../models/employeeSchema.js';
import Session from '../models/sessionSchema.js';
import {
  sendOtpEmail,
  sendRegistrationSuccessEmail,
  sendResetPasswordEmail,
  sendResetPasswordSuccessEmail,
} from '../services/emailService.js';
import { generateTokens } from '../utils/tokenutils.js';
import { ROLE_TEMPLATES } from '../constants/roleTemplates.js';

const isProduction = process.env.NODE_ENV === 'production';
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const refreshTokenCookieClearOptions = {
  httpOnly: refreshTokenCookieOptions.httpOnly,
  secure: refreshTokenCookieOptions.secure,
  sameSite: refreshTokenCookieOptions.sameSite,
  path: refreshTokenCookieOptions.path,
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SESSION_MAX_ACTIVE = parsePositiveInt(process.env.SESSION_MAX_ACTIVE, 5);
const SESSION_IDLE_TIMEOUT_MS =
  parsePositiveInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 60 * 24 * 30) * 60 * 1000;

const isSessionIdle = (session) => {
  if (!session?.lastSeenAt) return false;
  return Date.now() - new Date(session.lastSeenAt).getTime() > SESSION_IDLE_TIMEOUT_MS;
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', refreshTokenCookieClearOptions);
};

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const bindRefreshTokenToSession = async (sessionId, refreshToken) => {
  await Session.updateOne(
    { _id: sessionId },
    {
      refreshTokenHash: hashRefreshToken(refreshToken),
      refreshTokenRotatedAt: new Date(),
    }
  );
};

const revokeAllUserSessions = async (userId) => {
  await Session.updateMany(
    { userId, isActive: true },
    { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
  );
};

const resolveUserDeviceLabel = (req) => {
  const fallback = req.headers['user-agent'] || 'Unknown Device';
  return (req.headers['x-device-label'] || fallback).slice(0, 255);
};

const createSessionRecord = async (req, user, roleTemplate = '') => {
  const session = await Session.create({
    userId: user._id,
    email: user.email,
    role: user.role,
    roleTemplate,
    ipAddress: req.ip || req.socket?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    deviceLabel: resolveUserDeviceLabel(req),
    isActive: true,
    lastSeenAt: new Date(),
  });

  const overflowSessions = await Session.find({
    userId: user._id,
    isActive: true,
    revokedAt: null,
    _id: { $ne: session._id },
  })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .skip(Math.max(SESSION_MAX_ACTIVE - 1, 0))
    .select('_id')
    .lean();

  if (overflowSessions.length > 0) {
    await Session.updateMany(
      { _id: { $in: overflowSessions.map((item) => item._id) } },
      { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
    );
  }

  return session;
};

// Register User with OTP
export const register = async (req, res) => {
  let { name, phoneNumber, email, password, role, roleTemplate } = req.body;

  // Validate request
  if (!name || !phoneNumber || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Set default role to 'employee'
  if (!role) {
    role = 'employee';
  }

  if (!['admin', 'employee'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    // console.log('Generated OTP:', otp);
    const hashedOtp = await bcrypt.hash(otp, salt);
    const otpExpires = Date.now() + 15 * 60 * 1000; // OTP expires in 15 minutes

    let newUser;

    if (role === 'admin') {
      newUser = new Admin({
        email,
        password: hashedPassword,
        name,
        phoneNumber,
        roleTemplate: roleTemplate || ROLE_TEMPLATES.SUPER_ADMIN,
        otp: hashedOtp,
        otpExpires,
      });
    } else {
      newUser = new Employee({
        email,
        password: hashedPassword,
        name,
        phoneNumber,
        roleTemplate: roleTemplate || ROLE_TEMPLATES.EMPLOYEE,
        otp: hashedOtp,
        otpExpires,
      });
    }

    await newUser.save();

    // Send OTP via email
    await sendOtpEmail(email, 'Confirm Your Registration for The One Branding', `${otp}`);

    return res.status(201).json({ message: 'Email sent. Please verify your OTP.' });
  } catch (err) {
    console.error('Error details:', err); // Log full error
    res.status(500).json({ message: 'Error registering user!', error: err.message || err });
  }
};

// Confirm Registration with OTP
export const confirmRegistration = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const user = (await Admin.findOne({ email })) || (await Employee.findOne({ email }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if OTP is expired
    if (user.otpExpires < Date.now()) {
      // Delete user if OTP expires
      await (user.role === 'admin' ? Admin : Employee).deleteOne({ email });
      return res.status(400).json({ message: 'OTP has expired. Registration failed.' });
    }

    // Validate the entered OTP
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      // Delete user if OTP is invalid
      await (user.role === 'admin' ? Admin : Employee).deleteOne({ email });
      return res.status(400).json({ message: 'Invalid OTP. Registration failed.' });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true;
    await user.save();

    // Send confirmation email
    await sendRegistrationSuccessEmail(
      email,
      'Registration Confirmed for The One Branding',
      'Your registration has been confirmed. You can now log in.'
    );

    return res.status(200).json({ message: 'Registration confirmed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP', error: err });
  }
};

// Login User
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email in both Admin and Employee collections
    const user = (await Employee.findOne({ email })) || (await Admin.findOne({ email }));
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.mfaEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);
      const mfaSessionToken = crypto.randomBytes(32).toString('hex');

      user.mfaOtp = hashedOtp;
      user.mfaOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.mfaSessionToken = crypto.createHash('sha256').update(mfaSessionToken).digest('hex');
      await user.save();

      await sendOtpEmail(user.email, 'Your MFA verification code', otp);

      return res.status(200).json({
        message: 'MFA verification required',
        requiresMfa: true,
        email: user.email,
        mfaSessionToken,
      });
    }

    const session = await createSessionRecord(req, user, user.roleTemplate || '');
    // Generate tokens
    const { accessToken, refreshToken, roleTemplate, permissions } = await generateTokens(user, {
      sessionId: session._id,
    });
    await bindRefreshTokenToSession(session._id, refreshToken);

    // Set Refresh Token in an HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Return user details along with tokens
    res.status(200).json({
      message: 'Login successful',
      role: user.role,
      roleTemplate,
      permissions,
      sessionId: session._id,
      _id: user._id,
      email: user.email,
      token: accessToken,
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
};

// refresh access token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken)
      return res.status(401).json({ message: 'Unauthorized : Missing Refresh Token' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = (await Admin.findById(payload._id)) || (await Employee.findById(payload._id));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const sessionClaim = payload.sid || payload.sessionId || req.headers['x-session-id'];
    let session = null;

    if (sessionClaim) {
      session = await Session.findOne({
        _id: sessionClaim,
        userId: user._id,
        isActive: true,
        revokedAt: null,
      });

      if (!session) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session is invalid or revoked. Please login again.' });
      }

      if (isSessionIdle(session)) {
        await Session.updateOne(
          { _id: session._id },
          { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
        );
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session expired due to inactivity. Please login again.' });
      }

      const incomingRefreshHash = hashRefreshToken(refreshToken);
      if (!session.refreshTokenHash || session.refreshTokenHash !== incomingRefreshHash) {
        await Session.updateOne(
          { _id: session._id },
          { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
        );
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Refresh token reuse detected. Please login again.' });
      }
    } else {
      session = await createSessionRecord(req, user, user.roleTemplate || '');
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user, {
      sessionId: session._id,
    });
    await bindRefreshTokenToSession(session._id, newRefreshToken);

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    clearRefreshTokenCookie(res); // Clear expired/invalid token
    res.status(403).json({ message: 'Invalid or expired Refresh Token', error: err.message });
  }
};
// Logout
export const logout = async (req, res) => {
  try {
    const sessionId = req.user?.sid || req.user?.sessionId || req.headers['x-session-id'];
    if (sessionId) {
      await Session.findOneAndUpdate(
        { _id: sessionId, userId: req.user?._id },
        { isActive: false, revokedAt: new Date(), refreshTokenHash: null }
      );
    }

    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error logging out', error: err.message });
  }
};

// Reset Password with OTP
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = (await Admin.findOne({ email })) || (await Employee.findOne({ email }));
    if (!user) return res.status(200).json({ message: 'If the account exists, an OTP has been sent.' });

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.otp = hashedOtp;
    user.otpExpires = Date.now() + 15 * 60 * 1000; // OTP expires in 15 minutes
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    // Send OTP via email
    await sendResetPasswordEmail(email, 'Reset Your Password for The One Branding', `${otp}`);

    return res.status(200).json({ message: 'If the account exists, an OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err });
  }
};

// Verify OTP for Password Reset
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const user = (await Admin.findOne({ email })) || (await Employee.findOne({ email }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if OTP is expired
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Validate the entered OTP
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpires = null;
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return res.status(200).json({ message: 'OTP verified successfully', resetToken });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP', error: err });
  }
};

// Set New Password After OTP Verification
export const resetPassword = async (req, res) => {
  const { email, password, resetToken } = req.body;

  if (!email || !password || !resetToken) {
    return res.status(400).json({ message: 'Email, password and reset token are required' });
  }

  try {
    const user = (await Admin.findOne({ email })) || (await Employee.findOne({ email }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    if (
      !user.resetPasswordToken ||
      !user.resetPasswordTokenExpires ||
      user.resetPasswordToken !== hashedResetToken ||
      user.resetPasswordTokenExpires < Date.now()
    ) {
      return res.status(403).json({
        message: 'Invalid or expired reset token. Please verify OTP again.',
      });
    }

    // Update the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    await revokeAllUserSessions(user._id);

    // Notify the user
    await sendResetPasswordSuccessEmail(
      email,
      'Password Changed Successfully for The One Branding',
      'Your password has been successfully changed. If this was not you, please contact support immediately.'
    );

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err });
  }
};

export const verifyMfaLogin = async (req, res) => {
  const { email, otp, mfaSessionToken } = req.body;

  if (!email || !otp || !mfaSessionToken) {
    return res.status(400).json({ message: 'email, otp and mfaSessionToken are required' });
  }

  try {
    const user = (await Admin.findOne({ email })) || (await Employee.findOne({ email }));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedMfaSessionToken = crypto.createHash('sha256').update(mfaSessionToken).digest('hex');
    if (
      !user.mfaSessionToken ||
      !user.mfaOtp ||
      !user.mfaOtpExpires ||
      user.mfaSessionToken !== hashedMfaSessionToken ||
      user.mfaOtpExpires < Date.now()
    ) {
      return res.status(403).json({ message: 'Invalid or expired MFA session' });
    }

    const isOtpValid = await bcrypt.compare(otp, user.mfaOtp);
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid MFA OTP' });
    }

    user.mfaOtp = null;
    user.mfaOtpExpires = null;
    user.mfaSessionToken = null;
    await user.save();

    const session = await createSessionRecord(req, user, user.roleTemplate || '');
    const { accessToken, refreshToken, roleTemplate, permissions } = await generateTokens(user, {
      sessionId: session._id,
    });
    await bindRefreshTokenToSession(session._id, refreshToken);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful',
      role: user.role,
      roleTemplate,
      permissions,
      sessionId: session._id,
      _id: user._id,
      email: user.email,
      token: accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error verifying MFA login', error: error.message });
  }
};

export const updateMfaPreference = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be boolean' });
    }

    const user = (await Admin.findById(req.user._id)) || (await Employee.findById(req.user._id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.mfaEnabled = enabled;
    if (!enabled) {
      user.mfaOtp = null;
      user.mfaOtpExpires = null;
      user.mfaSessionToken = null;
    }
    await user.save();

    return res.status(200).json({ message: 'MFA preference updated successfully', mfaEnabled: user.mfaEnabled });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating MFA preference', error: error.message });
  }
};
