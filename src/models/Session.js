const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const sessionSchema = new mongoose.Schema({
  session_id: {
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
  access_token: {
    type: String,
    required: true,
    unique: true
  },
  refresh_token: {
    type: String,
    required: true,
    unique: true
  },
  login_time: {
    type: Date,
    default: Date.now
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true,
    index: true
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  },
  device_id: {
    type: String,
    default: null
  },
  device_type: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  terminated_at: {
    type: Date,
    default: null
  },
  terminated_by: {
    type: String,
    default: null
  }
}, {
  collection: 'sessions',
  timestamps: false
});

// Instance method to check if session is expired
sessionSchema.methods.isExpired = function isExpired() {
  return new Date() > this.expires_at;
};

// Instance method to check if session is valid
sessionSchema.methods.isValid = function isValid() {
  return this.is_active && !this.isExpired() && !this.terminated_at;
};

// Instance method to update last activity
sessionSchema.methods.updateActivity = async function updateActivity() {
  this.last_activity = new Date();
  return this.save();
};

// Instance method to terminate session
sessionSchema.methods.terminate = async function terminate(terminatedBy = null) {
  this.is_active = false;
  this.terminated_at = new Date();
  this.terminated_by = terminatedBy;
  return this.save();
};

attachCommon(sessionSchema);

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
