import asyncHandler from 'express-async-handler';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import FitTransaction from '../models/FitTransaction.js';
import generateToken from '../utils/generateToken.js';
import { ensureReferralCode, creditUser, INVITE_SIGNUP_FITCOIN } from '../services/fitService.js';
import sendOTPEmail from '../utils/sendEmail.js';
import sendOTPSms from '../utils/sendSMS.js';

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const cleanEmail = email.toLowerCase().trim(); // ← add

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.deleteMany({ email: cleanEmail, channel: 'email' });
  await OTP.create({
  email: cleanEmail,
  channel: 'email',
  otp,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  await sendOTPEmail(cleanEmail, otp);

  res.json({ message: 'OTP sent ✅' });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp, name, phone, password } = req.body;

  console.log('Verify attempt:', { email, otp, type: typeof otp });

  // String convert karo dono ko
  const otpRecord = await OTP.findOne({ 
    email: email.toLowerCase().trim(),
    channel: 'email',
  });

  console.log('DB record:', otpRecord?.otp, 'Received:', otp);

  if (!otpRecord) {
    res.status(400);
    throw new Error('OTP expired or not found. Please request a new one.');
  }

  // String comparison
  if (String(otpRecord.otp).trim() !== String(otp).trim()) {
    res.status(400);
    throw new Error('Invalid OTP. Please check and try again.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ email });
    res.status(400);
    throw new Error('OTP expired. Please request a new one.');
  }

  await OTP.deleteOne({ email });

  let user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    user = await User.create({
      name: name || 'Player',
      email: email.toLowerCase().trim(),
      password: password || Math.random().toString(36),
      phone: phone || '',
      isEmailVerified: true,
    });
    // Invite & Earn also works through the OTP signup path — same welcome
    // bonus + inviter linkage as the password path (see authController).
    const ref = String(req.body.referralCode || '').trim().toUpperCase();
    if (ref) {
      const inviter = await User.findOne({ referralCode: ref }).select('_id name');
      if (inviter && String(inviter._id) !== String(user._id)) {
        user.referredBy = inviter._id;
        await user.save();
        await creditUser({
          userId: user._id,
          type: 'earn_welcome',
          fitcoin: INVITE_SIGNUP_FITCOIN,
          fitPoints: INVITE_SIGNUP_FITCOIN,
          relatedUser: inviter._id,
          note: 'Welcome bonus for using an invite code',
        });
        await FitTransaction.create({
          user: inviter._id,
          type: 'earn_invite_signup',
          fitcoin: 0,
          fitPoints: 0,
          relatedUser: user._id,
          note: `${user.name} joined with your code`,
        });
      }
    }
    await ensureReferralCode(user);
  } else if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar || '',
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    lpuVerified: user.lpuVerified,
    lpuVerificationStatus: user.lpuVerificationStatus,
    token: generateToken(user._id, user.role),
  });
});

const checkUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  res.json({ exists: !!user });
});

// ── Phone verification (requires an authenticated user — used right after
// signup and from Profile Settings for any existing account) ──

const sendPhoneOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.trim().length < 8) {
    res.status(400);
    throw new Error('A valid phone number is required');
  }

  const cleanPhone = phone.trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.deleteMany({ phone: cleanPhone, channel: 'phone' });
  await OTP.create({
    phone: cleanPhone,
    channel: 'phone',
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  await sendOTPSms(cleanPhone, otp);

  res.json({ message: 'OTP sent to your phone ✅' });
});

const verifyPhoneOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    res.status(400);
    throw new Error('Phone number and OTP are required');
  }

  const cleanPhone = phone.trim();
  const otpRecord = await OTP.findOne({ phone: cleanPhone, channel: 'phone' });

  if (!otpRecord) {
    res.status(400);
    throw new Error('OTP expired or not found. Please request a new one.');
  }

  if (String(otpRecord.otp).trim() !== String(otp).trim()) {
    res.status(400);
    throw new Error('Invalid OTP. Please check and try again.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ phone: cleanPhone, channel: 'phone' });
    res.status(400);
    throw new Error('OTP expired. Please request a new one.');
  }

  await OTP.deleteOne({ phone: cleanPhone, channel: 'phone' });

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  user.phone = cleanPhone;
  user.isPhoneVerified = true;
  await user.save();

  res.json({
    message: 'Phone number verified ✅',
    phone: user.phone,
    isPhoneVerified: user.isPhoneVerified,
  });
});

export { sendOTP, verifyOTP, checkUser, sendPhoneOTP, verifyPhoneOTP };

