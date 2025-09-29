const failedLoginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const recordFailedLogin = (username) => {
  const attempts = failedLoginAttempts.get(username) || { count: 0, lockoutUntil: null };
  
  if (attempts.lockoutUntil && attempts.lockoutUntil > Date.now()) {
    return; // Already locked out
  }

  attempts.count++;
  
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockoutUntil = Date.now() + LOCKOUT_TIME;
    attempts.count = 0; // Reset after lockout
  }
  
  failedLoginAttempts.set(username, attempts);
};

const isLockedOut = (username) => {
  const attempts = failedLoginAttempts.get(username);
  if (attempts && attempts.lockoutUntil && attempts.lockoutUntil > Date.now()) {
    return true;
  }
  return false;
};

const clearFailedLogins = (username) => {
  failedLoginAttempts.delete(username);
};

module.exports = {
  recordFailedLogin,
  isLockedOut,
  clearFailedLogins,
};
