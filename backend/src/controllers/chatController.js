const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { roomId, messageText, messageType } = req.body;
      const senderId = req.user.id;

      const message = await ChatMessage.create({
        senderId,
        roomId,
        messageText,
        messageType: messageType || 'text'
      });

      // Get sender info
      const sender = await User.findByPk(senderId, {
        attributes: ['id', 'name', 'role']
      });

      // Broadcast message via WebSocket
      const io = req.app.get('io');
      if (io) {
        io.to(roomId).emit('new_message', {
          message,
          sender
        });
      }

      res.status(201).json({
        success: true,
        message: message,
        sender
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to send message',
        error: error.message
      });
    }
  }

  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await ChatMessage.findAll({
        where: { roomId },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'role']
        }],
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({
        success: true,
        count: messages.length,
        messages: messages.reverse() // Oldest first
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch messages',
        error: error.message
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const { messageId } = req.params;

      const message = await ChatMessage.findByPk(messageId);

      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      message.isRead = true;
      await message.save();

      res.status(200).json({
        success: true,
        message: 'Message marked as read'
      });

    } catch (error) {
      res.status(500).json({
        message: 'Failed to mark message as read',
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();