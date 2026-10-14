import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'both'],
      default: 'local',
    },
    hasPassword: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['player', 'ground_owner', 'coach', 'gym_owner', 'pool_owner', 'admin'],
      default: 'player',
    },
    phone: { type: String, trim: true },
    hidePhoneNumber: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    lpuVerified: { type: Boolean, default: false },
    lpuEmail: { type: String, lowercase: true, trim: true, default: '' },
    lpuRegistrationNumber: { type: String, trim: true, default: '' },
    lpuVerifiedAt: { type: Date, default: null },
    lpuVerificationStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── extended profile fields (all roles) ──
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    dateOfBirth: { type: Date, default: null },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
    bio: { type: String, trim: true, default: '' },

    // ── streak ──
    loginStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: null },
    activeDays: [{ type: String }],   
    bookedDays: [{ type: String }],   

    // ── swimming pool bookings ──
    medicalCertificateUrl: { type: String, default: '' },
    poolRegistrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ground' }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
