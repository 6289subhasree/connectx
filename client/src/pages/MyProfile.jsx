import { useState } from 'react';
import { api, cap, LEVELS } from '../api';
import { useAuth, useToast } from '../App.jsx';
import Avatar from '../components/Avatar.jsx';

// Skill profile management — FR-3, FR-10, FR-11
export default function MyProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({
    name: user.name,
    bio: user.bio,
    location: user.location,
    availability: user.availability,
    skills: user.skills.map(({ name, level, intent }) => ({ name, level, intent })),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSkill = (i, k, v) => setF({ ...f, skills: f.skills.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  const addSkill = (intent) => setF({ ...f, skills: [...f.skills, { name: '', level: intent === 'teach' ? 'intermediate' : 'beginner', intent }] });
  const removeSkill = (i) => setF({ ...f, skills: f.skills.filter((_, j) => j !== i) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api('/users/me', { method: 'PUT', body: f });
      setUser(d.user);
      toast('Profile saved');
    } catch (e2) {
      toast(e2.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return toast('Only JPEG or PNG images are allowed', 'err');
    if (file.size > 5 * 1024 * 1024) return toast('Image must be 5 MB or smaller', 'err');
    const form = new FormData();
    form.append('photo', file);
    try {
      const d = await api('/users/me/photo', { method: 'POST', form });
      setUser(d.user);
      toast('Photo updated');
    } catch (e2) {
      toast(e2.message, 'err');
    }
  };

  const section = (intent, title) => (
    <div className="skill-block">
      <div className="row-between">
        <h3>{title}</h3>
        <button type="button" className="btn ghost sm" onClick={() => addSkill(intent)}>
          + Add
        </button>
      </div>
      {f.skills.map((s, i) =>
        s.intent !== intent ? null : (
          <div key={i} className="skill-row">
            <input value={s.name} onChange={(e) => setSkill(i, 'name', e.target.value)} placeholder="Skill name" aria-label="Skill name" />
            <select value={s.level} onChange={(e) => setSkill(i, 'level', e.target.value)} aria-label="Proficiency">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {cap(l)}
                </option>
              ))}
            </select>
            <button type="button" className="btn ghost sm" onClick={() => removeSkill(i)} aria-label="Remove skill">
              ✕
            </button>
          </div>
        )
      )}
    </div>
  );

  return (
    <form className="card" onSubmit={save}>
      <div className="partner-head">
        <Avatar user={user} size={80} />
        <div className="grow">
          <h1 className="no-m">My profile</h1>
          <span className="muted">
            ★ {user.ratingAvg.toFixed(1)} · {user.ratingCount} ratings · {user.completedExchanges} completed exchanges
          </span>
        </div>
        <label className="btn ghost sm file">
          Upload photo
          <input type="file" accept="image/png,image/jpeg" onChange={upload} hidden />
        </label>
      </div>
      <div className="grid2">
        <label>
          Name
          <input value={f.name} onChange={set('name')} />
        </label>
        <label>
          Location
          <input value={f.location} onChange={set('location')} placeholder="City" />
        </label>
        <label>
          Availability
          <select value={f.availability} onChange={set('availability')}>
            {['flexible', 'weekdays', 'weekends', 'evenings'].map((a) => (
              <option key={a} value={a}>
                {cap(a)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Bio <span className="muted small">({f.bio.length}/500)</span>
        <textarea rows={3} maxLength={500} value={f.bio} onChange={set('bio')} placeholder="Your background and what you'd like to learn" />
      </label>
      <div className="grid2">
        {section('teach', 'Skills I can teach')}
        {section('learn', 'Skills I want to learn')}
      </div>
      <button className="btn primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
