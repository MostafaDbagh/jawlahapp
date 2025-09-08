const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vendor = sequelize.define('Vendor', {
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
  about: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 2000]
    }
  },
  work_time: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    validate: {
      isValidWorkTime(value) {
        if (value && typeof value === 'object') {
          const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          
          for (const [day, time] of Object.entries(value)) {
            if (!validDays.includes(day)) {
              throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
            }
            if (time && !timeRegex.test(time)) {
              throw new Error(`Invalid time format for ${day}: ${time}. Use format HH:MM-HH:MM`);
            }
          }
        }
      }
    }
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    validate: {
      isValidLocation(value) {
        if (value && typeof value === 'object') {
          if (value.lat !== undefined && (typeof value.lat !== 'number' || value.lat < -90 || value.lat > 90)) {
            throw new Error('Latitude must be a number between -90 and 90');
          }
          if (value.lng !== undefined && (typeof value.lng !== 'number' || value.lng < -180 || value.lng > 180)) {
            throw new Error('Longitude must be a number between -180 and 180');
          }
          if (value.city && typeof value.city !== 'string') {
            throw new Error('City must be a string');
          }
        }
      }
    }
  },
  subscript_date: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'vendors',
  timestamps: false,
  indexes: [
    {
      name: 'idx_vendors_name',
      fields: ['name']
    },
    {
      name: 'idx_vendors_is_active',
      fields: ['is_active']
    },
    {
      name: 'idx_vendors_rating',
      fields: ['rating']
    },
    {
      name: 'idx_vendors_subscript_date',
      fields: ['subscript_date']
    },
    {
      name: 'idx_vendors_location',
      fields: ['location'],
      using: 'gin'
    }
  ]
});

// Instance methods
Vendor.prototype.getPublicProfile = function() {
  return {
    id: this.id,
    name: this.name,
    image: this.image,
    about: this.about,
    work_time: this.work_time,
    location: this.location,
    is_active: this.is_active,
    rating: this.rating,
    created_at: this.created_at
  };
};

Vendor.prototype.isSubscriptionActive = function() {
  if (!this.subscript_date) return false;
  // Assuming subscription is valid for 1 year
  const oneYearFromSubscript = new Date(this.subscript_date);
  oneYearFromSubscript.setFullYear(oneYearFromSubscript.getFullYear() + 1);
  return new Date() <= oneYearFromSubscript;
};

Vendor.prototype.calculateDistance = function(userLat, userLng) {
  if (!this.location || !this.location.lat || !this.location.lng) {
    return null;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (this.location.lat - userLat) * Math.PI / 180;
  const dLng = (this.location.lng - userLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(userLat * Math.PI / 180) * Math.cos(this.location.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

module.exports = Vendor;
