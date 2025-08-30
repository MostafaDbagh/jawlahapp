const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountType = sequelize.define('AccountType', {
  type_code: {
    type: DataTypes.STRING(30),
    primaryKey: true,
    field: 'type_code'
  },
  type_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'account_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AccountType;
