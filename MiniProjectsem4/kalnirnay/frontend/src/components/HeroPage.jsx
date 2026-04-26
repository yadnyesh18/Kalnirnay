import './HeroPage.css'
import { useEffect, useState } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function HeroPage({ onSignIn, onRegister, onTelegramLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [dots, setDots] = useState([]);
  const [showTelegramModal, setShowTelegramModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Generate dynamic dots
    const newDots = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 15 + 10}s`,
      animationDelay: `-${Math.random() * 15}s`,
      opacity: Math.random() * 0.4 + 0.2
    }));
    setDots(newDots);

    // Setup IntersectionObserver for fade-in
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="kn-root">
      <div className="global-pattern-bg">
        {dots.map(dot => (
          <div key={dot.id} className="dynamic-dot" style={{
            left: dot.left,
            top: dot.top,
            animationDuration: dot.animationDuration,
            animationDelay: dot.animationDelay,
            opacity: dot.opacity
          }}></div>
        ))}
      </div>
      <nav className={`kn-nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-container">
          <span className="kn-nav-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-logo-icon">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Kaalnirnay
          </span>
          <div className="kn-nav-links">
            <a href="#overview">Overview</a>
            <a href="#features">Features</a>
            <a href="https://web.telegram.org/k/#@kaalnirnay_bot" target="_blank" rel="noreferrer">Telegram Bot</a>
          </div>
          <div className="kn-nav-actions">
            <button className="kn-btn-ghost" onClick={onSignIn}>Log in</button>
            <button className="kn-btn-solid" onClick={onRegister}>Sign up</button>
          </div>
        </div>
      </nav>

      <main className="kn-hero" id="overview">
        <div className="kn-hero-content">
          <div className="kn-hero-text reveal-on-scroll">
            <div className="pill-badge">Next-Gen Academic Planner</div>
            <h1 className="kn-h1">
              Your entire semester, <br />
              seamlessly mapped.
            </h1>
            <p className="kn-hero-p">
              Step away from chaotic spreadsheets. Kaalnirnay unifies your lectures, deadlines, and study blocks into a powerful, frictionless workspace.
            </p>
            <div className="kn-hero-btns">
              <button className="kn-cta-primary interactive-hover" onClick={onRegister}>Create workspace</button>
              <button className="kn-cta-outline interactive-hover" onClick={onSignIn}>See how it works</button>
            </div>
          </div>

          <div className="kn-hero-visual reveal-on-scroll delay-1">
            <div className="visual-panel main-panel">
              <div className="panel-header">
                <span className="header-dot"></span>
                <span className="header-dot"></span>
                <span className="header-dot"></span>
                <span className="header-title">Today's Schedule</span>
              </div>
              <div className="panel-body">
                <div className="schedule-item">
                  <div className="sch-time">09:00 AM</div>
                  <div className="sch-name border-left-blue">Core Subject Lecture</div>
                </div>
                <div className="schedule-item">
                  <div className="sch-time">11:30 AM</div>
                  <div className="sch-name border-left-gray">Lab Session</div>
                </div>
                <div className="schedule-item">
                  <div className="sch-time">02:00 PM</div>
                  <div className="sch-name border-left-gray">Study Block (Library)</div>
                </div>
              </div>
            </div>

            <div className="visual-panel side-panel side-panel-1">
              <div className="panel-mini-header">Upcoming</div>
              <div className="panel-mini-body">
                <strong>Project Due</strong>
                <span>Tomorrow, 11:59 PM</span>
              </div>
            </div>

            <div className="visual-panel side-panel side-panel-2">
              <div className="panel-mini-header">Result</div>
              <div className="panel-mini-body">
                <strong>Quiz Graded</strong>
                <span>Score: 95%</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="kn-showcase reveal-on-scroll" id="calendar">
        <div className="showcase-container">
          <div className="showcase-text">
            <h2>Command your schedule.</h2>
            <p>Our unified architecture automatically resolves conflicts between your syllabi and personal tasks. See the weeks ahead without the noise.</p>
          </div>
          <div className="showcase-visual" style={{ alignItems: 'flex-start' }}>
            <div className="mock-grid-ui" style={{ width: '100%', padding: '0.5rem' }}>
              <div className="mock-grid-header" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>This Week</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>5 Scheduled</span>
              </div>
              <div className="mock-grid-body" style={{ gap: '1rem' }}>
                <div className="mg-col">
                  <span style={{ display: 'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MON</span>
                  <div className="mg-item h-1" style={{ background: 'rgba(255,255,255,0.08)', borderLeft: '4px solid #fff', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}><span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Lecture</span></div>
                </div>
                <div className="mg-col">
                  <span style={{ display: 'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TUE</span>
                  <div className="mg-item h-2 mt-1" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid #666', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}><span style={{ fontSize: '1rem', fontWeight: 500, color: '#ccc' }}>Lab Work</span></div>
                </div>
                <div className="mg-col">
                  <span style={{ display: 'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WED</span>
                  <div className="mg-item h-3" style={{ background: 'rgba(255,255,255,0.08)', borderLeft: '4px solid #fff', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}><span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Seminar</span></div>
                </div>
                <div className="mg-col">
                  <span style={{ display: 'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>THU</span>
                  <div className="mg-item h-1 mt-2" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid #666', display: 'flex', alignItems: 'center', paddingLeft: '10px' }}><span style={{ fontSize: '1rem', fontWeight: 500, color: '#ccc' }}>Review</span></div>
                </div>
                <div className="mg-col">
                  <span style={{ display: 'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FRI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kn-showcase showcase-reverse reveal-on-scroll" id="deadlines">
        <div className="showcase-container">
          <div className="showcase-text">
            <h2>Never drop a deadline.</h2>
            <p>Assign parameters to multi-stage projects. Our engine calculates micro-deadlines and pings your devices immediately if you fall behind.</p>
          </div>
          <div className="showcase-visual">
            <div className="mock-list-ui" style={{ padding: '0 1.5rem' }}>
              <div className="ml-item" style={{ marginBottom: '1.5rem' }}>
                <span className="ml-circle active" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></span>
                <div style={{ flex: 1, paddingLeft: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>Submit Draft</span>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Due in 2 Days</span>
                </div>
              </div>
              <div className="ml-item" style={{ marginBottom: '1.5rem' }}>
                <span className="ml-circle" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></span>
                <div style={{ flex: 1, paddingLeft: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '1.3rem', fontWeight: 500, color: '#aaa' }}>Peer Review</span>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Pending</span>
                </div>
              </div>
              <div className="ml-item">
                <span className="ml-circle" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></span>
                <div style={{ flex: 1, paddingLeft: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '1.3rem', fontWeight: 500, color: '#aaa' }}>Final Submission</span>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Next Week</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kn-features" id="features">
        <div className="features-container">
          <div className="features-header reveal-on-scroll">
            <h2>Engineered for clarity.</h2>
            <p>No fluff, no glowing abstractions. Just powerful tools.</p>
          </div>

          <div className="features-bento reveal-on-scroll delay-1">

            {/* Bento Planning */}
            <div className="feat-item border-right border-bottom">
              <div className="feat-mockup">
                <div className="bento-grid">
                  <div className="bento-cell tall">
                    <span className="bento-label">DSA</span>
                    <div className="bento-bar"><div className="bento-fill" style={{width:'72%'}}></div></div>
                    <span className="bento-pct">72%</span>
                  </div>
                  <div className="bento-cell">
                    <span className="bento-label">OS</span>
                    <div className="bento-bar"><div className="bento-fill" style={{width:'45%'}}></div></div>
                    <span className="bento-pct">45%</span>
                  </div>
                  <div className="bento-cell">
                    <span className="bento-label">DBMS</span>
                    <div className="bento-bar"><div className="bento-fill" style={{width:'88%'}}></div></div>
                    <span className="bento-pct">88%</span>
                  </div>
                  <div className="bento-cell wide">
                    <span className="bento-label">Networks</span>
                    <div className="bento-bar"><div className="bento-fill" style={{width:'31%'}}></div></div>
                    <span className="bento-pct">31%</span>
                  </div>
                </div>
              </div>
              <h3>Bento Planning</h3>
              <p>Organize your semester via a high-density, monochrome grid.</p>
            </div>

            {/* Unified Schedule */}
            <div className="feat-item border-right border-bottom">
              <div className="feat-mockup">
                <div className="sched-ui">
                  <div className="sched-row header">
                    {['M','T','W','T','F'].map((d,i) => <span key={i} className="sched-day">{d}</span>)}
                  </div>
                  <div className="sched-row">
                    <div className="sched-block active" style={{gridColumn:'1/3'}}>Lecture</div>
                    <div className="sched-block dim">Lab</div>
                    <div className="sched-block active">Seminar</div>
                    <div className="sched-block dim">Review</div>
                  </div>
                  <div className="sched-deadline">
                    <span className="sched-dot"></span>
                    <span>Project deadline — Fri, 11:59 PM</span>
                  </div>
                </div>
              </div>
              <h3>Unified Schedule</h3>
              <p>One unified calendar mapping timelines across all syllabi.</p>
            </div>

            {/* Exam Countdowns */}
            <div className="feat-item border-bottom">
              <div className="feat-mockup">
                <div className="countdown-ui">
                  <div className="countdown-top">
                    <span className="countdown-exam-name">Final Exam</span>
                    <span className="countdown-badge">DSA · Sem 4</span>
                  </div>
                  <div className="countdown-display">
                    <span className="countdown-big">12</span>
                    <span className="countdown-days-label">days left</span>
                  </div>
                  <div className="countdown-track">
                    <div className="countdown-progress"></div>
                  </div>
                  <div className="countdown-meta">
                    <span className="countdown-subject">34 of 100 days elapsed</span>
                    <span className="countdown-date">May 14, 2026</span>
                  </div>
                </div>
              </div>
              <h3>Exam Countdowns</h3>
              <p>Minimalistic timers focusing on the precise days leading up to finals.</p>
            </div>

            {/* Smart Checklists */}
            <div className="feat-item border-right">
              <div className="feat-mockup">
                <div className="checklist-ui">
                  <div className="cl-item done">
                    <span className="cl-check checked"></span>
                    <span className="cl-text">Research phase</span>
                  </div>
                  <div className="cl-item done">
                    <span className="cl-check checked"></span>
                    <span className="cl-text">Outline draft</span>
                  </div>
                  <div className="cl-item active">
                    <span className="cl-check"></span>
                    <span className="cl-text">Write sections</span>
                    <div className="cl-sub">
                      <div className="cl-subitem done"><span className="cl-check-sm checked"></span><span>Intro</span></div>
                      <div className="cl-subitem"><span className="cl-check-sm"></span><span>Body</span></div>
                    </div>
                  </div>
                  <div className="cl-item">
                    <span className="cl-check"></span>
                    <span className="cl-text">Final review</span>
                  </div>
                </div>
              </div>
              <h3>Smart Checklists</h3>
              <p>Hierarchical task breaking, tracking strict sub-deadline parameters.</p>
            </div>

            {/* Telegram Alerts */}
            <div className="feat-item border-right">
              <div className="feat-mockup">
                <div className="tg-alerts-ui">
                  <div className="tg-card">
                    <div className="tg-card-top">
                      <span className="tg-bot-name">@kaalnirnay_bot</span>
                      <span className="tg-time">09:00</span>
                    </div>
                    <p className="tg-msg">📌 Reminder: DSA assignment due in <strong>2 hours</strong>.</p>
                  </div>
                  <div className="tg-card dim">
                    <div className="tg-card-top">
                      <span className="tg-bot-name">@kaalnirnay_bot</span>
                      <span className="tg-time">Yesterday</span>
                    </div>
                    <p className="tg-msg">🗓 New event added: <strong>Codeathon 2026</strong> — Apr 30.</p>
                  </div>
                </div>
              </div>
              <h3>Telegram Alerts</h3>
              <p>Plain text pings integrating directly with your mobile workflow.</p>
            </div>

            {/* Cross-Device */}
            <div className="feat-item">
              <div className="feat-mockup">
                <div className="devices-ui">
                  <div className="device laptop">
                    <div className="device-screen">
                      <div className="ds-bar"></div>
                      <div className="ds-row"><div className="ds-block w60"></div><div className="ds-block w30"></div></div>
                      <div className="ds-row"><div className="ds-block w80"></div></div>
                    </div>
                    <div className="device-base"></div>
                  </div>
                  <div className="device tablet">
                    <div className="device-screen">
                      <div className="ds-bar"></div>
                      <div className="ds-row"><div className="ds-block w60"></div></div>
                      <div className="ds-row"><div className="ds-block w80"></div></div>
                    </div>
                  </div>
                  <div className="device phone">
                    <div className="device-screen">
                      <div className="ds-bar"></div>
                      <div className="ds-row"><div className="ds-block w80"></div></div>
                    </div>
                  </div>
                  <div className="sync-line"></div>
                </div>
              </div>
              <h3>Cross-Device</h3>
              <p>Sub-millisecond sync across your laptop, tablet, and phone.</p>
            </div>

          </div>
        </div>
      </section>

      <footer className="kn-footer reveal-on-scroll delay-1">
        <div className="footer-top">
          <div className="footer-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Kaalnirnay
          </div>
          <div className="footer-links">
            <a href="#overview">Overview</a>
            <a href="#features">Features</a>
            <button className="footer-btn tg-connect-btn" onClick={() => setShowTelegramModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-1.97 9.28c-.15.67-.54.83-1.1.52l-3.03-2.24-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.07 5.58-5.04c.24-.22-.05-.34-.38-.13L8.69 13.7l-2.97-.93c-.65-.2-.66-.65.14-.96l11.6-4.47c.54-.2 1.01.13.83.96l.65-.17z" /></svg>
              Connect your Telegram ID
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Kaalnirnay.</span>
          <span>System Status: Online</span>
        </div>
      </footer>

      {/* Telegram Connect Modal */}
      {showTelegramModal && (
        <TelegramConnectModal
          onClose={() => setShowTelegramModal(false)}
          onSuccess={(userData) => {
            setShowTelegramModal(false);
            onTelegramLogin?.(userData);
          }}
        />
      )}
    </div>
  )
}

function TelegramConnectModal({ onClose, onSuccess }) {
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/telegram-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to connect. Please try again.');
      } else {
        onSuccess(data);
      }
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tg-modal-overlay" onClick={onClose}>
      <div className="tg-modal" onClick={e => e.stopPropagation()}>
        <button className="tg-modal-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="tg-modal-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#29B6F6">
            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-1.97 9.28c-.15.67-.54.83-1.1.52l-3.03-2.24-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.07 5.58-5.04c.24-.22-.05-.34-.38-.13L8.69 13.7l-2.97-.93c-.65-.2-.66-.65.14-.96l11.6-4.47c.54-.2 1.01.13.83.96l.65-.17z" />
          </svg>
        </div>

        <h2 className="tg-modal-title">Connect your Telegram</h2>
        <p className="tg-modal-desc">
          Enter your Telegram numeric ID to sync your group events to the calendar.
          <br />
          <span className="tg-modal-hint">
            To find your ID, message <a href="https://web.telegram.org/k/#@userinfobot" target="_blank" rel="noreferrer">@userinfobot</a> on Telegram.
          </span>
        </p>

        <form className="tg-modal-form" onSubmit={handleSubmit}>
          <div className="tg-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              type="text"
              placeholder="@username"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && <p className="tg-modal-error">{error}</p>}

          <button className="tg-modal-submit" type="submit" disabled={loading}>
            {loading ? <span className="tg-spinner" /> : 'Connect & View Calendar'}
          </button>
        </form>
      </div>
    </div>
  );
}
