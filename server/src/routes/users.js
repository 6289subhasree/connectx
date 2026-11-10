// Profiles, search, favourites, block/report — FR-3, FR-4, FR-10, FR-11, FR-15, FR-18, FR-19, FR-20
const router = require('express').Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { User, Report, Review } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { findMatches } = require('../services/matchService');
const { AppError, asyncH } = require('../utils/errors');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // FR-10: 5 MB
  fileFilter: (req, file, cb) =>
    ['image/jpeg', 'image/png'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new AppError(400, 'BAD_IMAGE', 'Only JPEG or PNG images are allowed')),
});

const isId = (id) => mongoose.isValidObjectId(id);
router.use(requireAuth);

// FR-3 / FR-11: update own profile
router.put(
  '/me',
  asyncH(async (req, res) => {
    const { name, bio, location, availability, skills } = req.body || {};
    const u = req.user;
    if (bio !== undefined) {
      if (String(bio).length > 500) throw new AppError(400, 'BIO_TOO_LONG', 'Bio must be 500 characters or fewer');
      u.bio = String(bio);
    }
    if (name !== undefined && String(name).trim()) u.name = String(name).trim();
    if (location !== undefined) u.location = String(location).slice(0, 80);
    if (availability !== undefined) u.availability = availability;
    if (skills !== undefined) {
      if (!Array.isArray(skills)) throw new AppError(400, 'BAD_SKILLS', 'Skills must be a list');
      u.skills = skills
        .filter((s) => s && String(s.name || '').trim())
        .slice(0, 30)
        .map((s) => ({ name: String(s.name).trim(), level: s.level || 'beginner', intent: s.intent }));
    }
    await u.save();
    res.json({ user: u.toSelf() });
  })
);

// FR-10: profile photo
router.post(
  '/me/photo',
  (req, res, next) =>
    upload.single('photo')(req, res, (err) => {
      if (err && err.code === 'LIMIT_FILE_SIZE') return next(new AppError(400, 'TOO_LARGE', 'Image must be 5 MB or smaller'));
      next(err);
    }),
  asyncH(async (req, res) => {
    if (!req.file) throw new AppError(400, 'NO_FILE', 'Choose an image to upload');
    req.user.photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await req.user.save();
    res.json({ user: req.user.toSelf() });
  })
);

// FR-4 / FR-20: search complementary partners
router.get(
  '/search',
  asyncH(async (req, res) => {
    const t0 = Date.now();
    const { want = '', teach = '', level = '', location = '', availability = '' } = req.query;
    const query = { status: 'active', role: 'user' };
    if (want) query['skills.name'] = new RegExp(String(want).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const candidates = await User.find(query).limit(500);
    const results = findMatches(req.user, candidates, { want, teach, level, location, availability });
    res.json({ results, tookMs: Date.now() - t0 });
  })
);

// FR-19: favourites
router.get(
  '/favorites',
  asyncH(async (req, res) => {
    const favs = await User.find({ _id: { $in: req.user.favorites } });
    res.json({ favorites: favs.map((f) => f.toPublic()) });
  })
);

router.post(
  '/:id/favorite',
  asyncH(async (req, res) => {
    if (!isId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const idx = req.user.favorites.findIndex((f) => String(f) === req.params.id);
    if (idx >= 0) req.user.favorites.splice(idx, 1);
    else req.user.favorites.push(req.params.id);
    await req.user.save();
    res.json({ favorite: idx < 0, user: req.user.toSelf() });
  })
);

// FR-15: block (toggle) and report
router.post(
  '/:id/block',
  asyncH(async (req, res) => {
    if (!isId(req.params.id) || req.params.id === String(req.user._id)) throw new AppError(400, 'BAD_ID', 'Invalid member');
    const idx = req.user.blocked.findIndex((f) => String(f) === req.params.id);
    if (idx >= 0) req.user.blocked.splice(idx, 1);
    else req.user.blocked.push(req.params.id);
    await req.user.save();
    res.json({ blocked: idx < 0, user: req.user.toSelf() });
  })
);

router.post(
  '/:id/report',
  asyncH(async (req, res) => {
    if (!isId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const reason = String(req.body?.reason || '').trim();
    if (!reason) throw new AppError(400, 'REASON_REQUIRED', 'Please describe the problem');
    const r = await Report.create({ reporter: req.user._id, reported: req.params.id, reason });
    if (!req.user.blocked.map(String).includes(req.params.id)) {
      req.user.blocked.push(req.params.id); // reporting also restricts contact
      await req.user.save();
    }
    res.status(201).json({ report: r });
  })
);

// FR-18: public profile with average rating + completed exchanges + reviews
router.get(
  '/:id',
  asyncH(async (req, res) => {
    if (!isId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const u = await User.findById(req.params.id);
    if (!u || u.role === 'admin') throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const reviews = await Review.find({ reviewee: u._id }).sort({ createdAt: -1 }).limit(10).populate('reviewer', 'name');
    res.json({
      user: u.toPublic(),
      reviews: reviews.map((r) => ({ stars: r.stars, comment: r.comment, by: r.reviewer?.name, at: r.createdAt })),
      isFavorite: req.user.favorites.map(String).includes(String(u._id)),
      isBlocked: req.user.blocked.map(String).includes(String(u._id)),
    });
  })
);

module.exports = router;
