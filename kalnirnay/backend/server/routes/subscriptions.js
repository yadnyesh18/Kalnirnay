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

// POST /subscriptions — register a user
router.post('/', async (req, res) => {
  const { telegram_id, username, group_id, email, password } = req.body

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id is required' })
  }

  let groups = [];
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('groups')
    .eq('telegram_id', telegram_id)
    .single()

  if (existing?.groups) groups = existing.groups;
  if (group_id && !groups.includes(group_id)) groups.push(group_id);

  const upsertData = { telegram_id, username, groups };
  if (email)    upsertData.email    = email;
  if (password) upsertData.password = password;

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert([upsertData], { onConflict: 'telegram_id' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ message: 'Subscribed successfully', subscription: data })
})

// POST /subscriptions/login — email + password login
// Uses telegram_id as email key (web-registered users store email as telegram_id)
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })

  // Look up by telegram_id (which stores the email for web-registered users)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('telegram_id', email)
    .single()

  if (error || !data) return res.status(401).json({ error: 'Account not found. Please register first.' })
  res.json(data)
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