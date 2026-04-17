// Shared helpers for LLM routes: env validation, prompt-injection sanitization,
// and robust JSON extraction from model responses.

// --- Env validation -------------------------------------------------------
let validated = false
export function assertAnthropicKey() {
  if (validated) return
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || typeof key !== 'string' || !key.trim()) {
    throw new Error(
      'ANTHROPIC_API_KEY is missing or empty. Set it in the environment before starting the server.'
    )
  }
  validated = true
}

// --- Prompt-injection sanitization ---------------------------------------
// Obvious injection markers we reject outright. Not exhaustive — the main
// defense is passing user data as JSON inside clear delimiters; this is belt-
// and-suspenders for the most blatant attempts.
const INJECTION_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior|above)\b/i,
  /<\/?\s*(system|user|assistant|human)\b/i,
  /\[\s*(system|user|assistant)\s*\]/i,
  /\bdisregard\s+(the\s+)?(above|previous|prior)\b/i,
]

const MAX_FIELD_LEN = 500

export function sanitizeUserString(s, { field = 'field' } = {}) {
  if (s == null) return ''
  if (typeof s !== 'string') s = String(s)
  // Strip CR/LF and collapse whitespace — prevents injection via newlines.
  s = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (s.length > MAX_FIELD_LEN) s = s.slice(0, MAX_FIELD_LEN)
  for (const re of INJECTION_PATTERNS) {
    if (re.test(s)) {
      const err = new Error(`Invalid characters in ${field}: possible prompt-injection attempt.`)
      err.statusCode = 400
      throw err
    }
  }
  return s
}

export function sanitizePlant(p) {
  return {
    name: sanitizeUserString(p?.name, { field: 'plant name' }),
    quantity: Number.isFinite(p?.quantity) ? Math.max(0, Math.floor(p.quantity)) : 1,
    notes: sanitizeUserString(p?.notes, { field: 'plant notes' }),
  }
}

export function sanitizeBed(b) {
  const width = Number(b?.width) || 0
  const height = Number(b?.height) || 0
  return {
    id: sanitizeUserString(b?.id, { field: 'bed id' }),
    name: sanitizeUserString(b?.name, { field: 'bed name' }),
    shape: sanitizeUserString(b?.shape, { field: 'bed shape' }),
    width,
    height,
    unit: sanitizeUserString(b?.unit, { field: 'bed unit' }),
    notchW: Number.isFinite(b?.notchW) ? Number(b.notchW) : undefined,
    notchH: Number.isFinite(b?.notchH) ? Number(b.notchH) : undefined,
  }
}

// --- JSON extraction -----------------------------------------------------
// Models are prompted to wrap JSON in <json>...</json>. Try that first; fall
// back to fenced code blocks; finally fall back to the original greedy match.
export function extractJson(text, { array = false } = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Model did not return any text')
  }
  const tagged = text.match(/<json>([\s\S]*?)<\/json>/i)
  if (tagged) return JSON.parse(tagged[1].trim())

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return JSON.parse(fenced[1].trim())

  // Legacy fallback — first balanced-looking block.
  const re = array ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const m = text.match(re)
  if (!m) throw new Error('Model did not return valid JSON')
  return JSON.parse(m[0])
}
