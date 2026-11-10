import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api';
import Avatar from './Avatar.jsx';

export default function Nav() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    const load = () => api('/notifications').then(setNotes).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [user, loc.pathname]);

  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const openBell = async () => {
    setOpen((o) => !o);
    if (notes.unread) {
      await api('/notifications/read', { method: 'POST' }).catch(() => {});
      setNotes((n) => ({ ...n, unread: 0 }));
    }
  };

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <span className="logo">⇄</span> ConnectX
      </Link>
      {user && (
        <>
          <button className="burger" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
            ☰
          </button>
          <nav className={`links ${menu ? 'show' : ''}`}>
            {user.role === 'admin' ? (
              <NavLink to="/admin">Admin console</NavLink>
            ) : (
              <>
                <NavLink to="/search">Find partners</NavLink>
                <NavLink to="/requests">Exchanges</NavLink>
                <NavLink to="/messages">Messages</NavLink>
                <NavLink to="/favorites">Favourites</NavLink>
              </>
            )}
          </nav>
          <div className="nav-right">
            <div className="bell-wrap" ref={ref}>
              <button className="bell" onClick={openBell} aria-label="Notifications">
                🔔{notes.unread > 0 && <span className="badge">{notes.unread}</span>}
              </button>
              {open && (
                <div className="dropdown">
                  <div className="dd-title">Notifications</div>
                  {notes.notifications.length === 0 && <p className="muted pad">Nothing yet.</p>}
                  {notes.notifications.map((n) => (
                    <button key={n._id} className={`dd-item ${n.readAt ? '' : 'unread'}`} onClick={() => n.link && navigate(n.link)}>
                      <span>{n.text}</span>
                      <small>{new Date(n.createdAt).toLocaleString()}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to={user.role === 'admin' ? '/admin' : '/me'} className="me-link" title="My profile">
              <Avatar user={user} size={32} />
              <span className="hide-sm">{user.name.split(' ')[0]}</span>
            </Link>
            <button className="btn ghost sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </>
      )}
    </header>
  );
}
