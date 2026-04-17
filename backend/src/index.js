import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { planRoute } from './routes/plan.js'
import { replaceRoute } from './routes/replace.js'
import { storageRoute } from './routes/storage.js'
import { assertAnthropicKey } from './lib/llm.js'

// Fail fast if required env is missing.
assertAnthropicKey()

const app = express()

// --- CORS -----------------------------------------------------------------
// In dev, allow localhost on any port. In prod, require CORS_ORIGINS env —
// comma-separated list of allowed origins. If unset, only same-origin works.
const isProd = process.env.NODE_ENV === 'production'
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, cb) {
    // Same-origin / curl / server-to-server have no Origin header.
    if (!origin) return cb(null, true)
    if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true)
    }
    if (envOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`Origin ${origin} not allowed by CORS`))
  },
}
app.use(cors(corsOptions))

app.use(express.json({ limit: '256kb' }))

// --- Rate limiting --------------------------------------------------------
// The LLM-backed endpoints are the expensive ones. Default: 10 req/min/IP.
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.LLM_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment and try again.' },
})

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Garden plan generation
app.use('/api/plan', llmLimiter, planRoute)

// Plant replacement recommendations
app.use('/api/replace', llmLimiter, replaceRoute)

// Persistent state storage — larger JSON limit for saved plans/state payloads.
app.use('/api/storage', express.json({ limit: '2mb' }), storageRoute)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Garden Planner API running on port ${PORT}`))
