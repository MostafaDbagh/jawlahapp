const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
  session_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'session_id'
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
  access_token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  refresh_token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  login_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'login_time'
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_activity'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  device_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  device_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  location: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  terminated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  terminated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'sessions',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['access_token']
    },
    {
      fields: ['refresh_token']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Instance method to check if session is expired
Session.prototype.isExpired = function() {
  return new Date() > this.expires_at;
};

// Instance method to check if session is valid
Session.prototype.isValid = function() {
  return this.is_active && !this.isExpired() && !this.terminated_at;
};

// Instance method to update last activity
Session.prototype.updateActivity = async function() {
  this.last_activity = new Date();
  return this.save();
};

// Instance method to terminate session
Session.prototype.terminate = async function(terminatedBy = null) {
  this.is_active = false;
  this.terminated_at = new Date();
  this.terminated_by = terminatedBy;
  return this.save();
};

module.exports = Session;
