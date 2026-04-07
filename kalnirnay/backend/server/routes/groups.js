const express  = require('express')
const router   = express.Router()
const supabase = require('../supabaseClient')

// POST /groups — upsert a group (called by bot whenever it sees a group)
router.post('/', async (req, res) => {
  const { group_id, group_name } = req.body

  if (!group_id || !group_name) {
    return res.status(400).json({ error: 'group_id and group_name are required' })
  }

  const { data, error } = await supabase
    .from('groups')
    .upsert([{ group_id, group_name }], { onConflict: 'group_id' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /groups — get groups by IDs (for frontend to show names)
router.get('/', async (req, res) => {
  const { ids } = req.query

  if (!ids) {
    // Return all groups
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // Return specific groups by IDs
  const idArray = ids.split(',')
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('group_id', idArray)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

module.exports = router
