import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Close, Chat, Calendar, Star, Shield, Search, CircleIcon } from '../components/Icons.jsx';

const STEPS = [
  ['List your skills', 'Add what you can teach and what you want to learn, with your level for each.'],
  ['Find a two-way match', 'Search shows people who teach what you want. If they also want what you teach, they rank first.'],
  ['Send a request', 'Name the skill you want and the one you will teach back, and add a short note.'],
  ['Agree a session', 'Once they accept, either of you proposes a time and the other confirms it.'],
  ['Rate each other', 'After the session, each of you leaves one rating from 1 to 5 stars.'],
];

const MATCHES = [
  { n: 'Priya Sen', t: 'UI design', w: 'Python', r: '4.8', two: true },
  { n: 'Arjun Roy', t: 'UI design', w: 'Python', r: '4.6', two: true },
  { n: 'Ananya Ghosh', t: 'UI design', w: 'Public speaking', r: '4.9', two: false },
];

const CHIPS = ['Python', 'UI design', 'Guitar', 'Figma', 'SQL', 'Public speaking'];

export default function Landing() {
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="landing">
      <header className="l-head">
        <Link to="/" className="l-logo" aria-label="ConnectX home">
          <span className="l-mark" aria-hidden>
            <i />
            <i />
          </span>
          ConnectX
        </Link>
        <button className="pill-btn black" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="l-menu">
          <CircleIcon>{menu ? <Close size={14} /> : <Plus size={14} />}</CircleIcon>
          Menu
        </button>
        <nav className="pill-group hide-md" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#matching">Matching</a>
          <a href="#safety">Safety</a>
        </nav>
        <Link to="/login" className="pill-btn white l-signin">
          <CircleIcon tone="dark">
            <ArrowRight size={14} />
          </CircleIcon>
          Sign in
        </Link>

        {menu && (
          <div id="l-menu" className="l-menu" role="menu">
            <a href="#how" onClick={() => setMenu(false)}>How it works</a>
            <a href="#matching" onClick={() => setMenu(false)}>Matching</a>
            <a href="#safety" onClick={() => setMenu(false)}>Safety</a>
            <hr />
            <Link to="/register">Create an account</Link>
            <Link to="/login">Sign in</Link>
          </div>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          <span>Teach one thing.</span>
          <span>Learn another.</span>
        </h1>

        <div className="hero-stage" aria-hidden>
          <div className="ring" />
          <div className="reach left">
            <img className="hand" src="/hand-human.webp" alt="" width="1249" height="452" />
          </div>
          <div className="reach right">
            <img className="hand" src="/hand-robot.webp" alt="" width="1205" height="445" />
          </div>
        </div>

        <div className="hero-foot">
          <div className="hero-copy">
            <p className="small-muted">Skill exchange for students</p>
            <p className="hero-lede">
              ConnectX pairs you with someone who knows what you want to learn and wants what you already know. No fees, just time.
            </p>
            <div className="hero-ctas">
              <Link to="/register" className="pill-btn black lg">
                <CircleIcon>
                  <ArrowRight size={14} />
                </CircleIcon>
                Create an account
              </Link>
              <a href="#how" className="text-link">
                See how it works
              </a>
            </div>
          </div>
          <ul className="chip-row" aria-label="Popular skills">
            {CHIPS.slice(0, 3).map((c) => (
              <li key={c} className="o-chip">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="l-sec how">
        <div className="how-head">
          <h2>An exchange, start to finish</h2>
          <p>Five steps, and you only have to do the first one before someone can find you.</p>
        </div>
        <ol className="steps">
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="step-n">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Matching ---------- */}
      <section id="matching" className="l-sec match">
        <div className="match-copy">
          <h2>Matches that work both ways</h2>
          <p>
            Most platforms find you a teacher. ConnectX looks for a partner: someone who teaches your skill and also wants to learn
            yours. Those two-way matches come first, then everyone else, sorted by rating.
          </p>
          <p className="small-muted">You can narrow results by level, availability and location.</p>
        </div>

        <div className="mock" aria-label="Example search">
          <div className="mock-fields">
            <div>
              <small>I want to learn</small>
              <span>UI design</span>
            </div>
            <div>
              <small>I can teach</small>
              <span>Python</span>
            </div>
            <span className="mock-go" aria-hidden>
              <Search size={16} />
            </span>
          </div>
          <ul className="mock-list">
            {MATCHES.map((m) => (
              <li key={m.n}>
                <span className="sc-av sm">{m.n.split(' ').map((p) => p[0]).join('')}</span>
                <div className="grow">
                  <b>{m.n}</b>
                  <small>
                    Teaches {m.t}, wants {m.w}
                  </small>
                </div>
                <span className="rating">
                  <Star size={12} /> {m.r}
                </span>
                <span className={`tag ${m.two ? 'on' : ''}`}>{m.two ? 'Two-way' : 'One-way'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Inside + safety ---------- */}
      <section id="safety" className="l-sec inside">
        <div className="inside-grid">
          <div className="inside-main">
            <h2>Everything after the match</h2>
            <p>Requests, scheduling, chat and feedback live in one place, so the exchange doesn't scatter across five apps.</p>
          </div>
          <div className="feat">
            <Calendar size={22} />
            <h3>Sessions with a confirm step</h3>
            <p>One of you proposes a time, the other confirms. Cancel up to 24 hours ahead and your partner is told.</p>
          </div>
          <div className="feat">
            <Chat size={22} />
            <h3>Chat with your partner</h3>
            <p>Message anyone you have an exchange with, before or after a session.</p>
          </div>
          <div className="feat">
            <Star size={22} filled={false} />
            <h3>Ratings that mean something</h3>
            <p>Only people who completed a session together can rate each other, once each.</p>
          </div>
          <div className="feat dark">
            <Shield size={22} />
            <h3>Block, report, and a real moderator</h3>
            <p>Blocking stops contact straight away. Reports go to an admin who can suspend the account.</p>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta">
        <div className="ring small" aria-hidden />
        <h2>Your first exchange starts with one search.</h2>
        <div className="hero-ctas center">
          <Link to="/register" className="pill-btn black lg">
            <CircleIcon>
              <ArrowRight size={14} />
            </CircleIcon>
            Create an account
          </Link>
          <Link to="/login" className="pill-btn white lg">
            Sign in
          </Link>
        </div>
      </section>

      <footer className="l-foot">
        <div>
          <b>ConnectX</b>
          <p>Built by Team 4 for PCC-CS504, IEM Kolkata.</p>
        </div>
        <p className="small-muted">Kanishka Bhadra, Oindreela Saha, Anushka Mukherjee, Subhasree Paul</p>
      </footer>
    </div>
  );
}
