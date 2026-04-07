require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const express = require('express')
const cors    = require('cors')

const eventsRouter = require('./routes/events')
const usersRouter  = require('./routes/users')
const groupsRouter = require('./routes/groups')

const app  = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/events', eventsRouter)
app.use('/users',  usersRouter)
app.use('/groups', groupsRouter)

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