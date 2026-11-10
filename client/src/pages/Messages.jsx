import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useToast } from '../App.jsx';
import Avatar from '../components/Avatar.jsx';

// In-app messaging between exchange partners (FR-8). Polls every 3 s.
export default function Messages() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [convs, setConvs] = useState([]);
  const [chat, setChat] = useState(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    api('/messages').then((d) => setConvs(d.conversations));
  }, [id, chat?.messages?.length]);

  useEffect(() => {
    setErr('');
    setChat(null);
    if (!id) return;
    const load = () =>
      api(`/messages/${id}`)
        .then(setChat)
        .catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [chat?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const d = await api(`/messages/${id}`, { method: 'POST', body: { content: text } });
      setChat({ ...chat, messages: [...chat.messages, d.message] });
      setText('');
    } catch (e2) {
      toast(e2.message, 'err');
    }
  };

  return (
    <div className={`chat-layout ${id ? 'has-chat' : ''}`}>
      <aside className="card conv-list">
        <h2>Messages</h2>
        {convs.length === 0 && <p className="muted small">Conversations appear once you send or receive an exchange request.</p>}
        {convs.map((c) => (
          <Link key={c.id} to={`/messages/${c.id}`} className={`conv ${String(c.id) === id ? 'on' : ''}`}>
            <Avatar user={c} size={36} />
            <div className="grow">
              <b>{c.name}</b>
              <small className="muted ellipsis">{c.last ? c.last.content : 'No messages yet'}</small>
            </div>
            {c.unread > 0 && <span className="badge static">{c.unread}</span>}
          </Link>
        ))}
      </aside>
      <section className="card chat">
        {!id && <div className="empty">Pick a conversation.</div>}
        {err && <div className="empty">{err}</div>}
        {chat && (
          <>
            <div className="chat-head">
              <Link to="/messages" className="back only-sm">
                ←
              </Link>
              <Avatar user={chat.partner} size={36} />
              <Link to={`/u/${chat.partner.id}`}>
                <b>{chat.partner.name}</b>
              </Link>
            </div>
            <div className="bubbles">
              {chat.messages.length === 0 && <p className="muted center">Say hello and agree a time for your first session.</p>}
              {chat.messages.map((m) => (
                <div key={m._id} className={`bubble ${String(m.from) === String(user.id) ? 'mine' : ''}`}>
                  {m.content}
                  <small>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="composer" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={2000} />
              <button className="btn dark">Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
