import { useState } from 'react'
import './ProfilePanel.css'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'
const API = 'http://localhost:3000'

export default function ProfilePanel({ user, events, onLogout, onUserUpdate }) {
  const [tgUsername, setTgUsername] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')

  const upcomingCount = events.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date.split(' to ')[0])
    return d >= new Date()
  }).length

  const withPrize = events.filter(e => e.prize).length

  const linkTelegram = async e => {
    e.preventDefault()
    setLinkError('')
    setLinkSuccess('')
    setLinking(true)
    try {
      const clean = tgUsername.replace('@', '').trim()
      const res = await fetch(`${API}/subscriptions/user/${clean}`)
      if (!res.ok) throw new Error('not_found')
      const updated = await res.json()
      setLinkSuccess(`Linked! @${updated.username} is now connected.`)
      setTgUsername('')
      onUserUpdate?.(updated)
    } catch {
      setLinkError('Username not found. Send /join in your college group with @kaalnirnay_bot first.')
    } finally {
      setLinking(false)
    }
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??'

  const isTgLinked = !!user?.telegram_id

  return (
    <aside className="pp-root">

      {/* Avatar + identity */}
      <div className="pp-identity">
        <div className="pp-avatar">{initials}</div>
        <div className="pp-identity-text">
          <p className="pp-username">@{user?.username || 'student'}</p>
          <p className="pp-role">Student</p>
        </div>
      </div>

      {/* Stats */}
      <div className="pp-stats">
        <div className="pp-stat">
          <span className="pp-stat-n">{events.length}</span>
          <span className="pp-stat-l">Total Events</span>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-n">{upcomingCount}</span>
          <span className="pp-stat-l">Upcoming</span>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-n">{withPrize}</span>
          <span className="pp-stat-l">With Prize</span>
        </div>
      </div>

      {/* Telegram section */}
      <div className="pp-section">
        <p className="pp-section-title">
          <span className="material-symbols-outlined pp-section-icon">send</span>
          Telegram
        </p>

        {isTgLinked ? (
          <div className="pp-tg-linked">
            <span className="material-symbols-outlined pp-tg-check">check_circle</span>
            <div>
              <p className="pp-tg-linked-label">Account linked</p>
              <p className="pp-tg-linked-val">@{user.username}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="pp-tg-desc">
              Link your Telegram to auto-sync events from your college groups.
            </p>

            {/* Step hint */}
            <div className="pp-tg-hint">
              <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="pp-tg-open-btn">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                Open @kaalnirnay_bot
              </a>
              <p className="pp-tg-hint-text">
                Send <code>/start</code> then <code>/join</code> in your college group, then enter your username below.
              </p>
            </div>

            <form className="pp-tg-form" onSubmit={linkTelegram}>
              <div className="pp-tg-input-wrap">
                <span className="material-symbols-outlined pp-tg-input-icon">alternate_email</span>
                <input
                  type="text"
                  placeholder="your_telegram_username"
                  value={tgUsername}
                  onChange={e => setTgUsername(e.target.value)}
                  required
                />
              </div>
              <button className="pp-tg-submit" type="submit" disabled={linking}>
                {linking
                  ? <span className="pp-spinner" />
                  : 'Link Account'}
              </button>
            </form>

            {linkError && <p className="pp-msg pp-msg--error">{linkError}</p>}
            {linkSuccess && <p className="pp-msg pp-msg--success">{linkSuccess}</p>}
          </>
        )}
      </div>

      {/* Groups */}
      {user?.groups?.length > 0 && (
        <div className="pp-section">
          <p className="pp-section-title">
            <span className="material-symbols-outlined pp-section-icon">group</span>
            Linked Groups
          </p>
          <div className="pp-groups">
            {user.groups.map(g => (
              <span key={g} className="pp-group-tag">{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button className="pp-logout" onClick={onLogout}>
        <span className="material-symbols-outlined">logout</span>
        Sign Out
      </button>

    </aside>
  )
}
