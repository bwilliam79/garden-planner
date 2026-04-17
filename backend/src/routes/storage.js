import { Router } from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

export const storageRoute = Router()

const DATA_DIR = process.env.DATA_DIR || '/data'

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(name) {
  const file = path.join(DATA_DIR, name)
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  } catch {
    return null
  }
}

function writeJson(name, data) {
  ensureDir()
  writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data), 'utf8')
}

// GET /api/storage/state  →  { state, savedPlans }
storageRoute.get('/state', (_req, res) => {
  res.json({
    state: readJson('garden-state.json'),
    savedPlans: readJson('garden-saved-plans.json'),
  })
})

// POST /api/storage/state  ←  { state?, savedPlans? }
storageRoute.post('/state', (req, res) => {
  const { state, savedPlans } = req.body
  if (state !== undefined) writeJson('garden-state.json', state)
  if (savedPlans !== undefined) writeJson('garden-saved-plans.json', savedPlans)
  res.json({ ok: true })
})
