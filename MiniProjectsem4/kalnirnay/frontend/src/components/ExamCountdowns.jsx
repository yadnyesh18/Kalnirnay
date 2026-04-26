export default function ExamCountdowns({ events }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter events that have a date in the future and look like exams/deadlines
  const countdowns = events
    .filter(e => {
      if (!e.date) return false
      const raw = e.date.includes(' to ') ? e.date.split(' to ')[0] : e.date
      const d = new Date(raw)
      return !isNaN(d) && d >= today
    })
    .map(e => {
      const raw = e.date.includes(' to ') ? e.date.split(' to ')[0] : e.date
      const target = new Date(raw)
      target.setHours(0, 0, 0, 0)
      const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))
      return { ...e, daysLeft: diff, target }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)

  if (!countdowns.length) return (
    <div className="countdown-empty">
      <p>No upcoming events to count down to.</p>
      <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>Add events via the calendar or Telegram bot.</p>
    </div>
  )

  return (
    <div className="countdown-grid">
      {countdowns.map(e => {
        const pct = e.daysLeft === 0 ? 100 : Math.max(5, 100 - Math.min(e.daysLeft, 100))
        const urgency = e.daysLeft === 0 ? 'today' : e.daysLeft <= 3 ? 'urgent' : e.daysLeft <= 7 ? 'soon' : 'normal'
        return (
          <div key={e.id} className={`countdown-card countdown-card--${urgency}`}>
            <div className="countdown-card-top">
              <span className="countdown-card-title">{e.title}</span>
              {e.group_name && <span className="countdown-card-group">{e.group_name}</span>}
            </div>
            <div className="countdown-card-num">
              {e.daysLeft === 0 ? (
                <span className="countdown-today-label">Today</span>
              ) : (
                <>
                  <span className="countdown-card-days">{e.daysLeft}</span>
                  <span className="countdown-card-unit">day{e.daysLeft !== 1 ? 's' : ''} left</span>
                </>
              )}
            </div>
            <div className="countdown-card-bar">
              <div className="countdown-card-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="countdown-card-date">
              {e.target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
