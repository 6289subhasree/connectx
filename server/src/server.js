require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const app = require('./app');
const { seed } = require('./seed');

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx';

(async () => {
  await mongoose.connect(URI);
  console.log('[db] connected');
  if (process.env.SEED_ON_START === 'true') await seed({ onlyIfEmpty: true });
  app.listen(PORT, () => console.log(`[api] ConnectX running on http://localhost:${PORT}`));
})().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
