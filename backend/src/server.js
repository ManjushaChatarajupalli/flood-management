const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const SocketHandler = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const reliefCenterRoutes = require('./routes/reliefCenterRoutes');
const rescueTeamRoutes = require('./routes/rescueTeamRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // 🆕

// Import weather polling 🆕
const { startWeatherPolling } = require('./services/weatherService');

// Import models for associations
const User = require('./models/User');
const Incident = require('./models/Incident');
const ReliefCenter = require('./models/ReliefCenter');
const RescueTeam = require('./models/RescueTeam');
const ChatMessage = require('./models/ChatMessage');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Make io accessible in controllers
app.set('io', io);

// Initialize Socket Handler
new SocketHandler(io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/relief-centers', reliefCenterRoutes);
app.use('/api/rescue-teams', rescueTeamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes); // 🆕

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Model Associations
setupAssociations();

function setupAssociations() {
  User.hasMany(Incident, { foreignKey: 'reporterId', as: 'incidents' });
  Incident.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

  User.hasOne(RescueTeam, { foreignKey: 'teamLeaderId', as: 'ledTeam' });
  RescueTeam.belongsTo(User, { foreignKey: 'teamLeaderId', as: 'teamLeader' });

  RescueTeam.hasMany(Incident, { foreignKey: 'assignedTeamId', as: 'assignedIncidents' });
  Incident.belongsTo(RescueTeam, { foreignKey: 'assignedTeamId', as: 'assignedTeam' });

  User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
  ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
}

// Database sync and server start
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.sync({ alter: false });
    console.log('✅ Database synced successfully');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

      // 🆕 Start weather polling after server starts
      startWeatherPolling();
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await sequelize.close();
    console.log('Server closed');
    process.exit(0);
  });
});