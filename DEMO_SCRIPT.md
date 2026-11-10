# POC demo recording script (~6 minutes)

Before recording: run `npm run seed` (or redeploy) so the data is fresh, and open the deployed URL once to wake it.
Use two browser windows (one normal, one incognito) so two members can be logged in side by side.

| # | Time | Who speaks | On screen | What to say |
|---|---|---|---|---|
| 1 | 0:00 | Oindreela | Title slide → app login page | ConnectX is a skill-exchange platform built on the MERN stack. Members trade what they know for what they want to learn. |
| 2 | 0:30 | Subhasree | Wrong password, then sign in as `subhasree@example.com` | Passwords are bcrypt-hashed; a wrong password is rejected. Sessions expire after 30 minutes of inactivity. |
| 3 | 1:00 | Subhasree | **Find partners**: learn *UI design*, teach *Python* → Search matches | Matching is complementary: Priya teaches what I want and wants what I teach, so she's a two-way match and ranks first, sorted by rating. Filters: level, availability, location. |
| 4 | 1:40 | Subhasree | Open Priya's profile → Send exchange request | The request names both skills. The server checks the account is active, both skills are on the profiles, and that there's no duplicate pending request. |
| 5 | 2:10 | Anushka | Try sending the same request again → error toast | That's decision-table rule R2: a duplicate is rejected with a clear message. |
| 6 | 2:30 | Anushka | **Exchanges → Received**: decline Rahul's request with a message | Decline flow: Rahul is notified and no session option appears. |
| 7 | 2:50 | Kanishka | Second window: sign in as `priya@example.com` → bell icon → accept | Priya gets an in-app notification (and an email when SMTP is configured). She accepts, and both members are notified. |
| 8 | 3:20 | Kanishka | Priya: Accepted & history → pick date → Arrange a session | Sessions can only be arranged for accepted requests. The API rejects a session for a pending one. |
| 9 | 3:50 | Subhasree | Subhasree window: Confirm slot → Mark completed → 4 stars + comment | The partner confirms the slot. After the session, each participant can rate once, as a whole number from 1 to 5. |
| 10 | 4:20 | Subhasree | Message Priya → open Priya's profile showing the new average and review | Messaging between partners, and the profile now shows the updated average rating and completed exchanges. |
| 11 | 4:50 | Oindreela | Sign in as `admin@connectx.com` → Suspend Kabir | Members can block and report others. Admins review reports and can suspend accounts; a suspended user can't sign in. |
| 12 | 5:20 | Anushka | Terminal: `npm test` → 50 passed | Our Jest suite implements the test plan directly: BVA for ratings, the decision table, all 5 basis paths of createRequest, plus integration and system cases. |
| 13 | 5:45 | All | Phone-width view (DevTools device toolbar) | Responsive down to 320 px. Thank you. |

## Viva quick answers

- **Why MongoDB for a "relational" HLD?** The HLD's 1:1 User–SkillProfile becomes an embedded document; requests, sessions, messages and reviews are separate collections linked by ObjectId references, so the same relationships hold.
- **V(G) of createRequest:** E − N + 2 = 15 − 12 + 2 = 5 → paths P1–P5, each one a Jest test.
- **30-minute inactivity timeout:** the JWT expires in 30 min, and every authenticated response returns a fresh token, so only idle users get logged out.
- **XSS / injection:** React escapes output, Helmet sets a Content-Security-Policy, `express-mongo-sanitize` strips `$` operators (tested with a `{ "$ne": null }` login attempt).
- **Why is the average rating stored on the user?** It's denormalised so search can sort by rating without recomputing (NFR-1 search < 1 s). It's updated incrementally by `averageRating()`.
