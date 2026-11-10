import { useEffect, useRef, useState, Fragment } from 'react';
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
const BAND_A = ['Python', 'UI design', 'Guitar', 'Figma', 'Public speaking', 'SQL'];
const BAND_B = ['React', 'Photography', 'C++', 'Singing', 'Excel', 'Node.js'];

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll engine: every [data-scroll] element gets a CSS variable with its progress (0 → 1).
   data-scroll="pin"  → --p, progress through a tall pinned container
   data-scroll="view" → --v, progress while the element crosses the viewport               */
function useScrollMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reveal = [...document.querySelectorAll('[data-reveal]')];
    if (reduced()) {
      reveal.forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const els = [...document.querySelectorAll('[data-scroll]')];
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (el.dataset.scroll === 'pin') {
          const span = r.height - vh;
          const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
          el.style.setProperty('--p', p.toFixed(4));
        } else {
          const v = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
          el.style.setProperty('--v', v.toFixed(4));
        }
      }
      root.classList.toggle('l-scrolled', window.scrollY > 40);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    );
    reveal.forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      io.disconnect();
      root.classList.remove('l-scrolled');
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* Types its text out once `go` turns true. */
function TypeIn({ text, go, delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return undefined;
    if (reduced()) {
      setN(text.length);
      return undefined;
    }
    let i = 0;
    let t;
    const start = setTimeout(function tick() {
      i += 1;
      setN(i);
      if (i < text.length) t = setTimeout(tick, 70);
    }, delay);
    return () => {
      clearTimeout(start);
      clearTimeout(t);
    };
  }, [go, text, delay]);
  return (
    <span className={`typed ${go && n < text.length ? 'caret' : ''}`}>
      {text.slice(0, n)}
      {n === 0 && ' '}
    </span>
  );
}

/* Tilts toward the pointer (user-driven, so it stays on even when motion is reduced elsewhere). */
function Tilt({ className, children }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    ref.current.style.setProperty('--rx', '0deg');
    ref.current.style.setProperty('--ry', '0deg');
  };
  return (
    <div ref={ref} className={`tilt ${className || ''}`} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </div>
  );
}

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [mockGo, setMockGo] = useState(false);
  const mockRef = useRef(null);
  const heroRef = useRef(null);

  useScrollMotion();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setMockGo(true), { threshold: 0.45 });
    if (mockRef.current) io.observe(mockRef.current);
    return () => io.disconnect();
  }, []);

  const spotlight = (e) => {
    const r = heroRef.current.getBoundingClientRect();
    heroRef.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    heroRef.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

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

      {/* ---------- Hero: pinned while the hands close the gap ---------- */}
      <div className="hero-pin" data-scroll="pin">
        <section className="hero" aria-labelledby="hero-title" ref={heroRef} onMouseMove={spotlight}>
          <div className="spot" aria-hidden />
          <h1 id="hero-title" className="hero-title">
            <span className="ht-a">Teach one thing.</span>
            <span className="ht-b">Learn another.</span>
          </h1>

          <div className="hero-stage" data-scroll="view" aria-hidden>
            <div className="ring" />
            <div className="spark" />
            <div className="reach left">
              <img className="hand" src="/hand-human.webp" alt="" width="1249" height="452" />
            </div>
            <div className="reach right">
              <img className="hand" src="/hand-robot.webp" alt="" width="1205" height="445" />
            </div>
          </div>

          <p className="hero-click" aria-hidden>
            It clicks when it goes both ways.
          </p>

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

          <div className="scroll-hint" aria-hidden>
            <span />
            Scroll
          </div>
        </section>
      </div>

      {/* ---------- Skill band, driven by scroll ---------- */}
      <section className="band" data-scroll="view" aria-label="Skills people trade on ConnectX">
        {[BAND_A, BAND_B].map((row, r) => (
          <div key={r} className={`band-row ${r ? 'rev' : ''}`}>
            {[...row, ...row].map((s, i) => (
              <Fragment key={i}>
                <span className={i % 3 === 1 ? 'outline' : ''}>{s}</span>
                <i className="band-sep" />
              </Fragment>
            ))}
          </div>
        ))}
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="l-sec how">
        <div className="how-head" data-reveal>
          <h2>An exchange, start to finish</h2>
          <p>Five steps, and you only have to do the first one before someone can find you.</p>
        </div>
        <ol className="steps" data-scroll="view">
          <span className="steps-line" aria-hidden />
          {STEPS.map(([t, d], i) => (
            <li key={t} data-reveal style={{ '--i': i }}>
              <span className="step-n">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Matching ---------- */}
      <section id="matching" className="l-sec match">
        <div className="match-copy" data-reveal>
          <h2>Matches that work both ways</h2>
          <p>
            Most platforms find you a teacher. ConnectX looks for a partner: someone who teaches your skill and also wants to learn
            yours. Those two-way matches come first, then everyone else, sorted by rating.
          </p>
          <p className="small-muted">You can narrow results by level, availability and location.</p>
        </div>

        <div className={`mock ${mockGo ? 'go' : ''}`} ref={mockRef} aria-label="Example search">
          <div className="mock-fields">
            <div>
              <small>I want to learn</small>
              <TypeIn text="UI design" go={mockGo} delay={250} />
            </div>
            <div>
              <small>I can teach</small>
              <TypeIn text="Python" go={mockGo} delay={1050} />
            </div>
            <span className="mock-go" aria-hidden>
              <Search size={16} />
            </span>
          </div>
          <ul className="mock-list">
            {MATCHES.map((m, i) => (
              <li key={m.n} style={{ '--i': i }}>
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
          <div className="inside-main" data-reveal>
            <h2>Everything after the match</h2>
            <p>Requests, scheduling, chat and feedback live in one place, so the exchange doesn't scatter across five apps.</p>
          </div>
          {[
            [<Calendar size={22} key="i" />, 'Sessions with a confirm step', 'One of you proposes a time, the other confirms. Cancel up to 24 hours ahead and your partner is told.', ''],
            [<Chat size={22} key="i" />, 'Chat with your partner', 'Message anyone you have an exchange with, before or after a session.', ''],
            [<Star size={22} filled={false} key="i" />, 'Ratings that mean something', 'Only people who completed a session together can rate each other, once each.', ''],
            [<Shield size={22} key="i" />, 'Block, report, and a real moderator', 'Blocking stops contact straight away. Reports go to an admin who can suspend the account.', 'dark'],
          ].map(([icon, title, text, tone], i) => (
            <div key={title} data-reveal style={{ '--i': i }}>
              <Tilt className={`feat ${tone}`}>
                {icon}
                <h3>{title}</h3>
                <p>{text}</p>
              </Tilt>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta" data-scroll="view">
        <div className="ring small" aria-hidden />
        <h2 data-reveal>Your first exchange starts with one search.</h2>
        <div className="hero-ctas center" data-reveal style={{ '--i': 2 }}>
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
