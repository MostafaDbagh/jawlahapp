const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const branchSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  vendor_id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  work_time: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  delivery_time: {
    type: String,
    default: null
  },
  min_order: {
    type: Number,
    default: 0
  },
  delivery_fee: {
    type: Number,
    default: 0
  },
  free_delivery: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  // Self-service "busy / pause orders" toggle the restaurant controls itself
  // (Keeta-style). When false the branch stays listed but rejects new orders at
  // checkout. Distinct from is_active (admin block) and work_time (schedule).
  // Legacy branches without this field are treated as accepting (=== false check).
  is_accepting_orders: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'branches',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

branchSchema.index({ lat: 1, lng: 1 });
// Customer browse: find({ is_active }).sort({ created_at: -1 }); and the
// per-vendor branch list find({ vendor_id, is_active }).
branchSchema.index({ is_active: 1, created_at: -1 });
branchSchema.index({ vendor_id: 1, is_active: 1 });

// Populate virtuals
branchSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendor_id',
  foreignField: 'id',
  justOne: true
});

branchSchema.virtual('subcategories', {
  ref: 'Subcategory',
  localField: 'id',
  foreignField: 'branch_id'
});

branchSchema.virtual('products', {
  ref: 'Product',
  localField: 'id',
  foreignField: 'branch_id'
});

branchSchema.virtual('reviews', {
  ref: 'Review',
  localField: 'id',
  foreignField: 'branch_id'
});

// Instance methods
branchSchema.methods.getAverageRating = async function getAverageRating() {
  const Review = mongoose.model('Review');
  const result = await Review.aggregate([
    { $match: { branch_id: this.id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return {
    averageRating: result.length ? parseFloat(result[0].averageRating) || 0 : 0,
    totalReviews: result.length ? result[0].totalReviews : 0
  };
};

// A short human-readable hours string for the customer app (e.g. "09:00 - 23:00").
// The merchant UI sets one open/close range applied to every day, so the common
// case is a single uniform range; if days differ we fall back to today's hours.
// Returns null when no schedule is set (the app then hides the hours line).
branchSchema.methods.getOpeningHoursText = function getOpeningHoursText() {
  if (!this.work_time) return null;
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const longDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const ranges = shortDays
    .map((d, i) => this.work_time[d] || this.work_time[longDays[i]])
    .filter(Boolean);
  if (ranges.length === 0) return null;

  const fmt = (range) => String(range).replace('-', ' - ');
  // All set days share the same range → show it once.
  if (ranges.every((r) => r === ranges[0])) return fmt(ranges[0]);

  // Mixed schedule → show today's hours if set, else the first day with hours.
  const idx = new Date().getDay();
  const today = this.work_time[shortDays[idx]] || this.work_time[longDays[idx]];
  return fmt(today || ranges[0]);
};

branchSchema.methods.isOpen = function isOpen() {
  if (!this.work_time) return true;

  const now = new Date();
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const longDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const idx = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  const daySchedule =
    this.work_time[shortDays[idx]] || this.work_time[longDays[idx]];
  if (!daySchedule) return false;

  const [openTime, closeTime] = daySchedule.split('-');
  // Overnight ranges (e.g. "20:00-02:00") close after midnight: the branch is
  // open if now is at/after open OR at/before close. Same-day ranges use the
  // normal between-check.
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  }
  return currentTime >= openTime && currentTime <= closeTime;
};

// Today's closing time ("HH:MM") from the schedule, so the app can show
// "open · closes at 23:30". Null when there's no schedule today (or none at all,
// i.e. always open). Mirrors isOpen()'s day lookup.
branchSchema.methods.getClosesAt = function getClosesAt() {
  if (!this.work_time) return null;
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const longDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const idx = new Date().getDay();
  const daySchedule = this.work_time[shortDays[idx]] || this.work_time[longDays[idx]];
  if (!daySchedule) return null;
  const closeTime = String(daySchedule).split('-')[1];
  return closeTime || null;
};

attachCommon(branchSchema);

module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
