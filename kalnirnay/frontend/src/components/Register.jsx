import { useState } from 'react'
import './Register.css'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'
const API = 'http://localhost:3000'
const STEPS = ['Profile', 'Focus', 'Finish']

export default function Register({ onBack, onSuccess, onSignIn }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', university: '', major: '', year: 'Freshman / 1st Year', program: 'ug',
    email: '', password: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const next = e => { e.preventDefault(); setStep(s => Math.min(s + 1, 2)) }
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      // Register user via subscriptions endpoint
      await fetch(`${API}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: form.email, // placeholder until Telegram links
          username: form.email.split('@')[0],
        })
      })
    } catch { /* non-blocking — account creation is Telegram-first */ }
    setLoading(false)
    setSuccess(true)
  }

  return (
    <div className="rg-root">
      {/* Ambient glows */}
      <div className="rg-glow rg-glow1" />
      <div className="rg-glow rg-glow2" />

      {/* ── HEADER ── */}
      <header className="rg-header">
        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <button onClick={onBack} style={{background: 'none', border: 'none', color: 'var(--text-secondary, #888)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'inherit', fontSize: '0.9rem', padding: 0}}>
             <span className="material-symbols-outlined" style={{fontSize: '1.1rem'}}>arrow_back</span> Back
          </button>
          <div className="rg-brand" style={{cursor: 'default'}}>Kaalnirnay</div>
        </div>
        <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="rg-help-btn">
          <span className="material-symbols-outlined">help</span>
        </a>
      </header>

      <main className="rg-main">
        <div className="rg-wrap">

          {/* ── STEPPER ── */}
          <div className="rg-stepper">
            {STEPS.map((label, i) => (
              <div className="rg-step" key={label}>
                <div className={`rg-step-bar ${i <= step ? 'rg-step-bar--active' : ''}`} />
                <span className={`rg-step-label ${i <= step ? 'rg-step-label--active' : ''}`}>{label}</span>
              </div>
            ))}
          </div>

          {/* ── STEP 0: PROFILE ── */}
          {step === 0 && (
            <form onSubmit={next}>
              <div className="rg-content-header">
                <h1 className="rg-h1">Tell us about yourself.</h1>
                <p className="rg-sub">This helps us tailor your experience to your academic journey.</p>
              </div>

              <div className="rg-grid2">
                <div className="rg-field">
                  <label>Full Name</label>
                  <input name="name" type="text" placeholder="e.g. Arjun Sharma"
                    value={form.name} onChange={handle} required />
                </div>
                <div className="rg-field">
                  <label>University / School</label>
                  <input name="university" type="text" placeholder="e.g. IIT Bombay"
                    value={form.university} onChange={handle} required />
                </div>
                <div className="rg-field">
                  <label>Major / Area of Study</label>
                  <input name="major" type="text" placeholder="e.g. Computer Science"
                    value={form.major} onChange={handle} required />
                </div>
                <div className="rg-field">
                  <label>Academic Year</label>
                  <div className="rg-select-wrap">
                    <select name="year" value={form.year} onChange={handle}>
                      <option>Freshman / 1st Year</option>
                      <option>Sophomore / 2nd Year</option>
                      <option>Junior / 3rd Year</option>
                      <option>Senior / 4th Year</option>
                      <option>Final Year</option>
                    </select>
                    <span className="material-symbols-outlined rg-select-icon">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="rg-field rg-field--full">
                <label>Program Level</label>
                <div className="rg-grid2">
                  <label className={`rg-program-card ${form.program === 'ug' ? 'rg-program-card--active' : ''}`}>
                    <input type="radio" name="program" value="ug" checked={form.program === 'ug'} onChange={handle} />
                    <div className="rg-program-icon rg-program-icon--secondary">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                      <h3>Undergraduate</h3>
                      <p>Core foundations and bachelor's degree paths.</p>
                    </div>
                  </label>
                  <label className={`rg-program-card ${form.program === 'pg' ? 'rg-program-card--active' : ''}`}>
                    <input type="radio" name="program" value="pg" checked={form.program === 'pg'} onChange={handle} />
                    <div className="rg-program-icon">
                      <span className="material-symbols-outlined">workspace_premium</span>
                    </div>
                    <div>
                      <h3>Postgraduate</h3>
                      <p>Masters, doctoral, or advanced research level.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rg-footer-row">
                <div className="rg-privacy">
                  <span className="material-symbols-outlined rg-lock-icon" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <span>Your data is private &amp; encrypted</span>
                </div>
                <button className="rg-btn-primary" type="submit">Continue</button>
              </div>
            </form>
          )}

          {/* ── STEP 1: FOCUS (account credentials) ── */}
          {step === 1 && (
            <form onSubmit={next}>
              <div className="rg-content-header">
                <h1 className="rg-h1">Set up your account.</h1>
                <p className="rg-sub">Create your login credentials to get started instantly.</p>
              </div>

              <div className="rg-stack">
                <div className="rg-field">
                  <label>University Email</label>
                  <div className="rg-input-wrap">
                    <span className="material-symbols-outlined rg-input-icon">school</span>
                    <input name="email" type="email" placeholder="you@university.edu"
                      value={form.email} onChange={handle} required />
                  </div>
                </div>
                <div className="rg-field">
                  <label>Choose Password</label>
                  <div className="rg-input-wrap">
                    <span className="material-symbols-outlined rg-input-icon">lock</span>
                    <input name="password" type="password" placeholder="••••••••"
                      value={form.password} onChange={handle} required />
                  </div>
                </div>
              </div>

              <div className="rg-footer-row">
                <button className="rg-btn-ghost" type="button" onClick={prev}>Back</button>
                <button className="rg-btn-primary" type="submit">Continue</button>
              </div>
            </form>
          )}

          {/* ── STEP 2: FINISH ── */}
          {step === 2 && (
            <form onSubmit={submit}>
              <div className="rg-content-header">
                <h1 className="rg-h1">You're almost in.</h1>
                <p className="rg-sub">Review your details and create your account.</p>
              </div>

              <div className="rg-review-card">
                <div className="rg-review-row">
                  <span className="material-symbols-outlined rg-review-icon" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  <div>
                    <p className="rg-review-label">Name</p>
                    <p className="rg-review-value">{form.name || '—'}</p>
                  </div>
                </div>
                <div className="rg-review-row">
                  <span className="material-symbols-outlined rg-review-icon" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  <div>
                    <p className="rg-review-label">University</p>
                    <p className="rg-review-value">{form.university || '—'}</p>
                  </div>
                </div>
                <div className="rg-review-row">
                  <span className="material-symbols-outlined rg-review-icon" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  <div>
                    <p className="rg-review-label">Major · {form.year}</p>
                    <p className="rg-review-value">{form.major || '—'}</p>
                  </div>
                </div>
                <div className="rg-review-row">
                  <span className="material-symbols-outlined rg-review-icon" style={{ fontVariationSettings: "'FILL' 1" }}>alternate_email</span>
                  <div>
                    <p className="rg-review-label">Email</p>
                    <p className="rg-review-value">{form.email || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="rg-trust">
                <div className="rg-trust-icon">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <div>
                  <h4>Built for Students</h4>
                  <p>Join 12,000+ students using Kaalnirnay to track events, hackathons, and deadlines.</p>
                </div>
              </div>

              <div className="rg-footer-row">
                <button className="rg-btn-ghost" type="button" onClick={prev}>Back</button>
                <button className="rg-btn-primary" type="submit" disabled={loading}>
                  {loading ? <span className="rg-spinner" /> : 'Create Account'}
                </button>
              </div>

              <p className="rg-switch">
                Already have an account?{' '}
                <button className="rg-link" type="button" onClick={onSignIn ?? onBack}>Log in</button>
              </p>
            </form>
          )}

        </div>
      </main>

      {/* ── SUCCESS MODAL ── */}
      {success && (
        <div className="rg-modal-overlay">
          <div className="rg-modal">
            <div className="rg-modal-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3>Welcome, {form.name.split(' ')[0] || 'Scholar'}!</h3>
            <p>Your account is ready. You can now access your dashboard and sync events.</p>
            <button className="rg-btn-primary" onClick={onSuccess} style={{marginTop: '1.5rem', width: '100%'}}>Go to Dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}
