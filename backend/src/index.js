import express from 'express'
import { planRoute } from './routes/plan.js'

const app = express()
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Garden plan generation
app.use('/api/plan', planRoute)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Garden Planner API running on port ${PORT}`))
