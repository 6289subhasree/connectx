// Vercel serverless entry: every /api/* request is routed here (see vercel.json).
const app = require('../server/src/app');
const { connectDB } = require('../server/src/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (e) {
    console.error('[db]', e.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Database unavailable. Check MONGODB_URI.', code: 'DB_DOWN' }));
  }
  return app(req, res);
};
