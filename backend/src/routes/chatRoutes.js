const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// All chat routes require authentication
router.post('/', authMiddleware, chatController.sendMessage);
router.get('/:roomId', authMiddleware, chatController.getMessages);
router.put('/:messageId/read', authMiddleware, chatController.markAsRead);

module.exports = router;