const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const CONTACT_STATUSES = ['new', 'in_progress', 'closed'];

// A "Contact us" message from the app/website. Can be submitted without an
// account (public). Admins browse these in the portal's "تواصل معنا" tab.
const contactRequestSchema = new mongoose.Schema({
  contact_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: { type: String, default: null, index: true },

  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, default: null, trim: true, maxlength: 20 },
  email: { type: String, default: null, trim: true, lowercase: true },

  subject: { type: String, default: null, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },

  status: { type: String, enum: CONTACT_STATUSES, default: 'new', index: true },
  admin_note: { type: String, default: null },
  handled_by: { type: String, default: null },
  handled_at: { type: Date, default: null }
}, {
  collection: 'contact_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

contactRequestSchema.index({ status: 1, created_at: -1 });

attachCommon(contactRequestSchema);

module.exports = mongoose.models.ContactRequest || mongoose.model('ContactRequest', contactRequestSchema);
module.exports.CONTACT_STATUSES = CONTACT_STATUSES;
