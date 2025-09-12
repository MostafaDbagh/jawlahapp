const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  entity_type: {
    type: DataTypes.ENUM('branch', 'subcategory', 'product'),
    allowNull: false
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed', 'buy_x_get_y'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'offers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['entity_type', 'entity_id', 'is_active']
    },
    {
      fields: ['start_date', 'end_date', 'is_active']
    },
    {
      fields: ['type']
    }
  ]
});

// Instance methods
Offer.prototype.isValid = function() {
  const now = new Date();
  return this.is_active && 
         this.start_date <= now && 
         this.end_date >= now;
};

Offer.prototype.calculateDiscount = function(originalPrice) {
  if (!this.isValid()) return originalPrice;
  
  let discountedPrice = parseFloat(originalPrice);
  
  switch (this.type) {
    case 'percentage':
      discountedPrice = discountedPrice * (1 - this.value / 100);
      break;
    case 'fixed':
      discountedPrice = Math.max(0, discountedPrice - this.value);
      break;
    case 'buy_x_get_y':
      // Implementation depends on specific business logic
      break;
  }
  
  return Math.round(discountedPrice * 100) / 100;
};

module.exports = Offer;
