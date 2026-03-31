// =============================================================
// INCIDENT CONTROLLER — Full version matching all routes
// =============================================================

const Incident = require('../models/Incident');
const imageVerificationService = require('../services/imageVerificationService');
const duplicateDetectionService = require('../services/duplicateDetectionService');
const imageService = require('../services/imageService');

// ─────────────────────────────────────────────────────────────
// POST /incidents/create  —  Public
// ─────────────────────────────────────────────────────────────
exports.createIncident = async (req, res) => {
  try {
    const { latitude, longitude, description, peopleCount, severityLevel } = req.body;
    const userId   = req.user?.id   || null;
    const userName = req.user?.name || 'Anonymous';

    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required to report an incident' });
    }

    const imageBuffer = req.file.buffer;

    const verification = await imageVerificationService.verifyImage(
      imageBuffer,
      parseFloat(latitude),
      parseFloat(longitude),
      userId
    );

    const duplicateCheck = await duplicateDetectionService.checkDuplicate(imageBuffer);
    if (!duplicateCheck.isUnique) {
      return res.status(409).json({
        message:            'Duplicate image detected',
        reason:             duplicateCheck.reason,
        existingIncidentId: duplicateCheck.existingIncidentId,
      });
    }

    let uploadResult = { url: '', publicId: '' };
    if (verification.verdict !== 'rejected') {
      uploadResult = await imageService.uploadImage(imageBuffer, `incident_${Date.now()}`);
    }

    const incidentStatus = imageVerificationService.verdictToStatus(verification.verdict);
    const autoApproved   = verification.verdict === 'approved';

    const l1 = verification.layers.layer1 || {};
    const l2 = verification.layers.layer2 || {};
    const l3 = verification.layers.layer3 || {};
    const l5 = verification.layers.layer5 || {};
    const l6 = verification.layers.layer6 || {};

    const incident = await Incident.create({
      photoUrl:             uploadResult.url,
      photoPublicId:        uploadResult.publicId,
      imageHash:            duplicateCheck.imageHash,
      latitude:             parseFloat(latitude),
      longitude:            parseFloat(longitude),
      description,
      reporterName:         userName,
      reporterId:           userId,
      peopleCount:          parseInt(peopleCount) || 0,
      severityLevel:        severityLevel || 'medium',
      status:               incidentStatus,
      autoApproved,
      verificationScore:    verification.score,
      verificationVerdict:  verification.verdict,
      verificationWarnings: verification.warnings,
      aiFloodDetected:      l1.passed || false,
      aiAnalysis:           l1.metadata || null,
      exifGpsValid:         l2.gpsValid      || false,
      exifTimestampValid:   l2.timestampValid || false,
      photoTimestamp:       l2.metadata?.photoTimestamp || null,
      exifData: {
        ...l2.metadata,
        pHash:         duplicateCheck.pHash,
        softwareClean: l2.softwareClean,
      },
      isOriginalImage:      l3.isOriginal !== false,
      reverseSearchSources: l3.webSources || [],
      isDuplicate:          false,
      inFloodZone:          l5.inFloodZone || false,
      precipitationData:    l5,
      reporterTrustScore:   l6.trustScore || 50,
      reporterTrustLevel:   l6.trustLevel || 'anonymous',
    });

    const io = req.app.get('io');
    if (io && autoApproved) {
      io.emit('new_incident', {
        id: incident.id, latitude, longitude,
        status: incidentStatus,
        verificationScore: verification.score,
        severity: severityLevel,
      });
    }

    return res.status(201).json({
      message: autoApproved
        ? '✅ Incident reported and verified successfully'
        : verification.verdict === 'review'
          ? '⚠️ Incident submitted — under manual review'
          : '❌ Incident rejected — image did not pass verification',
      incident: {
        id:                incident.id,
        status:            incident.status,
        verificationScore: incident.verificationScore,
        verdict:           incident.verificationVerdict,
        warnings:          incident.verificationWarnings,
      },
      verification: {
        score:   verification.score,
        verdict: verification.verdict,
        layers: {
          aiFloodDetected:    l1.passed,
          exifGpsValid:       l2.gpsValid,
          exifTimestampValid: l2.timestampValid,
          isOriginalImage:    l3.isOriginal,
          isUnique:           true,
          inFloodZone:        l5.inFloodZone,
          userTrustLevel:     l6.trustLevel,
        },
        warnings: verification.warnings,
      },
    });
  } catch (error) {
    console.error('createIncident error:', error);
    return res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /incidents  —  Public
// ─────────────────────────────────────────────────────────────
exports.getAllIncidents = async (req, res) => {
  try {
    const { status, verdict, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)  where.status              = status;
    if (verdict) where.verificationVerdict = verdict;

    const { count, rows } = await Incident.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      total:      count,
      page:       parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      incidents:  rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /incidents/:id  —  Public
// ─────────────────────────────────────────────────────────────
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    return res.json(incident);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /incidents/:id/status  —  rescue_team, admin
//
// FIX: Now accepts optional assignedTeamId (team assignment)
//      OR assignedToUserId (solo assignment — no team needed)
// ─────────────────────────────────────────────────────────────
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status, notes, assignedTeamId, assignedToUserId } = req.body;

    const validStatuses = [
      'pending_verification', 'unrescued', 'rescue_in_progress',
      'rescued', 'safe_zone', 'fake_report',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const updateData = { status };

    // ── Team assignment (normal flow) ──
    if (assignedTeamId) {
      updateData.assignedTeamId = assignedTeamId;
    }

    // ── Solo assignment (no team needed) ──
    if (assignedToUserId) {
      updateData.assignedToUserId = assignedToUserId;
    }

    // ── Completion timestamps ──
    if (status === 'rescued' || status === 'safe_zone') {
      updateData.resolvedAt = new Date();
    }

    // ── Fake report handling ──
    if (status === 'fake_report') {
      updateData.verificationVerdict = 'rejected';
      updateData.verificationNotes   = notes || 'Marked as fake by team';
      updateData.verifiedByTeam      = true;
      updateData.verifiedBy          = req.user.id;
      updateData.verifiedAt          = new Date();
    }

    await incident.update(updateData);

    const io = req.app.get('io');
    if (io) {
      io.emit('incident_status_updated', {
        id:               incident.id,
        status:           incident.status,
        assignedTeamId:   incident.assignedTeamId   || null,
        assignedToUserId: incident.assignedToUserId || null,
      });
    }

    return res.json({
      message:  `Incident status updated to "${status}"`,
      incident: {
        id:               incident.id,
        status:           incident.status,
        resolvedAt:       incident.resolvedAt,
        assignedTeamId:   incident.assignedTeamId   || null,
        assignedToUserId: incident.assignedToUserId || null,
      },
    });
  } catch (error) {
    console.error('updateIncidentStatus error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /incidents/:id/verify  —  rescue_team, admin
// ─────────────────────────────────────────────────────────────
exports.verifyIncident = async (req, res) => {
  try {
    const { verdict, notes } = req.body;
    if (!['approved', 'rejected'].includes(verdict)) {
      return res.status(400).json({ message: 'Verdict must be "approved" or "rejected"' });
    }

    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const statusMap = { approved: 'unrescued', rejected: 'fake_report' };

    await incident.update({
      status:              statusMap[verdict],
      verificationVerdict: verdict,
      verifiedByTeam:      true,
      verifiedBy:          req.user.id,
      verifiedAt:          new Date(),
      verificationNotes:   notes || null,
    });

    const io = req.app.get('io');
    if (io) io.emit('incident_verified', { id: incident.id, verdict, status: statusMap[verdict] });

    return res.json({
      message:  `Incident manually ${verdict}`,
      incident: {
        id:                  incident.id,
        status:              incident.status,
        verificationVerdict: incident.verificationVerdict,
        verifiedAt:          incident.verifiedAt,
      },
    });
  } catch (error) {
    console.error('verifyIncident error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /incidents/:id  —  admin only
// ─────────────────────────────────────────────────────────────
exports.deleteIncident = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    if (incident.photoPublicId) {
      await imageService.deleteImage(incident.photoPublicId).catch(err =>
        console.warn('Cloudinary delete failed:', err.message)
      );
    }

    await incident.destroy();
    return res.json({ message: `Incident #${req.params.id} deleted successfully` });
  } catch (error) {
    console.error('deleteIncident error:', error);
    return res.status(500).json({ message: error.message });
  }
};