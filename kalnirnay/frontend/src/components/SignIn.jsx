import { useState } from 'react'
import './AuthPage.css'

const API = 'http://localhost:3000'

export default function SignIn({ onBack, onSuccess, onRegister }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      onSuccess?.(data)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
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
          <div className="si-brand" style={{cursor: 'default'}}>Kalnirnay</div>
        </div>
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
              New to Kalnirnay?{' '}
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
