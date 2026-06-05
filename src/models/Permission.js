const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const permissionSchema = new mongoose.Schema({
  permission_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  permission_code: {
    type: String,
    required: true,
    unique: true
  },
  permission_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  module_code: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    default: null
  },
  action: {
    type: String,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'permissions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

attachCommon(permissionSchema);

module.exports = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
