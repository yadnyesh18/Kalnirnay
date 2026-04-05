import './HeroPage.css'
import { useEffect, useState } from 'react'

export default function HeroPage({ onSignIn, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [dots, setDots] = useState([]);

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
            <a href="https://t.me/kaalnirnay_bot" target="_blank" rel="noreferrer">Telegram Bot</a>
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
              Your entire semester, <br/>
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
          <div className="showcase-visual" style={{alignItems: 'flex-start'}}>
             <div className="mock-grid-ui" style={{width: '100%', padding: '0.5rem'}}>
               <div className="mock-grid-header" style={{display:'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem'}}>
                 <span>This Week</span>
                 <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>5 Scheduled</span>
               </div>
               <div className="mock-grid-body" style={{gap: '1rem'}}>
                 <div className="mg-col">
                    <span style={{display:'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600}}>MON</span>
                    <div className="mg-item h-1" style={{background: 'rgba(255,255,255,0.08)', borderLeft: '4px solid #fff', display: 'flex', alignItems: 'center', paddingLeft: '10px'}}><span style={{fontSize: '1rem', fontWeight: 600, color: '#fff'}}>Lecture</span></div>
                 </div>
                 <div className="mg-col">
                    <span style={{display:'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600}}>TUE</span>
                    <div className="mg-item h-2 mt-1" style={{background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid #666', display: 'flex', alignItems: 'center', paddingLeft: '10px'}}><span style={{fontSize: '1rem', fontWeight: 500, color: '#ccc'}}>Lab Work</span></div>
                 </div>
                 <div className="mg-col">
                    <span style={{display:'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600}}>WED</span>
                    <div className="mg-item h-3" style={{background: 'rgba(255,255,255,0.08)', borderLeft: '4px solid #fff', display: 'flex', alignItems: 'center', paddingLeft: '10px'}}><span style={{fontSize: '1rem', fontWeight: 600, color: '#fff'}}>Seminar</span></div>
                 </div>
                 <div className="mg-col">
                    <span style={{display:'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600}}>THU</span>
                    <div className="mg-item h-1 mt-2" style={{background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid #666', display: 'flex', alignItems: 'center', paddingLeft: '10px'}}><span style={{fontSize: '1rem', fontWeight: 500, color: '#ccc'}}>Review</span></div>
                 </div>
                 <div className="mg-col">
                    <span style={{display:'block', marginBottom: '12px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600}}>FRI</span>
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
            <div className="mock-list-ui" style={{padding: '0 1.5rem'}}>
               <div className="ml-item" style={{marginBottom: '1.5rem'}}>
                 <span className="ml-circle active" style={{width: '28px', height: '28px', borderWidth: '3px'}}></span>
                 <div style={{flex: 1, paddingLeft: '1rem'}}>
                    <span style={{display: 'block', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)'}}>Submit Draft</span>
                    <span style={{fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Due in 2 Days</span>
                 </div>
               </div>
               <div className="ml-item" style={{marginBottom: '1.5rem'}}>
                 <span className="ml-circle" style={{width: '28px', height: '28px', borderWidth: '3px'}}></span>
                 <div style={{flex: 1, paddingLeft: '1rem'}}>
                    <span style={{display: 'block', fontSize: '1.3rem', fontWeight: 500, color: '#aaa'}}>Peer Review</span>
                    <span style={{fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Pending</span>
                 </div>
               </div>
               <div className="ml-item">
                 <span className="ml-circle" style={{width: '28px', height: '28px', borderWidth: '3px'}}></span>
                 <div style={{flex: 1, paddingLeft: '1rem'}}>
                    <span style={{display: 'block', fontSize: '1.3rem', fontWeight: 500, color: '#aaa'}}>Final Submission</span>
                    <span style={{fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Next Week</span>
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
             <div className="feat-item border-right border-bottom">
                <span className="material-symbols-outlined">grid_view</span>
                <h3>Bento Planning</h3>
                <p>Organize your semester via a high-density, monochrome grid.</p>
             </div>
             <div className="feat-item border-right border-bottom">
                <span className="material-symbols-outlined">calendar_today</span>
                <h3>Unified Schedule</h3>
                <p>One unified calendar mapping timelines across all syllabi.</p>
             </div>
             <div className="feat-item border-bottom">
                <span className="material-symbols-outlined">hourglass_empty</span>
                <h3>Exam Countdowns</h3>
                <p>Minimalistic timers focusing on the precise days leading up to finals.</p>
             </div>
             <div className="feat-item border-right">
                <span className="material-symbols-outlined">checklist</span>
                <h3>Smart Checklists</h3>
                <p>Hierarchical task breaking, tracking strict sub-deadline parameters.</p>
             </div>
             <div className="feat-item border-right">
                <span className="material-symbols-outlined">send</span>
                <h3>Telegram Alerts</h3>
                <p>Plain text pings integrating directly with your mobile workflow.</p>
             </div>
             <div className="feat-item">
                <span className="material-symbols-outlined">sync</span>
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
             <button className="footer-btn" onClick={onSignIn}>Login</button>
          </div>
        </div>
        <div className="footer-bottom">
           <span>© 2026 Kaalnirnay.</span>
           <span>System Status: Online</span>
        </div>
      </footer>
    </div>
  )
}
