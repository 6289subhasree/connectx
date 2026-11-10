// Integration (B.9) and system (B.10) test cases, exercised through the HTTP API
const { setup, teardown, login, userId, api } = require('./helpers');
const { ExchangeRequest, Session, User } = require('../src/models');
const { sentEmails } = require('../src/services/notificationService');

const auth = (t) => ({ Authorization: `Bearer ${t}` });
let tA, tPriya, priyaId, reqId;

beforeAll(async () => {
  await setup();
  tA = await login('subhasree@example.com');
  tPriya = await login('priya@example.com');
  priyaId = await userId('priya@example.com');
});
afterAll(teardown);

describe('B.9 Integration tests', () => {
  test('IT-01 Matching + DB: only complementary candidates returned with ratings', async () => {
    const res = await api().get('/api/users/search').query({ want: 'UI design', teach: 'Python' }).set(auth(tA));
    const names = res.body.results.map((r) => r.user.name);
    expect(names.slice(0, 2)).toEqual(['Priya Sen', 'Arjun Roy']);
    expect(names).not.toContain('Rahul Das');
    expect(res.body.results[0].user.ratingAvg).toBe(4.8);
  });

  test('IT-02 Request service + DB: savePending stores Pending and returns id', async () => {
    const res = await api().post('/api/requests').set(auth(tA)).send({ recipientId: priyaId, offeredSkill: 'Python', wantedSkill: 'UI design', message: "Hi Priya, let's exchange skills." });
    expect(res.status).toBe(201);
    reqId = res.body.request._id;
    expect((await ExchangeRequest.findById(reqId)).status).toBe('pending');
  });

  test('IT-03 Notification dispatcher + SMTP stub: in-app record + email payload captured', async () => {
    const notes = await api().get('/api/notifications').set(auth(tPriya));
    expect(notes.body.notifications[0].text).toMatch(/Subhasree Paul sent you an exchange request/);
    expect(sentEmails.some((m) => m.to === 'priya@example.com' && /exchange request/.test(m.subject))).toBe(true);
  });

  test('IT-05a Session module: scheduling for a Pending request is rejected', async () => {
    const res = await api().post(`/api/requests/${reqId}/sessions`).set(auth(tA)).send({ startAt: new Date(Date.now() + 3 * 864e5) });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOT_ACCEPTED');
  });

  test('IT-04 Web UI + Request service: Accept → Accepted in DB; both notified', async () => {
    const res = await api().post(`/api/requests/${reqId}/decision`).set(auth(tPriya)).send({ decision: 'accepted', message: 'Happy to!' });
    expect(res.body.request.status).toBe('accepted');
    expect((await ExchangeRequest.findById(reqId)).status).toBe('accepted');
    const a = await api().get('/api/notifications').set(auth(tA));
    expect(a.body.notifications[0].text).toMatch(/Priya Sen accepted/);
  });

  test('State transition: accepting an already-decided request is invalid', async () => {
    const res = await api().post(`/api/requests/${reqId}/decision`).set(auth(tPriya)).send({ decision: 'declined' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  test('IT-05b Session module: session saved for the Accepted request', async () => {
    const res = await api().post(`/api/requests/${reqId}/sessions`).set(auth(tA)).send({ startAt: new Date(Date.now() + 3 * 864e5) });
    expect(res.status).toBe(201);
    expect(res.body.session.status).toBe('scheduled');
  });
});

describe('B.10 System tests (API level)', () => {
  test('ST-01 Register and log in; wrong password rejected', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'Test User', email: 'new@example.com', password: 'Strong123' });
    expect(reg.status).toBe(201);
    const ok = await api().post('/api/auth/login').send({ email: 'new@example.com', password: 'Strong123' });
    expect(ok.status).toBe(200);
    const bad = await api().post('/api/auth/login').send({ email: 'new@example.com', password: 'Wrong1234' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Incorrect email or password');
  });

  test('ST-02 Create skill profile', async () => {
    const t = (await api().post('/api/auth/login').send({ email: 'new@example.com', password: 'Strong123' })).body.token;
    const res = await api().put('/api/users/me').set(auth(t)).send({
      bio: 'Hello', location: 'Kolkata',
      skills: [{ name: 'Python', level: 'advanced', intent: 'teach' }, { name: 'UI design', level: 'beginner', intent: 'learn' }],
    });
    expect(res.body.user.skills).toHaveLength(2);
    expect(res.body.user.location).toBe('Kolkata');
  });

  test('ST-04/ST-06 Confirm → complete → 4-star review updates Priya average', async () => {
    const s = await Session.findOne({ request: reqId });
    expect((await api().post(`/api/sessions/${s._id}/confirm`).set(auth(tPriya))).body.session.status).toBe('confirmed');
    expect((await api().post(`/api/sessions/${s._id}/complete`).set(auth(tA))).body.session.status).toBe('completed');
    const rev = await api().post(`/api/sessions/${s._id}/review`).set(auth(tA)).send({ stars: 4, comment: 'Great teacher' });
    expect(rev.status).toBe(201);
    expect(rev.body.ratingAvg).toBe(4.7); // (4.8*12 + 4) / 13
    const again = await api().post(`/api/sessions/${s._id}/review`).set(auth(tA)).send({ stars: 5 });
    expect(again.body.code).toBe('ALREADY_REVIEWED');
    const hist = await api().get('/api/requests').set(auth(tPriya));
    expect(hist.body.requests.find((r) => r._id === reqId).sessions).toHaveLength(1);
  });

  test('ST-05 Decline flow: status Declined, sender notified', async () => {
    const tRahul = await login('rahul@example.com');
    const rid = (await ExchangeRequest.findOne({ offeredSkill: 'Guitar basics' }))._id;
    const res = await api().post(`/api/requests/${rid}/decision`).set(auth(tA)).send({ decision: 'declined', message: 'No time this month' });
    expect(res.body.request.status).toBe('declined');
    const n = await api().get('/api/notifications').set(auth(tRahul));
    expect(n.body.notifications[0].text).toMatch(/declined.*No time this month/);
  });

  test('ST-06 Message delivered in conversation', async () => {
    await api().post(`/api/messages/${priyaId}`).set(auth(tA)).send({ content: 'Thanks for the session!' });
    const conv = await api().get(`/api/messages/${await userId('subhasree@example.com')}`).set(auth(tPriya));
    expect(conv.body.messages.at(-1).content).toBe('Thanks for the session!');
  });
});

describe('Security & moderation', () => {
  test('Unauthenticated API call rejected', async () => {
    expect((await api().get('/api/requests')).status).toBe(401);
  });
  test("A user cannot view another pair's request", async () => {
    const tKabir = await login('kabir@example.com');
    expect((await api().get(`/api/requests/${reqId}`).set(auth(tKabir))).status).toBe(403);
  });
  test('NoSQL injection in login is neutralised', async () => {
    const res = await api().post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(401);
  });
  test('Passwords are stored as bcrypt hashes', async () => {
    const u = await User.findOne({ email: 'new@example.com' });
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
  });
  test('FR-15/16 Report → admin suspends → suspended user cannot log in', async () => {
    const tMeera = await login('meera@example.com');
    const kabirId = await userId('kabir@example.com');
    await api().post(`/api/users/${kabirId}/report`).set(auth(tMeera)).send({ reason: 'Spam' });
    const tAdmin = await login('admin@connectx.com');
    const reports = await api().get('/api/admin/reports').set(auth(tAdmin));
    expect(reports.body.reports.length).toBeGreaterThan(0);
    const r = reports.body.reports.find((x) => x.reported._id === kabirId);
    await api().post(`/api/admin/reports/${r._id}`).set(auth(tAdmin)).send({ action: 'suspend' });
    const login2 = await api().post('/api/auth/login').send({ email: 'kabir@example.com', password: 'Connect@123' });
    expect(login2.body.code).toBe('ACCOUNT_INACTIVE');
  });
  test('Non-admin cannot reach admin console', async () => {
    expect((await api().get('/api/admin/reports').set(auth(tA))).status).toBe(403);
  });
  test('FR-17 Password reset link works once', async () => {
    const f = await api().post('/api/auth/forgot').send({ email: 'priya@example.com' });
    const token = f.body.devLink.split('/reset/')[1];
    expect((await api().post(`/api/auth/reset/${token}`).send({ password: 'NewPass123' })).status).toBe(200);
    expect((await api().post(`/api/auth/reset/${token}`).send({ password: 'NewPass123' })).status).toBe(400);
    expect((await api().post('/api/auth/login').send({ email: 'priya@example.com', password: 'NewPass123' })).status).toBe(200);
  });
});
