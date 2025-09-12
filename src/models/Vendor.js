const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  about: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subscript_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'vendors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['subscript_date']
    }
  ]
});

// Instance methods
Vendor.prototype.isSubscriptionActive = function() {
  const now = new Date();
  const subscriptionDate = new Date(this.subscript_date);
  const oneYearLater = new Date(subscriptionDate);
  oneYearLater.setFullYear(subscriptionDate.getFullYear() + 1);
  
  return now <= oneYearLater && this.is_active;
};

Vendor.prototype.getBranches = async function() {
  const { Branch } = require('./Branch');
  return await Branch.findAll({
    where: { 
      vendor_id: this.id,
      is_active: true 
    }
  });
};

Vendor.prototype.getActiveBranchesCount = async function() {
  const { Branch } = require('./Branch');
  return await Branch.count({
    where: { 
      vendor_id: this.id,
      is_active: true 
    }
  });
};

Vendor.prototype.getAverageRating = async function() {
  const { Branch } = require('./Branch');
  const { Review } = require('./Review');
  
  const branches = await Branch.findAll({
    where: { vendor_id: this.id },
    attributes: ['id']
  });
  
  if (branches.length === 0) return { averageRating: 0, totalReviews: 0 };
  
  const branchIds = branches.map(branch => branch.id);
  
  const result = await Review.findOne({
    where: { branch_id: { [sequelize.Op.in]: branchIds } },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
      [sequelize.fn('COUNT', sequelize.col('rating')), 'totalReviews']
    ],
    raw: true
  });
  
  return {
    averageRating: parseFloat(result.averageRating) || 0,
    totalReviews: parseInt(result.totalReviews) || 0
  };
};

module.exports = Vendor;
