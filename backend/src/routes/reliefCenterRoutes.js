const express = require('express');
const router = express.Router();
const reliefCenterController = require('../controllers/reliefCenterController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes
router.get('/', reliefCenterController.getAllReliefCenters);
router.get('/nearest', reliefCenterController.findNearest);
router.get('/:id', reliefCenterController.getReliefCenterById);

// Protected routes (rescue teams can update capacity)
router.put(
  '/:id/capacity',
  authMiddleware,
  roleMiddleware('rescue_team', 'admin'),
  reliefCenterController.updateCapacity
);

// Admin only
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  reliefCenterController.createReliefCenter
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  reliefCenterController.updateReliefCenter
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  reliefCenterController.deleteReliefCenter
);

module.exports = router;