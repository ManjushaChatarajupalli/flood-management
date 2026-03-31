const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('incident', 'assignment', 'update', 'alert'),
    defaultValue: 'incident'
  },
  relatedIncidentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sentVia: {
    type: DataTypes.JSON,
    defaultValue: {
      push: true,
      email: false,
      sms: false
    }
  }
}, {
  tableName: 'notifications',
  timestamps: true
});

module.exports = Notification;