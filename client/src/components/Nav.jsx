import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api';
import Avatar from './Avatar.jsx';
import { Bell, LogOut, Menu, Close, ArrowLeft } from './Icons.jsx';

export function Logo() {
  return (
    <Link to="/" className="l-logo">
      <span className="l-mark" aria-hidden>
        <i />
        <i />
      </span>
      ConnectX
    </Link>
  );
}

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

  if (!user) {
    return (
      <header className="topbar">
        <Logo />
        <Link to="/" className="pill-btn white sm">
          <ArrowLeft size={14} /> Home
        </Link>
      </header>
    );
  }

  const links =
    user.role === 'admin'
      ? [['/admin', 'Admin console']]
      : [
          ['/search', 'Find partners'],
          ['/requests', 'Exchanges'],
          ['/messages', 'Messages'],
          ['/favorites', 'Favourites'],
        ];

  return (
    <header className="topbar">
      <Logo />
      <nav className={`pill-group links ${menu ? 'show' : ''}`} aria-label="Main">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-right">
        <div className="bell-wrap" ref={ref}>
          <button className="icon-btn" onClick={openBell} aria-label={`Notifications${notes.unread ? `, ${notes.unread} unread` : ''}`}>
            <Bell />
            {notes.unread > 0 && <span className="badge">{notes.unread}</span>}
          </button>
          {open && (
            <div className="dropdown">
              <div className="dd-title">Notifications</div>
              {notes.notifications.length === 0 && <p className="muted pad">You're all caught up.</p>}
              {notes.notifications.map((n) => (
                <button key={n._id} className={`dd-item ${n.readAt ? '' : 'unread'}`} onClick={() => n.link && navigate(n.link)}>
                  <span>{n.text}</span>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <Link to={user.role === 'admin' ? '/admin' : '/me'} className="me-pill" title="Your profile">
          <Avatar user={user} size={30} />
          <span className="hide-sm">{user.name.split(' ')[0]}</span>
        </Link>
        <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut />
        </button>
        <button className="icon-btn burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          {menu ? <Close size={18} /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
