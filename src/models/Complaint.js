const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'dismissed'];
const COMPLAINT_CATEGORIES = ['order', 'delivery', 'payment', 'app', 'restaurant', 'other'];

// A customer-submitted complaint. Optionally tied to a specific order. Admins
// browse these in the portal's "الشكاوى" tab and move them through the workflow.
const complaintSchema = new mongoose.Schema({
  complaint_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  user_id: { type: String, default: null, index: true },
  order_id: { type: String, default: null, index: true },
  // Short human-facing order reference the customer attaches to the complaint
  // (the code shown in the app, e.g. first 8 chars of order_id). Kept alongside
  // the resolved order_id so admins see exactly what the customer referenced.
  order_reference: { type: String, default: null },

  // Contact snapshot captured at submit time so admins can reach the customer
  // even if the account is later changed/removed.
  contact_name: { type: String, default: null },
  contact_phone: { type: String, default: null },

  category: { type: String, enum: COMPLAINT_CATEGORIES, default: 'other' },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },

  status: { type: String, enum: COMPLAINT_STATUSES, default: 'open', index: true },
  admin_note: { type: String, default: null },
  resolved_by: { type: String, default: null },
  resolved_at: { type: Date, default: null }
}, {
  collection: 'complaints',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

complaintSchema.index({ status: 1, created_at: -1 });

attachCommon(complaintSchema);

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
module.exports.COMPLAINT_STATUSES = COMPLAINT_STATUSES;
module.exports.COMPLAINT_CATEGORIES = COMPLAINT_CATEGORIES;
