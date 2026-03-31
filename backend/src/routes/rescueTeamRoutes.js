// =============================================================
// RESCUE TEAM ROUTES — Fixed with members endpoint
// =============================================================

const express = require('express');
const router = express.Router();
const rescueTeamController = require('../controllers/rescueTeamController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ── Public routes ──────────────────────────────────────────
router.get('/', rescueTeamController.getAllTeams);
router.get('/:id', rescueTeamController.getTeamById);

// ── FIX: Get available rescue members (for create team form dropdown) ──
router.get(
  '/members/available',
  authMiddleware,
  roleMiddleware('admin'),
  rescueTeamController.getAvailableMembers
);

// ── Rescue team routes ─────────────────────────────────────
router.put(
  '/:id/location',
  authMiddleware,
  roleMiddleware('rescue_team', 'admin'),
  rescueTeamController.updateTeamLocation
);

router.put(
  '/:id/status',
  authMiddleware,
  roleMiddleware('rescue_team', 'admin'),
  rescueTeamController.updateTeamStatus
);

// ── Admin only ─────────────────────────────────────────────
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  rescueTeamController.createTeam
);

module.exports = router;