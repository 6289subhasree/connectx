// Test Plan B.7 (Decision Table) and B.8 (Basis Path) for RequestService.createRequest()
const { setup, teardown, login, userId, api } = require('./helpers');
const { User, ExchangeRequest, Notification } = require('../src/models');

let tA, priyaId, subhasreeId;
beforeAll(async () => {
  await setup();
  tA = await login('subhasree@example.com'); // Sender: teaches Python, wants UI design
  priyaId = await userId('priya@example.com'); // Teaches UI design
  subhasreeId = await userId('subhasree@example.com');
});
afterAll(teardown);

const send = (token, body) => api().post('/api/requests').set('Authorization', `Bearer ${token}`).send(body);
const valid = () => ({ recipientId: priyaId, offeredSkill: 'Python', wantedSkill: 'UI design' });

describe('B.8 Basis path testing — V(G) = 5 independent paths', () => {
  test('P5 1→3→5→7→9→10→11→12 success: Pending saved, recipient notified, id returned', async () => {
    const before = await Notification.countDocuments({ user: priyaId });
    const res = await send(tA, valid());
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request._id).toBeDefined();
    expect(await Notification.countDocuments({ user: priyaId })).toBe(before + 1);
  });

  test('P4 1→3→5→7→8→12 duplicate: DUPLICATE_PENDING, no new record', async () => {
    const before = await ExchangeRequest.countDocuments();
    const res = await send(tA, valid());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_PENDING');
    expect(await ExchangeRequest.countDocuments()).toBe(before);
  });

  test('P3 1→3→5→6→12 skill mismatch: offered Guitar not in sender list', async () => {
    const res = await send(tA, { ...valid(), offeredSkill: 'Guitar' });
    expect(res.body.code).toBe('SKILL_MISMATCH');
  });

  test('P2 1→3→4→12 request to self', async () => {
    const res = await send(tA, { recipientId: subhasreeId, offeredSkill: 'Python', wantedSkill: 'Python' });
    expect(res.body.code).toBe('SELF_REQUEST');
  });

  test('P1 1→2→12 sender inactive: ACCOUNT_INACTIVE, nothing saved', async () => {
    const tR = await login('rahul@example.com');
    await User.updateOne({ email: 'rahul@example.com' }, { status: 'suspended' });
    const before = await ExchangeRequest.countDocuments();
    const res = await send(tR, { recipientId: subhasreeId, offeredSkill: 'Guitar basics', wantedSkill: 'Python' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_INACTIVE');
    expect(await ExchangeRequest.countDocuments()).toBe(before);
    await User.updateOne({ email: 'rahul@example.com' }, { status: 'active' });
  });
});

describe('B.7 Decision table — exchange-request submission rule', () => {
  beforeAll(async () => {
    await ExchangeRequest.deleteMany({ sender: subhasreeId, recipient: priyaId });
  });

  test('DT-01 (R1) Active + valid skills + no existing → saved Pending; Priya notified', async () => {
    const res = await send(tA, valid());
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('pending');
  });
  test('DT-02 (R2) existing pending request → "You already have a pending request"', async () => {
    const res = await send(tA, valid());
    expect(res.body.error).toBe('You already have a pending request');
  });
  test('DT-03 (R3) offers Guitar (not in own list) → "Selected skills do not match the profiles"', async () => {
    const res = await send(tA, { ...valid(), offeredSkill: 'Guitar' });
    expect(res.body.error).toBe('Selected skills do not match the profiles');
  });
  test('DT-04 (R5) sender Blocked → "Your account cannot send requests"', async () => {
    const tK = await login('ishaan@example.com');
    await User.updateOne({ email: 'ishaan@example.com' }, { status: 'suspended' });
    const res = await send(tK, { recipientId: priyaId, offeredSkill: 'C++', wantedSkill: 'UI design' });
    expect(res.body.error).toBe('Your account cannot send requests');
    await User.updateOne({ email: 'ishaan@example.com' }, { status: 'active' });
  });
});
