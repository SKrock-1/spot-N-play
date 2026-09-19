import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sport: {
      type: String,
      enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'hockey', 'kabaddi', 'kho kho', 'pickleball', 'table tennis', 'squash', 'handball', 'futsal', 'rugby', 'athletics', 'wrestling', 'weightlifting', 'yoga', 'skating', 'chess', 'carrom', 'archery', 'shooting', 'cycling', 'box cricket', 'box football', 'esports', 'other'],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitations: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined'],
          default: 'pending',
        },
      },
    ],
    maxMembers: {
      type: Number,
      default: 10,
    },
    joiningDeadline: {
      type: Date,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

groupSchema.index({ location: '2dsphere' });

export default mongoose.model('Group', groupSchema);