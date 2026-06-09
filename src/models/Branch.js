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
  return currentTime >= openTime && currentTime <= closeTime;
};

attachCommon(branchSchema);

module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
