import { useState } from 'react'
import './AuthPage.css'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'
const API = 'http://localhost:3000'

const TelegramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 18.63 5.37 24 12 24C18.63 24 24 18.63 24 12C24 5.37 18.63 0 12 0ZM17.97 8.01L15.63 19.14C15.46 19.92 14.99 20.12 14.34 19.75L10.79 17.13L9.07 18.78C8.88 18.97 8.72 19.13 8.35 19.13L8.6 15.51L15.2 9.54C15.49 9.28 15.13 9.14 14.75 9.4L6.59 14.54L3.09 13.44C2.33 13.2 2.31 12.68 3.25 12.31L16.92 7.04C17.55 6.81 18.11 7.19 17.97 8.01Z" fill="white"/>
  </svg>
)

export default function SignIn({ onBack, onSuccess, onRegister }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Email/password login — calls real subscription lookup by username
  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const username = form.email.split('@')[0]
      const res = await fetch(`${API}/subscriptions/user/${username}`)
      if (!res.ok) throw new Error('not_found')
      const user = await res.json()
      onSuccess?.(user)
    } catch {
      setError('Account not found. Make sure you have linked Telegram first.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="si-root">
      {/* Ambient glows */}
      <div className="si-glow si-glow1" />
      <div className="si-glow si-glow2" />

      {/* Background image */}
      <div className="si-bg-img">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBe2VFSLMrMTzuXCdPs-WCmGQHHd7skGcohzrZgtntexh2Rec2mG2vV5eFrHddICfuxpBl3N1iFePDtE-DfG2xU6-CVp_RJhysKJ--lqxBuEWpa06U9Hs3YdoztNhKyL9GhoKZzK0mhYogeYaJhe-UE5D2OmUxAe32Ceq4eGpwEM1sQVJiuGe5aAEkGdZMRbNlN0iKh0GPMLHA3d-TEPKwoQNCpTYlcLVrhq4ngCZlMx0zkYS1hDctdauqr7K8wJkqdfWGJ-DPmCzvP"
          alt=""
        />
      </div>

      {/* ── HEADER ── */}
      <header className="si-header">
        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <button onClick={onBack} style={{background: 'none', border: 'none', color: 'var(--text-secondary, #888)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'inherit', fontSize: '0.9rem', padding: 0}}>
             <span className="material-symbols-outlined" style={{fontSize: '1.1rem'}}>arrow_back</span> Back
          </button>
          <div className="si-brand" style={{cursor: 'default'}}>Kaalnirnay</div>
        </div>
        <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="si-help-btn">
          <span className="material-symbols-outlined">help</span>
        </a>
      </header>

      {/* ── MAIN ── */}
      <main className="si-main">
        <div className="si-center">

          {/* Heading */}
          <div className="si-heading">
            <h1 className="si-h1">Welcome back.</h1>
            <p className="si-sub">Your academic workspace awaits.</p>
          </div>

          {/* Card */}
          <div className="si-card">



            {/* Form */}
            <form className="si-form" onSubmit={submit}>
              <div className="si-field">
                <label htmlFor="si-email">Student Identifier</label>
                <div className="si-input-wrap">
                  <span className="material-symbols-outlined si-input-icon">person</span>
                  <input
                    id="si-email" name="email" type="email"
                    placeholder="Email or Username"
                    value={form.email} onChange={handle} required
                  />
                </div>
              </div>

              <div className="si-field">
                <div className="si-field-header">
                  <label htmlFor="si-password">Access Key</label>
                  <a href="#" className="si-forgot">Forgot Access Key?</a>
                </div>
                <div className="si-input-wrap">
                  <span className="material-symbols-outlined si-input-icon">key</span>
                  <input
                    id="si-password" name="password" type="password"
                    placeholder="••••••••"
                    value={form.password} onChange={handle} required
                  />
                </div>
              </div>

              <button className="si-submit" type="submit" disabled={loading}>
                {loading ? <span className="si-spinner" /> : 'Enter Workspace'}
              </button>
            </form>

            {error && <p className="si-error">{error}</p>}

            {/* Switch */}
            <p className="si-switch">
              New to Kaalnirnay?{' '}
              <button className="si-link" onClick={onRegister ?? onBack}>Create an account</button>
            </p>
          </div>

          {/* Accent dots */}
          <div className="si-accent">
            <div className="si-accent-dot" />
            <div className="si-accent-line" />
            <div className="si-accent-dot" />
          </div>

        </div>
      </main>


    </div>
  )
}
