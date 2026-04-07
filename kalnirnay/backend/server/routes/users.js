const express = require('express')
const router = express.Router()
const supabase = require('../supabaseClient')

// GET /users — list all users
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('subscribed_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /users — register a new user (from web sign-up or bot /join)
router.post('/', async (req, res) => {
  const {
    telegram_id, username, group_id,
    email, password,
    full_name, university, major, year, program
  } = req.body

  if (!telegram_id && !email) {
    return res.status(400).json({ error: 'email or telegram_id is required' })
  }

  // ── BOT /join path: upsert by telegram_id ──
  if (telegram_id) {
    let groups = []
    const { data: existing } = await supabase
      .from('users')
      .select('groups')
      .eq('telegram_id', telegram_id)
      .single()

    if (existing?.groups) groups = existing.groups
    if (group_id && !groups.includes(group_id)) groups.push(group_id)

    const upsertData = { telegram_id, username, groups }

    const { data, error } = await supabase
      .from('users')
      .upsert([upsertData], { onConflict: 'telegram_id' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ message: 'Subscribed successfully', subscription: data })
  }

  // ── WEB REGISTRATION path: insert by email ──
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Please log in.' })
  }

  const insertData = {
    email,
    password,
    full_name: full_name || null,
    university: university || null,
    major: major || null,
    year: year || null,
    program: program || null,
    username: email.split('@')[0],
    groups: [],
  }

  const { data, error } = await supabase
    .from('users')
    .insert([insertData])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ message: 'Registered successfully', subscription: data })
})

// POST /users/login — email + password login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  if (!password) return res.status(400).json({ error: 'Password is required' })

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) {
    return res.status(401).json({ error: 'Account not found. Please register first.' })
  }

  if (data.password !== password) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }

  res.json(data)
})

// POST /users/telegram-login — login via Telegram numeric ID
router.post('/telegram-login', async (req, res) => {
  const { telegram_id } = req.body
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' })

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', String(telegram_id))
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Telegram ID not found. Make sure you have used /join in your Telegram group first.' })
  }

  if (!data.groups || data.groups.length === 0) {
    return res.status(404).json({ error: 'Your Telegram ID is registered but not linked to any group. Use /join in your Telegram group.' })
  }

  res.json(data)
})

// POST /users/connect-telegram — link a Telegram username to an existing web account
router.post('/connect-telegram', async (req, res) => {
  const { user_id, telegram_username } = req.body
  if (!user_id || !telegram_username) {
    return res.status(400).json({ error: 'user_id and telegram_username are required' })
  }

  const clean = telegram_username.replace(/^@/, '')

  // Find the bot-created user by username
  const { data: botRecord } = await supabase
    .from('users')
    .select('*')
    .eq('username', clean)
    .single()

  if (!botRecord) {
    return res.status(404).json({
      error: `Username @${clean} not found. Make sure you have used /join in your Telegram group with the bot first.`
    })
  }

  // Find the web user
  const { data: webUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single()

  if (!webUser) {
    return res.status(404).json({ error: 'Web user not found.' })
  }

  // Merge groups
  const existingGroups = webUser.groups || []
  const botGroups = botRecord.groups || []
  const mergedGroups = [...new Set([...existingGroups, ...botGroups])]

  // Delete the bot-created record FIRST to free up the telegram_id unique constraint
  if (botRecord.id !== user_id) {
    await supabase.from('users').delete().eq('id', botRecord.id)
  }

  // Update the web user with telegram info
  const { data: updated, error } = await supabase
    .from('users')
    .update({
      telegram_id: botRecord.telegram_id,
      telegram_username: clean,
      groups: mergedGroups
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(updated)
})

// GET /users/user/:username — get user by Telegram username
router.get('/user/:username', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', req.params.username)
    .single()

  if (error || !data) return res.status(404).json({ error: 'User not found' })
  res.json(data)
})

// DELETE /users/:telegram_id — remove user
router.delete('/:telegram_id', async (req, res) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('telegram_id', req.params.telegram_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Unsubscribed successfully' })
})

module.exports = router