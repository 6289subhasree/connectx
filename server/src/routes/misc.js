// Messaging (FR-8), notifications (FR-12) and admin moderation (FR-16)
const express = require('express');
const mongoose = require('mongoose');
const { User, Message, Notification, Report, ExchangeRequest } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { notify } = require('../services/notificationService');
const { AppError, asyncH } = require('../utils/errors');

const isId = (id) => mongoose.isValidObjectId(id);

/* ---------------- Messages ---------------- */
const messages = express.Router();
messages.use(requireAuth);

// Conversation list: everyone I have an exchange with (any status except cancelled)
messages.get(
  '/',
  asyncH(async (req, res) => {
    const reqs = await ExchangeRequest.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      status: { $in: ['pending', 'accepted', 'declined'] },
    }).populate('sender recipient', 'name photo');
    const map = new Map();
    for (const r of reqs) {
      const p = String(r.sender._id) === String(req.user._id) ? r.recipient : r.sender;
      if (!map.has(String(p._id))) map.set(String(p._id), { id: p._id, name: p.name, photo: p.photo, unread: 0, last: null });
    }
    const ids = [...map.keys()];
    const msgs = await Message.find({
      $or: [
        { from: req.user._id, to: { $in: ids } },
        { to: req.user._id, from: { $in: ids } },
      ],
    }).sort({ createdAt: 1 });
    for (const m of msgs) {
      const other = String(m.from) === String(req.user._id) ? String(m.to) : String(m.from);
      const c = map.get(other);
      if (!c) continue;
      c.last = { content: m.content, at: m.createdAt };
      if (String(m.to) === String(req.user._id) && !m.read) c.unread += 1;
    }
    const list = [...map.values()].sort((a, b) => new Date(b.last?.at || 0) - new Date(a.last?.at || 0));
    res.json({ conversations: list });
  })
);

async function assertCanTalk(me, otherId) {
  if (!isId(otherId)) throw new AppError(404, 'NOT_FOUND', 'Member not found');
  const other = await User.findById(otherId);
  if (!other) throw new AppError(404, 'NOT_FOUND', 'Member not found');
  if (me.blocked.map(String).includes(otherId) || other.blocked.map(String).includes(String(me._id)))
    throw new AppError(403, 'BLOCKED', 'You cannot contact this member');
  const linked = await ExchangeRequest.exists({
    $or: [
      { sender: me._id, recipient: other._id },
      { sender: other._id, recipient: me._id },
    ],
  });
  if (!linked) throw new AppError(403, 'NO_EXCHANGE', 'You can message members you have an exchange request with');
  return other;
}

messages.get(
  '/:userId',
  asyncH(async (req, res) => {
    const other = await assertCanTalk(req.user, req.params.userId);
    const list = await Message.find({
      $or: [
        { from: req.user._id, to: other._id },
        { from: other._id, to: req.user._id },
      ],
    }).sort({ createdAt: 1 });
    await Message.updateMany({ from: other._id, to: req.user._id, read: false }, { $set: { read: true } });
    res.json({ partner: other.toPublic(), messages: list });
  })
);

messages.post(
  '/:userId',
  asyncH(async (req, res) => {
    const other = await assertCanTalk(req.user, req.params.userId);
    const content = String(req.body?.content || '').trim();
    if (!content) throw new AppError(400, 'EMPTY', 'Message cannot be empty');
    const m = await Message.create({ from: req.user._id, to: other._id, content: content.slice(0, 2000) });
    // FR-12: notify, but don't flood — only if they have no unread notification from this chat
    const recent = await Notification.exists({ user: other._id, type: 'message', link: `/messages/${req.user._id}`, readAt: null });
    if (!recent) await notify(other._id, 'message', `New message from ${req.user.name}`, `/messages/${req.user._id}`);
    res.status(201).json({ message: m });
  })
);

/* ---------------- Notifications ---------------- */
const notifications = express.Router();
notifications.use(requireAuth);
notifications.get(
  '/',
  asyncH(async (req, res) => {
    const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ notifications: list, unread: list.filter((n) => !n.readAt).length });
  })
);
notifications.post(
  '/read',
  asyncH(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  })
);

/* ---------------- Admin (FR-16) ---------------- */
const admin = express.Router();
admin.use(requireAuth, requireAdmin);
admin.get(
  '/reports',
  asyncH(async (req, res) => {
    const list = await Report.find().sort({ createdAt: -1 }).populate('reporter reported', 'name email status');
    res.json({ reports: list });
  })
);
admin.get(
  '/stats',
  asyncH(async (req, res) => {
    const [users, requests, open] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      ExchangeRequest.countDocuments(),
      Report.countDocuments({ status: 'open' }),
    ]);
    res.json({ users, requests, openReports: open });
  })
);
admin.post(
  '/reports/:id',
  asyncH(async (req, res) => {
    if (!isId(req.params.id)) throw new AppError(404, 'NOT_FOUND', 'Report not found');
    const r = await Report.findById(req.params.id);
    if (!r) throw new AppError(404, 'NOT_FOUND', 'Report not found');
    const { action } = req.body || {};
    if (action === 'suspend') {
      await User.updateOne({ _id: r.reported }, { $set: { status: 'suspended' } });
      r.status = 'actioned';
    } else if (action === 'reinstate') {
      await User.updateOne({ _id: r.reported }, { $set: { status: 'active' } });
      r.status = 'dismissed';
    } else if (action === 'dismiss') {
      r.status = 'dismissed';
    } else throw new AppError(400, 'BAD_ACTION', 'Action must be suspend, reinstate or dismiss');
    await r.save();
    res.json({ report: r });
  })
);

module.exports = { messages, notifications, admin };
