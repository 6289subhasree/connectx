// FR-2: JWT auth with a 30-minute *inactivity* timeout.
// Each token lives 30 min; every authenticated response returns a fresh token in
// the X-Refresh-Token header, so the session only expires after 30 idle minutes.
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/errors');

const crypto = require('crypto');

// JWT_SECRET if set; otherwise a key derived from the database URL, which is
// already a secret on the server. Every serverless instance derives the same key.
let derived = null;
const SECRET = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!derived) {
    const base = process.env.MONGODB_URI || 'dev-only-secret-change-me';
    derived = crypto.createHash('sha256').update(`connectx-jwt:${base}`).digest('hex');
  }
  return derived;
};
const IDLE = process.env.SESSION_IDLE || '30m';

const sign = (user) => jwt.sign({ sub: String(user._id), role: user.role }, SECRET(), { expiresIn: IDLE });

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new AppError(401, 'NO_TOKEN', 'Please sign in');
    let payload;
    try {
      payload = jwt.verify(token, SECRET());
    } catch {
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session expired after 30 minutes of inactivity. Please sign in again.');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError(401, 'NO_USER', 'Account not found');
    // Suspended accounts are read-only. POST /api/requests is left to
    // RequestService.createRequest(), whose Node 1 owns that rule (Test Plan B.8).
    const isCreateRequest = req.method === 'POST' && req.originalUrl.split('?')[0] === '/api/requests';
    if (user.status !== 'active' && req.method !== 'GET' && !isCreateRequest)
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Your account is suspended');
    req.user = user;
    res.set('X-Refresh-Token', sign(user));
    next();
  } catch (e) {
    next(e);
  }
}

const requireAdmin = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : next(new AppError(403, 'ADMIN_ONLY', 'Admins only'));

module.exports = { sign, requireAuth, requireAdmin };
