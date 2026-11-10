// Skill search & matching — FR-4, FR-20
// A candidate is "complementary" when they teach what I want to learn and/or
// want to learn what I can teach. Results are sorted by match score, then rating.
const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

const norm = (s) => String(s || '').trim().toLowerCase();

function scoreCandidate(candidate, { want, teach, level }) {
  const skills = candidate.skills || [];
  const w = norm(want);
  const t = norm(teach);
  const teachesWanted = w
    ? skills.find((k) => k.intent === 'teach' && norm(k.name).includes(w))
    : null;
  const wantsOffered = t ? skills.find((k) => k.intent === 'learn' && norm(k.name).includes(t)) : null;

  if (w && !teachesWanted) return null; // must teach what I want to learn
  if (level && teachesWanted && LEVEL_RANK[teachesWanted.level] < LEVEL_RANK[level]) return null;

  let score = 0;
  if (teachesWanted) score += 50 + 5 * LEVEL_RANK[teachesWanted.level];
  if (wantsOffered) score += 40; // two-way (complementary) match
  score += (candidate.ratingAvg || 0) * 2;
  return {
    score,
    mutual: Boolean(teachesWanted && wantsOffered),
    teachesSkill: teachesWanted ? teachesWanted.name : null,
    wantsSkill: wantsOffered ? wantsOffered.name : null,
  };
}

function findMatches(me, candidates, filters) {
  const blockedIds = new Set((me.blocked || []).map(String));
  const out = [];
  for (const c of candidates) {
    if (String(c._id) === String(me._id)) continue;
    if (c.status !== 'active' || c.role === 'admin') continue;
    if (blockedIds.has(String(c._id)) || (c.blocked || []).map(String).includes(String(me._id))) continue;
    if (filters.location && !norm(c.location).includes(norm(filters.location))) continue;
    if (filters.availability && filters.availability !== 'any' && c.availability !== filters.availability && c.availability !== 'flexible') continue;
    const m = scoreCandidate(c, filters);
    if (!m) continue;
    if (!filters.want && filters.teach && !m.wantsSkill) continue;
    out.push({ user: c.toPublic ? c.toPublic() : c, ...m });
  }
  out.sort((a, b) => b.score - a.score || b.user.ratingAvg - a.user.ratingAvg);
  return out;
}

module.exports = { findMatches, scoreCandidate, LEVEL_RANK };
