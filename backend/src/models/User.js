const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('citizen', 'rescue_team', 'admin'),
    defaultValue: 'citizen'
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fakeReportsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  verifiedReportsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // 🆕 Push notification subscription (stored as JSON string)
  pushSubscription: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  // 🆕 GPS Location for weather monitoring
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;