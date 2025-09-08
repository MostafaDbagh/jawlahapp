const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    }
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Image must be a valid URL'
      }
    }
  },
  has_offer: {
    type: DataTypes.DECIMAL(5, 4), // Allows up to 99.9999%
    allowNull: true,
    validate: {
      min: 0,
      max: 1,
      isDecimal: true
    }
  },
  free_delivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'categories',
  timestamps: false, // We're using created_at manually
  indexes: [
    {
      name: 'idx_categories_name',
      fields: ['name']
    },
    {
      name: 'idx_categories_has_offer',
      fields: ['has_offer']
    },
    {
      name: 'idx_categories_free_delivery',
      fields: ['free_delivery']
    }
  ]
});

module.exports = Category;
