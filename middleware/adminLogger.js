const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../admin-actions.log');

const adminActionLogger = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    const logEntry = `[${new Date().toISOString()}] Admin '${req.user.username}' performed action: ${req.method} ${req.originalUrl} | Body: ${JSON.stringify(req.body)}\n`;
    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error('Failed to log admin action:', err);
      }
    });
  }
  next();
};

module.exports = adminActionLogger;
