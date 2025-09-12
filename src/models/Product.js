const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
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
  subcategory_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'subcategories',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['branch_id']
    },
    {
      fields: ['subcategory_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['price']
    }
  ]
});

// Instance methods
Product.prototype.getVariations = async function() {
  const { ProductVariation } = require('./ProductVariation');
  return await ProductVariation.findAll({
    where: { product_id: this.id }
  });
};

Product.prototype.getActiveOffers = async function() {
  const { Offer } = require('./Offer');
  return await Offer.findAll({
    where: {
      entity_type: 'product',
      entity_id: this.id,
      is_active: true,
      start_date: { [sequelize.Op.lte]: new Date() },
      end_date: { [sequelize.Op.gte]: new Date() }
    }
  });
};

Product.prototype.getFinalPrice = async function() {
  const offers = await this.getActiveOffers();
  let finalPrice = parseFloat(this.price);
  
  for (const offer of offers) {
    if (offer.type === 'percentage') {
      finalPrice = finalPrice * (1 - offer.value / 100);
    } else if (offer.type === 'fixed') {
      finalPrice = Math.max(0, finalPrice - offer.value);
    }
  }
  
  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
};

module.exports = Product;
