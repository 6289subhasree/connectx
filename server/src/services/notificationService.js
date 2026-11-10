// Notification dispatcher (HLD application layer) — FR-12
// Writes an in-app notification record and, if SMTP is configured, sends an email.
// SMTP is optional: any free SMTP works (Gmail app password, Brevo free tier, or
// MailHog locally as used in the test plan). Without SMTP the email is logged.
const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const sentEmails = []; // kept for tests / demo inspection (like MailHog)

async function sendEmail(to, subject, text) {
  const mail = { from: process.env.MAIL_FROM || 'ConnectX <no-reply@connectx.local>', to, subject, text };
  sentEmails.push(mail);
  if (sentEmails.length > 100) sentEmails.shift();
  if (transporter) {
    try {
      await transporter.sendMail(mail);
    } catch (e) {
      console.warn('[mail] send failed:', e.message);
    }
  } else if (process.env.NODE_ENV !== 'test') {
    console.log(`[mail:dev] to=${to} subject="${subject}"`);
  }
}

async function notify(userId, type, text, link = '') {
  const n = await Notification.create({ user: userId, type, text, link, channel: 'in-app+email' });
  const user = await User.findById(userId).select('email name');
  if (user) await sendEmail(user.email, `ConnectX: ${text}`, `Hi ${user.name},\n\n${text}\n\nOpen ConnectX to view it.`);
  return n;
}

module.exports = { notify, sendEmail, sentEmails };
