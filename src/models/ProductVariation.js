const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  attributes: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'product_variations',
  timestamps: false,
  indexes: [
    {
      fields: ['product_id']
    }
  ]
});

module.exports = ProductVariation;
