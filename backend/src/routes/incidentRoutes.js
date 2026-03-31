const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ── Public routes ──────────────────────────────────────────────
router.post('/create', upload.single('image'), incidentController.createIncident);
router.get('/', incidentController.getAllIncidents);
router.get('/:id', incidentController.getIncidentById);

// ── Protected routes (rescue_team, admin) ──────────────────────
router.put('/:id/status',
  authMiddleware,
  roleMiddleware('rescue_team', 'admin'),
  incidentController.updateIncidentStatus
);

router.post('/:id/verify',
  authMiddleware,
  roleMiddleware('rescue_team', 'admin'),
  incidentController.verifyIncident
);

// ── Admin only ─────────────────────────────────────────────────
router.delete('/:id',
  authMiddleware,
  roleMiddleware('admin'),
  incidentController.deleteIncident
);

module.exports = router;