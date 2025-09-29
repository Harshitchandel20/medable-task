const jwt = require('jsonwebtoken');
const tokenBlacklist = new Set();

const auth = (req, res, next) => {
  const authHeader = req.get('authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token is blacklisted. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const logout = (token) => {
    if (token) {
        tokenBlacklist.add(token);
    }
};
  

module.exports = { auth, logout, tokenBlacklist };
