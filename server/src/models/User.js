const mongoose = require('mongoose');

// UML: SkillEntry { skillId, name, level: Proficiency, intent: teach | learn }
const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const skillEntrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  level: { type: String, enum: LEVELS, default: 'beginner' },
  intent: { type: String, enum: ['teach', 'learn'], required: true },
});

// UML: User 1 — 1 SkillProfile. The profile is embedded in the user document,
// which is the natural MongoDB modelling of a 1:1 relationship.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }, // AccountStatus

    // SkillProfile
    bio: { type: String, maxlength: 500, default: '' },          // FR-11
    location: { type: String, maxlength: 80, default: '' },
    availability: { type: String, enum: ['weekdays', 'weekends', 'evenings', 'flexible'], default: 'flexible' },
    photo: { type: String, default: '' },                         // FR-10 (data URL)
    skills: [skillEntrySchema],                                   // FR-3

    // Ratings summary (FR-18) – denormalised for fast sorting in search (FR-4)
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedExchanges: { type: Number, default: 0 },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // FR-19
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // FR-15

    resetToken: { type: String, default: null },                  // FR-17
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ 'skills.name': 1 });
userSchema.index({ ratingAvg: -1 });

userSchema.methods.teaches = function (skill) {
  const s = String(skill || '').trim().toLowerCase();
  return this.skills.some((k) => k.intent === 'teach' && k.name.toLowerCase() === s);
};

userSchema.methods.wantsToLearn = function (skill) {
  const s = String(skill || '').trim().toLowerCase();
  return this.skills.some((k) => k.intent === 'learn' && k.name.toLowerCase() === s);
};

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    bio: this.bio,
    location: this.location,
    availability: this.availability,
    photo: this.photo,
    skills: this.skills,
    ratingAvg: this.ratingAvg,
    ratingCount: this.ratingCount,
    completedExchanges: this.completedExchanges,
  };
};

userSchema.methods.toSelf = function () {
  return {
    ...this.toPublic(),
    email: this.email,
    role: this.role,
    status: this.status,
    favorites: this.favorites,
    blocked: this.blocked,
  };
};

userSchema.statics.LEVELS = LEVELS;

module.exports = mongoose.model('User', userSchema);
