const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const roleSchema = new mongoose.Schema({
  role_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  role_code: {
    type: String,
    required: true,
    unique: true
  },
  role_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  account_type: {
    type: String,
    required: true
  },
  is_system_role: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 100
  },
  parent_role_id: {
    type: String,
    default: null
  },
  created_by: {
    type: String,
    default: null
  },
  updated_by: {
    type: String,
    default: null
  }
}, {
  collection: 'roles',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

attachCommon(roleSchema);

module.exports = mongoose.models.Role || mongoose.model('Role', roleSchema);
