// FR-2: JWT auth with a 30-minute *inactivity* timeout.
// Each token lives 30 min; every authenticated response returns a fresh token in
// the X-Refresh-Token header, so the session only expires after 30 idle minutes.
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/errors');

const SECRET = () => process.env.JWT_SECRET || 'dev-only-secret-change-me';
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
    if (user.status !== 'active' && req.method !== 'GET')
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
