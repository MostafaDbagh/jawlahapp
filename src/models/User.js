const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'user_id'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      is: /^[a-zA-Z0-9_]+$/
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  country_code: {
    type: DataTypes.STRING(5),
    allowNull: false,
    validate: {
      len: [1, 5]
    }
  },
  phone_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      len: [7, 15]
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: true,
      isBefore: new Date().toISOString().split('T')[0] // Must be before today
    }
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      isIn: [['male', 'female', 'other', 'prefer_not_to_say']]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  salt: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  profile_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  account_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isIn: [['CUSTOMER', 'DRIVER', 'SERVICE_PROVIDER_OWNER', 'SERVICE_PROVIDER_ADMIN', 'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'CUSTOMER_SERVICE']]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_password_change: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferred_language: {
    type: DataTypes.STRING(5),
    defaultValue: 'ar'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Dubai'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  fcm_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'fcm_token'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['country_code', 'phone_number']
    }
  ],
  hooks: {
    // beforeCreate hook disabled to prevent double hashing
    // Password hashing is now handled in the controller
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        // Generate new salt and hash password
        const salt = crypto.randomBytes(32).toString('hex');
        const hash = await bcrypt.hash(user.password_hash + salt, 12);
        user.salt = salt;
        user.password_hash = hash;
        user.last_password_change = new Date();
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  const hash = candidatePassword + this.salt;
  return await bcrypt.compare(hash, this.password_hash);
};

// Instance method to set password
User.prototype.setPassword = async function(newPassword) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(newPassword + salt, 12);
  this.salt = salt;
  this.password_hash = hash;
  this.last_password_change = new Date();
  return this.save();
};

// Instance method to get public profile
User.prototype.getPublicProfile = function() {
  const { password_hash, salt, two_factor_secret, ...publicData } = this.toJSON();
  return publicData;
};

// Instance method to check if account is locked
User.prototype.isLocked = function() {
  return this.locked_until && new Date() < this.locked_until;
};

// Instance method to increment failed login attempts
User.prototype.incrementFailedAttempts = async function() {
  this.failed_login_attempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failed_login_attempts >= 5) {
    this.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  return this.save();
};

// Instance method to reset failed login attempts
User.prototype.resetFailedAttempts = async function() {
  this.failed_login_attempts = 0;
  this.locked_until = null;
  return this.save();
};

// Instance method to update last login
User.prototype.updateLastLogin = async function() {
  this.last_login = new Date();
  return this.save();
};

module.exports = User;
