import { useState } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function EventCard({ event, onClose, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${API}/events/${event.id}`, { method: 'DELETE' })
      onDeleted?.(event.id)
      onClose()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(false)
    }
  }
  const fields = [
    { label: 'Date',       key: 'date',       cls: 'accent' },
    { label: 'Time',       key: 'time',       cls: '' },
    { label: 'Venue',      key: 'venue',      cls: '' },
    { label: 'Deadline',   key: 'deadline',   cls: 'accent' },
    { label: 'Prize Pool', key: 'prize',      cls: 'gold' },
    { label: 'Team Size',  key: 'team_size',  cls: '' },
    { label: 'Contact',    key: 'contact',    cls: '' },
    { label: 'Register',   key: 'reg_link',   cls: '' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            {event.department && (
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
                {event.department}
              </p>
            )}
            <h2 className="modal-title">{event.title}</h2>
            <span style={{
              display: 'inline-block', marginTop: '6px', padding: '3px 10px',
              borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
              background: event.group_id ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)',
              color: event.group_id ? '#3B82F6' : '#f97316'
            }}>
              {event.group_id ? (event.group_name || 'Telegram Group') : 'Personal Event'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Domains */}
          {event.domains && event.domains.length > 0 && (
            <div className="modal-domains">
              {event.domains.map(d => (
                <span key={d} className="domain-tag">{d}</span>
              ))}
            </div>
          )}

          {/* Fields grid */}
          <div className="modal-grid">
            {fields.map(({ label, key, cls }) =>
              event[key] ? (
                <div key={key} className={`modal-field ${key === 'contact' || key === 'prize' ? 'full' : ''}`}>
                  <div className="field-label">{label}</div>
                  {key === 'reg_link' ? (
                    <a
                      href={event[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`field-value ${cls}`}
                      style={{ textDecoration: 'none' }}
                    >
                      {event[key]}
                    </a>
                  ) : (
                    <div className={`field-value ${cls}`}>{event[key]}</div>
                  )}
                </div>
              ) : null
            )}
          </div>

          {/* Summary */}
          {event.summary && (
            <div className="modal-summary">{event.summary}</div>
          )}

          {/* Added date */}
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Added {new Date(event.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>

        <div className="modal-footer">
          {event.reg_link && (
            <a
              href={event.reg_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Register Now
            </a>
          )}
          {!confirmDelete ? (
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(true)}
              style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', marginLeft: 'auto' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 500 }}>Delete this event?</span>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#ef4444', color: '#fff', padding: '6px 14px' }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '6px 14px' }}
              >
                Cancel
              </button>
            </div>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  )
}
