import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Avatar, { Stars } from '../components/Avatar.jsx';

// FR-19
export default function Favorites() {
  const [list, setList] = useState(null);
  useEffect(() => {
    api('/users/favorites').then((d) => setList(d.favorites));
  }, []);
  if (!list) return <div className="card empty">Loading…</div>;
  return (
    <>
      <h1>Favourite partners</h1>
      {list.length === 0 && (
        <div className="card empty">
          No favourites yet. Open a profile and choose “Save as favourite”. <Link to="/search">Find partners</Link>
        </div>
      )}
      <div className="cards">
        {list.map((u) => (
          <article key={u.id} className="card partner">
            <div className="partner-head">
              <Avatar user={u} />
              <div className="grow">
                <h3>{u.name}</h3>
                <span className="muted small">
                  Teaches {u.skills.filter((s) => s.intent === 'teach').map((s) => s.name).join(', ') || '—'}
                </span>
              </div>
              <Stars value={u.ratingAvg} />
            </div>
            <div className="actions">
              <Link className="btn dark sm" to={`/u/${u.id}`}>
                View profile
              </Link>
              <Link className="btn ghost sm" to={`/messages/${u.id}`}>
                Message
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
