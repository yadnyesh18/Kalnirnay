const path = require('path')
const envPath = path.resolve(__dirname, '../../.env')
if (require('fs').existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}
const express = require('express')
const cors    = require('cors')

const eventsRouter = require('./routes/events')
const usersRouter  = require('./routes/users')
const groupsRouter = require('./routes/groups')
const checklistsRouter = require('./routes/checklists')

const app  = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173']

console.log('Allowed origins:', allowedOrigins)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    console.error(`CORS blocked: "${origin}" not in`, allowedOrigins)
    cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/events', eventsRouter)
app.use('/users',  usersRouter)
app.use('/groups', groupsRouter)
app.use('/checklists', checklistsRouter)

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Kalnirnay API is running' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kalnirnay server running on port ${PORT}`)
})