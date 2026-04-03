const express  = require('express')
const router   = express.Router()
const supabase = require('../supabaseClient')

// GET /events — fetch all events sorted by date, optionally filter by group_ids
router.get('/', async (req, res) => {
  const { groups } = req.query; // e.g. ?groups=g1,g2
  
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (groups) {
    const groupArray = groups.split(',');
    query = query.in('group_id', groupArray);
  }

  const { data, error } = await query;

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
    reg_link, contact, summary, ocr_engine, raw_text,
    group_id
  } = req.body

  // Basic validation — title is required
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  // Query all events on the exact same date and group
  const { data: existingEvents } = await supabase
    .from('events')
    .select('id, title')
    .eq('date', date || '')
    .eq('group_id', group_id || null)

  if (existingEvents && existingEvents.length > 0) {
    // Check for "similar" event: if titles share a significant substring
    const newTitleClean = title.toLowerCase().trim()
    
    for (const ev of existingEvents) {
      const existingTitleClean = ev.title.toLowerCase().trim()
      
      // If one title is entirely contained within the other, or they are very similar
      if (
        newTitleClean === existingTitleClean ||
        newTitleClean.includes(existingTitleClean) ||
        existingTitleClean.includes(newTitleClean)
      ) {
        return res.status(409).json({
          error: 'Duplicate event detected',
          message: `A similar event "${ev.title}" already exists on ${date} for this group.`,
          existing_id: ev.id
        })
      }
    }
  }

  const { data, error } = await supabase
    .from('events')
    .insert([{
      title, date, time, venue, department,
      deadline, prize,
      domains: domains || [],
      team_size, reg_link, contact,
      summary, ocr_engine, raw_text, group_id
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