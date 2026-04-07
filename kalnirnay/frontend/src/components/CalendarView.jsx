import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

const API = 'http://localhost:3000'

const EMPTY_FORM = { title: '', summary: '' }

// Universal date parser: handles "DD MM YYYY", "DD/MM/YYYY", "DD-MM-YYYY", and ISO
function parseDateToISO(d) {
  if (!d) return null
  const m = d.trim().match(/^(\d{1,2})[\s/\-](\d{1,2})[\s/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return d
}
function toDateObj(raw) {
  if (!raw) return null
  const iso = parseDateToISO(raw.split(' to ')[0].trim())
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d) ? null : d
}

export default function CalendarView({ events, onEventClick, onEventAdded, user, onTelegramConnect }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [showTgModal, setShowTgModal] = useState(false)
  const [upcomingFilter, setUpcomingFilter] = useState('combined')

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr)
    setForm(EMPTY_FORM)
    setAddError('')
    setShowAddModal(true)
  }

  const handleAddEvent = async e => {
    e.preventDefault()
    if (!form.title.trim()) { setAddError('Title is required'); return }
    setAddLoading(true)
    setAddError('')
    try {
      const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: selectedDate, source: 'personal', user_id: user?.telegram_id || user?.email || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add event')
      setShowAddModal(false)
      onEventAdded?.()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // Today for upcoming filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Upcoming events: filtered + sorted nearest first
  const upcomingEvents = events
    .filter(e => {
      const d = toDateObj(e.date)
      if (!d) return !e.date // show no-date events
      if (d < today) return false
      if (upcomingFilter === 'personal' && e.group_id) return false
      if (upcomingFilter === 'telegram' && !e.group_id) return false
      return true
    })
    .sort((a, b) => {
      const da = toDateObj(a.date) || new Date('9999-12-31')
      const db = toDateObj(b.date) || new Date('9999-12-31')
      return da - db
    })

  // Convert events to FullCalendar format with color by source
  const calendarEvents = events
    .filter(e => e.date)
    .map(e => {
      const rawStart = e.date.includes(' to ') ? e.date.split(' to ')[0] : e.date
      const rawEnd = e.date.includes(' to ') ? e.date.split(' to ')[1] : null
      const startDate = parseDateToISO(rawStart)
      const endDate = parseDateToISO(rawEnd)
      if (!startDate) return null
      return {
        id: e.id,
        title: e.title,
        start: startDate,
        end: endDate || undefined,
        extendedProps: e
      }
    })
    .filter(Boolean)

  const isConnected = !!user?.telegram_id

  return (
    <div className="calendar-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="section-title">Event Calendar</h2>
          <div className="cal-legend">
            <span className="cal-legend-dot personal" />
            <span className="cal-legend-label">Personal (Orange)</span>
            <span className="cal-legend-dot telegram" />
            <span className="cal-legend-label">Telegram (Blue)</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isConnected && (
            <button
              onClick={() => setShowTgModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: '#24A1DE', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 0C5.37 0 0 5.37 0 12C0 18.63 5.37 24 12 24C18.63 24 24 18.63 24 12C24 5.37 18.63 0 12 0ZM17.97 8.01L15.63 19.14C15.46 19.92 14.99 20.12 14.34 19.75L10.79 17.13L9.07 18.78C8.88 18.97 8.72 19.13 8.35 19.13L8.6 15.51L15.2 9.54C15.49 9.28 15.13 9.14 14.75 9.4L6.59 14.54L3.09 13.44C2.33 13.2 2.31 12.68 3.25 12.31L16.92 7.04C17.55 6.81 18.11 7.19 17.97 8.01Z" fill="white" />
              </svg>
              Connect your Telegram User ID
            </button>
          )}
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        eventClick={(info) => onEventClick(info.event.extendedProps)}
        dateClick={handleDateClick}
        eventContent={(arg) => {
          const isPersonal = !arg.event.extendedProps.group_id
          const color = isPersonal ? '#f97316' : '#3B82F6'
          const groupName = arg.event.extendedProps.group_name
          return (
            <div
              style={{ background: color, borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', width: '100%' }}
              title={isPersonal ? 'Personal event' : (groupName ? `From: ${groupName}` : 'Group event')}
            >
              {arg.event.title}
            </div>
          )
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        }}
        height="auto"
        dayMaxEvents={3}
        eventDisplay="block"
      />


      {/* Add personal event modal */}
      {showAddModal && (
        <div className="si-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-event-modal" onClick={e => e.stopPropagation()}>
            <div className="add-event-header">
              <div>
                <h2 className="add-event-title">Add Event</h2>
                <p className="add-event-date">{selectedDate}</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddEvent} className="add-event-form">
              <div className="add-field" style={{ marginBottom: '0.75rem' }}>
                <label className="field-label">Title *</label>
                <input className="input" placeholder="Event name" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div className="add-field" style={{ marginBottom: '0.75rem' }}>
                <label className="field-label">Notes</label>
                <textarea className="input" rows={3} placeholder="Any details..." value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>

              {addError && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: '0.5rem 0' }}>{addError}</p>}

              <div className="add-event-footer">
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Saving...' : 'Add Event'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Username Connect modal */}
      {showTgModal && (
        <TelegramUsernameModal
          user={user}
          onClose={() => setShowTgModal(false)}
          onSuccess={(userData) => {
            setShowTgModal(false)
            onTelegramConnect?.(userData)
          }}
        />
      )}
    </div>
  )
}

function TelegramUsernameModal({ user, onClose, onSuccess }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Strip @ prefix if user typed it
    const clean = username.trim().replace(/^@/, '')
    if (!clean) { setError('Please enter your Telegram username.'); setLoading(false); return }

    try {
      // Use connect-telegram to merge bot record with the logged-in web user
      const res = await fetch(`${API}/users/connect-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          telegram_username: clean
        })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Username not found. Make sure you have used /join in your Telegram group with the bot first.')
      } else {
        setConnected(data)
      }
    } catch {
      setError('Network error. Is the backend server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #29B6F6, #0288D1)', display: 'grid', placeItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-1.97 9.28c-.15.67-.54.83-1.1.52l-3.03-2.24-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.07 5.58-5.04c.24-.22-.05-.34-.38-.13L8.69 13.7l-2.97-.93c-.65-.2-.66-.65.14-.96l11.6-4.47c.54-.2 1.01.13.83.96l.65-.17z" />
              </svg>
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>Connect Telegram</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '2px' }}>Link your account to see group events</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {connected ? (
            /* ── SUCCESS STATE ── */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Syne, sans-serif' }}>
                Connected as @{connected.username}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {connected.groups?.length > 0
                  ? `You are linked to ${connected.groups.length} group(s). Your group events will now appear on the calendar.`
                  : 'Your account was found but is not linked to any groups yet. Use /join in your Telegram group.'}
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={() => onSuccess(connected)}
              >
                View My Calendar
              </button>
            </div>
          ) : (
            /* ── FORM STATE ── */
            <>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Enter your Telegram username to sync events from your groups. You must have used <strong>/join</strong> in your Telegram group first.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Telegram Username</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.95rem', fontWeight: 600 }}>@</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="yadnyeshl_18"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      autoFocus
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.82rem', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {error}
                  </div>
                )}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                  {loading ? 'Connecting...' : 'Connect & Sync Events'}
                </button>
              </form>

              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem', textAlign: 'center', lineHeight: 1.5 }}>
                Don't have a Telegram group?{' '}
                <a href="https://web.telegram.org/k/#@kaalnirnay_bot" target="_blank" rel="noreferrer" style={{ color: '#29B6F6', textDecoration: 'none' }}>
                  Add @kaalnirnay_bot
                </a>{' '}
                to your group first.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}