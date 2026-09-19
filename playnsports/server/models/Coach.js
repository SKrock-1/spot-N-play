import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  hidePhoneNumber: { type: Boolean, default: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: 'India' },
  sport: { 
    type: String, 
    enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football', 'esports', 'other'],
    required: true 
  },
  experience: { type: Number, required: true },
  coachingLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'professional'],
    required: true 
  },
  certifications: { type: String, default: '' },
  bio: { type: String, default: '' },
  hourlyRate: { type: Number, default: 0 },
  avatar: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Coach', coachSchema);