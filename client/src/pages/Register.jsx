import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useToast } from '../App.jsx';

export const pwChecks = (p) => [
  ['At least 8 characters', p.length >= 8],
  ['An uppercase letter', /[A-Z]/.test(p)],
  ['A lowercase letter', /[a-z]/.test(p)],
  ['A number', /[0-9]/.test(p)],
];

export default function Register() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const d = await api('/auth/register', { method: 'POST', body: f });
      login(d.token, d.user);
      toast('Account created — now add your skills');
      navigate('/me');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted center">It takes a minute. Then list what you can teach.</p>
        <label>
          Full name
          <input value={f.name} onChange={set('name')} required autoFocus />
        </label>
        <label>
          Email address
          <input type="email" value={f.email} onChange={set('email')} required />
        </label>
        <label>
          Password
          <input type="password" value={f.password} onChange={set('password')} required />
        </label>
        <ul className="checks">
          {pwChecks(f.password).map(([t, ok]) => (
            <li key={t} className={ok ? 'ok' : ''}>
              <span className="check-dot" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <div className="auth-links">
          <Link to="/login">I already have an account</Link>
        </div>
      </form>
    </div>
  );
}
