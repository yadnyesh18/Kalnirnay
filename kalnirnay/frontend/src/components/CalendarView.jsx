import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

export default function CalendarView({ events, onEventClick }) {
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
        <span className="nav-tag">{events.length} events</span>
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
    </div>
  )
}
