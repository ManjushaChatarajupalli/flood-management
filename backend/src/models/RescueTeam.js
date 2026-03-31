// =============================================================
// RESCUE TEAM MODEL — Fixed with memberIds + area fields
// =============================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RescueTeam = sequelize.define('RescueTeam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  teamName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teamLeaderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // ── FIX: memberIds — JSON array of user IDs in this team ──
  memberIds: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    comment: 'JSON array of user IDs who are members of this team',
    get() {
      const raw = this.getDataValue('memberIds');
      try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    },
    set(val) {
      this.setDataValue('memberIds', JSON.stringify(Array.isArray(val) ? val : []));
    },
  },

  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },

  // ── FIX: area — operational zone for this team ──
  area: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
    comment: 'Operational area or zone assigned to this team',
  },

  currentLatitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  currentLongitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  lastLocationUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('available', 'on_mission', 'offline'),
    defaultValue: 'available',
  },
  currentIncidentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'rescue_teams',
  timestamps: true,
});

module.exports = RescueTeam;