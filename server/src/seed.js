// Seed data mirroring the HLD wireframes and test plan (Priya Sen, Arjun Roy, Rahul Das …)
// All demo accounts use the password: Connect@123
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ExchangeRequest, Session, Message, Review, Notification, Report } = require('./models');

const PASSWORD = 'Connect@123';

const people = [
  { name: 'Subhasree Paul', email: 'subhasree@example.com', location: 'Kolkata', availability: 'evenings',
    bio: 'CSE student at IEM. I write Python every day and want to get better at interface design.',
    teach: [['Python', 'advanced'], ['Data Structures', 'intermediate']], learn: [['UI design', 'beginner']] },
  { name: 'Priya Sen', email: 'priya@example.com', location: 'Kolkata', availability: 'weekends', rating: [4.8, 12], done: 9,
    bio: 'UI designer. Enjoys teaching interface design; wants Python skills.',
    teach: [['UI design', 'advanced'], ['Figma', 'expert']], learn: [['Python', 'beginner']] },
  { name: 'Arjun Roy', email: 'arjun@example.com', location: 'Salt Lake', availability: 'weekends', rating: [4.6, 8], done: 6,
    bio: 'Product designer who wants to automate boring work with Python.',
    teach: [['UI design', 'intermediate'], ['Photography', 'advanced']], learn: [['Python', 'beginner']] },
  { name: 'Rahul Das', email: 'rahul@example.com', location: 'Howrah', availability: 'evenings', rating: [4.3, 5], done: 3,
    bio: 'Guitarist for 8 years. Learning Python for music tech.',
    teach: [['Guitar basics', 'expert']], learn: [['Python', 'beginner']] },
  { name: 'Ananya Ghosh', email: 'ananya@example.com', location: 'Kolkata', availability: 'flexible', rating: [4.9, 15], done: 11,
    bio: 'Frontend developer. Happy to teach React; want to learn public speaking.',
    teach: [['React', 'expert'], ['UI design', 'intermediate']], learn: [['Public speaking', 'beginner']] },
  { name: 'Kabir Mehta', email: 'kabir@example.com', location: 'New Town', availability: 'weekdays', rating: [4.1, 4], done: 2,
    bio: 'Data analyst. Teaching SQL and Excel; want to learn guitar.',
    teach: [['SQL', 'advanced'], ['Excel', 'expert']], learn: [['Guitar basics', 'beginner']] },
  { name: 'Meera Iyer', email: 'meera@example.com', location: 'Kolkata', availability: 'weekends', rating: [4.7, 9], done: 7,
    bio: 'Classical vocalist and Carnatic music teacher. Curious about photography.',
    teach: [['Singing', 'expert']], learn: [['Photography', 'beginner']] },
  { name: 'Ishaan Bose', email: 'ishaan@example.com', location: 'Salt Lake', availability: 'evenings', rating: [3.9, 3], done: 2,
    bio: 'Competitive programmer. Teaching C++ and DSA, want to learn Figma.',
    teach: [['C++', 'expert'], ['Data Structures', 'advanced']], learn: [['Figma', 'beginner'], ['UI design', 'beginner']] },
  { name: 'Anushka Mukherjee', email: 'anushka@example.com', location: 'Kolkata', availability: 'flexible', rating: [4.5, 6], done: 4,
    bio: 'ConnectX team — developer and tester. Teaches testing with Jest.',
    teach: [['Software testing', 'advanced'], ['Python', 'intermediate']], learn: [['React', 'beginner']] },
  { name: 'Kanishka Bhadra', email: 'kanishka@example.com', location: 'Kolkata', availability: 'weekdays', rating: [4.4, 5], done: 3,
    bio: 'ConnectX team — backend developer.',
    teach: [['Node.js', 'advanced'], ['MongoDB', 'intermediate']], learn: [['UI design', 'beginner']] },
  { name: 'Oindreela Saha', email: 'oindreela@example.com', location: 'Kolkata', availability: 'weekends', rating: [4.6, 7], done: 5,
    bio: 'ConnectX team — project manager and developer.',
    teach: [['Project management', 'advanced'], ['Public speaking', 'advanced']], learn: [['Node.js', 'beginner']] },
];

async function seed({ onlyIfEmpty = false } = {}) {
  if (onlyIfEmpty && (await User.countDocuments()) > 0) {
    console.log('[seed] data exists, skipping');
    return;
  }
  await Promise.all([User, ExchangeRequest, Session, Message, Review, Notification, Report].map((m) => m.deleteMany({})));
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const byName = {};
  for (const p of people) {
    const u = await User.create({
      name: p.name,
      email: p.email,
      passwordHash,
      bio: p.bio,
      location: p.location,
      availability: p.availability,
      ratingAvg: p.rating ? p.rating[0] : 0,
      ratingCount: p.rating ? p.rating[1] : 0,
      completedExchanges: p.done || 0,
      skills: [
        ...p.teach.map(([name, level]) => ({ name, level, intent: 'teach' })),
        ...p.learn.map(([name, level]) => ({ name, level, intent: 'learn' })),
      ],
    });
    byName[p.name.split(' ')[0]] = u;
  }
  await User.create({ name: 'ConnectX Admin', email: 'admin@connectx.com', passwordHash, role: 'admin' });

  // Wireframe 8.4: a received request from Rahul (Guitar basics ↔ Python)
  await ExchangeRequest.create({
    sender: byName.Rahul._id, recipient: byName.Subhasree._id,
    offeredSkill: 'Guitar basics', wantedSkill: 'Python',
    message: 'Hi! I can teach you guitar basics if you help me with Python.',
  });
  await Notification.create({ user: byName.Subhasree._id, type: 'request', text: 'Rahul Das sent you an exchange request: learn Python, teach Guitar basics', link: '/requests' });

  // A past, completed exchange so history (FR-13) isn't empty
  const past = await ExchangeRequest.create({
    sender: byName.Subhasree._id, recipient: byName.Ishaan._id,
    offeredSkill: 'Python', wantedSkill: 'C++', status: 'accepted',
  });
  // (C++ isn't in Subhasree's learn list — fine for history; the rule only checks teach lists)
  await Session.create({
    request: past._id, participants: [byName.Subhasree._id, byName.Ishaan._id], proposedBy: byName.Subhasree._id,
    startAt: new Date(Date.now() - 6 * 24 * 3600 * 1000), status: 'completed',
  });
  await Message.create({ from: byName.Ishaan._id, to: byName.Subhasree._id, content: 'Thanks for the Python session — the list comprehension trick was great!' });

  // An open report for the admin console demo
  await Report.create({ reporter: byName.Meera._id, reported: byName.Kabir._id, reason: 'Missed two confirmed sessions without notice and was rude in chat.' });

  console.log(`[seed] ${people.length} members + admin created. Password for all: ${PASSWORD}`);
}

module.exports = { seed, PASSWORD };

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx')
    .then(() => seed())
    .then(() => mongoose.disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
