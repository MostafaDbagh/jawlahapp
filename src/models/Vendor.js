const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { attachCommon } = require('./baseSchema');

const vendorSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },
  // The user account (SERVICE_PROVIDER_OWNER) that owns/manages this restaurant.
  // Set when a restaurant is created from the web portal; null for legacy/seeded vendors.
  owner_user_id: {
    type: String,
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  image: {
    type: String,
    default: null
  },
  about: {
    type: String,
    default: null
  },
  subscript_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'vendors',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Populate virtual: a vendor's branches
vendorSchema.virtual('branches', {
  ref: 'Branch',
  localField: 'id',
  foreignField: 'vendor_id'
});

// Instance methods
vendorSchema.methods.isSubscriptionActive = function isSubscriptionActive() {
  const now = new Date();
  const subscriptionDate = new Date(this.subscript_date);
  const oneYearLater = new Date(subscriptionDate);
  oneYearLater.setFullYear(subscriptionDate.getFullYear() + 1);

  return now <= oneYearLater && this.is_active;
};

vendorSchema.methods.getBranches = function getBranches() {
  const Branch = mongoose.model('Branch');
  return Branch.find({ vendor_id: this.id, is_active: true });
};

vendorSchema.methods.getActiveBranchesCount = function getActiveBranchesCount() {
  const Branch = mongoose.model('Branch');
  return Branch.countDocuments({ vendor_id: this.id, is_active: true });
};

vendorSchema.methods.getAverageRating = async function getAverageRating() {
  const Branch = mongoose.model('Branch');
  const Review = mongoose.model('Review');

  const branches = await Branch.find({ vendor_id: this.id }).select('id').lean();
  if (branches.length === 0) return { averageRating: 0, totalReviews: 0 };

  const branchIds = branches.map((branch) => branch.id);

  const result = await Review.aggregate([
    { $match: { branch_id: { $in: branchIds } } },
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

attachCommon(vendorSchema);

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
