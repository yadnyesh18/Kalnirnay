import { useState } from 'react'
import axios from 'axios'

export default function SubscribeModal({ onClose, apiUrl }) {
  const [telegramId, setTelegramId] = useState('')
  const [username,   setUsername]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  const handleSubmit = async () => {
    if (!telegramId.trim()) {
      setError('Please enter your Telegram ID')
      return
    }
    setLoading(true)
    setError('')
    try {
      await axios.post(`${apiUrl}/subscriptions`, {
        telegram_id: telegramId.trim(),
        username:    username.trim() || telegramId.trim()
      })
      setSuccess(true)
    } catch (err) {
      setError('Failed to subscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <h2 className="modal-title">Get Notified</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sub-body">
          {!success ? (
            <>
              <p>
                Subscribe to receive Telegram reminders 3 days before any
                event deadline or start date. Never miss a hackathon again.
              </p>

              <div className="input-group">
                <label className="input-label">Your Telegram ID *</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. 123456789"
                  value={telegramId}
                  onChange={e => setTelegramId(e.target.value)}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '5px' }}>
                  Find your ID by messaging @userinfobot on Telegram
                </p>
              </div>

              <div className="input-group">
                <label className="input-label">Username (optional)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. yadnyesh18"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Subscribing...' : 'Subscribe'}
                </button>
                <button className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="success-msg">
              You're subscribed! You'll receive Telegram reminders for upcoming events.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
