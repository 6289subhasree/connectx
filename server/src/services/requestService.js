// Exchange request workflow — FR-5, FR-6, FR-7
// createRequest() follows the basis-path design in Test Plan B.8 node-for-node,
// so its 5 independent paths (V(G) = 5) map directly onto tests P1..P5.
const { ExchangeRequest, Session } = require('../models');
const { notify } = require('./notificationService');
const { AppError } = require('../utils/errors');

const MESSAGES = {
  ACCOUNT_INACTIVE: 'Your account cannot send requests',
  SELF_REQUEST: 'You cannot send a request to yourself',
  SKILL_MISMATCH: 'Selected skills do not match the profiles',
  DUPLICATE_PENDING: 'You already have a pending request',
  BLOCKED: 'You cannot contact this member',
};

const db = {
  pendingExists: (s, r, offered, wanted) =>
    ExchangeRequest.exists({
      sender: s._id,
      recipient: r._id,
      offeredSkill: new RegExp(`^${escapeRe(offered)}$`, 'i'),
      wantedSkill: new RegExp(`^${escapeRe(wanted)}$`, 'i'),
      status: 'pending',
    }),
  savePending: (s, r, offered, wanted, message) =>
    ExchangeRequest.create({ sender: s._id, recipient: r._id, offeredSkill: offered, wantedSkill: wanted, message }),
};

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(code) {
  return new AppError(code === 'DUPLICATE_PENDING' ? 409 : code === 'ACCOUNT_INACTIVE' || code === 'BLOCKED' ? 403 : 400, code, MESSAGES[code]);
}

async function createRequest(s, r, offered, wanted, message = '') {
  if (s.status !== 'active') throw fail('ACCOUNT_INACTIVE');                 // Node 1 -> 2
  if (String(s._id) === String(r._id)) throw fail('SELF_REQUEST');           // Node 3 -> 4
  if (!s.teaches(offered) || !r.teaches(wanted)) throw fail('SKILL_MISMATCH'); // Node 5 -> 6
  if (await db.pendingExists(s, r, offered, wanted)) throw fail('DUPLICATE_PENDING'); // Node 7 -> 8
  // FR-15: blocked members cannot contact each other (checked after the core rules)
  if (r.blocked.some((id) => String(id) === String(s._id)) || s.blocked.some((id) => String(id) === String(r._id)))
    throw fail('BLOCKED');
  const req = await db.savePending(s, r, offered, wanted, message);          // Node 9
  await notify(r._id, 'request', `${s.name} sent you an exchange request: learn ${wanted}, teach ${offered}`, '/requests'); // Node 10
  return req;                                                                // Node 11
}

// State transition: only pending -> accepted | declined is valid
async function decide(request, actor, decision, decisionMessage = '') {
  if (String(request.recipient._id || request.recipient) !== String(actor._id))
    throw new AppError(403, 'FORBIDDEN', 'Only the recipient can decide on this request');
  if (request.status !== 'pending')
    throw new AppError(409, 'INVALID_TRANSITION', `Request is already ${request.status}`);
  if (!['accepted', 'declined'].includes(decision))
    throw new AppError(400, 'BAD_DECISION', 'Decision must be accepted or declined');

  request.status = decision;
  request.decisionMessage = decisionMessage;
  await request.save(); // persistDecision

  const senderId = request.sender._id || request.sender;
  // notifyBoth
  await notify(senderId, 'decision', `${actor.name} ${decision} your exchange request${decisionMessage ? `: "${decisionMessage}"` : ''}`, '/requests');
  await notify(actor._id, 'decision', `You ${decision} an exchange request`, '/requests');
  return request;
}

async function scheduleSession(request, actor, startAt, durationMins = 60, mode) {
  const parties = [String(request.sender._id || request.sender), String(request.recipient._id || request.recipient)];
  if (!parties.includes(String(actor._id))) throw new AppError(403, 'FORBIDDEN', 'Not part of this exchange');
  if (request.status !== 'accepted')
    throw new AppError(409, 'NOT_ACCEPTED', 'Sessions can only be arranged for accepted requests');
  const when = new Date(startAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now())
    throw new AppError(400, 'BAD_TIME', 'Choose a future date and time');
  const session = await Session.create({
    request: request._id,
    participants: parties,
    proposedBy: actor._id,
    startAt: when,
    durationMins,
    mode: mode || 'Online (Google Meet)',
  });
  const other = parties.find((p) => p !== String(actor._id));
  await notify(other, 'session', `${actor.name} proposed a session on ${when.toUTCString()} — please confirm`, '/sessions');
  return session;
}

module.exports = { createRequest, decide, scheduleSession, MESSAGES, db };
