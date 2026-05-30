import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Admin from '../models/adminSchema.js';
import Employee from '../models/employeeSchema.js';
import { sendResetPasswordEmail, sendResetPasswordSuccessEmail } from '../services/emailService.js';
import { generateTokens } from '../utils/tokenutils.js';

const isProduction = process.env.NODE_ENV === 'production';
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Login User
export const login = async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginId = (identifier || email || '').trim();

  try {
    if (!loginId) {
      return res.status(400).json({ message: 'Email or employee ID is required' });
    }

    const isEmail = loginId.includes('@');
    const normalizedEmployeeCode = loginId.toUpperCase();

    // Admins log in with email only
    const adminUser = isEmail ? await Admin.findOne({ email: loginId }) : null;

    // Employees can log in with email or employeeCode
    const employeeUser = isEmail
      ? await Employee.findOne({ email: loginId })
      : await Employee.findOne({ employeeCode: normalizedEmployeeCode });

    const user = employeeUser || adminUser;
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Set Refresh Token in an HTTP-only cookie
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    // Return user details along with tokens
    res.status(200).json({
      message: 'Login successful',
      role: user.role,
      _id: user._id,
      email: user.email,
      employeeCode: user.employeeCode,
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

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.clearCookie('refreshToken'); // Clear expired/invalid token
    res.status(403).json({ message: 'Invalid or expired Refresh Token', error: err.message });
  }
};
// Logout
export const logout = (req, res) => {
  try {
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: refreshTokenCookieOptions.httpOnly,
      secure: refreshTokenCookieOptions.secure,
      sameSite: refreshTokenCookieOptions.sameSite,
    });

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
    if (!user) return res.status(404).json({ message: 'User not found' });

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

    return res.status(200).json({ message: 'Email sent. Please verify your OTP.' });
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
