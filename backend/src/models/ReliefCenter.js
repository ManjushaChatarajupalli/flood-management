const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReliefCenter = sequelize.define('ReliefCenter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  totalCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currentOccupancy: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  availableCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  resources: {
    type: DataTypes.JSON,
    defaultValue: {
      food: true,
      water: true,
      medical: false,
      shelter: true
    }
  },
  contactNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'relief_centers',
  timestamps: true
});

module.exports = ReliefCenter;