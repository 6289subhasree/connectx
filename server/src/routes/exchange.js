// Exchange requests, sessions and reviews — FR-5, FR-6, FR-7, FR-9, FR-13, FR-14
const router = require('express').Router();
const mongoose = require('mongoose');
const { User, ExchangeRequest, Session, Review } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { createRequest, decide, scheduleSession } = require('../services/requestService');
const { validateStars, averageRating } = require('../services/reviewService');
const { notify } = require('../services/notificationService');
const { AppError, asyncH } = require('../utils/errors');

router.use(requireAuth);
const isId = (id) => mongoose.isValidObjectId(id);
const me = (req) => String(req.user._id);

async function loadRequest(id, user) {
  if (!isId(id)) throw new AppError(404, 'NOT_FOUND', 'Request not found');
  const r = await ExchangeRequest.findById(id).populate('sender recipient', 'name photo ratingAvg');
  if (!r) throw new AppError(404, 'NOT_FOUND', 'Request not found');
  // Authorisation: only the two members can see or act on it (test strategy A.5)
  if (![String(r.sender._id), String(r.recipient._id)].includes(String(user._id)))
    throw new AppError(403, 'FORBIDDEN', 'You are not part of this exchange');
  return r;
}

// FR-5: send request
router.post(
  '/requests',
  asyncH(async (req, res) => {
    const { recipientId, offeredSkill, wantedSkill, message } = req.body || {};
    if (!isId(recipientId)) throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const recipient = await User.findById(recipientId);
    if (!recipient) throw new AppError(404, 'NOT_FOUND', 'Member not found');
    const r = await createRequest(req.user, recipient, offeredSkill, wantedSkill, String(message || '').slice(0, 500));
    res.status(201).json({ request: r });
  })
);

// FR-13: history of all requests + their sessions
router.get(
  '/requests',
  asyncH(async (req, res) => {
    const list = await ExchangeRequest.find({ $or: [{ sender: req.user._id }, { recipient: req.user._id }] })
      .sort({ updatedAt: -1 })
      .populate('sender recipient', 'name photo ratingAvg');
    const sessions = await Session.find({ participants: req.user._id }).sort({ startAt: 1 });
    const myReviews = await Review.find({ reviewer: req.user._id }).select('session');
    const reviewed = new Set(myReviews.map((r) => String(r.session)));
    const out = list.map((r) => {
      const o = r.toObject();
      o.direction = String(r.sender._id) === me(req) ? 'sent' : 'received';
      o.partner = o.direction === 'sent' ? o.recipient : o.sender;
      o.sessions = sessions
        .filter((s) => String(s.request) === String(r._id))
        .map((s) => ({ ...s.toObject(), reviewedByMe: reviewed.has(String(s._id)) }));
      return o;
    });
    res.json({ requests: out });
  })
);

router.get('/requests/:id', asyncH(async (req, res) => res.json({ request: await loadRequest(req.params.id, req.user) })));

// FR-6: accept / decline with optional message
router.post(
  '/requests/:id/decision',
  asyncH(async (req, res) => {
    const r = await loadRequest(req.params.id, req.user);
    const updated = await decide(r, req.user, req.body?.decision, String(req.body?.message || '').slice(0, 500));
    res.json({ request: updated });
  })
);

// Sender may withdraw a pending request
router.post(
  '/requests/:id/cancel',
  asyncH(async (req, res) => {
    const r = await loadRequest(req.params.id, req.user);
    if (String(r.sender._id) !== me(req)) throw new AppError(403, 'FORBIDDEN', 'Only the sender can withdraw');
    if (r.status !== 'pending') throw new AppError(409, 'INVALID_TRANSITION', `Request is already ${r.status}`);
    r.status = 'cancelled';
    await r.save();
    res.json({ request: r });
  })
);

// FR-7: arrange a session (only for accepted requests)
router.post(
  '/requests/:id/sessions',
  asyncH(async (req, res) => {
    const r = await loadRequest(req.params.id, req.user);
    const s = await scheduleSession(r, req.user, req.body?.startAt, Number(req.body?.durationMins) || 60, req.body?.mode);
    res.status(201).json({ session: s });
  })
);

async function loadSession(id, user) {
  if (!isId(id)) throw new AppError(404, 'NOT_FOUND', 'Session not found');
  const s = await Session.findById(id);
  if (!s) throw new AppError(404, 'NOT_FOUND', 'Session not found');
  if (!s.participants.map(String).includes(String(user._id))) throw new AppError(403, 'FORBIDDEN', 'Not your session');
  return s;
}
const otherOf = (s, user) => s.participants.map(String).find((p) => p !== String(user._id));

// Partner confirms the proposed slot
router.post(
  '/sessions/:id/confirm',
  asyncH(async (req, res) => {
    const s = await loadSession(req.params.id, req.user);
    if (s.status !== 'scheduled') throw new AppError(409, 'INVALID_TRANSITION', `Session is ${s.status}`);
    if (String(s.proposedBy) === me(req)) throw new AppError(400, 'OWN_PROPOSAL', 'Your partner needs to confirm this slot');
    s.status = 'confirmed';
    await s.save();
    await notify(otherOf(s, req.user), 'session', `${req.user.name} confirmed your session on ${s.startAt.toUTCString()}`, '/requests');
    res.json({ session: s });
  })
);

// FR-14: cancel at least 24 h in advance, partner notified
router.post(
  '/sessions/:id/cancel',
  asyncH(async (req, res) => {
    const s = await loadSession(req.params.id, req.user);
    if (!['scheduled', 'confirmed'].includes(s.status)) throw new AppError(409, 'INVALID_TRANSITION', `Session is ${s.status}`);
    if (s.startAt.getTime() - Date.now() < 24 * 60 * 60 * 1000)
      throw new AppError(400, 'TOO_LATE', 'Sessions can only be cancelled at least 24 hours in advance');
    s.status = 'cancelled';
    s.cancelReason = String(req.body?.reason || '').slice(0, 300);
    await s.save();
    await notify(otherOf(s, req.user), 'session', `${req.user.name} cancelled the session on ${s.startAt.toUTCString()}`, '/requests');
    res.json({ session: s });
  })
);

// Mark completed (enables reviews). Demo-friendly: allowed once confirmed.
router.post(
  '/sessions/:id/complete',
  asyncH(async (req, res) => {
    const s = await loadSession(req.params.id, req.user);
    if (s.status !== 'confirmed') throw new AppError(409, 'INVALID_TRANSITION', 'Only confirmed sessions can be completed');
    s.status = 'completed';
    await s.save();
    await User.updateMany({ _id: { $in: s.participants } }, { $inc: { completedExchanges: 1 } });
    await notify(otherOf(s, req.user), 'session', `Session marked completed — rate your partner`, '/requests');
    res.json({ session: s });
  })
);

// FR-9: rate a completed session (one review per participant)
router.post(
  '/sessions/:id/review',
  asyncH(async (req, res) => {
    const s = await loadSession(req.params.id, req.user);
    if (s.status !== 'completed') throw new AppError(409, 'NOT_COMPLETED', 'You can rate only after the session is completed');
    const stars = validateStars(req.body?.stars);
    if (await Review.exists({ session: s._id, reviewer: req.user._id }))
      throw new AppError(409, 'ALREADY_REVIEWED', 'You already rated this session');
    const revieweeId = otherOf(s, req.user);
    const review = await Review.create({
      session: s._id,
      reviewer: req.user._id,
      reviewee: revieweeId,
      stars,
      comment: String(req.body?.comment || '').slice(0, 1000),
    });
    const reviewee = await User.findById(revieweeId);
    const { avg, count } = averageRating(reviewee.ratingAvg, reviewee.ratingCount, stars);
    reviewee.ratingAvg = avg;
    reviewee.ratingCount = count;
    await reviewee.save();
    await notify(revieweeId, 'rating', `${req.user.name} rated you ${stars}★`, `/u/${revieweeId}`);
    res.status(201).json({ review, ratingAvg: avg });
  })
);

module.exports = router;
