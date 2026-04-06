import './ProfilePanel.css'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'

export default function ProfilePanel({ user, events, onLogout }) {
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??'

  const upcomingCount = events.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date.split(' to ')[0])
    return d >= new Date()
  }).length

  const withPrize = events.filter(e => e.prize).length

  return (
    <aside className="pp-root">

      {/* ── Header ── */}
      <div className="pp-header">
        <div className="pp-avatar">{initials}</div>
        <div>
          <p className="pp-username">@{user?.username || 'student'}</p>
          <p className="pp-email">{user?.email || user?.telegram_id || ''}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="pp-stats">
        <div className="pp-stat">
          <span className="pp-stat-n">{events.length}</span>
          <span className="pp-stat-l">Total</span>
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

      {/* ── Menu items ── */}
      <nav className="pp-menu">
        <div className="pp-menu-label">Account</div>

        <div className="pp-menu-item">
          <span className="material-symbols-outlined pp-menu-icon">person</span>
          <div>
            <p className="pp-menu-title">Profile</p>
            <p className="pp-menu-sub">@{user?.username || 'student'}</p>
          </div>
        </div>

        <div className="pp-menu-item">
          <span className="material-symbols-outlined pp-menu-icon">calendar_month</span>
          <div>
            <p className="pp-menu-title">My Calendar</p>
            <p className="pp-menu-sub">{events.length} events tracked</p>
          </div>
        </div>

        {user?.groups?.length > 0 && (
          <div className="pp-menu-item">
            <span className="material-symbols-outlined pp-menu-icon">group</span>
            <div>
              <p className="pp-menu-title">Linked Groups</p>
              <p className="pp-menu-sub">{user.groups.length} group{user.groups.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        <div className="pp-menu-label" style={{ marginTop: '0.5rem' }}>Integrations</div>

        <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" className="pp-menu-item pp-menu-item--link">
          <span className="pp-menu-icon pp-tg-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 0C5.37 0 0 5.37 0 12C0 18.63 5.37 24 12 24C18.63 24 24 18.63 24 12C24 5.37 18.63 0 12 0ZM17.97 8.01L15.63 19.14C15.46 19.92 14.99 20.12 14.34 19.75L10.79 17.13L9.07 18.78C8.88 18.97 8.72 19.13 8.35 19.13L8.6 15.51L15.2 9.54C15.49 9.28 15.13 9.14 14.75 9.4L6.59 14.54L3.09 13.44C2.33 13.2 2.31 12.68 3.25 12.31L16.92 7.04C17.55 6.81 18.11 7.19 17.97 8.01Z" fill="currentColor"/>
            </svg>
          </span>
          <div>
            <p className="pp-menu-title">Open Telegram Bot</p>
            <p className="pp-menu-sub">@kaalnirnay_bot</p>
          </div>
          <span className="material-symbols-outlined pp-menu-arrow">open_in_new</span>
        </a>
      </nav>

      {/* ── Logout ── */}
      <button className="pp-logout" onClick={onLogout}>
        <span className="material-symbols-outlined">logout</span>
        Sign Out
      </button>

    </aside>
  )
}
