const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware for socket connections
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.userId}`);

      // Join user-specific room
      socket.join(`user_${socket.userId}`);

      // Handle joining chat rooms
      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room: ${roomId}`);
      });

      // Handle leaving chat rooms
      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.userId} left room: ${roomId}`);
      });

      // Handle team location updates
      socket.on('update_location', async (data) => {
        const { teamId, latitude, longitude } = data;
        
        // Broadcast to all clients
        this.io.emit('team_location_updated', {
          teamId,
          latitude,
          longitude,
          timestamp: new Date()
        });
      });

      // Handle typing indicator
      socket.on('typing', (data) => {
        socket.to(data.roomId).emit('user_typing', {
          userId: socket.userId,
          isTyping: data.isTyping
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.userId}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  // Method to emit to specific user
  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Method to emit to all users
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // Method to emit to specific room
  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

module.exports = SocketHandler;