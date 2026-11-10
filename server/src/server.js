require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const app = require('./app');
const { connectDB } = require('./db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    console.log('[db] connected');
    app.listen(PORT, () => console.log(`[api] ConnectX running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Failed to start:', e.message);
    process.exit(1);
  });
