const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed', 'free_delivery'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  max_discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  tableName: 'promotions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

// Instance methods
Promotion.prototype.isValid = function() {
  const now = new Date();
  return this.is_active && 
         this.start_date <= now && 
         this.end_date >= now &&
         (!this.usage_limit || this.used_count < this.usage_limit);
};

Promotion.prototype.canUse = function(orderAmount = 0) {
  if (!this.isValid()) return false;
  
  if (this.min_order_amount && orderAmount < this.min_order_amount) {
    return false;
  }
  
  return true;
};

Promotion.prototype.calculateDiscount = function(orderAmount) {
  if (!this.canUse(orderAmount)) return 0;
  
  let discount = 0;
  
  switch (this.type) {
    case 'percentage':
      discount = orderAmount * (this.value / 100);
      if (this.max_discount) {
        discount = Math.min(discount, this.max_discount);
      }
      break;
    case 'fixed':
      discount = this.value;
      break;
    case 'free_delivery':
      // This would be handled separately in delivery logic
      discount = 0;
      break;
  }
  
  return Math.round(discount * 100) / 100;
};

module.exports = Promotion;
