import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      login(d.token, d.user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Welcome to ConnectX</h1>
        <p className="muted center">Exchange what you know for what you want to learn.</p>
        <label>
          Email address
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="auth-links">
          <Link to="/register">Create account</Link>
          <Link to="/forgot">Forgot password?</Link>
        </div>
        <div className="demo-hint">
          Demo: <code>subhasree@example.com</code> · <code>priya@example.com</code> · admin <code>admin@connectx.com</code>
          <br />
          Password <code>Connect@123</code>
        </div>
      </form>
    </div>
  );
}
