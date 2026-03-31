const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// ✅ Correct import - authMiddleware exports function directly
const authMiddleware = require('../middleware/authMiddleware');

// Public - get VAPID public key (no auth needed)
router.get('/vapid-public-key', notificationController.getVapidPublicKey);

// Protected routes - require login
router.post('/subscribe', authMiddleware, notificationController.subscribePush);
router.post('/unsubscribe', authMiddleware, notificationController.unsubscribePush);
router.post('/update-location', authMiddleware, notificationController.updateLocation);

// Admin only - send manual flood alert
router.post('/send-manual-alert', authMiddleware, notificationController.sendManualFloodAlert);

module.exports = router;