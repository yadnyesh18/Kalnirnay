require('dotenv').config({ path: '../../.env' })
const express = require('express')
const cors    = require('cors')

const eventsRouter        = require('./routes/events')
const usersRouter         = require('./routes/users')
const groupsRouter        = require('./routes/groups')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Routes
app.use('/events',        eventsRouter)
app.use('/users',         usersRouter)
app.use('/groups',        groupsRouter)

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Kalnirnay API is running' })
})

app.listen(PORT, () => {
  console.log(`Kalnirnay server running on http://localhost:${PORT}`)
})