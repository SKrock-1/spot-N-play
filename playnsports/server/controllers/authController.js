import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import generateToken from '../utils/generateToken.js';
import { updateStreak } from '../utils/updateStreak.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide all required fields (name, email, password)');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password is too short. It must be at least 6 characters long.');
  }

  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Role is intentionally never taken from the request — every signup is a
  // 'player' by default (schema default). Coach / ground_owner / gym_owner /
  // pool_owner is granted later by an admin via PATCH /admin/users/:id/role,
  // so this can't be used to self-assign a privileged role.
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password,
    phone,
    hasPassword: true,
    authProvider: 'local',
  });
  await updateStreak(user);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    lpuVerified: user.lpuVerified,
    lpuVerificationStatus: user.lpuVerificationStatus,
    hasPassword: user.hasPassword,
    authProvider: user.authProvider,
    token: generateToken(user._id, user.role),
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error('Invalid email or password');
  }

  await updateStreak(user);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    lpuVerified: user.lpuVerified,
    lpuVerificationStatus: user.lpuVerificationStatus,
    loginStreak: user.loginStreak,
    hasPassword: user.hasPassword !== false,
    authProvider: user.authProvider || 'local',
    token: generateToken(user._id, user.role),
  });
});

const getMe = asyncHandler(async (req, res) => {
  let user = await User.findById(req.user._id).select('-password');
  if (user) {
    user = await updateStreak(user);
  }
  res.json(user);
});

// ── Forgot Password: Step 1 (Send OTP to Email) ──
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Please provide your email address');
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email address');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.deleteMany({ email: cleanEmail, channel: 'password_reset' });
  await OTP.create({
    email: cleanEmail,
    channel: 'password_reset',
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
  });

  try {
    await sendPasswordResetEmail(cleanEmail, otp, user.name);
  } catch (emailErr) {
    console.error('Password reset email error:', emailErr.message);
  }

  res.json({ message: 'Password reset code sent to your email ✅' });
});

// ── Reset Password: Step 2 (Verify OTP and set new password) ──
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error('Email, verification code, and new password are all required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const cleanEmail = email.toLowerCase().trim();
  const otpRecord = await OTP.findOne({
    email: cleanEmail,
    channel: 'password_reset',
  });

  if (!otpRecord) {
    res.status(400);
    throw new Error('Reset code expired or not found. Please request a new one.');
  }

  if (String(otpRecord.otp).trim() !== String(otp).trim()) {
    res.status(400);
    throw new Error('Invalid verification code. Please check and try again.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    res.status(400);
    throw new Error('Reset code has expired. Please request a new one.');
  }

  await OTP.deleteOne({ _id: otpRecord._id });

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.password = newPassword;
  user.hasPassword = true;
  if (user.authProvider === 'google') {
    user.authProvider = 'both';
  }
  await user.save();

  res.json({ message: 'Password reset successfully ✅ You can now sign in with your new password.' });
});

// ── Google User: Setup initial password (authenticated via JWT) ──
const setupPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.password = password;
  user.hasPassword = true;
  if (user.authProvider === 'google') {
    user.authProvider = 'both';
  }
  await user.save();

  res.json({
    message: 'Password created successfully ✅',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      hasPassword: true,
      authProvider: user.authProvider,
    },
  });
});

// ── Dashboard / Settings: Change password (authenticated via JWT) ──
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // If user already has a recognized password, enforce checking currentPassword
  if (user.hasPassword) {
    if (!currentPassword) {
      res.status(400);
      throw new Error('Please enter your current password');
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }
  }

  user.password = newPassword;
  user.hasPassword = true;
  if (user.authProvider === 'google') {
    user.authProvider = 'both';
  }
  await user.save();

  res.json({ message: 'Password updated successfully ✅' });
});

export {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
  setupPassword,
  changePassword,
};
