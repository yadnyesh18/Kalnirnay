import { useState, useEffect } from 'react'
import axios from 'axios'
import './ProfilePanel.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ProfilePanel({ user, events, onLogout }) {
  const [groupNames, setGroupNames] = useState({})

  // Fetch group names whenever user.groups changes
  useEffect(() => {
    if (user?.groups?.length > 0) {
      axios.get(`${API}/groups?ids=${user.groups.join(',')}`)
        .then(res => {
          const map = {}
          res.data.forEach(g => { map[g.group_id] = g.group_name })
          setGroupNames(map)
        })
        .catch(() => { })
    }
  }, [user?.groups])
  // Use first two letters of full_name, then username, then email prefix
  const displayName = user?.full_name || user?.username || user?.email?.split('@')[0] || 'Student'
  const initials = displayName.slice(0, 2).toUpperCase()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Only count upcoming events (today and after) — spec says "should not calculate events which are yesterday and before"
  const upcomingCount = events.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date.split(' to ')[0])
    return d >= today
  }).length

  const personalCount = events.filter(e => !e.group_id).length
  const groupCount = events.filter(e => !!e.group_id).length

  return (
    <aside className="pp-root">

      {/* ── Header ── */}
      <div className="pp-header">
        <div className="pp-avatar">{initials}</div>
        <div>
          <p className="pp-username">{user?.full_name || user?.username || 'Student'}</p>
          <p className="pp-email">{user?.email || ''}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="pp-stats">
        <div className="pp-stat">
          <span className="pp-stat-n">{upcomingCount}</span>
          <span className="pp-stat-l">Upcoming</span>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-n">{personalCount}</span>
          <span className="pp-stat-l">Personal</span>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-n">{groupCount}</span>
          <span className="pp-stat-l">From Groups</span>
        </div>
      </div>

      {/* ── Menu items ── */}
      <nav className="pp-menu">
        <div className="pp-menu-label">Account</div>

        <div className="pp-menu-item">
          <span className="material-symbols-outlined pp-menu-icon">person</span>
          <div>
            <p className="pp-menu-title">Profile</p>
            <p className="pp-menu-sub">{user?.full_name || user?.username || 'Student'}</p>
          </div>
        </div>

        <div className="pp-menu-item">
          <span className="material-symbols-outlined pp-menu-icon">alternate_email</span>
          <div>
            <p className="pp-menu-title">Email</p>
            <p className="pp-menu-sub">{user?.email || 'Not set'}</p>
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
              {user.groups.map(gid => (
                <p key={gid} className="pp-menu-sub" style={{ margin: '2px 0' }}>
                  • {groupNames[gid] || gid}
                </p>
              ))}
            </div>
          </div>
        )}

        {user?.telegram_id && (
          <div className="pp-menu-item">
            <span className="material-symbols-outlined pp-menu-icon">link</span>
            <div>
              <p className="pp-menu-title">Telegram Connected</p>
              <p className="pp-menu-sub">@{user.telegram_username || user.username}</p>
            </div>
          </div>
        )}

        {user?.university && (
          <div className="pp-menu-item">
            <span className="material-symbols-outlined pp-menu-icon">school</span>
            <div>
              <p className="pp-menu-title">University</p>
              <p className="pp-menu-sub">{user.university} · {user.major || ''} · {user.year || ''}</p>
            </div>
          </div>
        )}
      </nav>

      {/* ── Logout ── */}
      <button className="pp-logout" onClick={onLogout}>
        <span className="material-symbols-outlined">logout</span>
        Sign Out
      </button>

    </aside>
  )
}
