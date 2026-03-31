const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // ── Photo ──────────────────────────────────────────────────
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  photoPublicId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imageHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'MD5 hash for duplicate detection (Layer 4)',
  },

  // ── Location ───────────────────────────────────────────────
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  // ── Report Info ────────────────────────────────────────────
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reporterName: {
    type: DataTypes.STRING,
    defaultValue: 'Anonymous',
  },
  reporterId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // ── Status ─────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM(
      'pending_verification',
      'unrescued',
      'rescue_in_progress',
      'rescued',
      'safe_zone',
      'fake_report'
    ),
    defaultValue: 'pending_verification',
  },

  // ── Verification Score & Verdict ───────────────────────────
  verificationScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Final score 0–100 from all 6 layers',
  },
  verificationVerdict: {
    type: DataTypes.ENUM('approved', 'review', 'rejected', 'pending'),
    defaultValue: 'pending',
    comment: 'Final verdict: approved / review / rejected',
  },
  verificationWarnings: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of warning messages from all layers',
    get() {
      const raw = this.getDataValue('verificationWarnings');
      try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    },
    set(val) {
      this.setDataValue('verificationWarnings', JSON.stringify(val || []));
    },
  },

  // ── Layer 1: AI Analysis ───────────────────────────────────
  aiAnalysis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON from Google Vision API — labels, flood matches',
    get() {
      const raw = this.getDataValue('aiAnalysis');
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    set(val) {
      this.setDataValue('aiAnalysis', val ? JSON.stringify(val) : null);
    },
  },
  aiFloodDetected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Layer 1: Did AI confirm flood content?',
  },

  // ── Layer 2: EXIF Metadata ─────────────────────────────────
  exifData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON: GPS, timestamp, device, editing software',
    get() {
      const raw = this.getDataValue('exifData');
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    set(val) {
      this.setDataValue('exifData', val ? JSON.stringify(val) : null);
    },
  },
  exifGpsValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Layer 2: EXIF GPS matches reported location?',
  },
  exifTimestampValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Layer 2: Photo taken within 48 hours?',
  },
  photoTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp extracted from EXIF',
  },

  // ── Layer 3: Reverse Image Search ─────────────────────────
  isOriginalImage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Layer 3: Not found via reverse image search?',
  },
  reverseSearchSources: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of URLs where image was found online',
    get() {
      const raw = this.getDataValue('reverseSearchSources');
      try { return raw ? JSON.parse(raw) : []; } catch { return []; }
    },
    set(val) {
      this.setDataValue('reverseSearchSources', JSON.stringify(val || []));
    },
  },

  // ── Layer 4: Duplicate Detection ──────────────────────────
  isDuplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Layer 4: Duplicate of existing incident?',
  },
  duplicateOfIncidentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Layer 4: ID of original incident if duplicate',
  },

  // ── Layer 5: Geo-Fence ─────────────────────────────────────
  inFloodZone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Layer 5: Reported location in active flood zone?',
  },
  precipitationData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON: Open-Meteo weather data at report location',
    get() {
      const raw = this.getDataValue('precipitationData');
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    set(val) {
      this.setDataValue('precipitationData', val ? JSON.stringify(val) : null);
    },
  },

  // ── Layer 6: User Trust ────────────────────────────────────
  reporterTrustScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    comment: 'Layer 6: Reporter trust score at time of submission',
  },
  reporterTrustLevel: {
    type: DataTypes.ENUM('high', 'medium', 'low', 'anonymous', 'unknown'),
    defaultValue: 'anonymous',
  },

  // ── People & Severity ──────────────────────────────────────
  peopleCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  severityLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },

  // ── Auto vs Manual Verification ───────────────────────────
  autoApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'true if score >= 75 and auto-approved by system',
  },
  verifiedByTeam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ── Assignment ─────────────────────────────────────────────
  assignedTeamId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Team assigned to this incident (team flow)',
  },

  // ── FIX: Solo Assignment ───────────────────────────────────
  assignedToUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Solo rescuer user ID — set when no team exists',
  },

  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'incidents',
  timestamps: true,
  indexes: [
    { fields: ['imageHash'] },
    { fields: ['status'] },
    { fields: ['reporterId'] },
    { fields: ['assignedTeamId'] },
    { fields: ['assignedToUserId'] },
    { fields: ['verificationVerdict'] },
    { fields: ['latitude', 'longitude'] },
  ],
});

module.exports = Incident;