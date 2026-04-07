import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import CalendarView from './components/CalendarView'
import EventCard from './components/EventCard'
import ProfilePanel from './components/ProfilePanel'
import HeroPage from './components/HeroPage'
import SignIn from './components/SignIn'
import Register from './components/Register'
import Splash from './components/Splash'
import axios from 'axios'
import './App.css'

const API = 'http://localhost:3000'

export default function App() {
  const [page, setPage] = useState('splash')
  const [user, setUser] = useState(null)

  const handleSuccess = (userData) => {
    setUser(userData || null)
    setPage('app')
  }

  if (page === 'splash') return <Splash onDone={() => setPage('hero')} />

  if (page === 'hero') return (
    <HeroPage
      onSignIn={() => setPage('signin')}
      onRegister={() => setPage('register')}
      onTelegramLogin={handleSuccess}
    />
  )

  if (page === 'signin') return (
    <SignIn
      onBack={() => setPage('hero')}
      onSuccess={handleSuccess}
      onRegister={() => setPage('register')}
    />
  )

  if (page === 'register') return (
    <Register
      onBack={() => setPage('hero')}
      onSuccess={handleSuccess}
      onSignIn={() => setPage('signin')}
    />
  )

  return (
    <MainApp
      user={user}
      onLogout={() => { setUser(null); setPage('hero') }}
      onUserUpdate={(updated) => setUser(updated)}
    />
  )
}

// Universal date parser: handles "DD MM YYYY", "DD/MM/YYYY", "DD-MM-YYYY", and ISO
function parseDateToISO(d) {
  if (!d) return null
  const m = d.trim().match(/^(\d{1,2})[\s/\-](\d{1,2})[\s/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return d
}
function dateObj(raw) {
  if (!raw) return null
  const iso = parseDateToISO(raw.split(' to ')[0].trim())
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d) ? null : d
}

function MainApp({ user, onLogout, onUserUpdate }) {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [upcomingFilter, setUpcomingFilter] = useState('combined')
  useEffect(() => { fetchEvents() }, [user])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const uid = user?.telegram_id || user?.email
      if (!uid) { setEvents([]); setLoading(false); return }
      let url = `${API}/events?user_id=${encodeURIComponent(uid)}`
      if (user?.groups?.length > 0) url += `&groups=${user.groups.join(',')}`
      const res = await axios.get(url)
      setEvents(res.data)
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  // Split events into upcoming and past
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingEvents = events
    .filter(e => {
      if (upcomingFilter === 'personal' && e.group_id) return false
      if (upcomingFilter === 'telegram' && !e.group_id) return false

      if (!e.date) return true
      const d = dateObj(e.date)
      return !d || d >= today
    })
    .sort((a, b) => {
      const da = dateObj(a.date) || new Date('9999-12-31')
      const db = dateObj(b.date) || new Date('9999-12-31')
      return da - db
    })

  const pastEvents = events
    .filter(e => {
      if (!e.date) return false
      const d = dateObj(e.date)
      return d && d < today
    })
    .sort((a, b) => {
      const da = dateObj(a.date)
      const db = dateObj(b.date)
      return db - da
    })

  // Get display name: prefer full_name, then username, then email prefix
  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.username
    ? user.username
    : user?.email?.split('@')[0] || ''

  return (
    <div className="app">
      <Navbar
        user={user}
        onLogin={() => {}}
        onLogout={onLogout}
        onProfileOpen={() => setShowProfile(true)}
      />

      <main className="main">
        <div className="dashboard-header">
          <h2>Welcome back{displayName ? `, ${displayName}` : ''}!</h2>
          <div className="dashboard-stats">
            <div className="stat">
              <span className="stat-num">{upcomingEvents.length}</span>
              <span className="stat-label">Upcoming</span>
            </div>
            <div className="stat">
              <span className="stat-num">{user?.groups?.length || 0}</span>
              <span className="stat-label">Groups</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading your events...</p>
          </div>
        ) : (
          <>
            <CalendarView events={events} onEventClick={setSelectedEvent} onEventAdded={fetchEvents} user={user} onTelegramConnect={(userData) => onUserUpdate(userData)} />

            {/* Upcoming Events */}
            <div className="events-list">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Upcoming Events</h2>
                <select
                  value={upcomingFilter}
                  onChange={e => setUpcomingFilter(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card, #1a1a2e)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="combined">All Events</option>
                  <option value="personal">Personal Only</option>
                  <option value="telegram">Telegram Only</option>
                </select>
              </div>
              <div className="events-grid">
                {upcomingEvents.length === 0 ? (
                  <p className="empty">No upcoming events. Send a poster to your Telegram group or add a personal event!</p>
                ) : (
                  upcomingEvents.map(event => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="events-list" style={{ opacity: 0.7 }}>
                <h2 className="section-title">Past Events</h2>
                <div className="events-grid">
                  {pastEvents.map(event => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Event detail modal */}
      {selectedEvent && (
        <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* Profile drawer overlay */}
      {showProfile && (
        <div className="profile-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-drawer" onClick={e => e.stopPropagation()}>
            <button className="profile-drawer-close" onClick={() => setShowProfile(false)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <ProfilePanel
              user={user}
              events={events}
              onLogout={() => { setShowProfile(false); onLogout() }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EventListItem({ event, onClick }) {
  const isPast = event.date && dateObj(event.date) && dateObj(event.date) < new Date()
  const isPersonal = !event.group_id

  return (
    <div className={`event-item ${isPast ? 'past' : ''}`} onClick={onClick}>
      <div className="event-item-left">
        <div className="event-dot" style={{ background: isPersonal ? '#f97316' : '#3B82F6' }} />
        <div>
          <h3 className="event-item-title">{event.title}</h3>
          {event.department && <p className="event-item-dept">{event.department}</p>}
        </div>
      </div>
      <div className="event-item-right">
        <span className="event-source-badge" style={{ background: isPersonal ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)', color: isPersonal ? '#f97316' : '#3B82F6', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
          {isPersonal ? 'Personal' : (event.group_name || 'Group')}
        </span>
        {event.date && <span className="event-date-badge">{event.date}</span>}
        {event.prize && <span className="event-prize-badge">Prize</span>}
        {event.domains?.length > 0 && (
          <div className="event-domains">
            {event.domains.slice(0, 2).map(d => (
              <span key={d} className="domain-tag">{d}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
