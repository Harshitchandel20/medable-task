require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const limiter = require('./middleware/rateLimiter');
const helmet = require('helmet');

// Import routes
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const whisperRoutes = require('./routes/whisper');
const webSocket = require('./websocket');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply the rate limiter to all requests
app.use('/api', limiter);

// Custom headers for puzzle hints
app.use((req, res, next) => {
  res.set({
    'X-Chat-Protocol': 'v1.0',
    'X-Message-Hint': 'whisper_endpoint_needs_decryption_key',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/whisper', whisperRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  const status = error.statusCode || 500;
  // Secure Error Handling: Do not leak stack trace
  res.status(status).json({ message: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`💬 Assessment 3: Chat/Messaging API running on http://localhost:${PORT}`);
  console.log(`📋 View instructions: http://localhost:${PORT}`);
  console.log(`🔐 Real-time features and security challenges await!`);
});

webSocket.init(server);
