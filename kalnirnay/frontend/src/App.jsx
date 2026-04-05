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

function MainApp({ user, onLogout, onUserUpdate }) {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => { fetchEvents() }, [user])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      let url = `${API}/events`
      if (user?.groups?.length > 0) url += `?groups=${user.groups.join(',')}`
      const res = await axios.get(url)
      setEvents(res.data)
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

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
          <h2>Welcome back{user?.username ? `, @${user.username}` : ''}!</h2>
          <div className="dashboard-stats">
            <div className="stat">
              <span className="stat-num">{events.length}</span>
              <span className="stat-label">Events tracked</span>
            </div>
            <div className="stat">
              <span className="stat-num">{events.filter(e => e.deadline).length}</span>
              <span className="stat-label">With deadlines</span>
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
            <CalendarView events={events} onEventClick={setSelectedEvent} onTelegramSignIn={onUserUpdate} />
            <div className="events-list">
              <h2 className="section-title">Your Group Events</h2>
              <div className="events-grid">
                {events.length === 0 ? (
                  <p className="empty">No events yet. Send a poster to your Telegram group!</p>
                ) : (
                  events.map(event => (
                    <EventListItem
                      key={event.id}
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))
                )}
              </div>
            </div>
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
              onUserUpdate={onUserUpdate}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EventListItem({ event, onClick }) {
  const isPast = event.date && new Date(event.date.split(' to ')[0]) < new Date()

  return (
    <div className={`event-item ${isPast ? 'past' : ''}`} onClick={onClick}>
      <div className="event-item-left">
        <div className="event-dot" />
        <div>
          <h3 className="event-item-title">{event.title}</h3>
          {event.department && <p className="event-item-dept">{event.department}</p>}
        </div>
      </div>
      <div className="event-item-right">
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
