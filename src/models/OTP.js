const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  otp_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'otp_id'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      len: [10, 20]
    }
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['password_reset', 'email_verification', 'phone_verification', 'phone_login']]
    }
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_used'
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'otps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No updated_at field in the schema
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['email']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Instance method to check if OTP is expired
OTP.prototype.isExpired = function() {
  return new Date() > this.expires_at;
};

// Instance method to check if OTP is valid
OTP.prototype.isValid = function() {
  return !this.isExpired() && !this.is_used && this.attempts < 3;
};

module.exports = OTP;
