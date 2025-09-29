const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../data');
const { auth, logout } = require('../middleware/auth');
const { registerValidation, loginValidation, statusValidation, validate } = require('../middleware/validators');
const authorize = require('../middleware/authorize');
const adminActionLogger = require('../middleware/adminLogger');
const { recordFailedLogin, isLockedOut, clearFailedLogins } = require('../middleware/lockout');
const webSocket = require('../websocket');

const router = express.Router();

// Session storage for active users (should be in database)
const { tokenBlacklist } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Login endpoint
router.post('/login', [loginValidation(), validate], async (req, res) => {
  try {
    const { username, password } = req.body;

    if (isLockedOut(username)) {
      return res.status(429).json({ error: 'Account locked due to too many failed login attempts. Please try again later.' });
    }

    const user = users.find(u => u.username === username || u.email === username);

    if (!user) {
      recordFailedLogin(username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailedLogin(username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearFailedLogins(username);

    const sessionId = uuidv4();
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.status = 'online';
    user.lastSeen = new Date().toISOString();

    webSocket.broadcast(JSON.stringify({ type: 'status-change', payload: { userId: user.id, status: user.status } }));

    res.set({
      'X-Session-Id': sessionId,
      'X-User-Role': user.role
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Register endpoint
router.post('/register', registerValidation(), validate, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = users.find(u => u.username === username || u.email === email);

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      status: 'online',
      lastSeen: new Date().toISOString(),
      role: 'user', // BUG: Hardcoded role
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    res.status(201).json({
      message: 'User registered successfully. Please log in.'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', auth, async (req, res) => {
  try {
    logout(req.token);
    const user = users.find(u => u.id === req.user.userId);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date().toISOString();
      webSocket.broadcast(JSON.stringify({ type: 'status-change', payload: { userId: user.id, status: user.status } }));
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Profile endpoint
router.get('/profile', auth, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // BUG: Returning sensitive information in profile
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      lastSeen: user.lastSeen,
      avatar: user.avatar,
      createdAt: user.createdAt,
      // BUG: Exposing all other user data for admins
      ...(user.role === 'admin' && {
        allUsers: users.map(u => ({
          id: u.id,
          username: u.username,
          status: u.status
        }))
      })
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Status update endpoint
router.put('/status', [auth, authorize('admin'), adminActionLogger, statusValidation(), validate], async (req, res) => {
  try {
    const { userId, status } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.status = status;
    user.lastSeen = new Date().toISOString();
    webSocket.broadcast(JSON.stringify({ type: 'status-change', payload: { userId: user.id, status: user.status } }));
    res.json({
      message: 'Status updated successfully',
      status: user.status,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
