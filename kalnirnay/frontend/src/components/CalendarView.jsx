import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'
const API = 'http://localhost:3000'

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 18.63 5.37 24 12 24C18.63 24 24 18.63 24 12C24 5.37 18.63 0 12 0ZM17.97 8.01L15.63 19.14C15.46 19.92 14.99 20.12 14.34 19.75L10.79 17.13L9.07 18.78C8.88 18.97 8.72 19.13 8.35 19.13L8.6 15.51L15.2 9.54C15.49 9.28 15.13 9.14 14.75 9.4L6.59 14.54L3.09 13.44C2.33 13.2 2.31 12.68 3.25 12.31L16.92 7.04C17.55 6.81 18.11 7.19 17.97 8.01Z" fill="white"/>
  </svg>
)

export default function CalendarView({ events, onEventClick, onTelegramSignIn }) {
  const [tgUsername, setTgUsername] = useState('')
  const [showTgModal, setShowTgModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitTg = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const clean = tgUsername.replace('@', '').trim()
      const res = await fetch(`${API}/subscriptions/user/${clean}`)
      if (!res.ok) throw new Error('not_found')
      const user = await res.json()
      setShowTgModal(false)
      onTelegramSignIn?.(user)
    } catch {
      setError('Telegram account not found. Send /join in your college group first.')
    } finally {
      setLoading(false)
    }
  }
  // Convert events to FullCalendar format
  const calendarEvents = events
    .filter(e => e.date)
    .map(e => {
      const startDate = e.date.includes(' to ')
        ? e.date.split(' to ')[0]
        : e.date
      const endDate = e.date.includes(' to ')
        ? e.date.split(' to ')[1]
        : null

      return {
        id:    e.id,
        title: e.title,
        start: startDate,
        end:   endDate || undefined,
        extendedProps: e
      }
    })

  return (
    <div className="calendar-section">
      <div className="section-header">
        <h2 className="section-title">Event Calendar</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="si-telegram-btn" type="button" onClick={() => { setError(''); setShowTgModal(true) }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
            <TelegramIcon />
            Sign in with Telegram
          </button>
          <span className="nav-tag">{events.length} events</span>
        </div>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        eventClick={(info) => onEventClick(info.event.extendedProps)}
        headerToolbar={{
          left:   'prev,next today',
          center: 'title',
          right:  'dayGridMonth,dayGridWeek'
        }}
        height="auto"
        dayMaxEvents={3}
        eventDisplay="block"
      />

      {showTgModal && (
        <div className="si-modal-overlay" onClick={() => setShowTgModal(false)}>
          <div className="si-modal" onClick={e => e.stopPropagation()}>
            <div className="si-modal-header">
              <TelegramIcon />
              <h2 style={{color: '#fff', margin: 0, fontSize: '1.2rem'}}>Sign in with Telegram</h2>
            </div>
            <p className="si-modal-desc" style={{color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
              Enter your Telegram username. Make sure you've already sent{' '}
              <code>/join</code> in your college group with{' '}
              <a href={TELEGRAM_BOT} target="_blank" rel="noreferrer" style={{color: '#fff'}}>@kaalnirnay_bot</a>.
            </p>
            <form onSubmit={submitTg}>
              <div className="si-input-wrap" style={{ marginBottom: '1rem', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined si-input-icon" style={{color: '#666', fontSize: '1.2rem'}}>alternate_email</span>
                <input
                  type="text"
                  placeholder="your_telegram_username"
                  value={tgUsername}
                  onChange={e => setTgUsername(e.target.value)}
                  required
                  autoFocus
                  style={{background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%'}}
                />
              </div>
              {error && <p className="si-error" style={{color: '#ff4444', fontSize: '0.85rem', marginBottom: '1rem'}}>{error}</p>}
              <button className="si-submit" type="submit" disabled={loading} style={{width: '100%', padding: '0.75rem', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                {loading ? '...' : 'Sign In'}
              </button>
            </form>
            <button className="si-modal-close" onClick={() => setShowTgModal(false)} style={{width: '100%', padding: '0.75rem', background: 'none', color: '#888', border: 'none', marginTop: '0.5rem', cursor: 'pointer'}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
