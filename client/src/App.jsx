import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api, getToken, setToken, setOnExpired } from './api';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { Forgot, Reset } from './pages/Password.jsx';
import Search from './pages/Search.jsx';
import Profile from './pages/Profile.jsx';
import Requests from './pages/Requests.jsx';
import Messages from './pages/Messages.jsx';
import MyProfile from './pages/MyProfile.jsx';
import Favorites from './pages/Favorites.jsx';
import Admin from './pages/Admin.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const show = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 3400 ? null : t)), 3500);
  }, []);

  useEffect(() => {
    setOnExpired((msg) => {
      setUser(null);
      show(msg || 'Session expired. Please sign in again.', 'err');
      navigate('/login');
    });
    if (!getToken()) return setReady(true);
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [navigate, show]);

  const login = (token, u) => {
    setToken(token);
    setUser(u);
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  if (!ready) return <div className="boot">ConnectX</div>;

  const guard = (el) => (user ? el : <Navigate to="/login" replace />);
  const home = user?.role === 'admin' ? '/admin' : '/search';

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout }}>
      <ToastCtx.Provider value={show}>
        <Nav />
        <main className="page">
          <Routes>
            <Route path="/" element={<Navigate to={user ? home : '/login'} replace />} />
            <Route path="/login" element={user ? <Navigate to={home} /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/me" /> : <Register />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset/:token" element={<Reset />} />
            <Route path="/search" element={guard(<Search />)} />
            <Route path="/u/:id" element={guard(<Profile />)} />
            <Route path="/requests" element={guard(<Requests />)} />
            <Route path="/messages" element={guard(<Messages />)} />
            <Route path="/messages/:id" element={guard(<Messages />)} />
            <Route path="/me" element={guard(<MyProfile />)} />
            <Route path="/favorites" element={guard(<Favorites />)} />
            <Route path="/admin" element={guard(user?.role === 'admin' ? <Admin /> : <Navigate to="/search" />)} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        {toast && (
          <div className={`toast ${toast.kind}`} role="status" key={toast.id}>
            {toast.text}
          </div>
        )}
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}
