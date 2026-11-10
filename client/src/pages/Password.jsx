import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../App.jsx';
import { pwChecks } from './Register.jsx';

export function Forgot() {
  const [email, setEmail] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      setRes(await api('/auth/forgot', { method: 'POST', body: { email } }));
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Reset password</h1>
        <p className="muted center">We'll email you a link that works for 15 minutes.</p>
        <label>
          Email address
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {err && <p className="error">{err}</p>}
        {res && (
          <div className="notice">
            {res.message}
            {res.devLink && (
              <>
                <br />
                <small>Demo mode (no mail server configured):</small> <Link to={new URL(res.devLink).pathname}>open reset link</Link>
              </>
            )}
          </div>
        )}
        <button className="btn primary block">Send reset link</button>
        <div className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

export function Reset() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api(`/auth/reset/${token}`, { method: 'POST', body: { password } });
      toast(d.message);
      navigate('/login');
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Choose a new password</h1>
        <label>
          New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </label>
        <ul className="checks">
          {pwChecks(password).map(([t, ok]) => (
            <li key={t} className={ok ? 'ok' : ''}>
              {ok ? '✓' : '○'} {t}
            </li>
          ))}
        </ul>
        {err && <p className="error">{err}</p>}
        <button className="btn primary block">Update password</button>
      </form>
    </div>
  );
}
