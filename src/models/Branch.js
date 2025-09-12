const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  lat: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  lng: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  work_time: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  delivery_time: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  min_order: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  free_delivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'branches',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vendor_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['lat', 'lng']
    },
    {
      fields: ['city']
    }
  ]
});

// Instance methods
Branch.prototype.getAverageRating = async function() {
  const { Review } = require('./Review');
  const result = await Review.findOne({
    where: { branch_id: this.id },
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

Branch.prototype.isOpen = function() {
  if (!this.work_time) return true;
  
  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  const daySchedule = this.work_time[currentDay];
  if (!daySchedule) return false;
  
  const [openTime, closeTime] = daySchedule.split('-');
  return currentTime >= openTime && currentTime <= closeTime;
};

module.exports = Branch;
