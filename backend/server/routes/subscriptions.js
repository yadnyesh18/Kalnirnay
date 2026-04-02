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

// POST /subscriptions — subscribe a user
router.post('/', async (req, res) => {
  const { telegram_id, username } = req.body

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id is required' })
  }

  // Upsert — if already subscribed, just update username
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert([{ telegram_id, username }], { onConflict: 'telegram_id' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ message: 'Subscribed successfully', subscription: data })
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