const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
  permission_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'permission_id'
  },
  permission_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  permission_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  module_code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Permission;
