import { Search as SearchIcon, CircleIcon } from '../components/Icons.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, cap, LEVELS } from '../api';
import { useAuth } from '../App.jsx';
import Avatar, { Stars } from '../components/Avatar.jsx';

// Wireframe 8.2 — Search and matches (FR-4, FR-20)
export default function Search() {
  const { user } = useAuth();
  const myLearn = user.skills.find((s) => s.intent === 'learn')?.name || '';
  const myTeach = user.skills.find((s) => s.intent === 'teach')?.name || '';
  const [f, setF] = useState({ want: myLearn, teach: myTeach, level: '', availability: '', location: '' });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const run = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
      setRes(await api(`/users/search?${q}`));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <section className="card">
        <h1>Find a skill exchange partner</h1>
        <p className="muted">Search for people with complementary teaching and learning skills.</p>
        {user.skills.length === 0 && (
          <div className="notice">
            Your profile has no skills yet. <Link to="/me">Add what you can teach and want to learn</Link> for better matches.
          </div>
        )}
        <form className="grid2" onSubmit={run}>
          <label>
            I want to learn
            <input value={f.want} onChange={set('want')} placeholder="e.g. UI design" />
          </label>
          <label>
            I can teach
            <input value={f.teach} onChange={set('teach')} placeholder="e.g. Python" />
          </label>
          <label>
            Skill level (minimum)
            <select value={f.level} onChange={set('level')}>
              <option value="">Any level</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {cap(l)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Availability
            <select value={f.availability} onChange={set('availability')}>
              <option value="">Any time</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
            </select>
          </label>
          <label>
            Location
            <input value={f.location} onChange={set('location')} placeholder="Any location" />
          </label>
          <div className="form-end">
            <button className="btn primary" disabled={busy}>
              {busy ? 'Searching…' : 'Search matches'}
              <CircleIcon>
                <SearchIcon size={14} />
              </CircleIcon>
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="row-between">
          <h2>Compatible partners</h2>
          {res && (
            <span className="muted small">
              {res.results.length} found in {res.tookMs} ms
            </span>
          )}
        </div>
        {res && res.results.length === 0 && <div className="card empty">No matches yet. Try a broader skill name or remove filters.</div>}
        <div className="cards">
          {res?.results.map((r) => (
            <article key={r.user.id} className="card partner">
              <div className="partner-head">
                <Avatar user={r.user} />
                <div className="grow">
                  <h3>{r.user.name}</h3>
                  <span className="muted small">
                    {r.user.location || 'Location not set'}, {r.user.availability}
                  </span>
                </div>
                <Stars value={r.user.ratingAvg} />
              </div>
              <p>
                {r.teachesSkill ? <>Teaches <b>{r.teachesSkill}</b></> : 'Teaches other skills'}
                {r.wantsSkill && <>, wants <b>{r.wantsSkill}</b></>}
              </p>
              <div className="row-between">
                {r.mutual ? <span className="tag on">Two-way match</span> : <span className="tag">One-way match</span>}
                <Link className="btn ghost sm" to={`/u/${r.user.id}`} state={{ want: r.teachesSkill || f.want, teach: r.wantsSkill || f.teach }}>
                  View profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
