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
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`)
      setEvents(res.data)
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar onSubscribe={() => setShowSubscribe(true)} />

      <main className="main">
        <div className="hero">
          <div className="hero-text">
            <span className="hero-tag">Smart Event Tracker</span>
            <h1 className="hero-title">Kalnirnay</h1>
            <p className="hero-sub">
              College events, hackathons and deadlines — all in one place.
              Never miss an opportunity again.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">{events.length}</span>
              <span className="stat-label">Events tracked</span>
            </div>
            <div className="stat">
              <span className="stat-num">
                {events.filter(e => e.deadline).length}
              </span>
              <span className="stat-label">With deadlines</span>
            </div>
            <div className="stat">
              <span className="stat-num">
                {events.filter(e => e.prize).length}
              </span>
              <span className="stat-label">Prize events</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading events...</p>
          </div>
        ) : (
          <>
            <CalendarView
              events={events}
              onEventClick={setSelectedEvent}
            />

            <div className="events-list">
              <h2 className="section-title">All Events</h2>
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

      {selectedEvent && (
        <EventCard
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showSubscribe && (
        <SubscribeModal
          onClose={() => setShowSubscribe(false)}
          apiUrl={API}
        />
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
