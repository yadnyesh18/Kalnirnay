import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import CalendarView from './components/CalendarView'
import EventCard from './components/EventCard'
import SubscribeModal from './components/SubscribeModal'
import HeroPage from './components/HeroPage'
import SignIn from './components/SignIn'
import Register from './components/Register'
import Splash from './components/Splash'
import axios from 'axios'
import './App.css'

const API = 'http://localhost:3000'

export default function App() {
  const [page, setPage] = useState('splash') // 'splash' | 'hero' | 'signin' | 'register' | 'app'

  if (page === 'splash') return <Splash onDone={() => setPage('hero')} />

  if (page === 'hero') return (
    <HeroPage
      onSignIn={() => setPage('signin')}
      onRegister={() => setPage('register')}
    />
  )
  if (page === 'signin') return (
    <SignIn onBack={() => setPage('hero')} onSuccess={() => setPage('app')} />
  )
  if (page === 'register') return (
    <Register onBack={() => setPage('hero')} onSuccess={() => setPage('app')} />
  )

  return <MainApp />
}

function MainApp() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => { 
    // Only fetch events when user logs in, or we want a public view?
    // Let's fetch all events initially if user is not logged in, just to show something.
    fetchEvents()
  }, [user])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      let url = `${API}/events`
      if (user && user.groups && user.groups.length > 0) {
        url += `?groups=${user.groups.join(',')}`
      }
      
      const res = await axios.get(url)
      setEvents(res.data)
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (username) => {
    try {
      setLoading(true)
      const sanitizedUsername = username.replace('@', '')
      const res = await axios.get(`${API}/subscriptions/user/${sanitizedUsername}`)
      setUser(res.data)
      setShowLogin(false)
      alert(`Welcome ${res.data.username}! Your personalized calendar is ready.`)
    } catch (err) {
      alert("User not found or no groups linked. Type /join in a Telegram group with the bot first!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar 
        user={user}
        onLogin={() => setShowLogin(true)} 
        onLogout={() => { setUser(null); setEvents([]); }} 
      />

      <main className="main">
        {!user ? (
          /* ── LANDING PAGE (LOGGED OUT VIEW) ── */
          <div className="landing-page">
            <div className="hero">
              <div className="hero-text">
                <span className="hero-tag">Smart Event Tracker</span>
                <h1 className="hero-title">Kalnirnay</h1>
                <p className="hero-sub">
                  Track college events, hackathons, and deadlines specifically from your Telegram groups.
                  Log in to view your personalized calendar.
                </p>
                <button className="btn btn-primary hero-btn" onClick={() => setShowLogin(true)}>
                  Log In with Telegram
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── DASHBOARD (LOGGED IN VIEW) ── */
          <div className="dashboard">
            <div className="dashboard-header">
              <h2>Welcome back, @{user.username}</h2>
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
                <CalendarView
                  events={events}
                  onEventClick={setSelectedEvent}
                />

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
          </div>
        )}
      </main>

      {selectedEvent && (
        <EventCard
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Log In with Telegram</h2>
            <p>Enter your Telegram username to view events from your joined groups.</p>
            <p className="small-text" style={{marginBottom: "1rem"}}>(Make sure you have typed <b>/join</b> in a group with the bot!)</p>
            <input 
              type="text" 
              placeholder="username (without @)" 
              id="login-username"
              className="login-input"
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowLogin(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                const val = document.getElementById('login-username').value
                if(val) handleLogin(val)
              }}>Log In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} // end MainApp

function EventListItem({ event, onClick }) {
  const isPast = event.date && new Date(event.date.split(' to ')[0]) < new Date()

  return (
    <div className={`event-item ${isPast ? 'past' : ''}`} onClick={onClick}>
      <div className="event-item-left">
        <div className="event-dot" />
        <div>
          <h3 className="event-item-title">{event.title}</h3>
          {event.department && (
            <p className="event-item-dept">{event.department}</p>
          )}
        </div>
      </div>
      <div className="event-item-right">
        {event.date && <span className="event-date-badge">{event.date}</span>}
        {event.prize && <span className="event-prize-badge">Prize</span>}
        {event.domains && event.domains.length > 0 && (
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
