const path = require('path')
const envPath = path.resolve(__dirname, '../../.env')
if (require('fs').existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}
const express = require('express')
const cors = require('cors')

const eventsRouter = require('./routes/events')
const usersRouter = require('./routes/users')
const groupsRouter = require('./routes/groups')
const checklistsRouter = require('./routes/checklists')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
console.log('CORS: open to all origins')
app.use(express.json())

// Swagger API docs
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/events', eventsRouter)
app.use('/users', usersRouter)
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