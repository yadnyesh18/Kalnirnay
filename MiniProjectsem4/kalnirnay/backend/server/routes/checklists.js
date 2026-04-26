const express = require('express')
const router = express.Router()
const supabase = require('../supabaseClient')

// GET /checklists?user_id=xxx — get all checklists with their items
router.get('/', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.json([])

  const { data: lists, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  if (!lists.length) return res.json([])

  const ids = lists.map(l => l.id)
  const { data: items, error: itemsErr } = await supabase
    .from('checklist_items')
    .select('*')
    .in('checklist_id', ids)
    .order('position', { ascending: true })

  if (itemsErr) return res.status(500).json({ error: itemsErr.message })

  const result = lists.map(l => ({
    ...l,
    items: (items || []).filter(i => i.checklist_id === l.id)
  }))

  res.json(result)
})

// POST /checklists — create a new checklist
router.post('/', async (req, res) => {
  const { user_id, title } = req.body
  if (!user_id || !title) return res.status(400).json({ error: 'user_id and title required' })

  const { data, error } = await supabase
    .from('checklists')
    .insert([{ user_id, title }])
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ...data, items: [] })
})

// PATCH /checklists/:id — rename checklist
router.patch('/:id', async (req, res) => {
  const { title } = req.body
  const { data, error } = await supabase
    .from('checklists')
    .update({ title })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /checklists/:id — delete checklist (cascades items)
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('checklists').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Deleted' })
})

// POST /checklists/:id/items — add item to checklist
router.post('/:id/items', async (req, res) => {
  const { text, parent_id, position } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const { data, error } = await supabase
    .from('checklist_items')
    .insert([{ checklist_id: req.params.id, text, parent_id: parent_id || null, position: position || 0 }])
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /checklists/items/:itemId — toggle done or update text
router.patch('/items/:itemId', async (req, res) => {
  const { done, text } = req.body
  const updates = {}
  if (done !== undefined) updates.done = done
  if (text !== undefined) updates.text = text

  const { data, error } = await supabase
    .from('checklist_items')
    .update(updates)
    .eq('id', req.params.itemId)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /checklists/items/:itemId — delete item
router.delete('/items/:itemId', async (req, res) => {
  const { error } = await supabase.from('checklist_items').delete().eq('id', req.params.itemId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Deleted' })
})

module.exports = router
