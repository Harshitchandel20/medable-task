# How I did this task

I walked through the README checklist and matched it against the codebase so I could explain what currently works and what still needs polish.

## Security fixes
- Password hashing now uses `bcrypt` everywhere (seed data and registration) so no plain text secrets linger.
- Secrets such as the JWT key and admin decrypt key are read from the environment, keeping them out of the repo.
- Login failures trigger the lockout helper and the shared error handler hides stack traces, so brute force and leakage are limited.
- Logging out drops the JWT into a blacklist and admin actions get written to `admin-actions.log` for traceability.
- Still pending: proper session cleanup/expiry rotation and deeper input sanitisation beyond the current express-validator checks.

## Authorization work
- Private rooms deny access to non-members and message edits/deletes double-check the current user owns the content.
- The admin-only status update route is protected by the authorize middleware plus a logger.
- Still pending: trimming the profile response so admins cannot see every user by default.

## Real-time pieces
- The WebSocket server is wired in `websocket.js` to broadcast new messages, delivery receipts, status changes, and typing indicators.
- Presence updates fire whenever users log in or out through the auth routes.

## Extra challenges touched
- Rate limiting, file uploads via S3, and account lockout give a head start on the bonus security goals.
- The whisper endpoint keeps the puzzle data in one place (`data.js`) and exposes helper hints for the cipher chain.

## What I would finish next
- Add automated cleanup for blacklisted tokens, harden validation (escaping, length caps), and close the remaining data exposure holes noted in the README. Then, I will work on the advanced objectives and using best coding practices.
