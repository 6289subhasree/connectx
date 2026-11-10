import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, cap } from '../api';
import { useAuth, useToast } from '../App.jsx';
import Avatar, { Stars } from '../components/Avatar.jsx';

// Wireframe 8.3 — Partner profile and request (FR-5, FR-15, FR-18, FR-19)
export default function Profile() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ wantedSkill: '', offeredSkill: '', message: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    api(`/users/${id}`)
      .then((data) => {
        setD(data);
        const theirTeach = data.user.skills.filter((s) => s.intent === 'teach').map((s) => s.name);
        const myTeach = user.skills.filter((s) => s.intent === 'teach').map((s) => s.name);
        const pick = (pref, list) => list.find((x) => x.toLowerCase() === String(pref || '').toLowerCase()) || list[0] || '';
        setForm({
          wantedSkill: pick(loc.state?.want, theirTeach),
          offeredSkill: pick(loc.state?.teach, myTeach),
          message: `Hi ${data.user.name.split(' ')[0]}, let's exchange skills.`,
        });
      })
      .catch((e) => setErr(e.message));
  }, [id, user.skills, loc.state]);

  if (err) return <div className="card empty">{err}</div>;
  if (!d) return <div className="card empty">Loading…</div>;
  const p = d.user;
  const teach = p.skills.filter((s) => s.intent === 'teach');
  const learn = p.skills.filter((s) => s.intent === 'learn');
  const myTeach = user.skills.filter((s) => s.intent === 'teach');

  const send = async (e) => {
    e.preventDefault();
    try {
      await api('/requests', { method: 'POST', body: { recipientId: p.id, ...form } });
      toast(`Request sent to ${p.name}`);
      navigate('/requests');
    } catch (e2) {
      toast(e2.message, 'err');
    }
  };
  const toggleFav = async () => {
    const r = await api(`/users/${p.id}/favorite`, { method: 'POST' });
    setUser(r.user);
    setD({ ...d, isFavorite: r.favorite });
    toast(r.favorite ? 'Saved to favourites' : 'Removed from favourites');
  };
  const toggleBlock = async () => {
    const r = await api(`/users/${p.id}/block`, { method: 'POST' });
    setUser(r.user);
    setD({ ...d, isBlocked: r.blocked });
    toast(r.blocked ? `${p.name} blocked` : `${p.name} unblocked`);
  };
  const report = async (e) => {
    e.preventDefault();
    try {
      await api(`/users/${p.id}/report`, { method: 'POST', body: { reason } });
      setReportOpen(false);
      setD({ ...d, isBlocked: true });
      toast('Report sent to moderators. Contact with this member is now restricted.');
    } catch (e2) {
      toast(e2.message, 'err');
    }
  };

  return (
    <>
      <Link to="/search" className="back">
        ← Back to matches
      </Link>
      <div className="split">
        <section className="card">
          <div className="partner-head">
            <Avatar user={p} size={72} />
            <div className="grow">
              <h1 className="no-m">{p.name}</h1>
              <span className="muted">
                {p.location || 'Location not set'} · Available {p.availability}
              </span>
            </div>
          </div>
          <div className="stats">
            <div>
              <Stars value={p.ratingAvg} />
              <small className="muted">{p.ratingCount} ratings</small>
            </div>
            <div>
              <b>{p.completedExchanges}</b>
              <small className="muted">completed exchanges</small>
            </div>
          </div>
          <h3>About</h3>
          <p>{p.bio || <span className="muted">No bio yet.</span>}</p>
          <h3>Teaches</h3>
          <div className="chips">
            {teach.map((s) => (
              <span key={s._id} className="chip teach">
                {s.name} · {cap(s.level)}
              </span>
            ))}
          </div>
          <h3>Wants to learn</h3>
          <div className="chips">
            {learn.map((s) => (
              <span key={s._id} className="chip learn">
                {s.name} · {cap(s.level)}
              </span>
            ))}
          </div>
          {d.reviews.length > 0 && (
            <>
              <h3>Recent reviews</h3>
              {d.reviews.map((r, i) => (
                <blockquote key={i} className="review">
                  <b>{'★'.repeat(r.stars)}</b>
                  <span className="muted">{'★'.repeat(5 - r.stars)}</span> {r.comment} <small className="muted">— {r.by}</small>
                </blockquote>
              ))}
            </>
          )}
          <div className="actions">
            <button className="btn ghost sm" onClick={toggleFav}>
              {d.isFavorite ? '♥ Favourite' : '♡ Save as favourite'}
            </button>
            <Link className="btn ghost sm" to={`/messages/${p.id}`}>
              Message
            </Link>
            <button className="btn ghost sm" onClick={toggleBlock}>
              {d.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button className="btn ghost sm danger" onClick={() => setReportOpen((o) => !o)}>
              Report
            </button>
          </div>
          {reportOpen && (
            <form onSubmit={report} className="report-box">
              <label>
                What happened?
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required />
              </label>
              <button className="btn danger sm">Send report</button>
            </form>
          )}
        </section>

        <aside className="card">
          <h2>Request an exchange</h2>
          {d.isBlocked ? (
            <p className="muted">You have blocked this member. Unblock to send requests.</p>
          ) : myTeach.length === 0 ? (
            <p className="muted">
              Add a skill you can teach on <Link to="/me">your profile</Link> first.
            </p>
          ) : (
            <form onSubmit={send}>
              <label>
                I want to learn
                <select value={form.wantedSkill} onChange={(e) => setForm({ ...form, wantedSkill: e.target.value })}>
                  {teach.map((s) => (
                    <option key={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                I can teach
                <select value={form.offeredSkill} onChange={(e) => setForm({ ...form, offeredSkill: e.target.value })}>
                  {myTeach.map((s) => (
                    <option key={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Optional introduction
                <textarea rows={3} maxLength={500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </label>
              <button className="btn dark block">Send exchange request</button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
