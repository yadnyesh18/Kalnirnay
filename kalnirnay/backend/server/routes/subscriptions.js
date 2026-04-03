const express  = require('express')
const router   = express.Router()
const supabase = require('../supabaseClient')

// GET /subscriptions — list all subscribers
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('subscribed_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /subscriptions — subscribe a user (and add them to a group if provided)
router.post('/', async (req, res) => {
  const { telegram_id, username, group_id } = req.body

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id is required' })
  }

  // Fetch existing user to get their current groups
  let groups = [];
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('groups')
    .eq('telegram_id', telegram_id)
    .single()
  
  if (existing && existing.groups) {
    groups = existing.groups;
  }

  // If a new group_id is provided, append it to the array
  if (group_id && !groups.includes(group_id)) {
    groups.push(group_id);
  }

  // Upsert — update username and groups
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert([{ telegram_id, username, groups }], { onConflict: 'telegram_id' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ message: 'Subscribed successfully', subscription: data })
})

// GET /subscriptions/user/:username — get user by username
router.get('/user/:username', async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('username', req.params.username)
    .single()

  if (error || !data) return res.status(404).json({ error: 'User not found' })
  res.json(data)
})

// DELETE /subscriptions/:telegram_id — unsubscribe
router.delete('/:telegram_id', async (req, res) => {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('telegram_id', req.params.telegram_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Unsubscribed successfully' })
})

module.exports = router