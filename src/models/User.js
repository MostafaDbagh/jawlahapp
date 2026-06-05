const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { attachCommon } = require('./baseSchema');

const ACCOUNT_TYPES = [
  'CUSTOMER', 'DRIVER', 'SERVICE_PROVIDER_OWNER', 'SERVICE_PROVIDER_ADMIN',
  'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE'
];

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  full_name: {
    type: String,
    default: null
  },
  country_code: {
    type: String,
    required: true,
    maxlength: 5
  },
  phone_number: {
    type: String,
    required: true,
    maxlength: 15
  },
  date_of_birth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say', null],
    default: null
  },
  password_hash: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  profile_image: {
    type: String,
    default: null
  },
  account_type: {
    type: String,
    enum: ACCOUNT_TYPES,
    required: true,
    default: 'CUSTOMER'
  },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  email_verified: { type: Boolean, default: false },
  phone_verified: { type: Boolean, default: false },
  two_factor_enabled: { type: Boolean, default: false },
  two_factor_secret: { type: String, default: null },
  last_login: { type: Date, default: null },
  last_password_change: { type: Date, default: Date.now },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date, default: null },
  preferred_language: { type: String, default: 'ar' },
  timezone: { type: String, default: 'Asia/Dubai' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  fcm_token: { type: String, default: null }
}, {
  collection: 'users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

userSchema.index({ country_code: 1, phone_number: 1 }, { unique: true });

// Instance method to compare password
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  const hash = candidatePassword + this.salt;
  return bcrypt.compare(hash, this.password_hash);
};

// Instance method to set password (hashes once; controllers also hash on register)
userSchema.methods.setPassword = async function setPassword(newPassword) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(newPassword + salt, 12);
  this.salt = salt;
  this.password_hash = hash;
  this.last_password_change = new Date();
  return this.save();
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function getPublicProfile() {
  const { password_hash, salt, two_factor_secret, ...publicData } = this.toJSON();
  return publicData;
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function isLocked() {
  return !!(this.locked_until && new Date() < this.locked_until);
};

// Instance method to increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function incrementFailedAttempts() {
  this.failed_login_attempts += 1;

  // Lock account after 5 failed attempts for 30 minutes
  if (this.failed_login_attempts >= 5) {
    this.locked_until = new Date(Date.now() + 30 * 60 * 1000);
  }

  return this.save();
};

// Instance method to reset failed login attempts
userSchema.methods.resetFailedAttempts = async function resetFailedAttempts() {
  this.failed_login_attempts = 0;
  this.locked_until = null;
  return this.save();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function updateLastLogin() {
  this.last_login = new Date();
  return this.save();
};

attachCommon(userSchema);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
