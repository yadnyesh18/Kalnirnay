const express  = require('express')
const router   = express.Router()
const supabase = require('../supabaseClient')

// GET /events — fetch all events sorted by date
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /events/:id — fetch single event
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Event not found' })
  res.json(data)
})

// POST /events — save new event from bot
router.post('/', async (req, res) => {
  const {
    title, date, time, venue, department,
    deadline, prize, domains, team_size,
    reg_link, contact, summary, ocr_engine, raw_text
  } = req.body

  // Basic validation — title is required
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  // Check for duplicate — same title and date already exists
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('title', title)
    .eq('date', date || '')
    .limit(1)

  if (existing && existing.length > 0) {
    return res.status(409).json({
      error: 'Duplicate event',
      message: `Event "${title}" on ${date} already exists`,
      existing_id: existing[0].id
    })
  }

  const { data, error } = await supabase
    .from('events')
    .insert([{
      title, date, time, venue, department,
      deadline, prize,
      domains: domains || [],
      team_size, reg_link, contact,
      summary, ocr_engine, raw_text
    }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ message: 'Event saved', event: data })
})

// DELETE /events/:id — remove an event
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Event deleted' })
})

module.exports = router