const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  role_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'role_id'
  },
  role_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  role_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  account_type: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  is_system_role: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system_role'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  parent_role_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Role;
