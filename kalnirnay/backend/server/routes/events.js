const express = require('express')
const router = express.Router()
const supabase = require('../supabaseClient')

// GET /events — fetch events for a specific user
// - Personal events: filtered by user_id (only YOUR personal events)
// - Group events: from subscribed groups
// - Returns group_name from groups table via LEFT JOIN
router.get('/', async (req, res) => {
  const { groups, user_id } = req.query;

  if (!user_id) return res.json([]);

  const groupArray = groups ? groups.split(',') : [];
  const promises = [
    // Personal events: belong to THIS user only
    supabase.from('events').select('*').is('group_id', null).eq('user_id', user_id).order('created_at', { ascending: false })
  ];

  if (groupArray.length > 0) {
    promises.push(
      supabase.from('events').select('*').in('group_id', groupArray).order('created_at', { ascending: false })
    );
  }

  const results = await Promise.all(promises);
  for (const r of results) {
    if (r.error) return res.status(500).json({ error: r.error.message });
  }

  const merged = results.flatMap(r => r.data || []);
  const seen = new Set();
  const deduped = merged.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

  // Fetch group names for all group_ids in the results
  const groupIds = [...new Set(deduped.filter(e => e.group_id).map(e => e.group_id))];
  let groupMap = {};
  if (groupIds.length > 0) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('group_id, group_name')
      .in('group_id', groupIds);
    if (groupData) {
      groupMap = Object.fromEntries(groupData.map(g => [g.group_id, g.group_name]));
    }
  }

  // Attach group_name to each event
  const enriched = deduped.map(e => ({
    ...e,
    group_name: e.group_id ? (groupMap[e.group_id] || null) : null
  }));

  res.json(enriched);
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

// POST /events — save new event (from bot or personal)
router.post('/', async (req, res) => {
  const {
    title, date, time, venue, department,
    deadline, prize, domains, team_size,
    reg_link, contact, summary, ocr_engine, raw_text,
    group_id, source, user_id
  } = req.body

  // Basic validation — title is required
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  // Query all events on the exact same date ACROSS ALL GROUPS
  // This prevents the same event from being saved twice when posted in different groups
  // Only check for duplicates if we have a valid date
  if (date && date.trim()) {
    try {
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, title, group_id')
        .eq('date', date)

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
              message: `A similar event "${ev.title}" already exists on ${date}.`,
              existing_id: ev.id
            })
          }
        }
      }
    } catch (dupErr) {
      console.error('Duplicate check failed:', dupErr.message)
      // Continue to insert even if duplicate check fails
    }
  }

  const { data, error } = await supabase
    .from('events')
    .insert([{
      title, date, time, venue, department,
      deadline, prize,
      domains: domains || [],
      team_size, reg_link, contact,
      summary, ocr_engine, raw_text,
      group_id: source === 'personal' ? null : (group_id || null),
      source: source || 'telegram',
      user_id: user_id || null
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