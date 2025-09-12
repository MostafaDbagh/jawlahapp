const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subcategory = sequelize.define('Subcategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
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
  has_offer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  free_delivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'subcategories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['branch_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['sort_order']
    }
  ]
});

// Instance methods
Subcategory.prototype.getProductCount = async function() {
  const { Product } = require('./Product');
  return await Product.count({
    where: { 
      subcategory_id: this.id,
      is_active: true 
    }
  });
};

Subcategory.prototype.getActiveOffers = async function() {
  const { Offer } = require('./Offer');
  return await Offer.findAll({
    where: {
      entity_type: 'subcategory',
      entity_id: this.id,
      is_active: true,
      start_date: { [sequelize.Op.lte]: new Date() },
      end_date: { [sequelize.Op.gte]: new Date() }
    }
  });
};

module.exports = Subcategory;
