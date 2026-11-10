// Authentication — FR-1, FR-2, FR-17
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { sign, requireAuth } = require('../middleware/auth');
const { sendEmail } = require('../services/notificationService');
const { AppError, asyncH } = require('../utils/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// FR-1: min 8 chars with upper, lower and a number (max 64 per test plan)
function validatePassword(p) {
  if (typeof p !== 'string' || p.length < 8) return 'Password must be at least 8 characters';
  if (p.length > 64) return 'Password must be at most 64 characters';
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p))
    return 'Password must include an uppercase letter, a lowercase letter and a number';
  return null;
}

router.post(
  '/register',
  asyncH(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim()) throw new AppError(400, 'NAME_REQUIRED', 'Name is required');
    if (!EMAIL_RE.test(String(email || ''))) throw new AppError(400, 'BAD_EMAIL', 'Enter a valid email address');
    const pwErr = validatePassword(password);
    if (pwErr) throw new AppError(400, 'WEAK_PASSWORD', pwErr);
    if (await User.exists({ email: String(email).toLowerCase() }))
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    const user = await User.create({
      name: String(name).trim(),
      email,
      passwordHash: await bcrypt.hash(password, 10), // NFR-2 bcrypt
    });
    res.status(201).json({ token: sign(user), user: user.toSelf() });
  })
);

router.post(
  '/login',
  asyncH(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
      throw new AppError(401, 'BAD_CREDENTIALS', 'Incorrect email or password');
    if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account has been suspended');
    res.json({ token: sign(user), user: user.toSelf() });
  })
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSelf() }));

// FR-17: time-limited (15 min) reset link
router.post(
  '/forgot',
  asyncH(async (req, res) => {
    const user = await User.findOne({ email: String(req.body?.email || '').toLowerCase() });
    let devLink;
    if (user) {
      const token = crypto.randomBytes(24).toString('hex');
      user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
      user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const link = `${base}/reset/${token}`;
      await sendEmail(user.email, 'Reset your ConnectX password', `Use this link within 15 minutes:\n${link}`);
      if (!process.env.SMTP_HOST) devLink = link; // demo mode: show link since no mail server
    }
    // Same response whether or not the email exists (no account enumeration)
    res.json({ message: 'If that email is registered, a reset link has been sent.', devLink });
  })
);

router.post(
  '/reset/:token',
  asyncH(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetToken: hash, resetTokenExpires: { $gt: new Date() } });
    if (!user) throw new AppError(400, 'BAD_TOKEN', 'This reset link is invalid or has expired');
    const pwErr = validatePassword(req.body?.password);
    if (pwErr) throw new AppError(400, 'WEAK_PASSWORD', pwErr);
    user.passwordHash = await bcrypt.hash(req.body.password, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();
    res.json({ message: 'Password updated. You can sign in now.' });
  })
);

module.exports = router;
module.exports.validatePassword = validatePassword;
