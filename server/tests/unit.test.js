// Unit tests — Test Strategy A.3.1 / Test Plan B.6 (EP + BVA)
const { validateStars, averageRating } = require('../src/services/reviewService');
const { validatePassword } = require('../src/routes/auth');
const { scoreCandidate } = require('../src/services/matchService');

const msg = (fn) => {
  try {
    fn();
    return 'saved';
  } catch (e) {
    return e.message;
  }
};

describe('B.6 Review star rating — Equivalence Partitioning & Boundary Value Analysis', () => {
  test.each([
    ['EP-01 valid nominal', 3, 'saved'],
    ['BVA-01 lower boundary (min)', 1, 'saved'],
    ['BVA-02 min − 1', 0, 'Rating must be between 1 and 5'],
    ['BVA-03 min + 1', 2, 'saved'],
    ['BVA-04 max − 1', 4, 'saved'],
    ['BVA-05 upper boundary (max)', 5, 'saved'],
    ['BVA-06 max + 1', 6, 'Rating must be between 1 and 5'],
    ['EP-02 decimal value', 3.5, 'Rating must be a whole number'],
    ['EP-03 empty input', '', 'Rating is required'],
    ['EP invalid below range (−1)', -1, 'Rating must be between 1 and 5'],
    ['EP invalid above range (10)', 10, 'Rating must be between 1 and 5'],
    ['EP wrong type ("abc")', 'abc', 'Rating must be a whole number'],
  ])('%s: input %p → %s', (_id, input, expected) => {
    expect(msg(() => validateStars(input))).toBe(expected);
  });
});

describe('Review.averageRating()', () => {
  test('first rating becomes the average', () => expect(averageRating(0, 0, 4)).toEqual({ avg: 4, count: 1 }));
  test('incremental average rounded to 1 dp', () => expect(averageRating(4.8, 12, 4)).toEqual({ avg: 4.7, count: 13 }));
});

describe('FR-1 password policy — BVA on length 7/8/64/65', () => {
  test('7 chars rejected', () => expect(validatePassword('Abcdef1')).toMatch(/at least 8/));
  test('8 chars accepted', () => expect(validatePassword('Abcdefg1')).toBeNull());
  test('64 chars accepted', () => expect(validatePassword('Aa1' + 'x'.repeat(61))).toBeNull());
  test('65 chars rejected', () => expect(validatePassword('Aa1' + 'x'.repeat(62))).toMatch(/at most 64/));
  test('missing uppercase/number rejected', () => expect(validatePassword('abcdefgh')).toMatch(/uppercase/));
});

describe('Matching score function', () => {
  const cand = (skills, ratingAvg = 4) => ({ skills, ratingAvg });
  test('two-way complementary match scores higher than one-way', () => {
    const mutual = scoreCandidate(cand([{ name: 'UI design', level: 'advanced', intent: 'teach' }, { name: 'Python', level: 'beginner', intent: 'learn' }]), { want: 'UI design', teach: 'Python' });
    const oneWay = scoreCandidate(cand([{ name: 'UI design', level: 'advanced', intent: 'teach' }]), { want: 'UI design', teach: 'Python' });
    expect(mutual.mutual).toBe(true);
    expect(mutual.score).toBeGreaterThan(oneWay.score);
  });
  test('candidate who does not teach the wanted skill is excluded', () => {
    expect(scoreCandidate(cand([{ name: 'Guitar', level: 'expert', intent: 'teach' }]), { want: 'UI design' })).toBeNull();
  });
  test('skill-level filter excludes lower proficiency (FR-20)', () => {
    expect(scoreCandidate(cand([{ name: 'UI design', level: 'intermediate', intent: 'teach' }]), { want: 'UI design', level: 'advanced' })).toBeNull();
  });
});
