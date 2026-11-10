# ConnectX — Skill Exchange Platform (MERN POC)

**Team 4 · PCC-CS504 Software Engineering Lab · IEM Kolkata · Section B, 2024–2028**
Kanishka Bhadra (90) · Oindreela Saha (92) · Anushka Mukherjee (94) · Subhasree Paul (103)

ConnectX lets members list the skills they can **teach** and want to **learn**, find a complementary partner,
send an exchange request, get an accept/decline decision, arrange a session, chat, and rate each other.

## Stack (MERN)

| Layer | Tech |
|---|---|
| **M**ongoDB | Mongoose ODM — models follow the HLD UML class diagram |
| **E**xpress | REST API under `/api`, JWT auth, Helmet, NoSQL-injection sanitiser, rate limiting |
| **R**eact | Vite + React Router single-page app (the four HLD wireframe screens + extras) |
| **N**ode | Node 18+; one process serves both API and the built React app |

**External APIs used: none.** No paid services. Email (FR-12/FR-17) is optional: set any SMTP server
(e.g. a Gmail app password or MailHog locally); without one, emails are logged and the reset link is shown on screen in demo mode.

## Requirements → implementation

| SRS | Feature | Where |
|---|---|---|
| FR-1 | Register; password ≥ 8 chars with upper, lower, number | `server/src/routes/auth.js` |
| FR-2 | Login; session expires after **30 min of inactivity** (sliding JWT via `X-Refresh-Token`) | `server/src/middleware/auth.js` |
| FR-3, FR-11 | Skill profile: skills (name, level, teach/learn), bio ≤ 500, location, availability | `PUT /api/users/me`, `MyProfile.jsx` |
| FR-4, FR-20 | Search & complementary matching, filters by level / location / availability, sorted by score then rating | `server/src/services/matchService.js` |
| FR-5 | Send exchange request (rules from Test Plan B.5) | `server/src/services/requestService.js#createRequest` |
| FR-6 | Accept / decline with optional message | `POST /api/requests/:id/decision` |
| FR-7 | Arrange a session (only after acceptance), partner confirms | `POST /api/requests/:id/sessions` |
| FR-8 | In-app messaging between exchange partners | `Messages.jsx`, `/api/messages` |
| FR-9 | 1–5 star rating + feedback after a completed session | `POST /api/sessions/:id/review` |
| FR-10 | Profile photo JPEG/PNG ≤ 5 MB | `POST /api/users/me/photo` |
| FR-12 | In-app + email notifications for requests, decisions, sessions, messages, ratings | `notificationService.js` |
| FR-13 | Exchange history dashboard | `Requests.jsx` → "Accepted & history" |
| FR-14 | Cancel a session ≥ 24 h in advance, partner notified | `POST /api/sessions/:id/cancel` |
| FR-15 | Block / report a member | `/api/users/:id/block`, `/report` |
| FR-16 | Admin reviews reports, suspends / reinstates accounts | `Admin.jsx`, `/api/admin` |
| FR-17 | Password reset via 15-minute single-use link | `/api/auth/forgot`, `/api/auth/reset/:token` |
| FR-18 | Average rating + completed exchanges on public profile | `Profile.jsx` |
| FR-19 | Favourite partners | `Favorites.jsx` |
| NFR-2 | bcrypt hashes, Helmet + CSP, mongo-sanitize, React output escaping, per-user authorisation | `app.js` |
| NFR-3 | Responsive 320 px → 2560 px | `client/src/styles.css` |

## Run locally

Needs Node 18+ and MongoDB (local `mongod`, or a free Atlas connection string).

```bash
cp server/.env.example server/.env      # set MONGODB_URI if not local
npm run build                            # installs server + client, builds React
npm run seed                             # demo data
npm start                                # http://localhost:5000
```

For development with hot reload: `npm run dev --prefix server` and `npm run dev --prefix client` (http://localhost:5173).

### Demo accounts (password `Connect@123`)

| Email | Role in the demo |
|---|---|
| `subhasree@example.com` | Teaches Python, wants UI design. Has a pending request from Rahul |
| `priya@example.com` | Teaches UI design, wants Python (top match) |
| `rahul@example.com` | Teaches Guitar basics (used for the decline flow) |
| `admin@connectx.com` | Admin console — one open report to action |

## Deploy (free)

1. **MongoDB Atlas** → create a free M0 cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0` → copy the connection string (add `/connectx` before the `?`).
2. **Render** → New → *Blueprint* → pick this repo (uses `render.yaml`) → paste `MONGODB_URI` → Deploy.
   Demo data is seeded automatically on first start (`SEED_ON_START=true`).
3. Free Render services sleep after ~15 min idle. **Open the URL a minute before the demo** to wake it.

## Tests

```bash
npm test     # Jest + Supertest, 50 cases, needs MongoDB at MONGODB_URI_TEST (default local)
```

Every case is named after its ID in the Test Strategy & Test Plan document:

| Plan section | Cases | File |
|---|---|---|
| B.6 Equivalence partitioning + BVA (star rating) | EP-01..03, BVA-01..06 | `tests/unit.test.js` |
| FR-1 password BVA (7/8/64/65) | 5 | `tests/unit.test.js` |
| B.7 Decision table | DT-01..DT-04 | `tests/requestWorkflow.test.js` |
| B.8 Basis path, V(G) = 5 | P1..P5 | `tests/requestWorkflow.test.js` |
| B.9 Integration | IT-01..IT-05 | `tests/integration.test.js` |
| B.10 System | ST-01, 02, 04, 05, 06 | `tests/integration.test.js` |
| A.5 Security | auth, authorisation, NoSQL injection, bcrypt, admin-only, reset link | `tests/integration.test.js` |

Service-layer coverage: ~86 % statements (`reviewService` 100 %). CI runs on every push (`.github/workflows/ci.yml`).

## Project structure

```
server/src
  models/         User (+ embedded SkillProfile/SkillEntry), ExchangeRequest, Session, Message, Review, Notification, Report
  services/       requestService (createRequest/decide/scheduleSession), matchService, reviewService, notificationService
  routes/         auth, users, exchange (requests/sessions/reviews), misc (messages, notifications, admin)
  middleware/     auth (JWT + 30-min idle timeout)
client/src
  pages/          Login, Register, Password, Search, Profile, Requests, Messages, MyProfile, Favorites, Admin
```
