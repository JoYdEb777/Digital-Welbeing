// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const usageRoutes = require('./routes/usageRoutes');
const focusRoutes = require('./routes/focusRoutes');
const breakRoutes = require('./routes/breakRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/breaks', breakRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`[Socket.io] User ${userId} joined their room`);
  });

  socket.on('startScreenTime', (userId) => {
    socket.join(userId);
    // Set a 45-minute break reminder
    const breakTimer = setTimeout(() => {
      io.to(userId).emit('breakReminder', {
        message: 'You have been using your screen for 45 minutes! Time for a break.',
        suggestions: [
          { type: 'stretch', description: 'Stand up and stretch for 2 minutes', icon: '🧘' },
          { type: 'hydrate', description: 'Drink a glass of water', icon: '💧' },
          { type: 'eyeRest', description: '20-20-20 Rule: Look at something 20ft away for 20 seconds', icon: '👁️' },
        ],
      });
    }, 45 * 60 * 1000); // 45 minutes

    socket.on('disconnect', () => clearTimeout(breakTimer));
    socket.on('stopScreenTime', () => clearTimeout(breakTimer));
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// MongoDB connection
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Try connecting to the configured MongoDB URI first
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000, // Fail fast if local MongoDB isn't running
    });
    console.log('[MongoDB] Connected successfully to local MongoDB');
  } catch (err) {
    console.warn(`[MongoDB] Local connection failed: ${err.message}`);
    console.log('[MongoDB] Starting in-memory MongoDB for development...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log('[MongoDB] In-memory MongoDB started successfully');
      console.log('[MongoDB] Note: Data will NOT persist across server restarts');
    } catch (memErr) {
      console.error(`[MongoDB] In-memory MongoDB failed: ${memErr.message}`);
      console.log('[Server] Starting without database connection...');
    }
  }

  server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
