import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, cap } from '../api';
import { useToast } from '../App.jsx';
import Avatar from '../components/Avatar.jsx';

// Wireframe 8.4 — Requests dashboard + history (FR-6, FR-7, FR-9, FR-13, FR-14)
export default function Requests() {
  const [list, setList] = useState(null);
  const [tab, setTab] = useState('received');
  const toast = useToast();

  const load = useCallback(() => api('/requests').then((d) => setList(d.requests)), []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (path, body, okMsg) => {
    try {
      await api(path, { method: 'POST', body });
      toast(okMsg);
      load();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  if (!list) return <div className="card empty">Loading…</div>;
  const counts = {
    received: list.filter((r) => r.direction === 'received' && r.status === 'pending').length,
    sent: list.filter((r) => r.direction === 'sent' && r.status === 'pending').length,
  };
  const shown =
    tab === 'history'
      ? list.filter((r) => r.status !== 'pending')
      : list.filter((r) => r.direction === tab && r.status === 'pending');

  return (
    <>
      <h1>Exchange requests</h1>
      <p className="muted">Track sent requests, decide on requests from other members, and manage sessions.</p>
      <div className="tabs" role="tablist">
        {[
          ['received', `Received${counts.received ? ` (${counts.received})` : ''}`],
          ['sent', `Sent${counts.sent ? ` (${counts.sent})` : ''}`],
          ['history', 'Accepted & history'],
        ].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="card empty">
          {tab === 'history' ? 'No accepted or past exchanges yet.' : `No pending ${tab} requests.`}{' '}
          <Link to="/search">Find a partner</Link>
        </div>
      )}
      <div className="cards wide">
        {shown.map((r) => (
          <RequestCard key={r._id} r={r} act={act} />
        ))}
      </div>
    </>
  );
}

function RequestCard({ r, act }) {
  const [reply, setReply] = useState('');
  const [when, setWhen] = useState('');
  const [rating, setRating] = useState({});
  const p = r.partner;
  const learn = r.direction === 'sent' ? r.wantedSkill : r.offeredSkill;
  const teach = r.direction === 'sent' ? r.offeredSkill : r.wantedSkill;
  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <article className="card req">
      <div className="partner-head">
        <Avatar user={p} size={40} />
        <div className="grow">
          <h3 className="no-m">
            {r.direction === 'sent' ? 'Sent to' : 'Received from'}: <Link to={`/u/${p._id}`}>{p.name}</Link>
          </h3>
          <span className="muted small">
            Learn <b>{learn}</b> · Teach <b>{teach}</b>
          </span>
        </div>
        <span className={`status ${r.status}`}>{cap(r.status)}</span>
      </div>
      {r.message && <p className="quote">“{r.message}”</p>}
      {r.decisionMessage && <p className="quote">Reply: “{r.decisionMessage}”</p>}

      {r.status === 'pending' && r.direction === 'received' && (
        <>
          <input placeholder="Optional message with your decision" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="actions">
            <button className="btn dark" onClick={() => act(`/requests/${r._id}/decision`, { decision: 'accepted', message: reply }, 'Request accepted — both of you were notified')}>
              Accept
            </button>
            <button className="btn ghost" onClick={() => act(`/requests/${r._id}/decision`, { decision: 'declined', message: reply }, 'Request declined')}>
              Decline
            </button>
          </div>
        </>
      )}
      {r.status === 'pending' && r.direction === 'sent' && (
        <div className="actions">
          <Link className="btn ghost" to={`/u/${p._id}`}>
            View partner
          </Link>
          <button className="btn ghost" onClick={() => act(`/requests/${r._id}/cancel`, {}, 'Request withdrawn')}>
            Withdraw
          </button>
        </div>
      )}

      {r.status === 'accepted' && (
        <div className="sessions">
          <h4>Sessions</h4>
          {r.sessions.length === 0 && <p className="muted small">No sessions yet — arrange one below.</p>}
          {r.sessions.map((s) => (
            <div key={s._id} className="session">
              <div className="row-between">
                <span>
                  📅 {fmtDate(s.startAt)} · {s.durationMins} min · {s.mode}
                </span>
                <span className={`status ${s.status}`}>{cap(s.status)}</span>
              </div>
              <div className="actions">
                {s.status === 'scheduled' && String(s.proposedBy) === String(p._id) && (
                  <button className="btn dark sm" onClick={() => act(`/sessions/${s._id}/confirm`, {}, 'Session confirmed')}>
                    Confirm slot
                  </button>
                )}
                {s.status === 'scheduled' && String(s.proposedBy) !== String(p._id) && <span className="muted small">Waiting for {p.name.split(' ')[0]} to confirm</span>}
                {s.status === 'confirmed' && (
                  <button className="btn dark sm" onClick={() => act(`/sessions/${s._id}/complete`, {}, 'Marked as completed')}>
                    Mark completed
                  </button>
                )}
                {['scheduled', 'confirmed'].includes(s.status) && (
                  <button className="btn ghost sm" onClick={() => act(`/sessions/${s._id}/cancel`, {}, 'Session cancelled — partner notified')}>
                    Cancel
                  </button>
                )}
                {s.status === 'completed' && !s.reviewedByMe && (
                  <div className="rate">
                    <span className="star-input" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" aria-label={`${n} stars`} className={n <= (rating.stars || 0) ? 'on' : ''} onClick={() => setRating({ ...rating, stars: n })}>
                          ★
                        </button>
                      ))}
                    </span>
                    <input placeholder="How was the session?" value={rating.comment || ''} onChange={(e) => setRating({ ...rating, comment: e.target.value })} />
                    <button className="btn dark sm" onClick={() => act(`/sessions/${s._id}/review`, rating, 'Thanks — rating submitted')}>
                      Submit rating
                    </button>
                  </div>
                )}
                {s.status === 'completed' && s.reviewedByMe && <span className="muted small">✓ You rated this session</span>}
              </div>
            </div>
          ))}
          <div className="arrange">
            <input type="datetime-local" min={minDate} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Session date and time" />
            <button className="btn primary sm" disabled={!when} onClick={() => act(`/requests/${r._id}/sessions`, { startAt: new Date(when).toISOString() }, 'Session proposed — partner notified')}>
              Arrange a session
            </button>
            <Link className="btn ghost sm" to={`/messages/${p._id}`}>
              Message {p.name.split(' ')[0]}
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
