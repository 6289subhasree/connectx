const mongoose = require('mongoose');
const User = require('./User');

const { ObjectId } = mongoose.Schema.Types;

// UML: ExchangeRequest { requestId, senderId, recipientId, offeredSkill, wantedSkill, status }
// State machine: pending -> accepted | declined  (cancelled by sender while pending)
const exchangeRequestSchema = new mongoose.Schema(
  {
    sender: { type: ObjectId, ref: 'User', required: true },
    recipient: { type: ObjectId, ref: 'User', required: true },
    offeredSkill: { type: String, required: true }, // sender teaches this
    wantedSkill: { type: String, required: true },  // recipient teaches this
    message: { type: String, maxlength: 500, default: '' },
    decisionMessage: { type: String, maxlength: 500, default: '' }, // FR-6 optional reason
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);
exchangeRequestSchema.index({ sender: 1, recipient: 1, status: 1 });

// UML: Session { sessionId, startAt, status } — Scheduled -> Confirmed -> Completed | Cancelled
const sessionSchema = new mongoose.Schema(
  {
    request: { type: ObjectId, ref: 'ExchangeRequest', required: true },
    participants: [{ type: ObjectId, ref: 'User' }],
    proposedBy: { type: ObjectId, ref: 'User', required: true },
    startAt: { type: Date, required: true },
    durationMins: { type: Number, default: 60 },
    mode: { type: String, default: 'Online (Google Meet)' },
    status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// UML: Message { messageId, content, sentAt }
const messageSchema = new mongoose.Schema(
  {
    from: { type: ObjectId, ref: 'User', required: true },
    to: { type: ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
messageSchema.index({ from: 1, to: 1, createdAt: 1 });

// UML: Review { reviewId, stars: 1..5, comment }
const reviewSchema = new mongoose.Schema(
  {
    session: { type: ObjectId, ref: 'Session', required: true },
    reviewer: { type: ObjectId, ref: 'User', required: true },
    reviewee: { type: ObjectId, ref: 'User', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// UML: Notification { notificationId, channel, readAt }
const notificationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    text: { type: String, required: true },
    link: { type: String, default: '' },
    channel: { type: String, default: 'in-app' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// UML: Report { reportId, reason, status }
const reportSchema = new mongoose.Schema(
  {
    reporter: { type: ObjectId, ref: 'User', required: true },
    reported: { type: ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'dismissed', 'actioned'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = {
  User,
  ExchangeRequest: mongoose.model('ExchangeRequest', exchangeRequestSchema),
  Session: mongoose.model('Session', sessionSchema),
  Message: mongoose.model('Message', messageSchema),
  Review: mongoose.model('Review', reviewSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Report: mongoose.model('Report', reportSchema),
};
