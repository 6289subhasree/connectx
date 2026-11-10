// Shared MongoDB connection. On Vercel each serverless instance reuses the
// cached connection between requests instead of reconnecting every time.
const mongoose = require('mongoose');

let pending = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!pending) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx';
    pending = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then(async (m) => {
        if (process.env.SEED_ON_START === 'true') {
          const { seed } = require('./seed');
          await seed({ onlyIfEmpty: true });
        }
        return m.connection;
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

module.exports = { connectDB };
