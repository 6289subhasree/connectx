process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { seed, PASSWORD } = require('../src/seed');
const { User } = require('../src/models');

const URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/connectx_test';

async function setup() {
  if (mongoose.connection.readyState === 0) await mongoose.connect(URI);
  await seed();
}
async function teardown() {
  await mongoose.disconnect();
}
async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.body.token;
}
const userId = async (email) => String((await User.findOne({ email }))._id);
const api = () => request(app);

module.exports = { setup, teardown, login, userId, api, app };
