import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

const TELEGRAM_BOT = 'https://t.me/kaalnirnay_bot'
const API = 'http://localhost:3000'

const EMPTY_FORM = { title: '', summary: '' }

export default function CalendarView({ events, onEventClick, onEventAdded, user }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

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
        body: JSON.stringify({ ...form, date: selectedDate, source: 'personal', user_id: user?.telegram_id || null })
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

  const parseDate = (d) => {
    if (!d) return null
    // Handle "DD MM YYYY" format from OCR
    const spaced = d.match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/)
    if (spaced) return `${spaced[3]}-${spaced[2].padStart(2,'0')}-${spaced[1].padStart(2,'0')}`
    return d // already ISO
  }

  // Convert events to FullCalendar format with color by source
  const calendarEvents = events
    .filter(e => e.date)
    .map(e => {
      const rawStart = e.date.includes(' to ') ? e.date.split(' to ')[0] : e.date
      const rawEnd   = e.date.includes(' to ') ? e.date.split(' to ')[1] : null
      const startDate = parseDate(rawStart)
      const endDate   = parseDate(rawEnd)
      if (!startDate) return null
      return {
        id:    e.id,
        title: e.title,
        start: startDate,
        end:   endDate || undefined,
        extendedProps: e
      }
    })
    .filter(Boolean)

  return (
    <div className="calendar-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="section-title">Event Calendar</h2>
          {/* Legend */}
          <div className="cal-legend">
            <span className="cal-legend-dot telegram" />
            <span className="cal-legend-label">Telegram</span>
            <span className="cal-legend-dot personal" />
            <span className="cal-legend-label">Personal</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a
            href={TELEGRAM_BOT}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: '#24A1DE', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 0C5.37 0 0 5.37 0 12C0 18.63 5.37 24 12 24C18.63 24 24 18.63 24 12C24 5.37 18.63 0 12 0ZM17.97 8.01L15.63 19.14C15.46 19.92 14.99 20.12 14.34 19.75L10.79 17.13L9.07 18.78C8.88 18.97 8.72 19.13 8.35 19.13L8.6 15.51L15.2 9.54C15.49 9.28 15.13 9.14 14.75 9.4L6.59 14.54L3.09 13.44C2.33 13.2 2.31 12.68 3.25 12.31L16.92 7.04C17.55 6.81 18.11 7.19 17.97 8.01Z" fill="white"/>
            </svg>
            Open Bot
          </a>
          <span className="nav-tag">{events.length} events</span>
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
          const color = isPersonal ? '#3B82F6' : '#f97316'
          return (
            <div style={{ background: color, borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', width: '100%' }}>
              {arg.event.title}
            </div>
          )
        }}
        headerToolbar={{
          left:   'prev,next today',
          center: 'title',
          right:  'dayGridMonth,dayGridWeek'
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
                <input className="input" placeholder="Event name" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} autoFocus />
              </div>
              <div className="add-field" style={{ marginBottom: '0.75rem' }}>
                <label className="field-label">Notes</label>
                <textarea className="input" rows={3} placeholder="Any details..." value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))} style={{resize: 'vertical'}} />
              </div>

              {addError && <p style={{color: '#ff4444', fontSize: '0.85rem', margin: '0.5rem 0'}}>{addError}</p>}

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
    </div>
  )
}
