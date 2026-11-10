const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { AppError } = require('./utils/errors');
const { messages, notifications, admin } = require('./routes/misc');

const app = express();
app.set('trust proxy', 1);

// NFR-2: security headers, NoSQL-injection sanitising, rate limiting
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ exposedHeaders: ['X-Refresh-Token'] }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'connectx', time: new Date() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api', require('./routes/exchange'));
app.use('/api/messages', messages);
app.use('/api/notifications', notifications);
app.use('/api/admin', admin);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' }));

// Serve the React build (single-service deploy)
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0].message, code: 'VALIDATION' });
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists', code: 'DUPLICATE' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong', code: 'SERVER_ERROR' });
});

module.exports = app;
