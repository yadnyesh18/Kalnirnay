import './HeroPage.css'

const Icon = {
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  parse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V6a2 2 0 0 0-2-2h-3"/><rect x="7" y="2" width="10" height="6" rx="1"/>
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  filter: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  logoMark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  logoMarkSm: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

const features = [
  { icon: Icon.parse,    title: 'Poster Parsing',   desc: 'Send any event poster to Telegram. It extracts title, date, deadline, and prize — instantly.' },
  { icon: Icon.calendar, title: 'Smart Calendar',   desc: 'All events land on a live calendar. Filter by domain, department, or deadline proximity.' },
  { icon: Icon.bell,     title: 'Deadline Alerts',  desc: 'Never miss a registration window. Get notified before it\'s too late.' },
  { icon: Icon.trophy,   title: 'Prize Tracking',   desc: 'Spot high-value hackathons at a glance. Prize badges surface the best opportunities.' },
  { icon: Icon.zap,      title: 'Real-time Sync',   desc: 'Events update the moment your Telegram group receives a new poster.' },
  { icon: Icon.filter,   title: 'Domain Filters',   desc: 'Filter by Web, Design, Finance and more. See only what\'s relevant to you.' },
]

const steps = [
  { n: '01', title: 'Add the bot',      desc: 'Invite the Kalnirnay bot to your college Telegram group in seconds.' },
  { n: '02', title: 'Share posters',    desc: 'Drop any event poster image into the group. It does the rest.' },
  { n: '03', title: 'Track everything', desc: 'Open the dashboard. Your calendar is already populated and sorted.' },
]

const stats = [
  { n: '2,400+', l: 'Events Parsed' },
  { n: '98%',    l: 'Accuracy Rate' },
  { n: '<2s',    l: 'Parse Speed'   },
  { n: '100%',   l: 'Free Forever'  },
]

export default function HeroPage({ onSignIn, onRegister }) {
  return (
    <div className="lp">

      <div className="lp-bg" aria-hidden>
        <div className="lp-orb o1" />
        <div className="lp-orb o2" />
        <div className="lp-orb o3" />
        <div className="lp-orb o4" />
        <div className="lp-grid" />
      </div>

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">
          <div className="lp-logo-mark">{Icon.logoMark}</div>
          <span className="lp-logo-name">Kalnirnay</span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#stats">Stats</a>
        </div>
        <div className="lp-nav-cta">
          <button className="lp-btn-ghost" onClick={onSignIn}>Sign In</button>
          <button className="lp-btn-solid" onClick={onRegister}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-pill">
          <span className="lp-pill-dot" />
          Live · Smart · Free
        </div>

        <h1 className="lp-hero-h1">
          Never Miss<br />
          <span className="lp-grad-text">What Matters</span>
        </h1>

        <p className="lp-hero-p">
          College events, hackathons & deadlines — intelligently parsed,
          beautifully organized, always on time.
        </p>

        <div className="lp-hero-btns">
          <button className="lp-cta-primary" onClick={onRegister}>
            Start for free {Icon.arrow}
          </button>
          <button className="lp-cta-ghost" onClick={onRegister}>
            <span className="lp-live-dot" />
            Explore dashboard
          </button>
        </div>

        <div className="lp-hero-card">
          <div className="lp-hero-card-inner">
            <div className="lp-hstat">
              <span className="lp-hstat-n">2.4k+</span>
              <span className="lp-hstat-l">Events Tracked</span>
            </div>
            <div className="lp-hdiv" />
            <div className="lp-hstat">
              <span className="lp-hstat-n">98%</span>
              <span className="lp-hstat-l">Parse Accuracy</span>
            </div>
            <div className="lp-hdiv" />
            <div className="lp-hstat">
              <span className="lp-hstat-n">Live</span>
              <span className="lp-hstat-l">Sync Engine</span>
            </div>
          </div>
        </div>

        <div className="lp-scroll-hint">
          <div className="lp-scroll-line" />
          <span>scroll</span>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-label">— Features</div>
        <h2 className="lp-section-h2">Everything you need,<br /><span className="lp-grad-text">nothing you don't</span></h2>
        <p className="lp-section-p">Built for students who move fast and hate missing out.</p>

        <div className="lp-features-grid">
          {features.map(f => (
            <div className="lp-feat-card" key={f.title}>
              <div className="lp-feat-icon">{f.icon}</div>
              <h3 className="lp-feat-title">{f.title}</h3>
              <p className="lp-feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-section-label">— How it works</div>
        <h2 className="lp-section-h2">Three steps.<br /><span className="lp-grad-text">Zero friction.</span></h2>

        <div className="lp-steps">
          {steps.map((s, i) => (
            <div className="lp-step" key={s.n}>
              <div className="lp-step-num">{s.n}</div>
              <div className="lp-step-body">
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
              {i < 2 && <div className="lp-step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats-band" id="stats">
        {stats.map(s => (
          <div className="lp-band-stat" key={s.l}>
            <span className="lp-band-n">{s.n}</span>
            <span className="lp-band-l">{s.l}</span>
          </div>
        ))}
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-final">
        <div className="lp-final-orb" />
        <div className="lp-section-label">— Get started today</div>
        <h2 className="lp-final-h2">
          Your next opportunity<br />
          <span className="lp-grad-text">is already posted.</span>
        </h2>
        <p className="lp-final-p">Join students who never miss a deadline, hackathon, or prize event.</p>
        <div className="lp-hero-btns">
          <button className="lp-cta-primary lp-cta-lg" onClick={onRegister}>
            Start for free {Icon.arrow}
          </button>
          <button className="lp-cta-ghost" onClick={onSignIn}>Sign In</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <div className="lp-logo-mark sm">{Icon.logoMarkSm}</div>
          <span className="lp-logo-name">Kalnirnay</span>
        </div>
        <p className="lp-footer-copy">© 2025 Kalnirnay · Smart Event Intelligence</p>
      </footer>

    </div>
  )
}
