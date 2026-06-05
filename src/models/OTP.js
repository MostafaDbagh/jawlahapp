const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const otpSchema = new mongoose.Schema({
  otp_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    default: null,
    index: true
  },
  phone: {
    type: String,
    default: null,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['password_reset', 'email_verification', 'phone_verification', 'phone_login']
  },
  expires_at: {
    type: Date,
    required: true,
    index: true
  },
  is_used: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  collection: 'otps',
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Instance method to check if OTP is expired
otpSchema.methods.isExpired = function isExpired() {
  return new Date() > this.expires_at;
};

// Instance method to check if OTP is valid
otpSchema.methods.isValid = function isValid() {
  return !this.isExpired() && !this.is_used && this.attempts < 3;
};

attachCommon(otpSchema);

module.exports = mongoose.models.OTP || mongoose.model('OTP', otpSchema);
