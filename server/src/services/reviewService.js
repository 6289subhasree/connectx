// Ratings & feedback — FR-9, FR-18. Validation rules from Test Plan B.6 (EP + BVA).
const { AppError } = require('../utils/errors');

function validateStars(input) {
  if (input === undefined || input === null || String(input).trim() === '')
    throw new AppError(400, 'RATING_REQUIRED', 'Rating is required');
  const n = Number(input);
  if (Number.isNaN(n)) throw new AppError(400, 'RATING_NOT_NUMBER', 'Rating must be a whole number');
  if (!Number.isInteger(n)) throw new AppError(400, 'RATING_NOT_INTEGER', 'Rating must be a whole number');
  if (n < 1 || n > 5) throw new AppError(400, 'RATING_RANGE', 'Rating must be between 1 and 5');
  return n;
}

// Review.averageRating(): incremental average, rounded to 1 decimal
function averageRating(currentAvg, currentCount, newStars) {
  const count = currentCount + 1;
  const avg = (currentAvg * currentCount + newStars) / count;
  return { avg: Math.round(avg * 10) / 10, count };
}

module.exports = { validateStars, averageRating };
